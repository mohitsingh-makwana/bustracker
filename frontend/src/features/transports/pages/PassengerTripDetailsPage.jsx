import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Icon from "../../../components/common/Icon";
import {
    getPassengerTripDetails,
    getPassengerTripStops,
} from "../services/passengerService";
import { formatTripTime } from "./PassengerTripCard";
import useLiveTrip from "../../tracking/hooks/useLiveTrip";
import PassengerLeafletTripMap from "./PassengerLeafletTripMap";
import "../../../styles/passenger-details.css";
import { formatStopArrivalTime } from "../../../utils/stopArrivalTime";

function firstValue(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== "");
}
function formatLiveDistance(meters) {
    if (meters === undefined || meters === null || !Number.isFinite(Number(meters))) return "—";
    const value = Number(meters);
    return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`;
}
function formatLiveSpeed(kmh) {
    if (kmh === undefined || kmh === null || kmh === "") return "---";
    const value = Number(kmh);
    return !Number.isFinite(value) ? "---" : `${Math.round(value)} km/h`;
}

function firstName(value) {
    const name = String(value ?? "Driver not assigned").trim();
    return name.split(/\s+/)[0] || "Driver not assigned";
}

function formatDate(value, fallback) {
    if (!value) return fallback;
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return fallback;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const delta = Math.round((target - today) / 86400000);
    if (delta === 0) return "Today";
    if (delta === 1) return "Tomorrow";
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function stopName(stop) {
    return firstValue(stop?.stopName, stop?.name, stop?.stop?.name, stop?.patternStop?.stop?.name, stop?.title, "Stop");
}


function stopSequence(stop, index) {
    const sequence = Number(firstValue(stop?.sequence, stop?.stopSequence, stop?.order, stop?.sequenceNumber, index + 1));
    return Number.isFinite(sequence) ? sequence : index + 1;
}

function normalizeStops(stops) {
    if (!Array.isArray(stops)) return [];
    return stops.map((stop, index) => ({ ...stop, _name: stopName(stop), _sequence: stopSequence(stop, index) }))
        .sort((a, b) => a._sequence - b._sequence);
}

function locationTimestamp(locationData) {
    const value = firstValue(locationData?.updatedAt, locationData?.lastUpdatedAt, locationData?.timestamp, locationData?.recordedAt, locationData?.createdAt);
    if (value === undefined) return null;
    const parsed = typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatUpdatedAt(locationData) {
    const time = locationTimestamp(locationData);
    if (!time) return "Live location received";
    const seconds = Math.max(0, Math.floor((Date.now() - time.getTime()) / 1000));
    if (seconds < 10) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    return `Updated ${minutes} min ago`;
}



function coordinatesOf(value) {
    const latitude = firstValue(value?.latitude, value?.lat, value?.currentLatitude, value?.currentLat, value?.lastLatitude, value?.location?.latitude, value?.position?.latitude);
    const longitude = firstValue(value?.longitude, value?.lng, value?.currentLongitude, value?.currentLng, value?.lastLongitude, value?.location?.longitude, value?.position?.longitude);
    if (latitude === undefined || longitude === undefined) return null;
    const lat = Number(latitude);
    const lng = Number(longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function hasCoordinates(data) {
    return coordinatesOf(data) !== null;
}

function coordinatesOfStop(stop) {
    return coordinatesOf({
        latitude: firstValue(stop?.latitude, stop?.lat, stop?.stopLatitude, stop?.stop?.latitude, stop?.stop?.lat, stop?.location?.latitude),
        longitude: firstValue(stop?.longitude, stop?.lng, stop?.stopLongitude, stop?.stop?.longitude, stop?.stop?.lng, stop?.location?.longitude),
    });
}

function TripRouteGraphic({ stops, hasLocation, locationData, locationLost, city = "City", origin = "Origin", destination = "Destination" }) {
    const [routeFocused, setRouteFocused] = useState(false);
    const [selectedStopIndex, setSelectedStopIndex] = useState(null);
    const labels = stops.length ? stops : [
        { _name: origin },
        { _name: destination },
    ];
    const stopCoordinates = labels.map((stop) => coordinatesOfStop(stop));
    const hasRouteCoordinates = stopCoordinates.length > 1 && stopCoordinates.every(Boolean);
    const bounds = hasRouteCoordinates ? {
        minLat: Math.min(...stopCoordinates.map((point) => point.lat)),
        maxLat: Math.max(...stopCoordinates.map((point) => point.lat)),
        minLng: Math.min(...stopCoordinates.map((point) => point.lng)),
        maxLng: Math.max(...stopCoordinates.map((point) => point.lng)),
    } : null;
    const project = (point) => {
        const lngRange = (bounds?.maxLng ?? 0) - (bounds?.minLng ?? 0) || 1;
        const latRange = (bounds?.maxLat ?? 0) - (bounds?.minLat ?? 0) || 1;
        const x = 28 + ((point.lng - bounds.minLng) / lngRange) * 304;
        const y = 26 + ((bounds.maxLat - point.lat) / latRange) * 208;
        return {
            x: Math.min(332, Math.max(28, x)),
            y: Math.min(234, Math.max(26, y)),
        };
    };
    const markers = labels.map((stop, index) => {
        const t = labels.length <= 1 ? 0 : index / (labels.length - 1);
        const projected = hasRouteCoordinates ? project(stopCoordinates[index]) : {
            x: 28 + t * 304,
            y: 228 - Math.sin(t * Math.PI) * 142 + Math.sin(t * Math.PI * 3) * 14,
        };
        return { ...stop, ...projected, number: index + 1 };
    });
    const routePoints = markers.map((marker) => `${marker.x},${marker.y}`).join(" ");
    const nextName = firstValue(locationData?.nextStopName, locationData?.nextStop?.name, locationData?.nextStop?.stopName, "");
    const gps = coordinatesOf(locationData);
    const busPosition = hasRouteCoordinates && gps ? project(gps) : null;
    const indoreLabels = String(city).toLowerCase().includes("indore");

    return (
        <div className={`passenger-map-scene ${locationLost ? "is-location-lost" : ""} ${routeFocused ? "is-route-focused" : ""}`} role="group" aria-label="Interactive trip route overview">
            <div className="passenger-map-neighborhood passenger-map-neighborhood--one">{indoreLabels ? "VIJAY NAGAR" : "NORTH AREA"}</div>
            <div className="passenger-map-neighborhood passenger-map-neighborhood--two">{indoreLabels ? "PALASIA" : "CENTRAL AREA"}</div>
            <div className="passenger-map-neighborhood passenger-map-neighborhood--three">{String(city || "City").toUpperCase()}</div>
            <div className="passenger-map-neighborhood passenger-map-neighborhood--four">{indoreLabels ? "MUSAKHEDI" : "SOUTH AREA"}</div>
            <svg className="passenger-map-svg" viewBox="0 0 360 260" role="img" aria-label="Route and stop sequence">
                <path className="passenger-map-road passenger-map-road--wide" d="M-20 28 72 75 128 60 192 91 230 45 390 79 M-15 204 71 163 113 188 190 151 237 187 378 141 M42 -12 71 66 54 113 105 170 91 279 M186 -15 164 54 207 117 188 186 227 273 M310 -14 276 61 299 126 267 176 293 274" />
                <path className="passenger-map-road" d="M-10 47 70 94 129 77 193 108 230 63 378 97 M-15 226 73 185 117 211 190 175 240 209 380 164 M26 -10 54 60 38 117 87 173 73 270 M166 -10 145 53 187 118 168 189 207 270 M333 -10 299 62 321 127 288 184 313 270 M-15 127 99 113 141 127 207 91 272 102 378 61" />
                <path className="passenger-map-river" d="M-15 251 C45 218 63 234 99 213 S160 220 199 226 270 204 375 231" />
                <polyline className="passenger-map-route-shadow" points={routePoints} />
                <polyline className="passenger-map-route-line" points={routePoints} />
                <polyline className="passenger-map-route-flow" points={routePoints} />
                {markers.map((marker, index) => {
                    const atEnd = index === 0 || index === markers.length - 1;
                    const labelOnLeft = marker.x > 242;
                    const isSelected = selectedStopIndex === index;
                    const isNext = String(marker._name).toLowerCase() === String(nextName).toLowerCase() && Boolean(nextName);
                    return <g
                        key={`${marker._name}-${index}`}
                        className={`passenger-map-stop-group ${isSelected ? "is-selected" : ""}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Show details for stop ${marker._name}`}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedStopIndex(isSelected ? null : index)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedStopIndex(isSelected ? null : index);
                            }
                        }}
                    >
                        <circle className={`passenger-map-stop ${atEnd ? "is-terminal" : ""} ${isNext ? "is-next" : ""} ${isSelected ? "is-selected" : ""}`} cx={marker.x} cy={marker.y} r={isSelected ? 12 : (atEnd ? 10 : 9)} />
                        {!atEnd && <text className="passenger-map-stop-number" x={marker.x} y={marker.y + 3.5}>{index + 1}</text>}
                        <text className={`passenger-map-stop-label ${labelOnLeft ? "is-left" : ""}`} x={marker.x + (labelOnLeft ? -14 : 14)} y={marker.y + 4} textAnchor={labelOnLeft ? "end" : "start"}>{marker._name}</text>
                    </g>;
                })}
                {busPosition && <g className={`passenger-map-bus-marker ${locationLost ? "is-stale" : ""}`} transform={`translate(${busPosition.x} ${busPosition.y})`}>
                    <circle className="passenger-map-bus-pulse" r="26" />
                    <circle r="20" />
                    <rect x="-9" y="-12" width="18" height="23" rx="5" />
                    <path d="M-6 -7h12v6H-6zM-6 3h12" />
                    <circle cx="-5" cy="7" r="1.8" /><circle cx="5" cy="7" r="1.8" />
                </g>}
            </svg>
            {selectedStopIndex !== null && markers[selectedStopIndex] && <div className="passenger-map-selected-stop" role="status" aria-live="polite">
                <span>STOP {selectedStopIndex + 1}</span>
                <strong>{markers[selectedStopIndex]._name}</strong>
                <button type="button" aria-label="Close stop details" onClick={() => setSelectedStopIndex(null)}><Icon name="x" size={15} /></button>
            </div>}
            <div className={`passenger-map-origin-pill ${locationLost ? "is-muted" : ""}`}><span />{locationLost ? "Route overview" : hasLocation ? "Live route" : "Route overview"}</div>
            <button type="button" className={`passenger-map-recenter ${routeFocused ? "is-active" : ""}`} aria-label={routeFocused ? "Show full route" : "Focus route"} aria-pressed={routeFocused} title={routeFocused ? "Show full route" : "Focus route"} onClick={() => { setRouteFocused((focused) => !focused); setSelectedStopIndex(null); }}><Icon name="target" size={21} /></button>
        </div>
    );
}

function StopTimeline({ stops, live, locationData, trip }) {
    const values = stops.length ? stops : [
        { _name: firstValue(trip.originStopName, trip.origin?.name, trip.startStopName, "Origin") },
        { _name: firstValue(trip.destinationStopName, trip.destination?.name, trip.endStopName, "Destination") },
    ];
    const nextName = firstValue(locationData?.nextStopName, locationData?.nextStop?.name, locationData?.nextStop?.stopName, "");
    const nextIndex = values.findIndex((stop) => stop._name.toLowerCase() === String(nextName).toLowerCase());

    return <div className={`passenger-details-timeline ${live ? "is-live" : ""}`}>
        {values.map((stop, index) => {
            const passed = live && nextIndex >= 0 && index < nextIndex;
            const current = live && ((nextIndex >= 0 && index === nextIndex) || (nextIndex < 0 && index === 0));
            return <div className={`passenger-timeline-stop ${passed ? "is-passed" : ""} ${current ? "is-current" : ""}`} key={`${stop._name}-${index}`}>
                <div className="passenger-timeline-track"><span className="passenger-timeline-node">{passed ? <Icon name="check" size={13} /> : null}</span>{index !== values.length - 1 && <span className="passenger-timeline-line" />}</div>
                <div className="passenger-timeline-label"><strong>{stop._name}</strong>{index === 0 && <span className="passenger-stop-kind passenger-stop-kind--start">Start</span>}{index === values.length - 1 && <span className="passenger-stop-kind passenger-stop-kind--destination">Destination</span>}{current && live && <span className="passenger-stop-kind passenger-stop-kind--current">Next</span>}
                    <b className={`passenger-timeline-arrival-time ${stop.stopArrivalTime ? "" : "is-missing"}`}>{formatStopArrivalTime(stop.stopArrivalTime)}</b>
                </div>
            </div>;
        })}
        {!stops.length && <p className="passenger-stops-note">Detailed intermediate stops are not available from the current trip response.</p>}
    </div>;
}

function TripNotStarted({ trip, onCheckAgain, checking, onBack }) {
    const start = firstValue(trip.scheduledStartTime, trip.scheduledTripStartTime);
    return <div className="passenger-prestart-state">
        <div className="passenger-prestart-illustration" aria-hidden="true">
            <span className="passenger-prestart-cloud passenger-prestart-cloud--one" />
            <span className="passenger-prestart-cloud passenger-prestart-cloud--two" />
            <svg viewBox="0 0 220 135" role="img" aria-label="Bus waiting for its scheduled departure">
                <circle className="passenger-prestart-clock" cx="158" cy="43" r="26" /><path className="passenger-prestart-clock-hand" d="M158 29v15l11 7" />
                <path className="passenger-prestart-ground" d="M23 114h174" />
                <g className="passenger-prestart-bus" transform="translate(49 30)">
                    <rect x="0" y="5" width="95" height="78" rx="15" />
                    <rect className="bus-window" x="11" y="18" width="73" height="31" rx="7" />
                    <rect className="bus-window-shine" x="18" y="23" width="22" height="4" rx="2" />
                    <rect x="13" y="55" width="69" height="5" rx="2.5" />
                    <rect x="16" y="67" width="12" height="7" rx="2" /><rect x="67" y="67" width="12" height="7" rx="2" />
                    <circle cx="19" cy="82" r="9" /><circle cx="77" cy="82" r="9" />
                </g>
            </svg>
        </div>
        <h2>This trip hasn’t started yet</h2>
        <p>The bus will start from {firstValue(trip.originStopName, "its first stop")} {start ? `at ${formatTripTime(start)}` : "at its scheduled time"}{trip.serviceDate ? ` ${formatDate(trip.serviceDate, "")}`.trim() : ""}.</p>
        <div className="passenger-prestart-info">
            <div><Icon name="calendar-clock" size={21} /><span><small>Start time</small><strong>{start ? formatTripTime(start) : "Not available"}</strong></span></div>
            <div><Icon name="calendar" size={21} /><span><small>Date</small><strong>{formatDate(trip.serviceDate, trip.dayGroup ?? "Scheduled")}</strong></span></div>
        </div>
        <button type="button" className="passenger-details-primary" disabled={checking} onClick={onCheckAgain}><Icon name="refresh" size={18} />{checking ? "Checking…" : "Check again"}</button>
        <button type="button" className="passenger-details-link" onClick={onBack}>Back to trips</button>
    </div>;
}

export default function PassengerTripDetailsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { tripId: routeTripId } = useParams();
    const { isMemberAuthenticated, transportSystemId: memberSystemId, publicTransportSystemId } = useAuth();
    const initialTrip = location.state?.trip ?? null;
    const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const accessType = location.state?.accessType ?? query.get("access") ?? ((location.state?.memberMode ?? isMemberAuthenticated) ? "PRIVATE" : "PUBLIC");
    const transportSystemId = firstValue(location.state?.transportSystemId, location.state?.system?.id, query.get("system") ? Number(query.get("system")) : undefined, memberSystemId, publicTransportSystemId);
    const isSchedule = location.state?.isSchedule ?? query.get("type") === "schedule";
    const initialStatus = String(initialTrip?.status ?? initialTrip?.tripStatus ?? "").toUpperCase();
    const terminalTripStatuses = ["COMPLETED", "TERMINATED", "CANCELLED", "CANCELED"];
    // A terminal trip still needs the live-tracking screen when opened from a bus being tracked.
    const isLive = location.state?.isLive ?? (query.get("mode") === "live" || ["ACTIVE", "IN_PROGRESS", ...terminalTripStatuses].includes(initialStatus));
    const entityId = isSchedule ? firstValue(initialTrip?.tripScheduleId, routeTripId) : firstValue(initialTrip?.tripId, routeTripId);

    const [trip, setTrip] = useState(initialTrip ?? {});
    const [stops, setStops] = useState([]);
    const [liveLocation, setLiveLocation] = useState(null);
    const [loading, setLoading] = useState(!initialTrip);
    const [checking, setChecking] = useState(false);
    const [detailError, setDetailError] = useState("");
    const [locationError, setLocationError] = useState("");
    const [lastUpdated, setLastUpdated] = useState("");
    const liveTracking = useLiveTrip(entityId, { accessType, transportSystemId, enabled: isLive && !isSchedule });

    const loadDetails = useCallback(async ({ quiet = false } = {}) => {
        if (!entityId || transportSystemId == null) {
            if (!initialTrip) setDetailError("Trip details are missing. Return to the selected transport system and open this trip again.");
            setLoading(false);
            return;
        }
        if (!quiet) setLoading(true);
        setDetailError("");
        const tasks = [getPassengerTripDetails({ accessType, transportSystemId, id: entityId, isSchedule })];
        const canFetchStops = !isSchedule && entityId != null;
        const results = await Promise.allSettled([
            ...tasks,
            ...(canFetchStops ? [getPassengerTripStops({ accessType, transportSystemId, tripId: entityId })] : []),
        ]);
        const detailResult = results[0];
        let detailStops = [];
        if (detailResult.status === "fulfilled") {
            const apiTrip = detailResult.value ?? {};
            const detailStopCandidates = [apiTrip.stops, apiTrip.routeStops, apiTrip.patternStops, apiTrip.routePattern?.stops, apiTrip.routePattern?.patternStops];
            detailStops = detailStopCandidates.find((candidate) => Array.isArray(candidate) && candidate.length > 0) ?? [];
            if (Array.isArray(detailStops)) setStops(normalizeStops(detailStops));
            setTrip((current) => ({ ...current, ...apiTrip, id: apiTrip.id ?? current.id ?? entityId }));
        } else if (!initialTrip) {
            setDetailError(detailResult.reason?.response?.data?.message ?? detailResult.reason?.response?.data?.msg ?? "Couldn't load trip details. Please try again.");
        }

        let resultIndex = 1;
        if (canFetchStops) {
            const stopsResult = results[resultIndex++];
            if (stopsResult.status === "fulfilled" && stopsResult.value.length) setStops(normalizeStops(stopsResult.value));
            else setStops(normalizeStops(Array.isArray(detailStops) ? detailStops : []));
        } else if (!isSchedule) {
            setStops(normalizeStops(Array.isArray(detailStops) ? detailStops : []));
        }

        setLoading(false);
        setChecking(false);
    }, [entityId, transportSystemId, initialTrip, accessType, isSchedule, isLive]);

    useEffect(() => { loadDetails(); }, [loadDetails]);

    useEffect(() => {
        if (!isLive || isSchedule) {
            setLiveLocation(null);
            setLocationError("");
            return;
        }
        const locationData = liveTracking.location;
        if (locationData && hasCoordinates(locationData)) {
            setLiveLocation(locationData);
            setLastUpdated(formatUpdatedAt(locationData));
            setLocationError(liveTracking.stale ? "Location updates are delayed." : liveTracking.error || "");
        } else if (liveTracking.error) {
            setLocationError(liveTracking.error);
        }
    }, [isLive, isSchedule, liveTracking.location, liveTracking.stale, liveTracking.error]);

    const normalizedStops = useMemo(() => normalizeStops(stops), [stops]);
    const routeName = firstValue(trip.routePatternName, trip.patternName, trip.routeName, "Trip details");
    const systemCity = firstValue(location.state?.system?.city, trip.transportSystemCity, trip.transportSystem?.city, "City");
    const origin = firstValue(trip.originStopName, trip.origin?.name, trip.startStopName, normalizedStops[0]?._name, "Origin");
    const destination = firstValue(trip.destinationStopName, trip.destination?.name, trip.endStopName, normalizedStops.at(-1)?._name, "Destination");
    const startTime = firstValue(trip.scheduledStartTime, trip.scheduledTripStartTime, trip.scheduledTripScheduleStartTime);
    const endTime = firstValue(trip.scheduledEndTime, trip.scheduledTripEndTime, trip.scheduledTripScheduleEndTime);
    const busNumber = firstValue(trip.busNumber, trip.bus?.busNumber, trip.registrationNumber, "Bus details unavailable");
    const driverName = firstValue(trip.driverName, trip.driver?.fullName, trip.driver?.name, "Driver not assigned");
    const routeCode = firstValue(trip.routePatternCode, trip.patternCode, trip.routeCode, "Route");
    const status = String(firstValue(trip.status, trip.tripStatus, isLive ? "ACTIVE" : "SCHEDULED")).toUpperCase();
    const isFinishedLiveTrip = isLive && terminalTripStatuses.includes(status);
    const endedEarly = ["TERMINATED", "CANCELLED", "CANCELED"].includes(status);
    const scheduledAndNotStarted = isLive && !["ACTIVE", "IN_PROGRESS", "COMPLETED", "TERMINATED", "CANCELLED", "CANCELED"].includes(status) && !loading;
    const locationLost = isLive && (Boolean(locationError) || !liveLocation || !hasCoordinates(liveLocation));
    const hasLocation = Boolean(liveLocation && hasCoordinates(liveLocation));
    const nextStopName = firstValue(liveLocation?.nextStopName, liveLocation?.nextStop?.name, liveLocation?.nextStop?.stopName, "");
    const nextStopDistance = firstValue(liveLocation?.nextStopDistanceMeters, liveLocation?.distanceToNextStopMeters, null);
    const remainingDistance = firstValue(liveLocation?.remainingDistanceMeters, null);

    const backToTrips = () => navigate(-1);
    if (scheduledAndNotStarted) {
        return <main className="passenger-page passenger-detail-page"><div className="passenger-detail-shell">
            <header className="passenger-detail-topbar"><button type="button" className="passenger-back-button" onClick={backToTrips} aria-label="Back"><Icon name="arrow-left" size={22} /></button><h1>Trip details</h1></header>
            <section className="passenger-prestart-map-wrap">
                <TripRouteGraphic stops={normalizedStops} hasLocation={false} locationData={null} locationLost={true} city={systemCity} origin={origin} destination={destination} />
            </section>
            <section className="passenger-prestart-sheet">
                <div className="passenger-details-sheet-handle" />
                <TripNotStarted trip={{ ...trip, originStopName: origin, scheduledStartTime: startTime }} onCheckAgain={() => { setChecking(true); loadDetails(); }} checking={checking || loading} onBack={backToTrips} />
            </section>
        </div></main>;
    }

    return <main className="passenger-page passenger-detail-page">
        <div className="passenger-detail-shell">
            <header className="passenger-detail-topbar"><button type="button" className="passenger-back-button" onClick={backToTrips} aria-label="Back"><Icon name="arrow-left" size={22} /></button><h1>Trip details</h1>{isLive && <span className="passenger-detail-topbar-live"><span />Live</span>}</header>
            {detailError && <div className="passenger-detail-error" role="alert"><Icon name="alert" size={17} /><span>{detailError}</span><button type="button" onClick={() => loadDetails()}>Try again</button></div>}
            {isFinishedLiveTrip ? <>
                <section className="passenger-live-map-wrap passenger-finished-map-wrap">
                    <PassengerLeafletTripMap stops={normalizedStops} locationData={liveLocation} routeGeometry={liveLocation?.routeGeometry ?? trip?.routeGeometry} locationLost={!hasLocation} nextStopName={nextStopName} finished height={320} />
                </section>
                <section className="passenger-detail-content passenger-live-content passenger-trip-finished" role="status" aria-live="polite">
                    <div className={`passenger-trip-finished-icon ${endedEarly ? "is-ended-early" : "is-completed"}`}><Icon name={endedEarly ? "alert-triangle" : "check-circle"} size={30} /></div>
                    <span className={`passenger-trip-finished-eyebrow ${endedEarly ? "is-ended-early" : "is-completed"}`}>{endedEarly ? "TRIP ENDED EARLY" : "TRIP COMPLETED"}</span>
                    <h2>{endedEarly ? "Trip ended early" : "Your trip is complete"}</h2>
                    <p>{endedEarly ? "The driver ended this trip before reaching the planned destination. Live tracking has stopped." : "The driver has completed this trip and the bus is no longer being tracked live."}</p>
                    <div className="passenger-trip-finished-route"><span className="passenger-finished-route-point" /><strong>{origin}</strong><span className="passenger-finished-route-line" /><span className="passenger-finished-route-point is-destination" /><strong>{destination}</strong></div>
                    <div className="passenger-trip-finished-note"><Icon name={endedEarly ? "info" : "check-circle"} size={17} /><span>{endedEarly ? "The planned destination was not reached. Please check the trip list for other available buses." : "Thanks for riding with BusTrackr. You can return to trips to track another bus."}</span></div>
                    <button type="button" className="passenger-details-secondary" onClick={backToTrips}><Icon name="arrow-left" size={17} /> Back to trips</button>
                </section>
            </> : isLive ? <>
                <section className="passenger-live-map-wrap">
                    <PassengerLeafletTripMap stops={normalizedStops} locationData={liveLocation} routeGeometry={liveLocation?.routeGeometry ?? trip?.routeGeometry} locationLost={locationLost} nextStopName={nextStopName} height={400} showStatus={false} />
                    <div className={`passenger-live-banner ${locationLost ? "is-lost" : ""}`} role="status" aria-live="polite">
                        <span className="passenger-live-banner-symbol"><Icon name={locationLost ? "alert" : "activity"} size={16} /></span>
                        <span className="passenger-live-banner-copy"><strong>{locationLost ? "Location lost" : "Live tracking"}</strong><small>{locationLost ? (String(accessType).toUpperCase() === "PUBLIC" ? "Live GPS isn't available for this public system yet." : (lastUpdated || "Latest position unavailable")) : (lastUpdated || "Live position received")}</small></span>
                        {locationLost && <button type="button" className="passenger-live-banner-retry" disabled={checking || loading} onClick={() => { setChecking(true); loadDetails(); }}><Icon name="refresh" size={14} />{checking || loading ? "Checking" : "Retry"}</button>}
                    </div>
                </section>
                <section className="passenger-detail-content passenger-live-content">
                    <div className="passenger-detail-route-heading"><h2>{origin} <span>→</span> {destination}</h2><div className="passenger-detail-badges"><span className="passenger-trip-status passenger-trip-status--live"><span className="passenger-status-dot" />Live</span><span className="passenger-frequency">{trip.frequencyLabel || (trip.tripType === "SINGLE" ? "One-time" : "Trip")}</span></div></div>
                    <div className="passenger-live-summary-grid">
                        <article className="passenger-live-summary-card"><span className="passenger-summary-icon"><Icon name="pin" size={25} /></span><div><small>Next stop</small><strong>{nextStopName || "Awaiting location"}</strong><p>{nextStopDistance != null ? `${formatLiveDistance(nextStopDistance)} away` : "Distance unavailable"}</p></div></article>
                        <article className="passenger-live-summary-card"><span className="passenger-summary-icon"><Icon name="flag" size={25} /></span><div><small>Destination</small><strong>{destination}</strong><p>{remainingDistance != null ? `${formatLiveDistance(remainingDistance)} remaining` : "Distance unavailable"}</p></div></article>
                    </div>
                    <div className="passenger-detail-info-card"><div className="passenger-detail-info-item"><Icon name="bus" size={24} /><span><small>Bus number</small><strong>{busNumber}</strong></span></div><div className="passenger-detail-info-item"><Icon name="user" size={24} /><span><small>Driver</small><strong>{firstName(driverName)}</strong></span></div></div>
                    <section className="passenger-stops-section"><h2>Stops</h2><StopTimeline stops={normalizedStops} live locationData={liveLocation} trip={{ ...trip, originStopName: origin, destinationStopName: destination, scheduledStartTime: startTime, scheduledEndTime: endTime }} /></section>
                    {locationLost && <p className="passenger-live-help">The route is still shown, but a current GPS fix is unavailable. Try refreshing in a moment.</p>}
                    {!locationLost && hasLocation && normalizedStops.length > 1 && !normalizedStops.every((stop) => coordinatesOfStop(stop)) && <p className="passenger-live-help">Live GPS was received. Stop coordinates are needed to place the bus precisely on the route map.</p>}
                    <button type="button" className="passenger-details-secondary" onClick={() => { setChecking(true); loadDetails(); }} disabled={checking || loading}><Icon name="refresh" size={17} />{checking || loading ? "Refreshing…" : "Refresh location"}</button>
                </section>
            </> : <section className="passenger-detail-content passenger-scheduled-content">
                <article className="passenger-scheduled-hero-card">
                    <div><h2>{origin} <span>→</span> {destination}</h2><div className="passenger-detail-badges"><span className="passenger-trip-status passenger-trip-status--scheduled">Scheduled</span><span className="passenger-frequency">{trip.frequencyLabel || (isSchedule ? "Daily" : "One-time")}</span></div></div>
                    <div className="passenger-scheduled-times"><div><small>Start time</small><strong>{startTime ? formatTripTime(startTime) : "Not available"}</strong></div><div><small>End time</small><strong>{endTime ? formatTripTime(endTime) : "Not available"}</strong></div></div>
                    <div className="passenger-scheduled-date"><Icon name="calendar" size={17} />{formatDate(trip.serviceDate ?? trip.scheduledTripStartTime, trip.dayGroup ?? "Date not available")}</div>
                    {routeName !== "Trip details" && <p className="passenger-scheduled-pattern">{routeName}</p>}
                </article>
                <article className="passenger-detail-info-card passenger-scheduled-info-card"><div className="passenger-detail-info-item"><Icon name="bus" size={24} /><span><small>Bus number</small><strong>{busNumber}</strong></span></div><div className="passenger-detail-info-item"><Icon name="user" size={24} /><span><small>Driver</small><strong>{firstName(driverName)}</strong></span></div><div className="passenger-detail-info-item"><Icon name="route" size={24} /><span><small>Route</small><strong>{routeCode}</strong></span></div></article>
                <section className="passenger-stops-section"><h2>Stops</h2><StopTimeline stops={normalizedStops} trip={{ ...trip, originStopName: origin, destinationStopName: destination, scheduledStartTime: startTime, scheduledEndTime: endTime }} /></section>
                <div className="passenger-tracking-disabled"><Icon name="lock" size={16} />Tracking starts when the trip begins</div>
                {loading && <p className="passenger-detail-loading">Refreshing trip details…</p>}
            </section>}
        </div>
    </main>;
}
