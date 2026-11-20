import { useEffect, useMemo, useState } from "react";
import Icon from "../../../components/common/Icon";
import { getPassengerFilterOptions } from "../services/passengerService";

const TIME_OPTIONS = [
    { value: "NOW", label: "Now" },
    { value: "NEXT_HOUR", label: "Next 1 hour" },
    { value: "TODAY", label: "Today" },
    { value: "TOMORROW", label: "Tomorrow" },
];

function normalizeLabel(value) {
    return String(value ?? "").trim().toLowerCase();
}

export function buildTimeFilters(timeChoice, pickedDateTime) {
    const now = new Date();
    const toDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const toTime = (date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    if (timeChoice === "NOW") return { date: toDate(now), startTime: toTime(now) };
    if (timeChoice === "NEXT_HOUR") {
        const end = new Date(now.getTime() + 60 * 60 * 1000);
        return { date: toDate(now), startTime: toTime(now), endTime: toTime(end) };
    }
    if (timeChoice === "TODAY") return { date: toDate(now) };
    if (timeChoice === "TOMORROW") {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        return { date: toDate(tomorrow) };
    }
    if (timeChoice === "PICKED" && pickedDateTime) {
        const [date, time] = pickedDateTime.split("T");
        if (!date || !time) return {};
        const [hour, minute] = time.split(":").map(Number);
        const end = new Date(`${date}T${time}`);
        end.setHours(hour + 1, minute, 0, 0);
        return { date, startTime: `${time}:00`, endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}:00` };
    }
    return {};
}

export default function PassengerFilterSheet({
    open,
    accessType,
    transportSystemId,
    initialStopQuery = "",
    onClose,
    onApply,
    onClear,
}) {
    const [routes, setRoutes] = useState([]);
    const [stops, setStops] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [optionsError, setOptionsError] = useState("");
    const [routeSearch, setRouteSearch] = useState("");
    const [routeId, setRouteId] = useState("");
    const [routeOpen, setRouteOpen] = useState(false);
    const [stopQuery, setStopQuery] = useState(initialStopQuery);
    const [stopId, setStopId] = useState("");
    const [stopOpen, setStopOpen] = useState(Boolean(initialStopQuery));
    const [timeChoice, setTimeChoice] = useState("");
    const [pickedDateTime, setPickedDateTime] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (!open) return undefined;
        setStopQuery(initialStopQuery);
        setStopId("");
        setRouteSearch("");
        setRouteId("");
        setTimeChoice("");
        setPickedDateTime("");
        setShowDatePicker(false);
        let cancelled = false;
        setLoadingOptions(true);
        setOptionsError("");
        getPassengerFilterOptions({ accessType, transportSystemId }).then((options) => {
            if (!cancelled) {
                setRoutes(options.routes);
                setStops(options.stops);
            }
        }).catch((error) => {
            if (!cancelled) setOptionsError(error?.response?.data?.msg || error?.response?.data?.message || "Route and stop options could not be loaded.");
        }).finally(() => {
            if (!cancelled) setLoadingOptions(false);
        });
        return () => { cancelled = true; };
    }, [open, accessType, transportSystemId, initialStopQuery]);

    useEffect(() => {
        if (!open) return undefined;
        function onKeyDown(event) {
            if (event.key === "Escape") onClose();
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const filteredRoutes = useMemo(() => {
        const query = normalizeLabel(routeSearch);
        return routes.filter((route) => !query || normalizeLabel(`${route.routeCode ?? route.code ?? ""} ${route.name ?? route.routeName ?? ""} ${route.routePatternCode ?? ""}`).includes(query)).slice(0, 8);
    }, [routes, routeSearch]);

    const filteredStops = useMemo(() => {
        const query = normalizeLabel(stopQuery);
        const matchingStops = stops.filter((stop) =>
            !query || normalizeLabel(`${stop.name ?? stop.stopName ?? ""} ${stop.stopCode ?? ""} ${stop.address ?? ""} ${stop.city ?? ""}`).includes(query)
        );
        return matchingStops.slice(0, 8);
    }, [stops, stopQuery]);

    if (!open) return null;

    const selectedRoute = routes.find((route) => String(route.id) === String(routeId));
    const selectedStop = stops.find((stop) => String(stop.id) === String(stopId));

    async function submitFilters() {
        if (stopQuery.trim() && !stopId) {
            setOptionsError("Choose a stop from the suggestions or clear the stop field.");
            return;
        }
        if (routeSearch.trim() && !routeId && routeOpen) {
            setOptionsError("Choose a route from the list before showing buses.");
            return;
        }
        const filters = {};
        if (routeId) filters.routeId = Number(routeId);
        if (stopId) filters.stopId = Number(stopId);
        Object.assign(filters, buildTimeFilters(timeChoice, pickedDateTime));
        if (timeChoice === "PICKED" && !pickedDateTime) {
            setOptionsError("Choose a date and time first.");
            return;
        }
        setOptionsError("");
        setApplying(true);
        try {
            await onApply(filters);
            onClose();
        } catch (error) {
            setOptionsError(error?.message || "Couldn't apply filters. Please try again.");
        } finally {
            setApplying(false);
        }
    }

    function clearAll() {
        setRouteId("");
        setRouteSearch("");
        setStopId("");
        setStopQuery("");
        setTimeChoice("");
        setPickedDateTime("");
        setShowDatePicker(false);
        onClear?.();
    }

    return (
        <div className="passenger-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="passenger-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="passenger-filter-title">
                <div className="passenger-sheet-handle" />
                <div className="passenger-sheet-heading">
                    <div>
                        <h2 id="passenger-filter-title">Find a bus</h2>
                        <p>Choose a route, stop or time.</p>
                    </div>
                    <button type="button" className="passenger-icon-button" aria-label="Close filters" onClick={onClose}><Icon name="x" size={21} /></button>
                </div>

                {optionsError && <p className="passenger-sheet-error" role="alert">{optionsError}</p>}

                <div className="passenger-field-group">
                    <label htmlFor="filter-route-search">Route</label>
                    <button type="button" className="passenger-select-field" onClick={() => setRouteOpen((value) => !value)} aria-expanded={routeOpen}>
                        <span>{selectedRoute ? `${selectedRoute.routeCode ?? selectedRoute.code ?? "Route"} · ${selectedRoute.name ?? selectedRoute.routeName ?? selectedRoute.routePatternName ?? ""}` : "Any route"}</span>
                        <Icon name={routeOpen ? "chevron-up" : "chevron-down"} size={19} />
                    </button>
                    {routeOpen && (
                        <div className="passenger-option-panel">
                            <div className="passenger-option-search"><Icon name="search" size={18} /><input id="filter-route-search" value={routeSearch} onChange={(event) => setRouteSearch(event.target.value)} placeholder="Search route" autoFocus /></div>
                            <button type="button" className="passenger-option" onClick={() => { setRouteId(""); setRouteSearch(""); setRouteOpen(false); }}>Any route</button>
                            {loadingOptions ? <div className="passenger-option-muted">Loading routes…</div> : filteredRoutes.map((route) => (
                                <button type="button" className="passenger-option" key={route.id} onClick={() => { setRouteId(String(route.id)); setRouteSearch(""); setRouteOpen(false); }}>
                                    <span className="passenger-option-title">{route.routeCode ?? route.code ?? route.routePatternCode ?? "Route"}</span>
                                    <span className="passenger-option-subtitle">{route.name ?? route.routeName ?? route.routePatternName ?? ""}</span>
                                    {String(routeId) === String(route.id) && <Icon name="check" size={17} />}
                                </button>
                            ))}
                            {!loadingOptions && filteredRoutes.length === 0 && <div className="passenger-option-muted">No routes found.</div>}
                        </div>
                    )}
                </div>

                <div className="passenger-field-group">
                    <label htmlFor="filter-stop-search">Stop</label>
                    <div className="passenger-input-field">
                        <Icon name="search" size={18} />
                        <input id="filter-stop-search" value={stopQuery} onChange={(event) => { setStopQuery(event.target.value); setStopId(""); setStopOpen(true); }} onFocus={() => setStopOpen(true)} placeholder="Search stop name" autoComplete="off" />
                        {stopQuery && <button type="button" aria-label="Clear stop" onClick={() => { setStopQuery(""); setStopId(""); setStopOpen(false); }}><Icon name="x" size={16} /></button>}
                    </div>
                    {stopOpen && (
                        <div className="passenger-suggestions">
                            {loadingOptions ? <div className="passenger-option-muted">Loading stops…</div> : filteredStops.map((stop) => (
                                <button type="button" key={stop.id} className="passenger-suggestion" onClick={() => { setStopId(String(stop.id)); setStopQuery(stop.name ?? stop.stopName ?? ""); setStopOpen(false); }}>
                                    <Icon name="pin" size={18} />
                                    <span><strong>{stop.name ?? stop.stopName ?? "Unnamed stop"}</strong><small>{stop.address ?? stop.city ?? "Bus stop"}</small></span>
                                    {String(stopId) === String(stop.id) && <Icon name="check" size={17} />}
                                </button>
                            ))}
                            {!loadingOptions && filteredStops.length === 0 && <div className="passenger-option-muted">No matching stops found.</div>}
                        </div>
                    )}
                    {selectedStop && <p className="passenger-selected-hint">Selected: {selectedStop.name ?? selectedStop.stopName}</p>}
                </div>

                <div className="passenger-field-group">
                    <label>Time</label>
                    <div className="passenger-time-grid">
                        {TIME_OPTIONS.map((option) => (
                            <button type="button" className={`passenger-time-chip ${timeChoice === option.value ? "is-active" : ""}`} key={option.value} aria-pressed={timeChoice === option.value} onClick={() => { setTimeChoice(option.value); setShowDatePicker(false); }}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" className={`passenger-date-time ${showDatePicker ? "is-active" : ""}`} onClick={() => { setShowDatePicker((shown) => !shown); setTimeChoice("PICKED"); }}>
                        <Icon name="calendar-clock" size={19} />
                        <span>Pick date and time</span>
                        <Icon name="chevron-right" size={18} />
                    </button>
                    {showDatePicker && <input className="passenger-date-input" type="datetime-local" value={pickedDateTime} onChange={(event) => { setPickedDateTime(event.target.value); setTimeChoice("PICKED"); }} aria-label="Pick date and time" />}
                </div>

                <div className="passenger-sheet-actions">
                    <button type="button" className="passenger-show-buses" onClick={submitFilters} disabled={applying}>
                        {applying ? <span className="passenger-spinner" /> : null}{applying ? "Finding buses…" : "Show buses"}
                    </button>
                    <button type="button" className="passenger-clear-filters" onClick={clearAll}>Clear filters</button>
                </div>
            </section>
        </div>
    );
}
