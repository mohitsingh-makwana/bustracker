import { readJwtPayload } from "../utils/jwt.js";

const STORAGE_KEY = "bustrackr.registration-flow";
const TOKEN_LIFETIME_MS = 120_000;

function getSessionStorage() {
    try {
        return typeof window !== "undefined" ? window.sessionStorage : null;
    } catch {
        return null;
    }
}

export function getVerificationExpiry(token, receivedAt = Date.now()) {
    const exp = readJwtPayload(token)?.exp;
    // JWT NumericDate is normally seconds. Tolerate millisecond epoch values
    // too, while falling back only when the claim is absent or malformed.
    if (exp === null || exp === undefined || exp === "") {
        return receivedAt + TOKEN_LIFETIME_MS;
    }
    const expiry = Number(exp);
    if (!Number.isFinite(expiry) || expiry <= 0) {
        return receivedAt + TOKEN_LIFETIME_MS;
    }
    return expiry > 1_000_000_000_000 ? expiry : expiry * 1000;
}

export function createRegistrationFlowStore(storageProvider = getSessionStorage) {
    let flow = null;

    function persist() {
        const storage = storageProvider();
        try {
            if (flow) storage?.setItem(STORAGE_KEY, JSON.stringify(flow));
            else storage?.removeItem(STORAGE_KEY);
        } catch {
            // The in-memory flow remains usable if sessionStorage is unavailable.
        }
    }

    function read() {
        if (!flow) {
            try {
                const stored = storageProvider()?.getItem(STORAGE_KEY);
                flow = stored ? JSON.parse(stored) : null;
            } catch {
                flow = null;
            }
        }
        if (flow && (!flow.email || !flow.verificationToken || !Number.isFinite(flow.expiresAt) || flow.expiresAt <= Date.now())) {
            clear();
        }
        return flow ? { ...flow } : null;
    }

    function save({ email, verificationToken, receivedAt = Date.now(), expiresAt }) {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        if (!normalizedEmail || !verificationToken) {
            clear();
            return null;
        }
        flow = {
            email: normalizedEmail,
            verificationToken,
            expiresAt: Number.isFinite(expiresAt) ? expiresAt : getVerificationExpiry(verificationToken, receivedAt),
        };
        persist();
        return { ...flow };
    }

    function clear() {
        flow = null;
        persist();
    }

    function clearIfEmailChanges(email) {
        const current = read();
        if (current && current.email !== String(email || "").trim().toLowerCase()) clear();
    }

    return { read, save, clear, clearIfEmailChanges };
}

const registrationFlowStore = createRegistrationFlowStore();
export default registrationFlowStore;
export { TOKEN_LIFETIME_MS };
