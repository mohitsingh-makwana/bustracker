import { useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "../../../components/common/BrandLogo";
import Icon from "../../../components/common/Icon";
import completedArt from "../../../assets/bustrackr/trip-completed-art.png";
import { handleIllustrationError } from "../../../components/common/imageFallback";
import { formatDistance, formatTime, normalizeDriverTrip } from "../driverUtils";
import "../../../styles/driver.css";

export default function DriverTripCompletedPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state ?? {};
    const trip = normalizeDriverTrip(state.trip ?? {});
    const terminatedEarly = Boolean(state.terminatedEarly);
    const stopsCovered = Number(state.stopsCovered ?? 0);
    const totalStops = Number(state.totalStops ?? 0);
    const started = trip.actualStartTime ?? trip.scheduledStartTime;
    const ended = trip.actualEndTime ?? trip.scheduledEndTime;

    // Backend LocalDateTime values represent the local scheduled/actual wall clock.
    // Convert only 24-hour clock notation to 12-hour display; do not shift timezones.
    const formatTripTime = (value) => {
        if (!value) return "Time unavailable";
        const match = String(value).match(/[T ](\\d{1,2}):(\\d{2})/);
        if (!match) return formatTime(value);
        const hour = Number(match[1]);
        const minute = match[2];
        const suffix = hour >= 12 ? "PM" : "AM";
        return `${hour % 12 || 12}:${minute} ${suffix}`;
    };

    return (
        <main className="driver-app-page driver-completed-page">
            <div className="driver-app-shell driver-completed-shell">
                <header className="driver-completed-header"><button onClick={() => navigate("/driver")} aria-label="Back to dashboard"><Icon name="arrow-left" size={22} /></button><BrandLogo size="md" /></header>
                <section className="driver-completed-content">
                    <img className="driver-completed-art" src={completedArt} alt="Bus with a green check mark" onError={handleIllustrationError} />
                    <h1>{terminatedEarly ? "Trip ended" : "Trip completed"}</h1>
                    <p className="driver-completed-copy">{terminatedEarly ? `Your trip from ${trip.originStopName} to ${trip.destinationStopName} was ended early.` : `Your trip from ${trip.originStopName} to ${trip.destinationStopName} has been completed successfully.`}</p>
                    <section className="driver-completed-summary">
                        <div className="driver-completed-route"><Icon name="route" size={26} /><div><small>Route</small><strong>{trip.originStopName} → {trip.destinationStopName}</strong>{trip.routePatternCode && <span>{trip.routePatternCode}</span>}</div></div>
                        <div className="driver-completed-stat-grid">
                            <div><Icon name="clock" size={22} /><span><small>Started</small><strong>{formatTripTime(started)}</strong></span></div>
                            <div><Icon name="clock" size={22} /><span><small>Ended</small><strong>{formatTripTime(ended)}</strong></span></div>
                            <div><Icon name="route" size={22} /><span><small>Distance</small><strong>{formatDistance(trip.distanceKm)}</strong></span></div>
                            <div><Icon name="pin" size={22} /><span><small>Stops covered</small><strong>{totalStops > 0 ? `${stopsCovered} of ${totalStops}` : "Not available"}</strong></span></div>
                        </div>
                    </section>
                    <button className="driver-button driver-button--navy driver-button--wide" onClick={() => navigate("/driver", { replace: true })}><Icon name="home" size={20} /> Back to home</button>
                    <button className="driver-completed-history-link" onClick={() => navigate("/driver/history")}>View history</button>
                </section>
            </div>
        </main>
    );
}
