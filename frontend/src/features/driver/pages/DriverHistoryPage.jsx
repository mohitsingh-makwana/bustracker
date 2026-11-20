import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../../../components/common/Icon";
import { getDriverMe, getDriverTripHistory } from "../services/driverService";
import { formatDateLabel, formatDistance, formatLongDate, formatTime, getErrorMessage, normalizeDriverTrip } from "../driverUtils";
import { DriverAppShell, DriverEmptyState, DriverError, DriverLoading } from "../components";
import "../../../styles/driver.css";

const PAGE_SIZE = 50;

function getHistoryDate(trip) {
    return trip.actualEndTime ?? trip.actualStartTime ?? trip.scheduledStartTime ?? trip.createdAt ?? null;
}

function inWeek(date, now = new Date()) {
    if (!date) return false;
    const current = new Date(now);
    current.setHours(23, 59, 59, 999);
    const monday = new Date(now);
    const weekday = monday.getDay();
    monday.setDate(monday.getDate() - (weekday === 0 ? 6 : weekday - 1));
    monday.setHours(0, 0, 0, 0);
    const parsed = new Date(date);
    return parsed >= monday && parsed <= current;
}

function isThisMonth(date) {
    if (!date) return false;
    const parsed = new Date(date);
    const now = new Date();
    return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth();
}

function TripHistoryCard({ trip, onOpen }) {
    const status = String(trip.status ?? "COMPLETED").toUpperCase();
    const isCancelled = ["CANCELLED", "TERMINATED", "ABORTED"].includes(status);
    return (
        <button className="driver-history-card" onClick={onOpen}>
            <span className="driver-history-card__top"><span className="driver-route-code">{trip.routePatternCode || "Trip"}</span><span className={`driver-history-status ${isCancelled ? "is-cancelled" : "is-completed"}`}>{isCancelled ? (status === "TERMINATED" ? "Ended early" : "Cancelled") : "Completed"}</span></span>
            <strong className="driver-history-card__route">{trip.originStopName} <span>→</span> {trip.destinationStopName}</strong>
            <span className="driver-history-card__meta"><span><Icon name="clock" size={16} /> {formatTime(trip.actualStartTime ?? trip.scheduledStartTime)} – {formatTime(trip.actualEndTime ?? trip.scheduledEndTime)}</span><span><Icon name="route" size={16} /> {formatDistance(trip.distanceKm)}</span></span>
            <span className="driver-history-card__meta"><span><Icon name="bus" size={16} /> {trip.busNumber}</span><span><Icon name="calendar" size={16} /> {trip.isRegular ? "Daily" : "One-time"}</span><Icon name="chevron-right" size={20} className="driver-history-card__chevron" /></span>
        </button>
    );
}

export default function DriverHistoryPage() {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [pageInfo, setPageInfo] = useState({ last: true, totalElements: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");
    const [period, setPeriod] = useState("WEEK");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [driverName, setDriverName] = useState("Driver");

    const loadHistory = useCallback(async (pageNumber = 0, append = false) => {
        if (append) setLoadingMore(true); else setLoading(true);
        setError("");
        try {
            const result = await getDriverTripHistory({ page: pageNumber, size: PAGE_SIZE });
            const normalized = result.items.map(normalizeDriverTrip);
            setItems((previous) => append ? [...previous, ...normalized] : normalized);
            setPage(pageNumber);
            setPageInfo(result.pageInfo);
        } catch (loadError) {
            setError(getErrorMessage(loadError, "Trip history couldn't be loaded."));
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => { loadHistory(0); }, [loadHistory]);
    useEffect(() => { getDriverMe().then((driver) => setDriverName(driver?.name ?? "Driver")).catch(() => {}); }, []);

    const filtered = useMemo(() => items.filter((trip) => {
        const date = getHistoryDate(trip);
        if (period === "WEEK") return inWeek(date);
        if (period === "MONTH") return isThisMonth(date);
        if (!fromDate && !toDate) return true;
        const day = date ? String(date).slice(0, 10) : "";
        return (!fromDate || day >= fromDate) && (!toDate || day <= toDate);
    }).sort((a, b) => new Date(getHistoryDate(b) ?? 0) - new Date(getHistoryDate(a) ?? 0)), [items, period, fromDate, toDate]);

    const groups = useMemo(() => filtered.reduce((accumulator, trip) => {
        const label = formatDateLabel(getHistoryDate(trip), formatLongDate(getHistoryDate(trip)));
        (accumulator[label] ??= []).push(trip);
        return accumulator;
    }, {}), [filtered]);

    return (
        <DriverAppShell name={driverName} activeTab="history">
            <section className="driver-history-page">
                <div className="driver-page-heading"><p className="driver-eyebrow">Your journeys</p><h1>Trip history</h1><p>Review completed and cancelled trips.</p></div>
                <div className="driver-history-filters" role="tablist" aria-label="Filter trip history">
                    <button className={period === "WEEK" ? "is-active" : ""} onClick={() => setPeriod("WEEK")} role="tab" aria-selected={period === "WEEK"}>This week</button>
                    <button className={period === "MONTH" ? "is-active" : ""} onClick={() => setPeriod("MONTH")} role="tab" aria-selected={period === "MONTH"}>This month</button>
                    <button className={period === "CUSTOM" ? "is-active" : ""} onClick={() => setPeriod("CUSTOM")} role="tab" aria-selected={period === "CUSTOM"}><Icon name="calendar" size={17} /> Pick dates</button>
                </div>
                {period === "CUSTOM" && <div className="driver-date-range"><label>From<input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></label><label>To<input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></label></div>}
                {error && <DriverError message={error} onRetry={() => loadHistory(0)} />}
                {loading ? <DriverLoading message="Loading your trip history…" /> : filtered.length === 0 ? <DriverEmptyState title="No trips yet" description="Your completed and cancelled trips will appear here." actionLabel={period === "WEEK" ? "View this month" : undefined} onAction={() => setPeriod("MONTH")} /> : (
                    <>
                        <div className="driver-history-summary"><span>{filtered.length} {filtered.length === 1 ? "trip" : "trips"} shown</span><button onClick={() => loadHistory(0)} disabled={loadingMore}><Icon name="refresh" size={16} /> Refresh</button></div>
                        {Object.entries(groups).map(([label, trips]) => (
                            <section className="driver-history-group" key={label}>
                                <h2>{label} <small>{trips.length} {trips.length === 1 ? "trip" : "trips"}</small></h2>
                                <div className="driver-history-list">{trips.map((trip, index) => <TripHistoryCard key={`${trip.id ?? trip.tripId ?? index}-${index}`} trip={trip} onOpen={() => setSelectedTrip(trip)} />)}</div>
                            </section>
                        ))}
                        {!pageInfo.last && <button className="driver-button driver-button--outline driver-button--wide driver-load-more" onClick={() => loadHistory(page + 1, true)} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more trips"}</button>}
                    </>
                )}
            </section>
            {selectedTrip && <div className="driver-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTrip(null); }}><section className="driver-dialog driver-history-dialog" role="dialog" aria-modal="true" aria-labelledby="history-dialog-title"><button className="driver-modal-close" onClick={() => setSelectedTrip(null)} aria-label="Close trip details"><Icon name="x" size={20} /></button><span className="driver-route-code">{selectedTrip.routePatternCode || "Trip"}</span><h2 id="history-dialog-title">{selectedTrip.originStopName} → {selectedTrip.destinationStopName}</h2><p className="driver-history-dialog__status">{String(selectedTrip.status ?? "COMPLETED").replaceAll("_", " ")}</p><div className="driver-history-modal-stats"><div><small>Started</small><strong>{formatTime(selectedTrip.actualStartTime ?? selectedTrip.scheduledStartTime)}</strong></div><div><small>Ended</small><strong>{formatTime(selectedTrip.actualEndTime ?? selectedTrip.scheduledEndTime)}</strong></div><div><small>Distance</small><strong>{formatDistance(selectedTrip.distanceKm)}</strong></div><div><small>Bus</small><strong>{selectedTrip.busNumber}</strong></div></div><button className="driver-button driver-button--primary driver-button--wide" onClick={() => setSelectedTrip(null)}>Done</button></section></div>}
        </DriverAppShell>
    );
}
