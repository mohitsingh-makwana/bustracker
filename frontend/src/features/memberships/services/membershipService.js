import apiClient from "../../../services/apiClient";

function readPage(data, label, requestedPage, requestedSize) {
    const pageData = data?.data?.content ? data.data : data;
    let items;

    if (Array.isArray(pageData)) items = pageData;
    else if (Array.isArray(pageData?.content)) items = pageData.content;
    else if (Array.isArray(pageData?.data)) items = pageData.data;
    else if (Array.isArray(pageData?.items)) items = pageData.items;
    else throw new Error(`The ${label} response has an unexpected format.`);

    return {
        items,
        pageInfo: {
            page: Number(pageData?.number ?? pageData?.page ?? requestedPage),
            size: Number(pageData?.size ?? requestedSize),
            totalElements: Number(pageData?.totalElements ?? items.length),
            totalPages: Number(pageData?.totalPages ?? (items.length < requestedSize ? 1 : requestedPage + 1)),
            last: Boolean(pageData?.last ?? items.length < requestedSize),
        },
    };
}

/**
 * The /transport-systems/my endpoint returns a pageable collection of the
 * current user's systems. Each row is normalized to the membership shape used
 * by the Home page. It supports either a nested `transportSystem`/`system`
 * object or a flattened DTO containing system fields and membership status.
 */
function normalizeMySystem(row) {
    const nestedSystem = row?.transportSystem ?? row?.system ?? null;
    // A /transport-systems/my row may be a plain TransportSystem DTO. Do not
    // mistake its TransportSystemStatus (`status`) for a membership status.
    const explicitMembership = row?.membership ?? row?.member ?? null;
    const systemId = explicitMembership?.transportSystemId
        ?? row?.transportSystemId
        ?? nestedSystem?.id
        ?? row?.id;

    const membershipStatus = explicitMembership?.status
        ?? row?.membershipStatus
        ?? row?.memberStatus
        ?? null;
    const membershipRole = explicitMembership?.role
        ?? row?.membershipRole
        ?? row?.memberRole
        ?? null;

    const system = nestedSystem ?? {
        ...row,
        id: row?.id ?? systemId,
    };

    return {
        ...(explicitMembership ?? {}),
        id: explicitMembership?.id ?? row?.membershipId ?? row?.memberId ?? systemId,
        userId: explicitMembership?.userId ?? row?.userId,
        transportSystemId: systemId,
        role: membershipRole,
        status: membershipStatus,
        hasMembershipStatus: membershipStatus != null,
        fromMySystems: true,
        system,
    };
}

export async function getMyMembershipsPage({ page = 0, size = 10 } = {}) {
    const response = await apiClient.get("/transport-systems/my", {
        params: { page, size },
        authTokenType: "user",
    });

    const result = readPage(response.data, "my transport systems", page, size);
    return { ...result, items: result.items.map(normalizeMySystem) };
}

export async function getMyMemberships({ page = 0, size = 10 } = {}) {
    const result = await getMyMembershipsPage({ page, size });
    return result.items;
}


/**
 * Checks the signed-in user's membership for a selected transport system.
 * The endpoint also supports guests; when no USER token exists, the request is sent without Authorization.
 */
export async function checkTransportSystemMembership(transportSystemId) {
    const response = await apiClient.get(
        `/transport-systems/${transportSystemId}/membership-check`,
        { authTokenType: "user" }
    );
    return response.data;
}

export async function requestTransportMembership(transportSystemId) {
    const response = await apiClient.post(
        `/transport-systems/${transportSystemId}/membership-request`,
        {},
        { authTokenType: "user" }
    );
    return response.data;
}
