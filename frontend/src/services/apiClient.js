import axios from "axios";
import tokenStore from "./tokenStore";


const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000,
});

apiClient.interceptors.request.use(
    (config) => {
        // Login and public endpoints may opt out of Authorization while still
        // opting into the selected transport context.
        if (config.skipAuth) {
            delete config.headers.Authorization;
            delete config.skipAuth;
            delete config.authTokenType;
        } else {
            // Protected APIs use MEMBER tokens by default. Membership checks,
            // requests and user-profile APIs explicitly use the USER token.
            const tokenType = config.authTokenType ?? "member";
            const token = tokenType === "user"
                ? tokenStore.getUserToken()
                : tokenStore.getMemberToken();

            if (token) config.headers.Authorization = `Bearer ${token}`;
            else delete config.headers.Authorization;
            delete config.authTokenType;
        }

        // Only attach the transport ID when a request explicitly needs the
        // selected system context. Backend header name: X-Transport-System.
        if (config.useTransportSystemContext) {
            const transportSystemId = config.transportSystemId
                ?? tokenStore.getSelectedTransportSystemId();
            if (transportSystemId != null && transportSystemId !== "") {
                config.headers["X-Transport-System"] = String(transportSystemId);
            }
        }
        delete config.useTransportSystemContext;
        delete config.transportSystemId;
        return config;
    },
    (error) => Promise.reject(error)
);

export default apiClient;