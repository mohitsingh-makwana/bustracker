import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getCurrentUser } from "../../auth/services/authService";
import { getPrivateTransportSystemById, getPublicTransportSystemById } from "../services/transportService";
import { getPassengerHomeData, searchPassengerTrips } from "../services/passengerService";
import { getUserIdFromStoredToken } from "../../auth/services/authService";
import BrandLogo, { BrandMark } from "../../../components/common/BrandLogo";
import heroBus from "../../../assets/bustrackr/home-hero-art.png";
import { handleIllustrationError } from "../../../components/common/imageFallback";
import Icon from "../../../components/common/Icon";
import PassengerTripCard from "./PassengerTripCard";
import PassengerFilterSheet from "./PassengerFilterSheet";
import "../../../styles/passenger.css";

const TIME_FILTERS = [
    { value: "NOW", label: "Now" },
    { value: "NEXT_HOUR", label: "Next 1 hour" },
    { value: "TODAY", label: "Today" },
    { value: "TOMORROW", label: "Tomorrow" },
];

function errorMessage(error, fallback) {
    return error?.response?.data?.msg || error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

function initialsFrom(user) {
    const name = user?.fullName ?? user?.name ?? user?.displayName;
    if (name) return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    return user?.email?.[0]?.toUpperCase() ?? "G";
}

function dayGroupFor(trip) {
    if (trip.dayGroup) return trip.dayGroup;
    const scheduledDate = trip.serviceDate ?? (trip.scheduledTripStartTime && String(trip.scheduledTripStartTime).includes("T") ? String(trip.scheduledTripStartTime).slice(0, 10) : null);
    if (!scheduledDate) return "Today";
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;
    if (scheduledDate === tomorrow) return "Tomorrow";
    if (scheduledDate === today) return "Today";
    return null;
}

function timeMinutes(value) {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const match = String(value).match(/(?:T)?(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER;
}

function nowMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

export default function PassengerHomePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        isAuthenticated,
        isMemberAuthenticated,
        userId,
        transportSystemId: memberTransportSystemId,
        publicTransportSystemId,
        role,
        logout,
    } = useAuth();

    const passedSystem = location.state?.system ?? null;
    const memberMode = location.state?.memberMode ?? isMemberAuthenticated;
    const selectedId = passedSystem?.id ?? location.state?.transportSystemId ?? (memberMode ? memberTransportSystemId : publicTransportSystemId);
    const apiAccessType = memberMode ? "PRIVATE" : "PUBLIC";

    // AuthContext/tokenStore are in-memory. After a browser refresh, a private
    // passenger route may still be restored from navigation state while its
    // member token is gone; return to the home/login entry instead of rendering
    // a misleading 403 error state.
    useEffect(() => {
        if (memberMode && !isMemberAuthenticated) {
            navigate("/", {
                replace: true,
                state: { authNotice: "Your session ended. Please log in again to continue." },
            });
        }
    }, [memberMode, isMemberAuthenticated, navigate]);

    const [system, setSystem] = useState(passedSystem);
    const [user, setUser] = useState(null);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [homeData, setHomeData] = useState({ liveTrips: [], upcomingTrips: [], pageInfo: {}, warnings: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tripLoadError, setTripLoadError] = useState("");
    const [notice, setNotice] = useState("");
    const [activeTime, setActiveTime] = useState("");
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [appliedFilters, setAppliedFilters] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [filteredTrips, setFilteredTrips] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function resolveSystem() {
            if (passedSystem) setSystem(passedSystem);
            if (selectedId == null) {
                if (!passedSystem) {
                    setError("No transport system was selected. Return to Home and choose a transport system.");
                    setLoading(false);
                }
                return;
            }
            setError("");
            try {
                // Always retrieve the selected system through the access-type-specific details API.
                const details = apiAccessType === "PUBLIC"
                    ? await getPublicTransportSystemById(selectedId)
                    : await getPrivateTransportSystemById(selectedId);
                if (!cancelled) setSystem({ ...(passedSystem ?? {}), ...details });
            } catch (fetchError) {
                // The discovery card remains a useful fallback if the detail endpoint is temporarily unavailable.
                if (!cancelled && !passedSystem) setError(errorMessage(fetchError, "Unable to load transport system details."));
            }
        }
        resolveSystem();
        return () => { cancelled = true; };
    }, [passedSystem, selectedId, apiAccessType]);

    useEffect(() => {
        let cancelled = false;
        const storedUserId = userId ?? getUserIdFromStoredToken();
        if (!isAuthenticated || storedUserId == null) {
            setUser(null);
            return undefined;
        }
        getCurrentUser(storedUserId).then((result) => {
            if (!cancelled) setUser(result);
        }).catch(() => {
            if (!cancelled) setUser(null);
        });
        return () => { cancelled = true; };
    }, [isAuthenticated, userId]);

    const loadTrips = useCallback(async () => {
        if (selectedId == null) return;
        setLoading(true);
        setTripLoadError("");
        try {
            const data = await getPassengerHomeData({ accessType: apiAccessType, transportSystemId: selectedId, page: 0, size: 50 });
            setHomeData(data);
            setFilteredTrips(null);
            if (data.warnings.length) setNotice(data.warnings.join(" "));
            else setNotice("");
        } catch (loadError) {
            if (redirectIfPassengerSessionEnded(loadError)) return;
            setTripLoadError(errorMessage(loadError, "Couldn't load trips for this transport system."));
        } finally {
            setLoading(false);
        }
    }, [apiAccessType, selectedId]);

    useEffect(() => { loadTrips(); }, [loadTrips]);

    function redirectIfPassengerSessionEnded(failure) {
        const status = failure?.response?.status;
        if (memberMode && (!isMemberAuthenticated || status === 401 || status === 403)) {
            navigate("/", {
                replace: true,
                state: { authNotice: "Your session ended. Please log in again to continue." },
            });
            return true;
        }
        return false;
    }

    async function applyFilters(filters) {
        setSearchLoading(true);
        setSearchError("");
        try {
            const result = await searchPassengerTrips({ accessType: apiAccessType, transportSystemId: selectedId, filters });
            const liveTrips = result.filter((trip) => String(trip.status).toUpperCase() === "ACTIVE");
            const upcomingTrips = result.filter((trip) => String(trip.status).toUpperCase() === "SCHEDULED");
            setFilteredTrips({ liveTrips, upcomingTrips });
            setAppliedFilters(filters);
            setActiveTime("");
            setNotice(result.length ? `${result.length} matching trip${result.length === 1 ? "" : "s"} found.` : "");
        } catch (searchFailure) {
            if (redirectIfPassengerSessionEnded(searchFailure)) return;
            const message = errorMessage(searchFailure, "Couldn't search buses. Please try again.");
            setSearchError(message);
            throw new Error(message);
        } finally {
            setSearchLoading(false);
        }
    }

    function clearFilters() {
        setAppliedFilters(null);
        setFilteredTrips(null);
        setSearchError("");
        setSearchQuery("");
        setActiveTime("");
        setNotice("");
    }

    const data = filteredTrips ?? homeData;
    const liveTrips = data.liveTrips ?? [];
    const upcomingTrips = data.upcomingTrips ?? [];

    const visibleUpcoming = useMemo(() => {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const tomorrowDate = new Date(today);
        tomorrowDate.setDate(today.getDate() + 1);
        const tomorrowKey = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;
        const current = nowMinutes();

        return [...upcomingTrips].filter((trip) => {
            const group = dayGroupFor(trip);
            if (!group) return false;
            const start = timeMinutes(trip.scheduledStartTime);
            const tripDate = trip.serviceDate ?? (trip.scheduledStartTime && String(trip.scheduledStartTime).includes("T") ? String(trip.scheduledStartTime).slice(0, 10) : null);
            if (activeTime === "TOMORROW") return group === "Tomorrow" || tripDate === tomorrowKey;
            if (activeTime === "TODAY") return group === "Today" || tripDate === todayKey;
            if (activeTime === "NEXT_HOUR") return (group === "Today" || tripDate === todayKey) && start >= current && start <= current + 60;
            if (activeTime === "NOW") return (group === "Today" || tripDate === todayKey) && start >= current;
            return true;
        }).sort((a, b) => timeMinutes(a.scheduledStartTime) - timeMinutes(b.scheduledStartTime));
    }, [upcomingTrips, activeTime]);

    const filteredEmpty = Boolean(filteredTrips && liveTrips.length === 0 && upcomingTrips.length === 0);
    const showLiveSection = activeTime !== "TOMORROW" && !filteredEmpty;
    const groupedUpcoming = useMemo(() => {
        const groups = { Today: [], Tomorrow: [] };
        visibleUpcoming.forEach((trip) => {
            const group = dayGroupFor(trip);
            if (group in groups) groups[group].push(trip);
        });
        return groups;
    }, [visibleUpcoming]);

    async function handleFilterSubmit(filters) {
        await applyFilters(filters);
    }

    function handleMainSearch(event) {
        event.preventDefault();
        setFilterSheetOpen(true);
    }

    function openTrip(trip, live = false) {
        const isSchedule = !live && trip.tripId == null && trip.tripScheduleId != null;
        const entityId = isSchedule ? trip.tripScheduleId : (trip.tripId ?? trip.id);
        if (entityId == null) {
            setNotice("Trip details are not available for this item yet.");
            return;
        }
        const queryParams = new URLSearchParams();
        if (isSchedule) queryParams.set("type", "schedule");
        if (live) queryParams.set("mode", "live");
        queryParams.set("access", apiAccessType);
        if (selectedId != null) queryParams.set("system", String(selectedId));
        const query = `?${queryParams.toString()}`;
        navigate(`/passenger/trips/${encodeURIComponent(entityId)}${query}`, {
            state: {
                trip: { ...trip, isLive: live },
                system,
                memberMode,
                transportSystemId: selectedId,
                accessType: apiAccessType,
                isSchedule,
                isLive: live,
            },
        });
    }

    if (error && !system) {
        return (
            <main className="passenger-page">
                <section className="passenger-error-page">
                    <BrandMark size={58} />
                    <h1>Couldn't open this transport</h1>
                    <p>{error}</p>
                    <button type="button" className="passenger-primary-button" onClick={() => navigate("/")}>Back to transport systems</button>
                </section>
            </main>
        );
    }

    return (
        <main className="passenger-page">
            <div className="passenger-shell">
                <header className="passenger-topbar">
                    <button type="button" className="passenger-back-button" aria-label="Back to transport systems" onClick={() => navigate("/")}><Icon name="arrow-left" size={21} /></button>
                    <BrandMark size={42} className="passenger-app-mark" />
                    <div className="passenger-system-heading">
                        <div className="passenger-system-title-row">
                            <h1>{system?.name ?? "Loading transport…"}</h1>
                            <span className={`passenger-access-badge ${String(system?.accessType ?? apiAccessType).toUpperCase() === "PUBLIC" ? "passenger-access-badge--public" : "passenger-access-badge--private"}`}>
                                {String(system?.accessType ?? apiAccessType).toUpperCase() === "PUBLIC" ? <Icon name="bus" size={12} /> : <Icon name="lock" size={12} />}
                                {String(system?.accessType ?? apiAccessType).toUpperCase() === "PUBLIC" ? "PUBLIC" : "PRIVATE"}
                            </span>
                        </div>
                        <span className="passenger-system-city"><Icon name="pin" size={13} />{system?.city || system?.area || "Transport system"}</span>
                    </div>
                    <div className="passenger-profile-wrap">
                        <button className="passenger-avatar" type="button" aria-label="Open profile menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>{initialsFrom(user)}</button>
                        {profileMenuOpen && <div className="passenger-profile-menu">
                            {isAuthenticated ? <button type="button" onClick={() => navigate("/", { state: { scrollToMySystems: true } })}><Icon name="users" size={16} />My systems</button> : <button type="button" onClick={() => navigate("/login")}><Icon name="user" size={16} />Login</button>}
                            {isAuthenticated ? <button type="button" onClick={() => { logout(); navigate("/", { replace: true }); }}><Icon name="logout" size={16} />Logout</button> : <button type="button" onClick={() => navigate("/register")}><Icon name="user" size={16} />Register</button>}
                        </div>}
                    </div>
                </header>

                <section className="passenger-hero-banner" aria-label="BusTrackr introduction">
                    <div className="passenger-hero-copy">
                        <span className="passenger-hero-eyebrow">YOUR CITY, IN MOTION</span>
                        <h2>Find your bus.<br /><span>Travel smarter.</span></h2>
                        <p>Explore routes, stops and live bus locations near you.</p>
                        <button type="button" className="passenger-hero-action" onClick={() => setFilterSheetOpen(true)}>
                            <Icon name="route" size={14} />
                            <span>Explore routes</span>
                            <Icon name="arrow-right" size={13} />
                        </button>
                    </div>
                    <div className="passenger-hero-art" aria-hidden="true"><img src={heroBus} alt="" onError={handleIllustrationError} /></div>
                    <span className="passenger-hero-sun" aria-hidden="true" />
                </section>

                <div className="passenger-search-row">
                    <form className="passenger-search-field" onSubmit={handleMainSearch}>
                        <Icon name="search" size={20} />
                        <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onFocus={() => { if (searchQuery.trim()) setFilterSheetOpen(true); }} placeholder="Search route or stop" aria-label="Search route or stop" />
                        {searchQuery && <button type="button" className="passenger-clear-search" aria-label="Clear search" onClick={() => setSearchQuery("")}><Icon name="x" size={16} /></button>}
                        <button type="submit" className="passenger-search-filter-button" aria-label="Open bus filters"><Icon name="sliders" size={20} /></button>
                    </form>
                </div>

                <div className="passenger-time-filters" role="group" aria-label="Filter trips by time">
                    {TIME_FILTERS.map((filter) => <button key={filter.value} type="button" className={`passenger-time-chip ${activeTime === filter.value ? "is-active" : ""}`} aria-pressed={activeTime === filter.value} onClick={() => { setActiveTime(filter.value); setFilteredTrips(null); setAppliedFilters(null); setNotice(""); }}>{filter.label}</button>)}
                </div>

                {notice && <div className="passenger-notice" role="status"><Icon name="info" size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="x" size={15} /></button></div>}
                {tripLoadError && <div className="passenger-search-error" role="alert"><span>{tripLoadError}</span><button type="button" onClick={loadTrips}>Try again</button></div>}
                {searchError && <div className="passenger-search-error" role="alert"><span>{searchError}</span><button type="button" onClick={() => applyFilters(appliedFilters ?? {})}>Try again</button></div>}
                {homeData.warnings?.length > 0 && !searchError && <div className="passenger-partial-warning"><Icon name="info" size={16} />{homeData.warnings.join(" ")}</div>}

                {filteredEmpty && !searchLoading ? (
                    <section className="passenger-no-results-full" aria-live="polite">
                        <PassengerInlineEmpty
                            large
                            message="No buses found for this search"
                            description="Try adjusting your route, stop or time filters to see available buses."
                            actionLabel="Clear filters"
                            onAction={clearFilters}
                        />
                    </section>
                ) : <>
                {showLiveSection && (
                    <section className="passenger-section" aria-labelledby="passenger-live-heading">
                        <div className="passenger-section-heading">
                            <div className="passenger-live-title"><span className="passenger-pulse-dot" /><h2 id="passenger-live-heading">Live now</h2><span className="passenger-live-count">{loading ? "—" : (homeData.pageInfo?.live?.totalElements ?? liveTrips.length)} buses</span></div>
                            <button type="button" className="passenger-refresh-button" onClick={loadTrips} disabled={loading} aria-label="Refresh trip lists"><Icon name="refresh" size={17} /></button>
                        </div>
                        {loading ? <TripCardSkeletons count={2} /> : liveTrips.length ? (
                            <div className="passenger-trip-list">{liveTrips.map((trip) => <PassengerTripCard key={trip.id ?? trip.tripId} trip={trip} live onOpen={(item) => openTrip(item, true)} onTrack={(item) => openTrip(item, true)} />)}</div>
                        ) : <PassengerInlineEmpty message="No live buses right now." />}
                    </section>
                )}

                <section className="passenger-section passenger-upcoming-section" aria-labelledby="passenger-upcoming-heading">
                    <div className="passenger-section-heading"><h2 id="passenger-upcoming-heading">Upcoming</h2><span className="passenger-section-subtitle">Scheduled trips</span></div>
                    {loading ? <TripCardSkeletons count={2} /> : visibleUpcoming.length ? (
                        <div className="passenger-upcoming-groups">
                            {Object.entries(groupedUpcoming).filter(([, trips]) => trips.length).map(([group, trips]) => <div className="passenger-day-group" key={group}>
                                <h3>{group}</h3>
                                <div className="passenger-trip-list">{trips.map((trip) => <PassengerTripCard key={trip.id ?? trip.tripScheduleId} trip={trip} onOpen={(item) => openTrip(item, false)} />)}</div>
                            </div>)}
                        </div>
                    ) : (searchLoading ? <TripCardSkeletons count={1} /> : <PassengerInlineEmpty message={filteredTrips ? "No buses found for this search." : "No upcoming buses for this time."} actionLabel={filteredTrips ? "Clear filters" : undefined} onAction={filteredTrips ? clearFilters : undefined} />)}
                </section>
                </>}

                <footer className="passenger-footer"><BrandLogo size="sm" /><span>Connecting people. Moving cities.</span></footer>
            </div>

            <PassengerFilterSheet
                open={filterSheetOpen}
                accessType={apiAccessType}
                transportSystemId={selectedId}
                initialStopQuery={searchQuery}
                onClose={() => setFilterSheetOpen(false)}
                onApply={handleFilterSubmit}
                onClear={clearFilters}
            />


        </main>
    );
}

function TripCardSkeletons({ count = 2 }) {
    return <div className="passenger-trip-list" aria-label="Loading trips">{Array.from({ length: count }, (_, index) => <div className="passenger-trip-skeleton" key={index}><span /><span /><span /><div><i /><i /></div></div>)}</div>;
}

function PassengerInlineEmpty({ message, description, actionLabel, onAction, large = false }) {
    return <div className={`passenger-inline-empty ${large ? "passenger-inline-empty--full" : ""}`}>
        <div className="passenger-empty-illustration" aria-hidden="true">
            <svg viewBox="0 0 190 122" role="img" aria-label="Bus search illustration">
                <ellipse cx="91" cy="105" rx="70" ry="7" fill="#E8E5DE" />
                <path d="M18 87V73M25 87V65M17 72h9M13 78h17" stroke="#D5DCCF" strokeWidth="3" strokeLinecap="round" />
                <path d="M159 88V72M166 88V64M158 72h9M154 78h17" stroke="#D5DCCF" strokeWidth="3" strokeLinecap="round" />
                <path d="M34 25c0-8 7-14 15-14 6 0 11 3 13 8 7-2 14 3 14 10H36c-1-1-2-2-2-4Z" fill="#EEF1F3" />
                <path d="M118 19c0-7 6-12 13-12 5 0 9 3 11 7 6-2 12 2 12 8h-34c-1-1-2-2-2-3Z" fill="#EEF1F3" />
                <path className="passenger-empty-route" d="M24 90C34 90 28 70 44 70S65 80 75 70" fill="none" stroke="#F6BE59" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 6" />
                <g className="passenger-empty-bus" transform="translate(48 34)">
                    <rect x="0" y="0" width="84" height="62" rx="13" fill="#F59E0B" />
                    <rect x="10" y="10" width="64" height="27" rx="6" fill="#183451" />
                    <path d="M16 15h23v3H16z" fill="#7CA6C8" opacity=".8" />
                    <rect x="10" y="43" width="64" height="5" rx="2.5" fill="#D97706" />
                    <rect x="11" y="52" width="13" height="5" rx="2" fill="#FFF1C7" />
                    <rect x="60" y="52" width="13" height="5" rx="2" fill="#FFF1C7" />
                    <circle cx="17" cy="62" r="8" fill="#183451" /><circle cx="67" cy="62" r="8" fill="#183451" />
                    <path d="M-5 19h5v26h-5a5 5 0 0 1-5-5V24a5 5 0 0 1 5-5ZM84 19h5a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5h-5Z" fill="#183451" />
                </g>
                <g className="passenger-empty-magnifier" transform="translate(125 68) rotate(-12)">
                    <circle className="passenger-empty-lens-halo" cx="0" cy="0" r="29" fill="none" stroke="#F7C66C" strokeWidth="2" />
                    <circle cx="0" cy="0" r="23" fill="#FFFEFB" stroke="#183451" strokeWidth="8" />
                    <path d="M-10 -13A17 17 0 0 1 4 -17" fill="none" stroke="#C9DDEB" strokeWidth="3" strokeLinecap="round" />
                    <path d="M17 17 39 39" stroke="#183451" strokeWidth="10" strokeLinecap="round" />
                    <path d="M17 17 39 39" stroke="#6F8CA4" strokeWidth="3" strokeLinecap="round" />
                </g>
                <path d="M28 42l4 5 7-9" fill="none" stroke="#D5E9D8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
        {large ? <h2>{message}</h2> : <p>{message}</p>}
        {description && <p>{description}</p>}
        {actionLabel && <button type="button" onClick={onAction}>{actionLabel}</button>}
    </div>;
}
