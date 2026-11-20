import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import BrandLogo from "../../../components/common/BrandLogo";
import Icon from "../../../components/common/Icon";
import HomeHeader from "../../../components/home/HomeHeader";
import TransportSystemCard from "../../../components/home/TransportSystemCard";
import { TransportEmptyState, TransportErrorState, TransportSkeletonList } from "../../../components/home/TransportListStates";
import { getCurrentUser } from "../../auth/services/authService";
import { getTransportSystems } from "../services/transportService";
import { checkTransportSystemMembership, getMyMembershipsPage, requestTransportMembership } from "../../memberships/services/membershipService";
import heroIllustration from "../../../assets/bustrackr/auth-illustration.jpg";
import mySystemPublicImage from "../../../assets/bustrackr/my-system-public.jpg";
import mySystemPrivateImage from "../../../assets/bustrackr/my-system-private.jpg";
import { handleIllustrationError } from "../../../components/common/imageFallback";

const FILTERS = [
    { value: "ALL", label: "All" },
    { value: "PUBLIC", label: "Public", icon: "bus" },
    { value: "PRIVATE", label: "Private", icon: "lock" },
];

function getErrorMessage(error, fallback) {
    return error?.response?.data?.message || error?.response?.data?.msg || error?.response?.data?.error || error?.message || fallback;
}

function membershipForSystem(memberships, systemId) {
    return memberships.find((member) => String(member.transportSystemId) === String(systemId)) ?? null;
}

export default function HomePage() {
    const { isAuthenticated, userId, selectTransportSystem, selectPublicTransportSystem } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const mySystemsRef = useRef(null);

    const [systems, setSystems] = useState([]);
    const [systemsLoading, setSystemsLoading] = useState(true);
    const [systemsError, setSystemsError] = useState("");
    const [query, setQuery] = useState("");
    const [submittedQuery, setSubmittedQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [memberships, setMemberships] = useState([]);
    const [membershipsLoading, setMembershipsLoading] = useState(false);
    const [membershipsResolved, setMembershipsResolved] = useState(false);
    const [membershipsError, setMembershipsError] = useState("");
    const [membershipsPageInfo, setMembershipsPageInfo] = useState({ page: 0, size: 10, totalElements: 0, totalPages: 1, last: true });
    const [mySystemsMoreLoading, setMySystemsMoreLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [notice, setNotice] = useState(location.state?.authNotice || "");
    const [selectedSystem, setSelectedSystem] = useState(null);
    const [showAllSystems, setShowAllSystems] = useState(false);
    const [showAllMySystems, setShowAllMySystems] = useState(false);

    const loadSystems = useCallback(async () => {
        setSystemsLoading(true);
        setSystemsError("");
        try {
            const data = await getTransportSystems({ page: 0, size: 50, query: submittedQuery });
            setSystems(data.filter((system) => String(system.status ?? "ACTIVE").toUpperCase() !== "INACTIVE"));
        } catch (error) {
            setSystemsError(getErrorMessage(error, "Couldn't load transport systems"));
        } finally {
            setSystemsLoading(false);
        }
    }, [submittedQuery]);

    const loadMyMemberships = useCallback(async () => {
        if (!isAuthenticated) {
            setMemberships([]);
            setMembershipsPageInfo({ page: 0, size: 10, totalElements: 0, totalPages: 1, last: true });
            setMembershipsError("");
            setCurrentUser(null);
            setMembershipsLoading(false);
            setMembershipsResolved(false);
            return;
        }
        setMembershipsLoading(true);
        setMembershipsResolved(false);
        setMembershipsError("");
        try {
            const [membershipPage, user] = await Promise.all([
                getMyMembershipsPage({ page: 0, size: 10 }),
                getCurrentUser(userId).catch(() => null),
            ]);
            setMemberships((previous) => {
                const previousBySystem = new Map(previous.map((member) => [String(member.transportSystemId), member]));
                const incoming = membershipPage.items.map((member) => {
                    const old = previousBySystem.get(String(member.transportSystemId));
                    return {
                        ...member,
                        status: member.status ?? old?.status ?? null,
                        role: member.role ?? old?.role ?? null,
                    };
                });
                const incomingIds = new Set(incoming.map((member) => String(member.transportSystemId)));
                // Preserve newly submitted PENDING/REJECTED request states if the
                // /transport-systems/my DTO intentionally contains system fields only.
                const localRequestStates = previous.filter((member) =>
                    member.status && !incomingIds.has(String(member.transportSystemId))
                );
                return [...incoming, ...localRequestStates];
            });
            setMembershipsPageInfo(membershipPage.pageInfo);
            setShowAllMySystems(false);
            setCurrentUser(user);
            setMembershipsResolved(true);
        } catch (error) {
            setMembershipsError(getErrorMessage(error, "Unable to load your systems."));
            setMembershipsResolved(true);
        } finally {
            setMembershipsLoading(false);
        }
    }, [isAuthenticated, userId]);

    useEffect(() => { loadSystems(); }, [loadSystems]);
    useEffect(() => { loadMyMemberships(); }, [loadMyMemberships]);

    useEffect(() => {
        const privateSystem = location.state?.privateSystem;
        if (privateSystem?.name && isAuthenticated) {
            setNotice(`You're signed in. Select ${privateSystem.name} to check your access or request membership.`);
            return;
        }
        if (location.state?.authNotice) setNotice(location.state.authNotice);
    }, [isAuthenticated, location.state]);

    const visibleSystems = useMemo(() => systems.filter((system) => {
        const accessType = String(system.accessType ?? "").toUpperCase();
        return activeFilter === "ALL" || accessType === activeFilter;
    }), [systems, activeFilter]);

    function clearFilters() {
        setQuery("");
        setSubmittedQuery("");
        setActiveFilter("ALL");
    }

    async function handleRequestAccess(system) {
        try {
            const response = await requestTransportMembership(system.id);
            const returnedMembership = response?.membership ?? response?.data ?? response;
            const responseStatus = String(returnedMembership?.status ?? "PENDING").toUpperCase();
            const normalizedMembership = {
                ...returnedMembership,
                transportSystemId: returnedMembership?.transportSystemId ?? system.id,
                status: responseStatus,
                role: returnedMembership?.role ?? null,
            };

            setMemberships((previous) => {
                const existing = membershipForSystem(previous, system.id);
                if (existing) {
                    return previous.map((member) => String(member.transportSystemId) === String(system.id)
                        ? { ...member, ...normalizedMembership }
                        : member);
                }
                return [...previous, normalizedMembership];
            });

            if (responseStatus === "ACTIVE") setNotice(`You already have access to ${system.name}.`);
            else if (responseStatus === "PENDING") setNotice(`Your access request for ${system.name} is pending admin approval.`);
            else if (responseStatus === "REJECTED") setNotice(`Your request for ${system.name} was rejected. You can try again later.`);
            else setNotice(response?.msg || response?.message || `Your access request for ${system.name} was processed.`);
            setSelectedSystem((current) => String(current?.id) === String(system.id)
                ? { ...current, accessCheckLoading: false, accessState: responseStatus, accessMessage: response?.msg || response?.message || `Your request status is ${responseStatus.toLowerCase()}.` }
                : current);
            await loadMyMemberships();
        } catch (error) {
            throw new Error(getErrorMessage(error, "Unable to submit your access request."));
        }
    }

    async function handleSelectTransportSystem(system) {
        setNotice("");
        setSelectedSystem({ ...system, accessCheckLoading: true, accessState: null, accessMessage: "Checking your access…", detailError: "" });

        try {
            // This check runs only after the user selects a system. It works for guests too.
            const check = await checkTransportSystemMembership(system.id);
            const accessType = String(check?.accessType ?? system.accessType ?? "").toUpperCase();
            const loggedIn = Boolean(check?.isUserLoggedIn ?? isAuthenticated);
            const hasMembership = Boolean(check?.isMember);
            const memberStatus = String(check?.status ?? "").toUpperCase();
            const role = String(check?.role ?? "").replace(/^ROLE_/i, "").toUpperCase();
            const refreshedSystem = { ...system, accessType };

            if (!loggedIn) {
                if (accessType === "PRIVATE") {
                    setSelectedSystem(null);
                    navigate("/login", { state: { privateSystem: { id: system.id, name: system.name } } });
                    return;
                }
                await openPublicSystem(refreshedSystem);
                return;
            }

            // An ACTIVE membership is the only case that should exchange a USER token for a MEMBER token.
            if (hasMembership && memberStatus === "ACTIVE") {
                await selectTransportSystem(system.id);
                if (role === "DRIVER") {
                    setSelectedSystem(null);
                    navigate("/driver");
                    return;
                }

                if (role === "ADMIN") {
                    // The member token has been obtained for this approved system.
                    // Continue directly into the implemented Admin workspace instead
                    // of showing the old informational placeholder dialog.
                    setSelectedSystem(null);
                    navigate("/admin", {
                        state: {
                            transportSystem: refreshedSystem,
                            accessType,
                            role,
                        },
                    });
                    return;
                }
                setSelectedSystem(null);
                navigate("/passenger", { state: { system: refreshedSystem, accessType, role, memberMode: true } });
                return;
            }

            // Public systems remain browsable without an active membership.
            if (accessType === "PUBLIC") {
                await openPublicSystem(refreshedSystem, hasMembership ? memberStatus : null);
                return;
            }

            if (hasMembership && memberStatus === "PENDING") {
                setSelectedSystem({ ...refreshedSystem, accessCheckLoading: false, accessState: "PENDING", accessMessage: `Your access request for ${system.name} is awaiting admin approval.` });
                return;
            }

            if (hasMembership && memberStatus === "REJECTED") {
                setSelectedSystem({ ...refreshedSystem, accessCheckLoading: false, accessState: "REJECTED", accessMessage: `Your previous request for ${system.name} was rejected. You can request access again.` });
                return;
            }

            setSelectedSystem({ ...refreshedSystem, accessCheckLoading: false, accessState: "REQUEST_ACCESS", accessMessage: `You don't have access to ${system.name} yet. Send a request to the transport admin.` });
        } catch (error) {
            setSelectedSystem({ ...system, accessCheckLoading: false, accessState: "ERROR", accessMessage: getErrorMessage(error, "Unable to check access for this transport system."), detailError: getErrorMessage(error, "Unable to check access for this transport system.") });
        }
    }

    async function openPublicSystem(system, membershipStatus = null) {
        selectPublicTransportSystem(system.id);
        navigate("/passenger", { state: { system, accessType: "PUBLIC", membershipStatus, memberMode: false } });
    }

    async function handleTryAgainRequest(system) {
        try {
            await handleRequestAccess(system);
        } catch (error) {
            setSelectedSystem((current) => String(current?.id) === String(system.id)
                ? { ...current, accessMessage: getErrorMessage(error, "Unable to submit your access request.") }
                : current);
        }
    }

    function scrollToMySystems() {
        mySystemsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function toggleMySystemsView() {
        if (showAllMySystems) {
            setShowAllMySystems(false);
            return;
        }

        const loadedPages = Math.max(1, Math.ceil(memberships.length / membershipsPageInfo.size));
        if (membershipsPageInfo.totalPages > loadedPages) {
            setMySystemsMoreLoading(true);
            setMembershipsError("");
            try {
                const remainingPages = [];
                for (let page = loadedPages; page < membershipsPageInfo.totalPages; page += 1) {
                    remainingPages.push(page);
                }
                const pages = await Promise.all(remainingPages.map((page) =>
                    getMyMembershipsPage({ page, size: membershipsPageInfo.size })
                ));
                const allRecords = [...memberships, ...pages.flatMap((result) => result.items)];
                const uniqueRecords = new Map();
                allRecords.forEach((member) => {
                    uniqueRecords.set(String(member.id ?? member.transportSystemId), member);
                });
                setMemberships([...uniqueRecords.values()]);
            } catch (error) {
                setMembershipsError(getErrorMessage(error, "Unable to load all your systems."));
                return;
            } finally {
                setMySystemsMoreLoading(false);
            }
        }
        setShowAllMySystems(true);
    }

    const mySystems = useMemo(() => memberships
        .map((member) => ({
            member,
            system: member.system ?? systems.find((system) => String(system.id) === String(member.transportSystemId)),
        }))
        .filter((entry) => entry.system && String(entry.system.status ?? "ACTIVE").toUpperCase() !== "INACTIVE"), [memberships, systems]);
    const displayedSystems = showAllSystems ? visibleSystems : visibleSystems.slice(0, 3);

    return (
        <main className="home-page">
            <div className="home-shell">
                <HomeHeader user={currentUser} onMySystems={scrollToMySystems} />

                <section className="home-hero" aria-labelledby="home-heading">
                    <div className="home-hero__copy">
                        <h1 id="home-heading">Find your bus.<br /><span>Travel smarter.</span></h1>
                        <p className="home-hero__subtitle">Explore routes, stops and live bus locations near you.</p>
                    </div>
                    <img className="home-hero__art" src={heroIllustration} alt="A city bus at a bus stop" onError={handleIllustrationError} />
                </section>

                <button type="button" className="home-create-system-cta" onClick={() => navigate(isAuthenticated ? "/transport-systems/create" : "/login", { state: isAuthenticated ? undefined : { returnTo: "/transport-systems/create", authNotice: "Log in to create a transport system." } })}>
                    <span className="home-create-system-cta__icon"><Icon name="plus" size={22} /></span>
                    <span className="home-create-system-cta__copy"><strong>Create a transport system</strong><small>{isAuthenticated ? "Set up your network and manage it as an admin." : "Log in with your user account to get started."}</small></span>
                    <Icon name="arrow-right" size={19} className="home-create-system-cta__arrow" />
                </button>

                <form className="transport-search" onSubmit={(event) => { event.preventDefault(); setSubmittedQuery(query.trim()); }} role="search">
                    <Icon name="search" size={23} className="transport-search__leading" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by name or city"
                        aria-label="Search by name or city"
                    />
                    <button type="submit" className="transport-search__submit" aria-label="Search transport systems">
                        <Icon name="search" size={23} />
                    </button>
                </form>

                <div className="transport-filters" role="group" aria-label="Filter transport systems">
                    {FILTERS.map((filter) => (
                        <button
                            type="button"
                            key={filter.value}
                            className={`filter-chip ${activeFilter === filter.value ? "filter-chip--active" : ""}`}
                            aria-pressed={activeFilter === filter.value}
                            onClick={() => setActiveFilter(filter.value)}
                        >
                            {filter.icon && <Icon name={filter.icon} size={17} />}
                            {filter.label}
                        </button>
                    ))}
                </div>

                {notice && (
                    <div className="home-notice" role="status">
                        <Icon name="info" size={18} />
                        <span>{notice}</span>
                        <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}><Icon name="x" size={17} /></button>
                    </div>
                )}

                {isAuthenticated && (
                    <section className="my-systems-section" ref={mySystemsRef} aria-labelledby="my-systems-heading">
                        <div className="section-heading">
                            <h2 id="my-systems-heading">My systems</h2>
                            {(mySystems.length > 2 || membershipsPageInfo.totalElements > 2) && <button className="section-link" type="button" onClick={toggleMySystemsView} disabled={mySystemsMoreLoading}>{mySystemsMoreLoading ? "Loading…" : showAllMySystems ? "Show less" : "View all"} {!mySystemsMoreLoading && <Icon name="arrow-right" size={17} />}</button>}
                        </div>
                        {membershipsLoading || systemsLoading ? (
                            <div className="my-systems-loading"><span /><span /></div>
                        ) : membershipsError ? (
                            <div className="membership-load-error" role="alert">
                                <span>{membershipsError}</span>
                                <button type="button" className="text-action" onClick={loadMyMemberships}>Try again</button>
                            </div>
                        ) : systemsError ? (
                            <div className="membership-load-error" role="alert">Transport details couldn't be loaded for your memberships. Retry from Explore transport systems.</div>
                        ) : mySystems.length ? (
                            <div className={`my-systems-list ${showAllMySystems ? "my-systems-list--expanded" : ""}`}>
                                {mySystems.map(({ member, system }) => {
                                    const status = String(member.status ?? "").toUpperCase();
                                    const statusLabel = status ? status.charAt(0) + status.slice(1).toLowerCase() : "";
                                    return (
                                        <button type="button" className="my-system-card" key={member.id ?? `${system.id}-${status}`} onClick={() => handleSelectTransportSystem(system)}>
                                            <span className="my-system-card__image-wrap"><img src={String(system.accessType).toUpperCase() === "PUBLIC" ? mySystemPublicImage : mySystemPrivateImage} alt="" onError={handleIllustrationError} />
                                                {statusLabel && <span className={`membership-chip membership-chip--${status.toLowerCase()}`}>
                                                    {status === "ACTIVE" ? <Icon name="check" size={13} /> : status === "PENDING" ? <Icon name="clock" size={13} /> : <Icon name="x" size={13} />}
                                                    {statusLabel}
                                                </span>}
                                            </span>
                                            <span className="my-system-card__name">{system.name}</span>
                                            <span className="my-system-card__city"><Icon name="pin" size={13} />{system.city || system.area || "Location not specified"}</span>
                                            {status === "ACTIVE" || (!status && member.fromMySystems) ? <span className="my-system-card__action">Open</span> : status === "PENDING" ? <span className="my-system-card__action my-system-card__action--muted">Request pending</span> : status === "REJECTED" ? <span className="my-system-card__action my-system-card__action--rejected">Request rejected</span> : <span className="my-system-card__action">Check access</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="my-systems-empty">
                                <Icon name="bus" size={24} />
                                <span>You are not part of any transport system yet.</span>
                            </div>
                        )}
                    </section>
                )}

                <section className="transport-list-section" aria-labelledby="explore-heading">
                    <div className="section-heading">
                        <div>
                            <h2 id="explore-heading">Explore transport systems</h2>
                        </div>
                        {visibleSystems.length > 3 && <button className="section-link" type="button" onClick={() => setShowAllSystems((shown) => !shown)}>{showAllSystems ? "Show less" : "View all"} <Icon name="arrow-right" size={17} /></button>}
                    </div>

                    {systemsLoading ? <TransportSkeletonList /> : systemsError ? (
                        <TransportErrorState onRetry={loadSystems} />
                    ) : visibleSystems.length === 0 ? (
                        <TransportEmptyState onClear={clearFilters} />
                    ) : (
                        <div className="transport-system-list">
                            {displayedSystems.map((system) => (
                                <TransportSystemCard
                                    key={system.id}
                                    system={system}
                                    membership={membershipForSystem(memberships, system.id)}
                                    onRequestAccess={handleRequestAccess}
                                    onSelectSystem={handleSelectTransportSystem}
                                />
                            ))}
                        </div>
                    )}
                    {!systemsLoading && !systemsError && visibleSystems.length > 0 && (
                        <p className="private-access-note"><Icon name="info" size={17} />Private systems need approval from the transport admin.</p>
                    )}
                </section>

                <footer className="home-footer">
                    <div className="home-footer__brand">About BusTrackr</div>
                    <nav aria-label="Footer"><button type="button" onClick={() => setSelectedSystem({ informational: "About BusTrackr", description: "BusTrackr helps passengers discover public transport, request access to private systems, and follow bus locations." })}>About</button><span /> <button type="button" onClick={() => setSelectedSystem({ informational: "Help", description: "Help and support contact details will be added when the support channel is configured." })}>Help</button><span /> <button type="button" onClick={() => setSelectedSystem({ informational: "Privacy", description: "BusTrackr uses account and transport membership information to provide access to transport systems." })}>Privacy</button></nav>
                </footer>
            </div>

            {selectedSystem && (
                <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSystem(null); }}>
                    <section className="system-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="system-preview-title">
                        <button type="button" className="dialog-close" onClick={() => setSelectedSystem(null)} aria-label="Close"><Icon name="x" size={20} /></button>
                        <BrandLogo size="md" />
                        <h2 id="system-preview-title">{selectedSystem.informational || selectedSystem.name}</h2>
                        {selectedSystem.city && <p className="system-preview-city"><Icon name="pin" size={17} /> {selectedSystem.city}</p>}
                        <p>{selectedSystem.description || "Transport system information"}</p>
                        {selectedSystem.accessCheckLoading && <p role="status">Checking your membership…</p>}
                        {selectedSystem.detailLoading && <p role="status">Loading transport details…</p>}
                        {selectedSystem.detailError && <p className="inline-error" role="alert">{selectedSystem.detailError}</p>}
                        {selectedSystem.accessMessage && !selectedSystem.accessCheckLoading && <p className={`system-access-message ${selectedSystem.accessState === "ERROR" ? "system-access-message--error" : ""}`} role={selectedSystem.accessState === "ERROR" ? "alert" : "status"}>{selectedSystem.accessMessage}</p>}
                        {selectedSystem.selectedRole && <p className="system-preview-role">Selected membership: {selectedSystem.selectedRole}</p>}
                        {selectedSystem.transportCode && <p className="system-preview-note">Transport code: {selectedSystem.transportCode}</p>}
                        {(selectedSystem.accessState === "PUBLIC" || selectedSystem.accessState === "ACTIVE") && <p className="system-preview-note">Routes, stops and live bus tracking will be added to the transport details experience in the next stage.</p>}
                        {selectedSystem.accessState === "REQUEST_ACCESS" && <button type="button" className="button button--amber button--full" onClick={() => handleTryAgainRequest(selectedSystem)}>Request access</button>}
                        {selectedSystem.accessState === "REJECTED" && <button type="button" className="button button--amber button--full" onClick={() => handleTryAgainRequest(selectedSystem)}>Try again</button>}
                        {selectedSystem.accessState === "ERROR" && <button type="button" className="button button--amber button--full" onClick={() => handleSelectTransportSystem(selectedSystem)}>Try again</button>}
                        <button type="button" className="button button--navy button--full" onClick={() => setSelectedSystem(null)}>Back to transport systems</button>
                    </section>
                </div>
            )}
        </main>
    );
}
