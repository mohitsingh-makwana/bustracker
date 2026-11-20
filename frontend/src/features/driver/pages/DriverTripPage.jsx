import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Icon from "../../../components/common/Icon";
import LeafletMap from "../../../components/maps/LeafletMap";
import { BrandMark } from "../../../components/common/BrandLogo";
import { useAuth } from "../../../context/AuthContext";
import { useDriverLocationSender } from "../../tracking/context/DriverLocationContext";
import {
    completeDriverTrip,
    getCurrentDriverTrip,
    getTripStops,
    terminateDriverTrip,
} from "../services/driverService";
import { formatDistance, formatTime, getErrorMessage, normalizeDriverTrip, normalizeStops } from "../driverUtils";
import { DriverAppShell, DriverConfirmDialog, DriverError, DriverLoading } from "../components";
import "../../../styles/driver.css";
import { formatStopArrivalTime } from "../../../utils/stopArrivalTime";

function DriverRouteMap({ stops, arrivedIndex, nextStopIndex, locationError, gpsPosition, speedKmh, routeGeometry }) {
    // Derive a safe local index as a guard against missing/undefined props during first render.
    const effectiveNextStopIndex = Number.isInteger(nextStopIndex)
        ? Math.max(0, Math.min(nextStopIndex, Math.max(stops.length - 1, 0)))
        : (stops.length ? Math.min(arrivedIndex + 1, stops.length - 1) : 0);
    return (
        <section className="driver-map-card driver-map-card--navigation">
            <LeafletMap
                buses={gpsPosition ? [{ ...gpsPosition, id:"driver-current-location", tripId:"driver-current-location", point:{lat:gpsPosition.lat ?? gpsPosition.latitude,lng:gpsPosition.lng ?? gpsPosition.longitude}, heading:gpsPosition.headingDegrees, stale:locationError }] : []}
                stops={stops.map((stop,index)=>({...stop,statusKey:index<=arrivedIndex?'passed':index===effectiveNextStopIndex?'next':index===stops.length-1?'destination':'upcoming'}))}
                height={420} fitRoute follow roadRoute routeGeometry={routeGeometry} speedKmh={speedKmh}
            />
            {(!gpsPosition || !stops.some((stop) => Number.isFinite(Number(stop.latitude ?? stop.lat)))) && <p className="driver-map-note">The map uses real GPS and stop coordinates when available.</p>}
        </section>
    );
}

export default function DriverTripPage() {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const [trip, setTrip] = useState(location.state?.trip ? normalizeDriverTrip(location.state.trip) : null);
    const [stops, setStops] = useState([]);
    const [loading, setLoading] = useState(!location.state?.trip);
    const [pageError, setPageError] = useState("");
    const locationSender = useDriverLocationSender();
    const gpsPosition = locationSender.position;
    const [gpsError, setGpsError] = useState("");
    const [sendError, setSendError] = useState(null);
    const [gpsEnabled, setGpsEnabled] = useState(true);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

    const [showStops, setShowStops] = useState(false);
    const [dialog, setDialog] = useState(null);
    const [actionBusy, setActionBusy] = useState(false);
    const lastSubmitRef = useRef(0);
    const sendingRef = useRef(false);
    const [now, setNow] = useState(Date.now());

    const loadTrip = useCallback(async () => {
        setPageError("");
        // Avoid unsupported GET /trips/{id} for driver accounts. Start/resume passes
        // the selected trip in router state; refresh falls back to the current-trip API.
        let tripData = location.state?.trip && String(location.state.trip.id ?? location.state.trip.tripId) === String(tripId)
            ? location.state.trip : null;
        try {
            const current = await getCurrentDriverTrip();
            if (String(current?.id ?? current?.tripId) === String(tripId)) tripData = { ...(tripData ?? {}), ...current };
        } catch (error) {
            if (!tripData) setPageError(getErrorMessage(error, "Couldn't load your active trip. Return to the dashboard and resume the trip."));
        }
        if (tripData) setTrip(normalizeDriverTrip(tripData));
        else setPageError((previous) => previous || "This trip isn't available as your current driver trip. Return to the dashboard and select Resume trip.");
        try {
            const stopsData = await getTripStops(tripId);
            setStops(normalizeStops(stopsData));
        } catch (error) {
            setStops([]);
            setPageError((previous) => previous || `Trip loaded, but its stops couldn't be loaded: ${getErrorMessage(error)}`);
        }
        setLoading(false);
    }, [tripId]);

    useEffect(() => { loadTrip(); }, [loadTrip]);
    useEffect(() => {
        const onlineHandler = () => setOnline(true);
        const offlineHandler = () => setOnline(false);
        window.addEventListener("online", onlineHandler);
        window.addEventListener("offline", offlineHandler);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.removeEventListener("online", onlineHandler);
            window.removeEventListener("offline", offlineHandler);
            window.clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        if (tripId && trip && stops.length && !locationSender.isActive) {
            locationSender.start({ tripId, stops, pingIntervalSeconds: trip?.pingIntervalSeconds ?? 5 });
        }
        return () => {
            if (locationSender.isActive && String(locationSender.tripId) === String(tripId)) {
                locationSender.stop('idle');
            }
        };
    }, [tripId, trip?.id, stops.length]);
    useEffect(() => {
        setGpsError(locationSender.error || '');
        setLastUpdatedAt(locationSender.lastSuccessAt || null);
    }, [locationSender.status, locationSender.error, locationSender.lastSuccessAt]);

    // Stop progress comes from the backend live-location response; the driver
    // UI no longer advances stops manually or from browser-side geofence checks.
    const arrivedIndex = Number.isInteger(locationSender.progress?.currentIndex)
        ? Math.max(-1, Math.min(locationSender.progress.currentIndex, stops.length - 1))
        : -1;
    const nextStopIndex = stops.length ? Math.min(arrivedIndex + 1, stops.length - 1) : 0;
    const nextStop = stops[nextStopIndex] ?? null;
    const destination = stops.length ? stops[stops.length - 1] : null;
    const isAtDestination = stops.length > 0 && arrivedIndex >= stops.length - 1;
    const locationProblem = !online || Boolean(gpsError) || Boolean(sendError) || ['retrying','location-off','session-expired','trip-not-active'].includes(locationSender.status);
    const updatedText = lastUpdatedAt ? `Updated ${Math.max(0, Math.floor((now - lastUpdatedAt) / 1000))} sec ago` : "Waiting for first GPS update";
    const driverName = trip?.driverName ?? "Driver";

    async function confirmFinish() {
        setActionBusy(true);
        setPageError("");
        const terminatedEarly = !isAtDestination;
        try {
            const response = terminatedEarly ? await terminateDriverTrip(tripId) : await completeDriverTrip(tripId);
            locationSender.stop('idle');
            const merged = {
                ...(trip ?? {}),
                ...(response ?? {}),
                // Action responses contain the authoritative trip ID; don't
                // let a stale listing field override it during normalization.
                id: response?.id ?? response?.tripId ?? tripId,
                tripId: response?.id ?? response?.tripId ?? tripId,
            };
            const finishedTrip = normalizeDriverTrip(merged);
            navigate("/driver/trips/completed", {
                replace: true,
                state: {
                    trip: finishedTrip,
                    stopsCovered: Math.min(arrivedIndex + 1, stops.length),
                    totalStops: stops.length,
                    terminatedEarly,
                },
            });
        } catch (error) {
            setPageError(getErrorMessage(error, terminatedEarly ? "The trip couldn't be terminated." : "The trip couldn't be completed."));
            setDialog(null);
        } finally {
            setActionBusy(false);
        }
    }

    if (loading) return <DriverAppShell name={driverName} hideNav hideHeader><DriverLoading message="Loading your active trip…" /></DriverAppShell>;

    return (
        <DriverAppShell name={`${trip?.originStopName ?? "Trip"} → ${trip?.destinationStopName ?? "Details"}`} hideNav hideHeader>
            <div className="driver-trip-page">
                <div className="driver-trip-status-row">
                    <button className="driver-trip-brand-button" onClick={() => navigate("/driver")} aria-label="Back to dashboard"><BrandMark size={38} /></button>
                    <div className="driver-trip-status-route">{trip?.originStopName ?? "Origin"} <span>→</span> {trip?.destinationStopName ?? "Destination"}</div>
                    <div className={`driver-map-status ${locationProblem ? "driver-map-status--warning" : ""}`}><i />{{sending:"Sending",retrying:"Retrying", "location-off":"Location off","weak-gps":"Weak GPS","session-expired":"Session expired","trip-not-active":"Trip not active",error:"Location error"}[locationSender.status] ?? (locationProblem ? "Retrying" : "Sending")}</div>
                </div>
                {(sendError?.kind === "session" || locationSender.status === "session-expired") && <div className="driver-dialog-backdrop" role="presentation"><section className="driver-dialog" role="dialog" aria-modal="true" aria-labelledby="driver-session-title"><div className="driver-dialog__symbol driver-dialog__symbol--warning"><Icon name="alert" size={30} /></div><h2 id="driver-session-title">Session expired</h2><p>Sign in again to keep sharing your location.</p><button className="driver-button driver-button--primary driver-button--wide" onClick={() => { logout(); navigate("/login"); }}>Sign in again</button></section></div>}
                {(sendError || locationSender.error) && locationSender.status !== "session-expired" && <div className={`driver-alert ${sendError?.kind === "offline" || !navigator.onLine ? "driver-alert--warning" : "driver-alert--danger"}`}><Icon name="alert" size={18} /><span>{sendError?.message ?? locationSender.error}</span><button onClick={() => { setSendError(null); }}>Dismiss</button></div>}
                {gpsError && <div className="driver-alert driver-alert--danger"><Icon name="alert" size={18} /><span>{gpsError.includes("permission") ? "Location is off. Passengers can't see your bus." : `GPS issue: ${gpsError}`}</span><button onClick={() => { locationSender.start({ tripId, stops, pingIntervalSeconds: trip?.pingIntervalSeconds ?? 5 }); }}>Retry GPS</button></div>}
                {gpsPosition?.accuracyMeters > 80 && <div className="driver-alert driver-alert--warning"><Icon name="alert" size={18} /><span>GPS signal weak. Move to an open area for a better signal.</span></div>}
                <DriverRouteMap stops={stops} arrivedIndex={arrivedIndex} nextStopIndex={nextStopIndex} locationError={locationProblem} gpsPosition={gpsPosition} speedKmh={locationSender.speedKmh} routeGeometry={locationSender.routeGeometry ?? trip?.routeGeometry} />
                {!locationSender.wakeLockAvailable && <div className="driver-alert driver-alert--warning">Keep this screen open while driving so location updates can continue.</div>}
                <div className="driver-location-stamp"><span className={lastUpdatedAt ? "is-on" : ""} /><span>{updatedText}</span>{gpsPosition && <small>± {Math.round(gpsPosition.accuracyMeters ?? 0)} m</small>}</div>

                <section className="driver-trip-detail-sheet">
                    <div className="driver-sheet-grabber" />
                    <div className="driver-trip-detail-heading"><h1>{trip?.originStopName ?? "Origin"} <span>→</span> {trip?.destinationStopName ?? "Destination"}</h1><span className="driver-live-chip"><i /> Active trip</span></div>
                    <div className="driver-trip-info-grid">
                        <div className="driver-trip-info-tile"><span className="driver-info-icon"><Icon name="pin" size={23} /></span><div><small>Next stop</small><strong>{isAtDestination ? "Destination reached" : nextStop?._name ?? "Stop information unavailable"}</strong><span>{locationSender.distanceToNext != null ? `${formatDistance(Number(locationSender.distanceToNext) / 1000)} away` : (stops.length ? `Stop ${Math.min(nextStopIndex + 1, stops.length)} of ${stops.length}` : "Waiting for GPS distance")}</span></div></div>
                        <div className="driver-trip-info-tile"><span className="driver-info-icon"><Icon name="flag" size={23} /></span><div><small>Destination</small><strong>{trip?.destinationStopName ?? destination?._name ?? "Destination"}</strong><span>{locationSender.remainingDistance != null ? `${formatDistance(Number(locationSender.remainingDistance) / 1000)} remaining` : (trip?.distanceKm != null ? `${formatDistance(trip.distanceKm)} travelled` : "Distance updates as GPS arrives")}</span></div></div>
                    </div>
                    <div className="driver-trip-bus-row"><div><Icon name="bus" size={22} /><span><small>Bus number</small><strong>{trip?.busNumber ?? "Not available"}</strong></span></div><div><Icon name="user" size={22} /><span><small>Driver</small><strong>{driverName}</strong></span></div></div>

                    {stops.length > 0 && <section className="driver-stops-panel">
                        <button className="driver-stops-toggle" onClick={() => setShowStops((value) => !value)} aria-expanded={showStops}><span><Icon name="route" size={20} /> Stops <small>{Math.max(0, arrivedIndex + 1)} of {stops.length} reached</small></span><Icon name={showStops ? "chevron-up" : "chevron-down"} size={20} /></button>
                        {showStops && <div className="driver-stop-list">{stops.map((stop, index) => {
                            const passed = index <= arrivedIndex;
                            const next = index === nextStopIndex && !isAtDestination;
                            return <div className={`driver-stop-row ${passed ? "is-passed" : ""} ${next ? "is-next" : ""}`} key={`${stop.id ?? stop.stopId ?? stop._sequence}-${stop._sequence}`}>
                                <span className="driver-stop-rail"><i>{passed ? <Icon name="check" size={13} /> : index + 1}</i></span>
                                <div className="driver-stop-row__name"><strong>{stop._name}</strong>{index === 0 && <em>Start</em>}{index === stops.length - 1 && <em className="is-destination">Destination</em>}{next && <em>Next</em>}<b className={`driver-stop-arrival-time ${stop.stopArrivalTime ? "" : "is-missing"}`}>{formatStopArrivalTime(stop.stopArrivalTime)}</b></div>
                            </div>;
                        })}</div>}
                    </section>}

                    <button className={`driver-button driver-button--wide ${isAtDestination ? "driver-button--primary" : "driver-button--outline"} driver-complete-button`} onClick={() => setDialog(isAtDestination ? "complete" : "early")} disabled={actionBusy}>
                        <Icon name="flag-checkered" size={20} /> Complete trip
                    </button>
                    {pageError && <DriverError message={pageError} onRetry={loadTrip} />}
                    {!stops.length && <p className="driver-map-note">The trip-stops endpoint did not return a stop sequence. You can still terminate or complete the trip, but destination arrival cannot be verified from the available data.</p>}
                </section>
            </div>
            {dialog === "complete" && <DriverConfirmDialog title="Complete this trip?" description="This ends location sharing and makes your bus available for the next trip." confirmLabel="Complete trip" onConfirm={confirmFinish} onCancel={() => setDialog(null)} busy={actionBusy} />}
            {dialog === "early" && <DriverConfirmDialog title={`You haven't reached ${trip?.destinationStopName ?? "your destination"}`} description="Ending now will mark this trip as ended early. Your recorded distance and actual end time will be saved." confirmLabel="End trip anyway" cancelLabel="Keep driving" onConfirm={confirmFinish} onCancel={() => setDialog(null)} busy={actionBusy} warning />}
        </DriverAppShell>
    );
}
