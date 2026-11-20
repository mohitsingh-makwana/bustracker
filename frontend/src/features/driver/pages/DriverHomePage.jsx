import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../services/apiClient";
import heroArt from "../../../assets/bustrackr/home-hero-art.png";
import { handleIllustrationError } from "../../../components/common/imageFallback";
import Icon from "../../../components/common/Icon";
import { useAuth } from "../../../context/AuthContext";
import {
    getCurrentDriverTrip,
    getDriverMe,
    getRegularUpcomingTrips,
    getSingleUpcomingTrips,
    startRegularTrip,
    startSingleTrip,
} from "../services/driverService";
import {
    formatDateLabel,
    formatTime,
    getErrorMessage,
    getScheduledStartDateTime,
    getTripKey,
    normalizeDriverTrip,
} from "../driverUtils";
import { DriverAppShell, DriverEmptyState, DriverError, DriverLoading, DriverStatusPill } from "../components";
import "../../../styles/driver.css";

const PAGE_SIZE = 50;

function normalizeScheduleTrip(row) {
    return normalizeDriverTrip({ ...row, tripScheduleId: row.tripScheduleId ?? row.id, tripType: row.tripType ?? "REGULAR" });
}

function startAllowed(trip) {
    const start = getScheduledStartDateTime(trip);
    if (!start) return false;
    return Date.now() >= start.getTime() - 30 * 60 * 1000;
}

function timeUntilStart(trip) {
    const start = getScheduledStartDateTime(trip);
    if (!start) return null;
    const minutes = Math.ceil((start.getTime() - Date.now()) / 60000);
    if (minutes <= 0) return "Trip is ready to start";
    if (minutes < 60) return `Starts in ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `Starts in ${hours} hr ${rest} min` : `Starts in ${hours} hr`;
}

function scheduleSortValue(trip) {
    return getScheduledStartDateTime(trip)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function DriverUpcomingCard({ trip, disabled, onOpen }) {
    const startDate = getScheduledStartDateTime(trip);
    return (
        <button className={`driver-upcoming-card ${disabled ? "driver-upcoming-card--disabled" : ""}`} onClick={onOpen} disabled={disabled}>
            <span className="driver-upcoming-card__time">
                <strong>{formatTime(startDate ?? trip.scheduleStartTime)}</strong>
                <small>{formatDateLabel(startDate ?? trip.serviceDate)}</small>
            </span>
            <span className="driver-upcoming-card__main">
                <span className="driver-route-code">{trip.routePatternCode || "Route"}</span>
                <strong className="driver-upcoming-card__route">{trip.originStopName} <span>→</span> {trip.destinationStopName}</strong>
                <small><Icon name="bus" size={16} /> {trip.busNumber}</small>
            </span>
            <span className="driver-frequency">{trip.isRegular ? "Daily" : "One-time"}</span>
            <Icon name="chevron-right" size={21} className="driver-upcoming-card__chevron" />
        </button>
    );
}

export default function DriverHomePage() {
    const { transportSystemId } = useAuth();
    const navigate = useNavigate();
    const [driver, setDriver] = useState(null);
    const [system, setSystem] = useState(null);
    const [currentTrip, setCurrentTrip] = useState(null);
    const [singleUpcoming, setSingleUpcoming] = useState([]);
    const [regularUpcoming, setRegularUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [warnings, setWarnings] = useState([]);
    const [startBusyKey, setStartBusyKey] = useState("");
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [now, setNow] = useState(Date.now());

    const loadDashboard = useCallback(async ({ quiet = false } = {}) => {
        if (quiet) setRefreshing(true); else setLoading(true);
        setError("");
        const [driverResult, currentResult, singleResult, regularResult, systemResult] = await Promise.allSettled([
            getDriverMe(),
            getCurrentDriverTrip(),
            getSingleUpcomingTrips({ page: 0, size: PAGE_SIZE }),
            getRegularUpcomingTrips({ page: 0, size: PAGE_SIZE }),
            transportSystemId != null ? apiClient.get("/transport-systems").then((response) => response.data?.data ?? response.data) : Promise.resolve(null),
        ]);
        const problems = [];
        if (driverResult.status === "fulfilled") setDriver(driverResult.value);
        else problems.push("Driver profile couldn't be loaded.");
        if (currentResult.status === "fulfilled") setCurrentTrip(currentResult.value ? normalizeDriverTrip(currentResult.value) : null);
        else problems.push("Your current trip couldn't be checked.");
        if (singleResult.status === "fulfilled") setSingleUpcoming(singleResult.value.items.map(normalizeDriverTrip));
        else problems.push("One-time upcoming trips couldn't be loaded.");
        if (regularResult.status === "fulfilled") setRegularUpcoming(regularResult.value.items.map(normalizeScheduleTrip));
        else problems.push("Recurring schedules couldn't be loaded.");
        if (systemResult.status === "fulfilled") setSystem(systemResult.value);
        setWarnings(problems);
        if (driverResult.status === "rejected" && currentResult.status === "rejected" && singleResult.status === "rejected" && regularResult.status === "rejected") {
            setError(getErrorMessage(driverResult.reason, "Couldn't load the driver dashboard."));
        }
        setLoading(false);
        setRefreshing(false);
    }, [transportSystemId]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    const activeTrip = currentTrip?.id != null || currentTrip?.tripId != null ? currentTrip : null;
    const upcoming = useMemo(() => [...singleUpcoming, ...regularUpcoming]
        .map((trip) => ({ ...trip, _startValue: scheduleSortValue(trip) }))
        .filter((trip) => {
            if (trip._startValue < now - 30 * 60 * 1000) return false;
            if (!activeTrip) return true;
            const sameTrip = trip.id != null && String(trip.id) === String(activeTrip.id ?? activeTrip.tripId);
            const sameSchedule = trip.tripScheduleId != null && activeTrip.tripScheduleId != null
                && String(trip.tripScheduleId) === String(activeTrip.tripScheduleId);
            return !sameTrip && !sameSchedule;
        })
        .sort((a, b) => a._startValue - b._startValue), [singleUpcoming, regularUpcoming, activeTrip, now]);
    const nextTrip = activeTrip ? activeTrip : upcoming[0] ?? null;
    const remaining = activeTrip ? upcoming : upcoming.slice(1);
    const laterToday = remaining.filter((trip) => formatDateLabel(getScheduledStartDateTime(trip) ?? trip.serviceDate) === "Today");
    const upcomingLater = remaining.filter((trip) => formatDateLabel(getScheduledStartDateTime(trip) ?? trip.serviceDate) !== "Today");
    const driverName = driver?.name ?? "Driver";
    const systemName = system?.name ?? system?.transportSystemName ?? "Your transport system";
    const driverStatus = activeTrip ? "ON_TRIP" : driver?.status ?? "AVAILABLE";

    async function handleStartTrip(trip) {
        if (activeTrip) return;
        const id = trip.tripScheduleId != null ? `schedule-${trip.tripScheduleId}` : `trip-${trip.tripId ?? trip.id}`;
        setStartBusyKey(id);
        setError("");
        try {
            const result = trip.tripScheduleId != null
                ? await startRegularTrip(trip.tripScheduleId)
                : await startSingleTrip(trip.tripId ?? trip.id);
            // The start response identifies the newly active trip. Give its ID
            // precedence over any tripId carried by the upcoming schedule card.
            let startedTrip = result ? normalizeDriverTrip({
                ...trip,
                ...result,
                id: result.id ?? result.tripId ?? trip.id ?? trip.tripId,
                tripId: result.id ?? result.tripId ?? trip.id ?? trip.tripId,
            }) : null;
            const responseHasTripId = result?.id != null || result?.tripId != null;
            if (!responseHasTripId || startedTrip?.id == null) {
                try {
                    const refreshed = await getCurrentDriverTrip();
                    if (refreshed) startedTrip = normalizeDriverTrip({
                        ...trip,
                        ...refreshed,
                        id: refreshed.id ?? refreshed.tripId ?? trip.id ?? trip.tripId,
                        tripId: refreshed.id ?? refreshed.tripId ?? trip.id ?? trip.tripId,
                    });
                } catch { /* Keep action response and show a clear message below if it has no id. */ }
            }
            if (startedTrip?.id == null) {
                throw new Error("The trip started, but the response did not include its trip ID. Refresh the dashboard to continue tracking.");
            }
            navigate(`/driver/trips/${startedTrip.id}`, { state: { trip: startedTrip } });
        } catch (actionError) {
            setError(getErrorMessage(actionError, "The trip couldn't be started."));
            await loadDashboard({ quiet: true });
        } finally {
            setStartBusyKey("");
        }
    }

    if (loading) return <DriverAppShell name={driverName}><DriverLoading /></DriverAppShell>;

    return (
        <DriverAppShell activeTab="home" name={driverName}>
            <div className="driver-home-content">
                <section className="driver-welcome-hero">
                    <img className="driver-welcome-hero__art" src={heroArt} alt="Yellow city bus in a city" onError={handleIllustrationError} />
                    <div className="driver-welcome-hero__copy">
                        <span className="driver-eyebrow">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},</span>
                        <h1>{driverName.split(/\s+/)[0]}</h1>
                        <DriverStatusPill status={driverStatus} />
                        <p>{systemName}</p>
                    </div>
                </section>

                {error && <DriverError message={error} onRetry={() => loadDashboard()} />}
                {warnings.length > 0 && !error && <div className="driver-warning-stack">{warnings.map((warning) => <p key={warning}><Icon name="alert" size={16} />{warning}</p>)}</div>}

                <div className="driver-section-toolbar">
                    <span className="driver-subtle-copy">Your day at a glance</span>
                    <button className="driver-icon-button" onClick={() => loadDashboard({ quiet: true })} disabled={refreshing} aria-label="Refresh dashboard"><Icon name="refresh" size={18} className={refreshing ? "driver-spin" : ""} /></button>
                </div>

                {nextTrip ? (
                    <section className={`driver-next-trip-card ${activeTrip ? "driver-next-trip-card--active" : ""}`}>
                        <div className="driver-next-trip-card__topline">
                            <span className="driver-next-trip-card__title"><span className={`driver-next-trip-card__icon ${activeTrip ? "is-live" : ""}`}><Icon name={activeTrip ? "activity" : "clock"} size={22} /></span>{activeTrip ? "Trip in progress" : "Next trip"}</span>
                            {nextTrip.routePatternCode && <span className="driver-route-code driver-route-code--large">{nextTrip.routePatternCode}</span>}
                        </div>
                        <h2>{nextTrip.originStopName} <span>→</span> {nextTrip.destinationStopName}</h2>
                        <div className="driver-next-trip-card__details">
                            <div className="driver-detail-pair"><Icon name="clock" size={25} /><div><span>{activeTrip ? "Started" : "Start time"}</span><strong>{formatTime(activeTrip ? nextTrip.actualStartTime ?? nextTrip.scheduledStartTime : getScheduledStartDateTime(nextTrip) ?? nextTrip.scheduleStartTime)}</strong>{!activeTrip && startAllowed(nextTrip) && <em>{timeUntilStart(nextTrip)}</em>}</div></div>
                            <div className="driver-detail-pair"><Icon name="calendar" size={25} /><div><span>{activeTrip ? "Next stop" : "Date"}</span><strong>{activeTrip ? (nextTrip.nextStopName ?? "See route") : formatDateLabel(getScheduledStartDateTime(nextTrip) ?? nextTrip.serviceDate)}</strong></div></div>
                            <div className="driver-detail-pair"><Icon name="bus" size={25} /><div><span>Bus number</span><strong>{nextTrip.busNumber}</strong></div></div>
                            <div className="driver-detail-pair"><Icon name="refresh" size={25} /><div><span>Trip type</span><strong className="driver-frequency">{nextTrip.isRegular ? "Daily" : "One-time"}</strong></div></div>
                        </div>
                        {activeTrip ? (
                            <button className="driver-button driver-button--navy driver-button--wide" onClick={() => navigate(`/driver/trips/${activeTrip.id ?? activeTrip.tripId}`, { state: { trip: activeTrip } })}><Icon name="play" size={19} /> Resume trip</button>
                        ) : (
                            <button className={`driver-button driver-button--wide ${startAllowed(nextTrip) ? "driver-button--primary" : "driver-button--disabled"}`} onClick={() => handleStartTrip(nextTrip)} disabled={!startAllowed(nextTrip) || Boolean(startBusyKey)}>
                                <Icon name={startAllowed(nextTrip) ? "play-circle" : "clock"} size={22} />
                                {startBusyKey ? "Starting trip…" : startAllowed(nextTrip) ? "Start trip" : `Opens at ${(() => { const date = getScheduledStartDateTime(nextTrip); if (!date) return "scheduled time"; date.setMinutes(date.getMinutes() - 30); return formatTime(date); })()}`}
                            </button>
                        )}
                        {!activeTrip && <p className="driver-next-trip-card__footnote">You can start 30 minutes before the scheduled time.</p>}
                    </section>
                ) : (
                    <DriverEmptyState title="No trips assigned yet" description="When your trips are assigned, you’ll find them here." actionLabel="Refresh dashboard" onAction={() => loadDashboard({ quiet: true })} />
                )}

                {activeTrip && upcoming.length > 0 && <div className="driver-current-trip-notice"><Icon name="info" size={19} /><span>Finish the current trip before starting another.</span></div>}

                {laterToday.length > 0 && (
                    <section className="driver-trip-section">
                        <div className="driver-section-title"><Icon name="clock" size={27} /><h2>Later today</h2></div>
                        <div className="driver-upcoming-list">{laterToday.map((trip) => <DriverUpcomingCard key={getTripKey(trip)} trip={trip} disabled={Boolean(activeTrip)} onOpen={() => activeTrip ? undefined : setSelectedTrip(trip)} />)}</div>
                    </section>
                )}
                {upcomingLater.length > 0 && (
                    <section className="driver-trip-section">
                        <div className="driver-section-title"><Icon name="calendar" size={27} /><h2>Upcoming</h2></div>
                        {Object.entries(upcomingLater.reduce((groups, trip) => {
                            const label = formatDateLabel(getScheduledStartDateTime(trip) ?? trip.serviceDate);
                            (groups[label] ??= []).push(trip);
                            return groups;
                        }, {})).map(([label, trips]) => (
                            <div className="driver-upcoming-group" key={label}>
                                <h3>{label}</h3>
                                <div className="driver-upcoming-list">{trips.map((trip) => <DriverUpcomingCard key={getTripKey(trip)} trip={trip} disabled={Boolean(activeTrip)} onOpen={() => activeTrip ? undefined : setSelectedTrip(trip)} />)}</div>
                            </div>
                        ))}
                    </section>
                )}

                <footer className="driver-home-footer"><span>Drive safely.</span><strong>Bus<span>Trackr</span></strong></footer>
            </div>
            {selectedTrip && <div className="driver-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !startBusyKey) setSelectedTrip(null); }}><section className="driver-dialog driver-upcoming-dialog" role="dialog" aria-modal="true" aria-labelledby="upcoming-trip-title"><button className="driver-modal-close" onClick={() => setSelectedTrip(null)} aria-label="Close trip details"><Icon name="x" size={20} /></button><span className="driver-route-code">{selectedTrip.routePatternCode || "Route"}</span><h2 id="upcoming-trip-title">{selectedTrip.originStopName} → {selectedTrip.destinationStopName}</h2><p className="driver-upcoming-dialog__date">{formatDateLabel(getScheduledStartDateTime(selectedTrip) ?? selectedTrip.serviceDate)} · {formatTime(getScheduledStartDateTime(selectedTrip) ?? selectedTrip.scheduleStartTime)} · {selectedTrip.isRegular ? "Daily" : "One-time"}</p><div className="driver-history-modal-stats"><div><small>Bus number</small><strong>{selectedTrip.busNumber}</strong></div><div><small>Trip type</small><strong>{selectedTrip.isRegular ? "Recurring" : "One-time"}</strong></div></div><button className={`driver-button driver-button--wide ${startAllowed(selectedTrip) ? "driver-button--primary" : "driver-button--disabled"}`} disabled={!startAllowed(selectedTrip) || Boolean(startBusyKey)} onClick={async () => { await handleStartTrip(selectedTrip); }}>{startBusyKey ? "Starting trip…" : startAllowed(selectedTrip) ? "Start trip" : `Opens at ${(() => { const date = getScheduledStartDateTime(selectedTrip); if (!date) return "scheduled time"; date.setMinutes(date.getMinutes() - 30); return formatTime(date); })()}`}</button><button className="driver-dialog__cancel" onClick={() => setSelectedTrip(null)} disabled={Boolean(startBusyKey)}>Close</button></section></div>}
        </DriverAppShell>
    );
}
