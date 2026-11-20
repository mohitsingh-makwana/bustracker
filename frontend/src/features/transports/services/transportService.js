import apiClient from "../../../services/apiClient";

function readCollection(data, label) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    throw new Error(`The ${label} response has an unexpected format.`);
}

async function fetchPublicSystemPage({ page, size, name, city }) {
    const params = { page, size };
    if (name?.trim()) params.name = name.trim();
    if (city?.trim()) params.city = city.trim();

    const response = await apiClient.get("/transport-systems/public", {
        params,
        skipAuth: true,
    });
    return readCollection(response.data, "transport systems");
}

async function fetchRouteCounts() {
    const response = await apiClient.get("/transport-systems/route-count", {
        skipAuth: true,
    });
    return readCollection(response.data, "transport-system route counts");
}

async function fetchActiveTripCounts() {
    const response = await apiClient.get("/transport-systems/active-trip-count", {
        skipAuth: true,
    });
    return readCollection(response.data, "transport-system active-trip counts");
}

function attachCounts(systems, routeCounts, activeTripCounts) {
    const routeCountBySystem = new Map(
        routeCounts.map((item) => [String(item.transportSystemId), Number(item.routeCount ?? 0)])
    );
    const activeTripCountBySystem = new Map(
        activeTripCounts.map((item) => [
            String(item.transportSystemId),
            Number(item.tripCount ?? item.activeTripCount ?? 0),
        ])
    );

    return systems.map((system) => ({
        ...system,
        routeCount: routeCountBySystem.get(String(system.id)) ?? 0,
        activeTripCount: activeTripCountBySystem.get(String(system.id)) ?? 0,
    }));
}

export async function getTransportSystems({ page = 0, size = 50, query = "", name, city } = {}) {
    let systems;

    // The single search box should match either name or city. Because these are
    // separate optional backend filters, fetch both matches and merge by ID.
    if (query?.trim()) {
        const term = query.trim();
        const [nameMatches, cityMatches] = await Promise.all([
            fetchPublicSystemPage({ page, size, name: term }),
            fetchPublicSystemPage({ page, size, city: term }),
        ]);
        const uniqueById = new Map();
        [...nameMatches, ...cityMatches].forEach((system) => {
            uniqueById.set(String(system.id), system);
        });
        systems = [...uniqueById.values()];
    } else {
        systems = await fetchPublicSystemPage({ page, size, name, city });
    }

    // Counts are independent endpoints. If one count endpoint is temporarily
    // unavailable, preserve the transport list and use 0 for missing counts.
    const [routeCounts, activeTripCounts] = await Promise.all([
        fetchRouteCounts().catch((error) => {
            console.warn("Unable to load transport-system route counts.", error);
            return [];
        }),
        fetchActiveTripCounts().catch((error) => {
            console.warn("Unable to load transport-system active-trip counts.", error);
            return [];
        }),
    ]);

    return attachCounts(systems, routeCounts, activeTripCounts);
}

export async function getPublicTransportSystemById(id) {
    const response = await apiClient.get(`/public/transport-systems/${id}`, {
        skipAuth: true,
        useTransportSystemContext: true,
        transportSystemId: id,
    });
    return response.data;
}

export async function getPrivateTransportSystemById(_id) {
    // The backend resolves the current transport system from the authenticated
    // context-holder. Do not append an ID: GET /transport-systems is the contract.
    const response = await apiClient.get("/transport-systems");
    return response.data?.data ?? response.data;
}

/** Creates a transport system using the authenticated USER token. The backend
 * is expected to create the requesting user’s ADMIN membership as part of this operation. */
export async function createTransportSystem(payload) {
    const response = await apiClient.post("/transport-systems", payload, { authTokenType: "user" });
    return response.data?.data ?? response.data;
}
