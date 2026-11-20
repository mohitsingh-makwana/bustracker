import test from "node:test";
import assert from "node:assert/strict";
import {
    buildRegistrationPayload,
    formatOtpCountdown,
    getOtpActionState,
    getVerificationResult,
    hasValidRegistrationFlow,
    normalizeEmail,
} from "../../auth/registrationFlowUtils.js";
import { createRegistrationFlowStore, getVerificationExpiry } from "../../../services/registrationFlowStore.js";

function fakeStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
        values,
    };
}

test("registration flow is normalized, bound to one email, persisted in session storage, and cleared", () => {
    const storage = fakeStorage();
    const store = createRegistrationFlowStore(() => storage);
    const saved = store.save({ email: " Test@Example.com ", verificationToken: "jwt", expiresAt: Date.now() + 60_000 });
    assert.equal(saved.email, "test@example.com");
    assert.equal(JSON.parse(storage.getItem("bustrackr.registration-flow")).verificationToken, "jwt");
    store.clearIfEmailChanges("other@example.com");
    assert.equal(store.read(), null);
    assert.equal(storage.getItem("bustrackr.registration-flow"), null);
});

test("registration flow expires and has no localStorage dependency", () => {
    const storage = fakeStorage();
    const store = createRegistrationFlowStore(() => storage);
    store.save({ email: "a@example.com", verificationToken: "jwt", expiresAt: Date.now() - 1 });
    assert.equal(store.read(), null);
    assert.equal(storage.values.size, 0);
    assert.equal(getVerificationExpiry("not-a-jwt", 10_000), 130_000);
});

test("OTP send states and resend countdown are correct", () => {
    assert.deepEqual(getOtpActionState({ email: "bad", sending: false, remainingSeconds: 0, hasSentOtp: false }), {
        sendDisabled: true, action: "send",
    });
    assert.deepEqual(getOtpActionState({ email: " A@Example.com ", sending: true, remainingSeconds: 0, hasSentOtp: false }), {
        sendDisabled: true, action: "send",
    });
    assert.deepEqual(getOtpActionState({ email: "a@example.com", sending: false, remainingSeconds: 119, hasSentOtp: true }), {
        sendDisabled: true, action: "verify",
    });
    assert.equal(formatOtpCountdown(119), "1:59");
    assert.equal(formatOtpCountdown(0), "0:00");
});

test("verify response branches on null versus present verification token", () => {
    assert.deepEqual(getVerificationResult({ verificationToken: null, message: "Invalid OTP" }), {
        verified: false, message: "Invalid OTP", verificationToken: null, email: "",
    });
    assert.deepEqual(getVerificationResult({ verificationToken: "signed-jwt", message: "Verified" }), {
        verified: true, message: "Verified", verificationToken: "signed-jwt", email: "",
    });
});

test("registration guard accepts only an unexpired stored token", () => {
    assert.equal(hasValidRegistrationFlow({ email: "a@example.com", verificationToken: "jwt", expiresAt: 500 }, 499), true);
    assert.equal(hasValidRegistrationFlow({ email: "a@example.com", verificationToken: "jwt", expiresAt: 500 }, 500), false);
    assert.equal(hasValidRegistrationFlow(null), false);
});

test("registration payload includes verified email and token, excludes confirm password", () => {
    const payload = buildRegistrationPayload({
        fullName: "A User",
        email: " A@Example.com ",
        password: "password123",
        phone: "+91 98765 43210",
        verificationToken: "verified-jwt",
        confirmPassword: "password123",
    });
    assert.deepEqual(payload, {
        fullName: "A User",
        email: "a@example.com",
        password: "password123",
        phone: "9876543210",
        verificationToken: "verified-jwt",
    });
    assert.equal("confirmPassword" in payload, false);
    assert.equal(normalizeEmail(" A@Example.com "), "a@example.com");
});


test("accepts the backend UserVerificationResponse and preserves its success message", () => {
    const response = {
        email: " User@Example.com ",
        verificationToken: "header.eyJleHAiOjE3OTM5MDAwMDB9.signature",
        message: "otp verified successfully!",
    };
    assert.deepEqual(getVerificationResult(response), {
        verified: true,
        message: "otp verified successfully!",
        verificationToken: response.verificationToken,
        email: "user@example.com",
    });
    assert.equal(getVerificationResult({ data: response }).verified, true);
});

test("uses the 120-second fallback when a JWT exp claim is null", () => {
    const payload = Buffer.from(JSON.stringify({ exp: null })).toString("base64url");
    const token = `header.${payload}.signature`;
    assert.equal(getVerificationExpiry(token, 10_000), 130_000);
});


test("parses a JSON-string verification response and nested API response envelopes", () => {
    const body = {
        email: "rishabh@example.com",
        verificationToken: "signed.jwt.token",
        message: "otp verified successfully!",
    };
    assert.equal(getVerificationResult(JSON.stringify(body)).verified, true);
    assert.equal(getVerificationResult({ data: { data: body } }).verificationToken, body.verificationToken);
});

test("accepts JWT expiry expressed as milliseconds", () => {
    const expiryMs = 1_800_000_000_000;
    const payload = Buffer.from(JSON.stringify({ exp: expiryMs })).toString("base64url");
    assert.equal(getVerificationExpiry(`header.${payload}.signature`, 10_000), expiryMs);
});
