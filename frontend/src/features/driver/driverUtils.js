export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
    return error?.response?.data?.msg
        || error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || fallback;
}

export function normalizeDriverTrip(row = {}) {
    const id = row.tripId ?? row.id ?? null;
    const tripScheduleId = row.tripScheduleId ?? null;
    const scheduledStartTime = row.scheduledTripStartTime ?? row.scheduledStartTime ?? row.scheduledStart ?? null;
    const scheduledEndTime = row.scheduledTripEndTime ?? row.scheduledEndTime ?? row.scheduledEnd ?? null;
    const scheduleStartTime = row.scheduledTripScheduleStartTime ?? row.scheduleStartTime ?? null;
    const scheduleEndTime = row.scheduledTripScheduleEndTime ?? row.scheduleEndTime ?? null;
    const status = String(row.status ?? row.tripStatus ?? (tripScheduleId != null ? "SCHEDULED" : "SCHEDULED")).toUpperCase();
    const operatingDays = Array.isArray(row.operatingDays) ? row.operatingDays : [];
    const tripTypeRaw = String(row.tripType ?? (tripScheduleId == null ? "ONE_TIME" : "REGULAR")).toUpperCase();
    const isRegular = tripScheduleId != null || tripTypeRaw.includes("REGULAR") || tripTypeRaw.includes("DAILY") || tripTypeRaw.includes("SCHEDULE");

    return {
        ...row,
        id,
        tripId: id,
        tripScheduleId,
        tripType: tripTypeRaw,
        isRegular,
        routePatternName: row.routePatternName ?? row.patternName ?? row.routeName ?? "Route details unavailable",
        routePatternCode: row.routePatternCode ?? row.patternCode ?? row.routeCode ?? "",
        originStopName: row.originStopName ?? row.originName ?? row.origin ?? "Origin",
        destinationStopName: row.destinationStopName ?? row.destinationName ?? row.destination ?? "Destination",
        busNumber: row.busNumber ?? row.registrationNumber ?? "Bus not assigned",
        driverName: row.driverName ?? "Driver",
        scheduledStartTime,
        scheduledEndTime,
        scheduleStartTime,
        scheduleEndTime,
        actualStartTime: row.actualStartTime ?? null,
        actualEndTime: row.actualEndTime ?? null,
        distanceKm: row.distanceKm ?? null,
        status,
        operatingDays,
        serviceDate: row.serviceDate ?? row.date ?? (scheduledStartTime ? String(scheduledStartTime).slice(0, 10) : null),
    };
}

export function unwrapEntity(value) {
    let data = value;
    for (let index = 0; index < 3 && data?.data != null; index += 1) data = data.data;
    if (data && typeof data === "object" && !Array.isArray(data)) return data.trip ?? data.currentTrip ?? data.driver ?? data.profile ?? data.result ?? data;
    return data;
}

export function normalizeStops(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((stop, index) => ({
        ...stop,
        // The API's `id` is PatternStop.id; `stopId` identifies the physical Stop.
        patternStopId: stop.patternStopId ?? stop.id,
        _name: stop.stopName ?? stop.name ?? stop.stop?.name ?? `Stop ${index + 1}`,
        _sequence: Number(stop.sequence ?? stop.stopSequence ?? index + 1),
    })).sort((a, b) => a._sequence - b._sequence);
}

export function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTime(value, fallback = "Time unavailable") {
    const date = parseDate(value);
    if (date) return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).format(date);
    if (value && typeof value === "string") {
        const match = value.match(/(?:T)?(\d{1,2}):(\d{2})/);
        if (match) {
            const hour = Number(match[1]);
            const minute = match[2];
            const suffix = hour >= 12 ? "PM" : "AM";
            return `${hour % 12 || 12}:${minute} ${suffix}`;
        }
    }
    return fallback;
}

export function formatDateLabel(value, fallback = "Date pending") {
    const date = parseDate(value);
    if (!date) return fallback;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const delta = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (delta === 0) return "Today";
    if (delta === 1) return "Tomorrow";
    if (delta === -1) return "Yesterday";
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatLongDate(value, fallback = "Date unavailable") {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date) : fallback;
}

export function formatDistance(value) {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    return `${Number(value).toFixed(1)} km`;
}

export function initialsFromName(name = "Driver") {
    return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "DR";
}

export function statusLabel(status) {
    const value = String(status ?? "AVAILABLE").toUpperCase();
    if (value === "ON_TRIP" || value === "ACTIVE") return "On trip";
    if (value === "NOT_AVAILABLE" || value === "UNAVAILABLE") return "Not available";
    return "Available";
}

export function getServiceDate(trip) {
    const preferred = trip.scheduledStartTime ?? trip.scheduledTripStartTime ?? trip.serviceDate;
    if (preferred) return String(preferred).slice(0, 10);
    const time = trip.scheduleStartTime;
    if (!time) return null;
    const [hours, minutes] = String(time).split(":").map(Number);
    const today = new Date();
    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const operatingDays = trip.operatingDays.map((day) => String(day).toUpperCase());
    for (let offset = 0; offset <= 7; offset += 1) {
        const candidate = new Date(today);
        candidate.setDate(today.getDate() + offset);
        candidate.setHours(hours || 0, minutes || 0, 0, 0);
        if (operatingDays.length && !operatingDays.includes(dayNames[candidate.getDay()])) continue;
        if (candidate.getTime() >= Date.now()) {
            return `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, "0")}-${String(candidate.getDate()).padStart(2, "0")}`;
        }
    }
    return null;
}

export function getScheduledStartDateTime(trip) {
    const actual = parseDate(trip.scheduledStartTime ?? trip.scheduledTripStartTime);
    if (actual) return actual;
    const dateKey = getServiceDate(trip);
    const time = trip.scheduleStartTime;
    if (!dateKey || !time) return null;
    const hm = String(time).match(/^(\d{1,2}):(\d{2})/);
    if (!hm) return null;
    const date = new Date(`${dateKey}T${String(Number(hm[1])).padStart(2, "0")}:${hm[2]}:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function getTripKey(trip) {
    return trip.tripId != null ? `trip-${trip.tripId}` : `schedule-${trip.tripScheduleId ?? trip.id}-${getServiceDate(trip) ?? "upcoming"}`;
}
