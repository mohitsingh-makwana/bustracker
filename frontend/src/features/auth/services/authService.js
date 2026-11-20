import apiClient from "../../../services/apiClient";
import { readJwtPayload } from "../../../utils/jwt";
import tokenStore from "../../../services/tokenStore";
import { buildRegistrationPayload, normalizeEmail } from "../registrationFlowUtils";

export { buildRegistrationPayload, formatOtpCountdown, getOtpActionState, getVerificationResult, hasValidRegistrationFlow, normalizeEmail } from "../registrationFlowUtils";

export async function sendRegistrationOtp(email) {
    const response = await apiClient.post(`/auth/send-otp?email=${encodeURIComponent(normalizeEmail(email))}`, null, {
        skipAuth: true,
    });
    const body = response.data;
    return typeof body === "string" ? body : body?.message || "";
}

export async function verifyRegistrationOtp(email, otp) {
    const response = await apiClient.post("/auth/verify", {
        email: normalizeEmail(email),
        otp: String(otp),
    }, {
        skipAuth: true,
    });
    return response.data;
}

export async function register(payload) {
    const requestBody = buildRegistrationPayload(payload);
    const response = await apiClient.post("/auth/register", requestBody, {
        skipAuth: true,
    });
    return response.data;
}

// The UI labels this field Email, but the backend authentication contract uses `username`.
export async function login(email, password) {
    const response = await apiClient.post(
        "/auth/login",
        { username: email, password },
        { skipAuth: true }
    );
    return response.data;
}

export async function accessTransportSystem(transportSystemId) {
    const response = await apiClient.post(
        `/transport-systems/${transportSystemId}/access`,
        {},
        { authTokenType: "user" }
    );
    return {
        token: response.data?.token ?? null,
        message: response.data?.msg ?? response.data?.message ?? "",
    };
}

export function getUserIdFromStoredToken() {
    const token = tokenStore.getUserToken();
    if (!token) return null;
    const payload = readJwtPayload(token);
    return payload?.userId ?? payload?.user_id ?? payload?.id ?? null;
}

export async function getCurrentUser(userId = getUserIdFromStoredToken()) {
    if (userId == null || userId === "") {
        throw new Error("The login token does not contain a user ID, so the profile cannot be loaded.");
    }
    const response = await apiClient.get(`/users/${encodeURIComponent(userId)}`, {
        authTokenType: "user",
    });
    return response.data;
}
