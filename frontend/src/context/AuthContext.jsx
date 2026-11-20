import { createContext, useContext, useEffect, useState } from "react";
import tokenStore from "../services/tokenStore";
import registrationFlowStore from "../services/registrationFlowStore";
import sharedStomp from "../features/tracking/services/sharedStomp";
import { readJwtPayload } from "../utils/jwt";
import {
    login as loginRequest,
    accessTransportSystem as accessRequest,
} from "../features/auth/services/authService";

const AuthContext = createContext(null);

const INITIAL_AUTH_STATE = {
    userToken: null,
    userId: null,
    memberToken: null,
    transportSystemId: null,
    publicTransportSystemId: null,
    memberId: null,
    role: null,
};

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(INITIAL_AUTH_STATE);

    useEffect(() => {
        sharedStomp.updateAuth(auth.memberToken);
    }, [auth.memberToken]);

    // Step 1: Obtain the USER token from the email-labelled login form.
    async function login(email, password) {
        const response = await loginRequest(email, password);
        const token = typeof response === "string" ? response : response?.token;

        if (!token) {
            throw new Error(response?.msg || response?.message || "Login response did not contain a token.");
        }

        const claims = readJwtPayload(token);
        const userId = response?.userId ?? response?.user?.id ?? claims?.userId ?? claims?.user_id ?? claims?.id ?? null;

        tokenStore.clearAllTokens();
        tokenStore.setUserToken(token);

        setAuth({
            ...INITIAL_AUTH_STATE,
            userToken: token,
            userId,
        });

        return token;
    }

    // Step 2: Obtain a MEMBER token for a selected, approved system.
    async function selectTransportSystem(transportSystemId) {
        if (!auth.userToken) {
            throw new Error("Please log in first.");
        }

        tokenStore.clearMemberToken();
        tokenStore.setSelectedTransportSystemId(null);
        setAuth((previous) => ({
            ...previous,
            memberToken: null,
            transportSystemId: null,
            publicTransportSystemId: null,
            memberId: null,
            role: null,
        }));

        const access = await accessRequest(transportSystemId);
        const token = access?.token;

        if (!token) {
            throw new Error(access?.message || "You don't have access to this transport system yet.");
        }

        const claims = readJwtPayload(token);
        if (
            claims?.transportSystemId != null &&
            String(claims.transportSystemId) !== String(transportSystemId)
        ) {
            throw new Error("The member token does not match the selected transport system.");
        }

        tokenStore.setMemberToken(token);
        tokenStore.setSelectedTransportSystemId(transportSystemId);
        setAuth((previous) => ({
            ...previous,
            memberToken: token,
            transportSystemId: String(transportSystemId),
            publicTransportSystemId: null,
            memberId: claims?.memberId ?? claims?.member_id ?? null,
            role: claims?.role ?? null,
        }));

        return token;
    }

    async function refreshMemberToken() {
        if (!auth.userToken || auth.transportSystemId == null) throw new Error("Your sign-in session is no longer available.");
        const access = await accessRequest(auth.transportSystemId);
        if (!access?.token) throw new Error(access?.message || "Your member session could not be renewed.");
        const claims = readJwtPayload(access.token);
        tokenStore.setMemberToken(access.token);
        setAuth((previous) => ({ ...previous, memberToken: access.token, memberId: claims?.memberId ?? claims?.member_id ?? previous.memberId, role: claims?.role ?? previous.role }));
        return access.token;
    }

    function selectPublicTransportSystem(transportSystemId) {
        // A public guest/user context must not accidentally keep a previous
        // member token from another transport system.
        tokenStore.clearMemberToken();
        tokenStore.setSelectedTransportSystemId(transportSystemId);
        setAuth((previous) => ({
            ...previous,
            memberToken: null,
            transportSystemId: null,
            publicTransportSystemId: String(transportSystemId),
            memberId: null,
            role: null,
        }));
    }

    function logout() {
        registrationFlowStore.clear();
        tokenStore.clearAllTokens();
        setAuth({ ...INITIAL_AUTH_STATE });
    }

    const value = {
        ...auth,
        login,
        selectTransportSystem,
        refreshMemberToken,
        selectPublicTransportSystem,
        logout,
        isAuthenticated: Boolean(auth.userToken),
        isMemberAuthenticated: Boolean(auth.memberToken),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider.");
    return context;
}
