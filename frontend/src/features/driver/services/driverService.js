import apiClient from "../../../services/apiClient";
import sharedStomp from "../../tracking/services/sharedStomp";

const DEFAULT_PAGE_SIZE = 50;

function unwrap(data) {
    let result = data;
    for (let index = 0; index < 3 && result?.data != null; index += 1) result = result.data;
    return result;
}

function entity(data, keys = []) {
    const body = unwrap(data);
    if (body == null) return null;
    if (Array.isArray(body)) return body[0] ?? null;
    for (const key of keys) {
        if (body?.[key] != null) return body[key];
    }
    return body;
}

export function readDriverPage(data, label = "driver trips", page = 0, size = DEFAULT_PAGE_SIZE) {
    const body = unwrap(data);
    const items = Array.isArray(body)
        ? body
        : Array.isArray(body?.content)
            ? body.content
            : Array.isArray(body?.items)
                ? body.items
                : Array.isArray(body?.results)
                    ? body.results
                    : Array.isArray(body?.data)
                        ? body.data
                        : null;

    if (!items) throw new Error(`The ${label} response has an unexpected format.`);

    return {
        items,
        pageInfo: {
            page: Number(body?.number ?? body?.page ?? page),
            size: Number(body?.size ?? size),
            totalElements: Number(body?.totalElements ?? items.length),
            totalPages: Number(body?.totalPages ?? (items.length < size ? page + 1 : page + 2)),
            last: Boolean(body?.last ?? items.length < size),
        },
    };
}

export function getDriverMe() {
    return apiClient.get("/drivers/me").then((response) => entity(response.data, ["driver", "profile", "result"]));
}

export async function getCurrentDriverTrip() {
    try {
        const response = await apiClient.get("/trips/my/current");
        const result = entity(response.data, ["trip", "currentTrip", "result"]);
        if (!result || (result.id == null && result.tripId == null)) return null;
        return result;
    } catch (error) {
        // A 404/204 is treated as "no active trip"; other failures stay visible.
        if (error?.response?.status === 404 || error?.response?.status === 204) return null;
        throw error;
    }
}

export async function getSingleUpcomingTrips({ page = 0, size = DEFAULT_PAGE_SIZE } = {}) {
    const response = await apiClient.get("/trips/my/single-upcoming", { params: { page, size } });
    return readDriverPage(response.data, "single upcoming trips", page, size);
}

export async function getRegularUpcomingTrips({ page = 0, size = DEFAULT_PAGE_SIZE } = {}) {
    const response = await apiClient.get("/trip-schedules/my/regular-upcoming", { params: { page, size } });
    return readDriverPage(response.data, "regular upcoming trips", page, size);
}

export async function getDriverTripHistory({ page = 0, size = DEFAULT_PAGE_SIZE } = {}) {
    const response = await apiClient.get("/trips/my/history", { params: { page, size } });
    return readDriverPage(response.data, "trip history", page, size);
}

export async function getTripStops(tripId) {
    const response = await apiClient.get(`/trips/${encodeURIComponent(tripId)}/stops`);
    const body = unwrap(response.data);
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.content)) return body.content;
    if (Array.isArray(body?.items)) return body.items;
    if (Array.isArray(body?.stops)) return body.stops;
    if (Array.isArray(body?.routeStops)) return body.routeStops;
    return [];
}

export async function startSingleTrip(tripId) {
    const response = await apiClient.post(`/trips/my/${encodeURIComponent(tripId)}/start`);
    return entity(response.data, ["trip", "result"]);
}

export async function startRegularTrip(tripScheduleId) {
    const response = await apiClient.post(`/trip-schedules/my/${encodeURIComponent(tripScheduleId)}/start`);
    return entity(response.data, ["trip", "result"]);
}

export async function completeDriverTrip(tripId) {
    const response = await apiClient.patch(`/trips/my/${encodeURIComponent(tripId)}/complete`);
    return entity(response.data, ["trip", "result"]);
}

export async function terminateDriverTrip(tripId) {
    const response = await apiClient.patch(`/trips/${encodeURIComponent(tripId)}/terminate`);
    return entity(response.data, ["trip", "result"]);
}

function toLocalDateTime(timestamp) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function sendDriverLocation(tripId, position) {
    if (position.nextPatternStopId == null) {
        throw new Error("nextPatternStopId is required to update driver location.");
    }
    const payload = {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracyMeters ?? null,
        speedMetersPerSecond: position.speedMetersPerSecond ?? null,
        headingDegrees: position.headingDegrees ?? null,
        recordedAt: toLocalDateTime(position.capturedAtMs ?? Date.now()),
        nextPatternStopId: position.nextPatternStopId,
    };
    return sharedStomp.publish(`/app/trips/${encodeURIComponent(tripId)}/locations`, payload);
}
