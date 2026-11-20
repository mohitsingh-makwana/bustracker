import Icon from "../../../components/common/Icon";

function formatTime(value) {
    if (!value) return "Time not available";
    const text = String(value);
    const match = text.match(/(?:T)?(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (!match) return text;
    let hour = Number(match[1]);
    const minute = match[2];
    const suffix = hour >= 12 ? "PM" : "AM";
    hour %= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${suffix}`;
}

function routeLabel(trip) {
    return String(trip.routeName ?? "Route details unavailable").trim();
}

export function formatTripTime(value) {
    return formatTime(value);
}

export default function PassengerTripCard({ trip, live = false, onOpen, onTrack }) {
    return (
        <article className={`passenger-trip-card ${live ? "passenger-trip-card--live" : ""}`}>
            <button type="button" className="passenger-trip-card__main" onClick={() => onOpen?.(trip)} aria-label={`Open trip ${trip.routePatternName || trip.routeName || routeLabel(trip)}`}>
                <div className="passenger-trip-card__topline">
                    <span className="passenger-route-code">{routeLabel(trip)}</span>
                    <span className={`passenger-trip-status passenger-trip-status--${live ? "live" : "scheduled"}`}>
                        {live && <span className="passenger-status-dot" />}
                        {live ? "Live" : "Scheduled"}
                    </span>
                </div>
                <h3 className="passenger-trip-card__route">{trip.routePatternName || "Route pattern details unavailable"}</h3>
                <div className="passenger-trip-card__bus"><Icon name="bus" size={16} /><span>{trip.busNumber || "Bus details unavailable"}</span></div>
                <div className="passenger-trip-card__driver"><Icon name="user" size={15} /><span>{trip.driverName || "Driver not assigned"}</span></div>
                <div className="passenger-trip-card__meta">
                    <span className="passenger-frequency">{trip.frequencyLabel === "One-time" ? "One-time" : trip.frequencyLabel || "Daily"}</span>
                    <span className="passenger-trip-card__detail">{formatTime(trip.scheduledStartTime)}{trip.scheduledEndTime ? ` – ${formatTime(trip.scheduledEndTime)}` : ""}</span>
                    <Icon name="chevron-right" size={18} />
                </div>
            </button>
            {live && <button type="button" className="passenger-track-button" onClick={() => onTrack?.(trip)}><Icon name="navigation" size={15} />Track</button>}
        </article>
    );
}
