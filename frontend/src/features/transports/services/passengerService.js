import apiClient from "../../../services/apiClient";

const DEFAULT_PAGE_SIZE = 50;

function unwrap(data) {
    let result = data;
    for (let i = 0; i < 3 && result?.data != null; i += 1) result = result.data;
    return result;
}

export function readPage(data, label = "items", requestedPage = 0, requestedSize = DEFAULT_PAGE_SIZE) {
    const body = unwrap(data);
    let items;
    if (Array.isArray(body)) items = body;
    else if (Array.isArray(body?.content)) items = body.content;
    else if (Array.isArray(body?.items)) items = body.items;
    else if (Array.isArray(body?.results)) items = body.results;
    else throw new Error(`The ${label} response has an unexpected format.`);

    return {
        items,
        pageInfo: {
            page: Number(body?.number ?? body?.page ?? requestedPage),
            size: Number(body?.size ?? requestedSize),
            totalElements: Number(body?.totalElements ?? items.length),
            totalPages: Number(body?.totalPages ?? (items.length < requestedSize ? requestedPage + 1 : requestedPage + 2)),
            last: Boolean(body?.last ?? items.length < requestedSize),
        },
    };
}

function transportRequestConfig(accessType, transportSystemId, params = {}) {
    const isPublic = String(accessType).toUpperCase() === "PUBLIC";
    return {
        params,
        ...(isPublic ? {
            skipAuth: true,
            useTransportSystemContext: true,
            transportSystemId,
        } : { authTokenType: "member" }),
    };
}

async function getTripPage({ accessType, transportSystemId, status, page = 0, size = DEFAULT_PAGE_SIZE }) {
    const isPublic = String(accessType).toUpperCase() === "PUBLIC";
    // Keep the public and private trip-list paths aligned with the backend controller contracts.
    const path = isPublic ? "/trips/transport-system/public" : "/trips/transport-system";
    const response = await apiClient.get(path, transportRequestConfig(accessType, transportSystemId, { status, page, size }));
    return readPage(response.data, `${status.toLowerCase()} trips`, page, size);
}

async function getSchedulePage({ accessType, transportSystemId, page = 0, size = DEFAULT_PAGE_SIZE }) {
    const isPublic = String(accessType).toUpperCase() === "PUBLIC";
    const path = isPublic
        ? "/trip-schedules/transport-system/public"
        : "/trip-schedules/transport-system";
    const response = await apiClient.get(path, transportRequestConfig(accessType, transportSystemId, { page, size }));
    return readPage(response.data, "trip schedules", page, size);
}

export async function getPassengerHomeData({ accessType, transportSystemId, page = 0, size = DEFAULT_PAGE_SIZE }) {
    const [liveResult, scheduledResult, schedulesResult] = await Promise.allSettled([
        getTripPage({ accessType, transportSystemId, status: "ACTIVE", page, size }),
        getTripPage({ accessType, transportSystemId, status: "SCHEDULED", page, size }),
        getSchedulePage({ accessType, transportSystemId, page, size }),
    ]);

    const livePage = liveResult.status === "fulfilled" ? liveResult.value : { items: [], pageInfo: null };
    const scheduledPage = scheduledResult.status === "fulfilled" ? scheduledResult.value : { items: [], pageInfo: null };
    const schedulesPage = schedulesResult.status === "fulfilled" ? schedulesResult.value : { items: [], pageInfo: null };

    if (liveResult.status === "rejected" && scheduledResult.status === "rejected" && schedulesResult.status === "rejected") {
        throw liveResult.reason ?? scheduledResult.reason ?? schedulesResult.reason;
    }

    const liveTrips = livePage.items
        .filter((trip) => String(trip.status ?? "ACTIVE").toUpperCase() === "ACTIVE")
        .map((trip) => normalizeTripCard(trip, { fallbackStatus: "ACTIVE" }));

    const singleUpcomingTrips = scheduledPage.items
        .filter((trip) => trip.tripScheduleId == null)
        .filter((trip) => String(trip.status ?? "SCHEDULED").toUpperCase() === "SCHEDULED")
        .map((trip) => normalizeTripCard(trip, { fallbackStatus: "SCHEDULED" }));

    const regularUpcomingTrips = schedulesPage.items.flatMap((schedule) => expandSchedule(schedule));

    const errorParts = [];
    if (liveResult.status === "rejected") errorParts.push("Live trips couldn't be loaded.");
    if (scheduledResult.status === "rejected") errorParts.push("Single upcoming trips couldn't be loaded.");
    if (schedulesResult.status === "rejected") errorParts.push("Regular schedules couldn't be loaded.");

    return {
        liveTrips: sortLiveTrips(liveTrips),
        upcomingTrips: sortUpcomingTrips([...singleUpcomingTrips, ...regularUpcomingTrips]),
        pageInfo: {
            live: livePage.pageInfo,
            scheduled: scheduledPage.pageInfo,
            schedules: schedulesPage.pageInfo,
        },
        warnings: errorParts,
    };
}

export function normalizeTripCard(row, { fallbackStatus = "SCHEDULED" } = {}) {
    const tripScheduleId = row?.tripScheduleId ?? null;
    const scheduledStart = row?.scheduledTripStartTime ?? row?.scheduledStartTime ?? row?.scheduledStart ?? null;
    const scheduledEnd = row?.scheduledTripEndTime ?? row?.scheduledEndTime ?? row?.scheduledEnd ?? null;
    const scheduleStart = row?.scheduledTripScheduleStartTime ?? row?.scheduledStartTime ?? row?.scheduledStart ?? null;
    const scheduleEnd = row?.scheduledTripScheduleEndTime ?? row?.scheduledEndTime ?? row?.scheduledEnd ?? null;
    const status = String(row?.status ?? fallbackStatus).toUpperCase();
    const operatingDays = Array.isArray(row?.operatingDays) ? row.operatingDays : [];
    const tripType = String(row?.tripType ?? (tripScheduleId == null ? "SINGLE" : "REGULAR")).toUpperCase();
    const regular = tripScheduleId != null || tripType.includes("REGULAR") || tripType.includes("DAILY");

    const routePattern = row?.routePattern ?? row?.pattern ?? row?.routePatternDetails ?? {};
    const route = row?.route ?? routePattern?.route ?? row?.routeDetails ?? {};
    // Search responses can flatten the route/stop fields differently from the
    // home feed. Resolve common nested variants before using the generic fallback.
    const originStop = row?.originStop ?? row?.startStop ?? row?.fromStop
        ?? routePattern?.originStop ?? routePattern?.startStop ?? routePattern?.fromStop
        ?? route?.originStop ?? route?.startStop ?? route?.fromStop ?? {};
    const destinationStop = row?.destinationStop ?? row?.endStop ?? row?.toStop
        ?? routePattern?.destinationStop ?? routePattern?.endStop ?? routePattern?.toStop
        ?? route?.destinationStop ?? route?.endStop ?? route?.toStop ?? {};
    const bus = row?.bus ?? {};
    const driver = row?.driver ?? {};
    const resolvedScheduledStart = scheduledStart ?? row?.startTime ?? row?.tripStartTime ?? null;
    const resolvedScheduledEnd = scheduledEnd ?? row?.endTime ?? row?.tripEndTime ?? null;

    return {
        id: row?.tripId ?? row?.id ?? (regular ? `schedule-${row?.id ?? tripScheduleId}` : null),
        tripId: row?.tripId ?? row?.id ?? null,
        tripScheduleId,
        tripType,
        isRegular: regular,
        routePatternId: row?.routePatternId ?? routePattern?.routePatternId ?? routePattern?.id ?? null,
        routeName: row?.routeName ?? route?.routeName ?? route?.name ?? "Route details unavailable",
        routePatternName: row?.routePatternName ?? row?.patternName ?? routePattern?.routePatternName ?? routePattern?.patternName ?? routePattern?.name ?? "Route pattern details unavailable",
        routePatternCode: row?.routePatternCode ?? row?.patternCode ?? routePattern?.routePatternCode ?? routePattern?.code ?? row?.routeCode ?? route?.routeCode ?? route?.code ?? "",
        originStopName: row?.originStopName ?? row?.originName ?? row?.startStopName ?? row?.fromStopName ?? originStop?.stopName ?? originStop?.name ?? routePattern?.originStopName ?? routePattern?.startStopName ?? route?.originStopName ?? route?.startStopName ?? row?.origin ?? row?.startPoint ?? "Origin",
        destinationStopName: row?.destinationStopName ?? row?.destinationName ?? row?.endStopName ?? row?.toStopName ?? destinationStop?.stopName ?? destinationStop?.name ?? routePattern?.destinationStopName ?? routePattern?.endStopName ?? route?.destinationStopName ?? route?.endStopName ?? row?.destination ?? row?.endPoint ?? "Destination",
        busId: row?.busId ?? bus?.busId ?? bus?.id ?? null,
        busNumber: row?.busNumber ?? bus?.busNumber ?? bus?.registrationNumber ?? row?.registrationNumber ?? "Bus details unavailable",
        driverId: row?.driverId ?? driver?.driverId ?? driver?.id ?? null,
        driverName: row?.driverName ?? driver?.fullName ?? driver?.name ?? [driver?.firstName, driver?.lastName].filter(Boolean).join(" ") ?? row?.driverFirstName ?? "Driver not assigned",
        scheduledStartTime: status === "ACTIVE" ? resolvedScheduledStart : (regular ? scheduleStart : resolvedScheduledStart),
        scheduledEndTime: status === "ACTIVE" ? resolvedScheduledEnd : (regular ? scheduleEnd : resolvedScheduledEnd),
        scheduledTripStartTime: scheduledStart,
        operatingDays,
        status,
        scheduleStatus: row?.scheduleStatus ?? null,
        frequencyLabel: regular ? (operatingDays.length ? formatOperatingDays(operatingDays) : "Daily") : "One-time",
        serviceDate: row?.serviceDate ?? row?.date ?? (scheduledStart && String(scheduledStart).includes("T") ? String(scheduledStart).slice(0, 10) : null),
        raw: row,
    };
}

function formatOperatingDays(days) {
    const normalized = days.map((day) => String(day).toUpperCase());
    if (normalized.length === 7) return "Daily";
    if (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].every((day) => normalized.includes(day))) return "Weekdays";
    if (["SATURDAY", "SUNDAY"].every((day) => normalized.includes(day))) return "Weekends";
    return normalized.map((day) => day.slice(0, 3)).join(", ");
}

function normalizeTime(value) {
    if (!value) return null;
    const text = String(value);
    const match = text.match(/(\d{1,2}:\d{2})(?::\d{2})?/);
    return match?.[1] ?? null;
}

function parseTimeMinutes(value) {
    const time = normalizeTime(value);
    if (!time) return Number.MAX_SAFE_INTEGER;
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
}

function dayName(date) {
    return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][date.getDay()];
}

function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function expandSchedule(row) {
    const normalized = normalizeTripCard({ ...row, tripScheduleId: row?.tripScheduleId ?? row?.id, status: "SCHEDULED" }, { fallbackStatus: "SCHEDULED" });
    const status = String(row?.scheduleStatus ?? "ACTIVE").toUpperCase();
    if (["INACTIVE", "CANCELLED", "COMPLETED", "DISABLED"].includes(status)) return [];

    const days = (Array.isArray(row?.operatingDays) ? row.operatingDays : []).map((day) => String(day).toUpperCase());
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const todayName = dayName(now);
    const tomorrowName = dayName(tomorrow);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseTimeMinutes(row?.scheduledTripScheduleStartTime ?? row?.scheduledStartTime ?? row?.scheduledStart);
    const result = [];

    const hasToday = days.includes(todayName) && startMinutes >= currentMinutes;
    const hasTomorrow = days.includes(tomorrowName);
    if (hasToday) result.push({ ...normalized, id: `schedule-${row.id ?? row.tripScheduleId}-${dateKey(now)}`, tripId: null, serviceDate: dateKey(now), dayGroup: "Today" });
    if (hasTomorrow) result.push({ ...normalized, id: `schedule-${row.id ?? row.tripScheduleId}-${dateKey(tomorrow)}`, tripId: null, serviceDate: dateKey(tomorrow), dayGroup: "Tomorrow" });
    return result;
}

function sortLiveTrips(trips) {
    return [...trips].sort((a, b) => String(a.routePatternCode).localeCompare(String(b.routePatternCode)));
}

function sortUpcomingTrips(trips) {
    return [...trips].sort((a, b) => {
        const dayCompare = String(a.serviceDate ?? "").localeCompare(String(b.serviceDate ?? ""));
        if (dayCompare) return dayCompare;
        return parseTimeMinutes(a.scheduledStartTime) - parseTimeMinutes(b.scheduledStartTime);
    });
}

export async function searchPassengerTrips({
    accessType,
    transportSystemId,
    filters = {},
    page = 0,
    size = DEFAULT_PAGE_SIZE,
}) {
    const isPublic = String(accessType).toUpperCase() === "PUBLIC";
    const path = isPublic ? "/passengers/public/search" : "/passengers/search";

    // Search filters and pagination are query parameters on both search endpoints.
    // Keep page/size explicit so the backend can bind Pageable alongside the filter DTO.
    const params = Object.fromEntries(
        Object.entries({ ...filters, page, size }).filter(
            ([, value]) => value !== null && value !== undefined && value !== ""
        )
    );

    const response = await apiClient.get(
        path,
        transportRequestConfig(accessType, transportSystemId, params)
    );
    const body = unwrap(response.data);
    return readPage(body, "passenger search", page, size).items.map((row) =>
        normalizeTripCard(row, { fallbackStatus: row?.status ?? "SCHEDULED" })
    );
}

export async function getPassengerFilterOptions({ accessType, transportSystemId }) {
    const isPublic = String(accessType).toUpperCase() === "PUBLIC";
    const path = isPublic
        ? "/trips/passenger/filter-options/public"
        : "/trips/passenger/filter-options";
    const response = await apiClient.get(
        path,
        transportRequestConfig(accessType, transportSystemId)
    );
    const body = unwrap(response.data) ?? {};
    const routes = Array.isArray(body.routes) ? body.routes : [];
    const stops = Array.isArray(body.stops) ? body.stops : [];

    return {
        routes: routes.map((route) => ({
            id: route.routeId,
            name: route.routeName,
            routeId: route.routeId,
            routeName: route.routeName,
        })),
        stops: stops.map((stop) => ({
            id: stop.stopId,
            name: stop.stopName,
            stopId: stop.stopId,
            stopName: stop.stopName,
        })),
    };
}


function normalizeObject(data) {
    const body = unwrap(data);
    if (body && typeof body === "object" && !Array.isArray(body)) {
        return body.trip ?? body.schedule ?? body.result ?? body;
    }
    return body;
}

function normalizeCollection(data) {
    const body = unwrap(data);
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.content)) return body.content;
    if (Array.isArray(body?.items)) return body.items;
    if (Array.isArray(body?.stops)) return body.stops;
    if (Array.isArray(body?.routeStops)) return body.routeStops;
    if (Array.isArray(body?.results)) return body.results;
    return [];
}

export async function getPassengerTripDetails({ accessType, transportSystemId, id, isSchedule = false }) {
    const isPublic = String(accessType).toUpperCase() === "PUBLIC";
    const path = isSchedule
        ? (isPublic ? `/trip-schedules/public/${id}` : `/trip-schedules/${id}`)
        : (isPublic ? `/trips/public/${id}` : `/trips/${id}`);
    const response = await apiClient.get(path, transportRequestConfig(accessType, transportSystemId));
    return normalizeObject(response.data);
}

export async function getPassengerTripStops({ accessType, transportSystemId, tripId }) {
    const isPublic = String(accessType).toUpperCase() === "PUBLIC";
    const path = isPublic ? `/trips/${tripId}/stops/public` : `/trips/${tripId}/stops`;
    const response = await apiClient.get(path, transportRequestConfig(accessType, transportSystemId));
    return normalizeCollection(response.data);
}

export async function getPassengerLiveLocation({ accessType, transportSystemId, tripId }) {
    const isPublic = String(accessType).toUpperCase() === "PUBLIC";
    const path = isPublic
        ? `/trips/${encodeURIComponent(tripId)}/live-location/public`
        : `/trips/${encodeURIComponent(tripId)}/live-location`;
    // Public tracking omits Authorization but still sends X-Transport-System.
    // Private tracking uses the authenticated transport-member token.
    const response = await apiClient.get(path, transportRequestConfig(accessType, transportSystemId));
    return normalizeObject(response.data);
}
