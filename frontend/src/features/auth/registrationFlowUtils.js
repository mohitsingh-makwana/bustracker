export function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

export function buildRegistrationPayload({ fullName, email, password, phone, verificationToken }) {
    return {
        fullName,
        email: normalizeEmail(email),
        password,
        phone: (() => {
            const digits = String(phone).replace(/\D/g, "");
            return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
        })(),
        verificationToken,
    };
}

export function getOtpActionState({ email, sending, remainingSeconds, hasSentOtp }) {
    const validEmail = /^\S+@\S+\.\S+$/.test(normalizeEmail(email));
    return {
        sendDisabled: !validEmail || sending || remainingSeconds > 0,
        action: hasSentOtp ? "verify" : "send",
    };
}

export function getVerificationResult(response) {
    // Axios normally returns the JSON body directly. Accept a JSON string and
    // common API-envelope shapes as well, so a successful backend response is
    // not mistaken for a failed verification when the content type is unusual.
    let body = response;
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch {
            body = null;
        }
    }

    for (let depth = 0; depth < 3 && body && !body.verificationToken && body.data; depth += 1) {
        body = body.data;
    }

    const rawToken = body?.verificationToken;
    const verificationToken = typeof rawToken === "string" && rawToken.trim()
        ? rawToken.trim()
        : null;

    return {
        verified: Boolean(verificationToken),
        message: typeof body?.message === "string" ? body.message : "",
        verificationToken,
        email: typeof body?.email === "string" ? normalizeEmail(body.email) : "",
    };
}

export function hasValidRegistrationFlow(flow, now = Date.now()) {
    return Boolean(flow?.email && flow?.verificationToken && Number.isFinite(flow?.expiresAt) && flow.expiresAt > now);
}

export function formatOtpCountdown(seconds) {
    const safeSeconds = Math.max(0, seconds);
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}
