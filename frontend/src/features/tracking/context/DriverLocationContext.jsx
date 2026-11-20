import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { sendDriverLocation } from '../../driver/services/driverService';
import sharedStomp from '../services/sharedStomp';

const DriverLocationContext = createContext(null);
const storageKey = (tripId) => `bustrackr:stop-progress:${tripId}`;
const patternStopId = (stop) => stop?.patternStopId ?? stop?.id;
const orderedStops = (stops = []) => [...stops].sort((a, b) => Number(a.sequence ?? a._sequence) - Number(b.sequence ?? b._sequence));

function restorePointer(tripId, stops, serverNextId) {
  const serverIndex = serverNextId == null ? -1 : stops.findIndex((stop) => String(patternStopId(stop)) === String(serverNextId));
  let currentIndex = -1;
  let nextIndex = stops.length > 0 ? 0 : null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(tripId)) || 'null');
    if (saved?.tripId === String(tripId) && Number.isInteger(saved.currentIndex)) {
      currentIndex = Math.max(
          -1,
          Math.min(saved.currentIndex, Math.max(stops.length - 1, -1))
      );

      nextIndex = currentIndex + 1 < stops.length
          ? currentIndex + 1
          : null;
    }
  } catch { /* storage may be unavailable */ }
  if (serverIndex >= 0) {
    const candidateCurrent = serverIndex - 1;
    if (candidateCurrent > currentIndex) {
      currentIndex = candidateCurrent;
      nextIndex = serverIndex < stops.length ? serverIndex : null;
    }
  }
  return { tripId: String(tripId), stops, currentIndex, nextIndex };
}

function saveProgress(progress) {
  try {
    sessionStorage.setItem(storageKey(progress.tripId), JSON.stringify({ tripId: progress.tripId, currentIndex: progress.currentIndex }));
  } catch { /* best effort */ }
}

function toLocalDateTimeString(timestamp) {
  const date = new Date(timestamp ?? Date.now());
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function DriverLocationProvider({ children }) {
  const { memberToken } = useAuth();
  const [state, setState] = useState({
    status: 'idle', tripId: null, lastSuccessAt: null, error: '', accuracy: null,
    position: null, nextStop: null, remainingDistance: null, distanceToNext: null,
    speedKmh: null, progress: null, routeGeometry: null, wakeLockAvailable: true,
  });
  const active = useRef(null);
  const stopRef = useRef(() => {});

  const stop = useCallback((reason = 'idle') => {
    const session = active.current;
    if (session) {
      session.stopped = true;
      if (session.watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(session.watchId);
      clearInterval(session.timer);
      session.unsubscribe?.();
      session.wakeLock?.release?.().catch(() => {});
      document.removeEventListener('visibilitychange', session.visibility);
    }
    active.current = null;
    setState((s) => ({ ...s, status: reason, tripId: null, progress: null, error: reason === 'idle' ? '' : s.error }));
  }, []);
  stopRef.current = stop;

  const start = useCallback(({ tripId, stops = [], pingIntervalSeconds = 5 }) => {
    stopRef.current('idle');
    if (!tripId) return;
    const normalizedStops = orderedStops(stops);
    const firstSequenceOneStop = normalizedStops.find(
        (stop) => Number(stop.sequence ?? stop._sequence) === 1
    );

    const sequenceOneId = patternStopId(firstSequenceOneStop);
    const session = {
      tripId: String(tripId), stops: normalizedStops,
      interval: Math.max(1, Number(pingIntervalSeconds) || 5) * 1000,
      latest: null, latestNextPatternStopId: sequenceOneId ?? null,
      watchId: null, timer: null, stopped: false, wakeLock: null, sending: false,
      initialLocationReady: false, progress: restorePointer(tripId, normalizedStops, null),
    };
    active.current = session;

    const setStatus = (status, extra = {}) => {
      if (active.current === session && !session.stopped) {
        setState((s) => ({ ...s, status, tripId: session.tripId, progress: session.progress, ...extra }));
      }
    };
    if (!normalizedStops.length) { setStatus('error', { error: 'No pattern stops are available for this trip.' }); return; }
    if (sequenceOneId == null) { setStatus('error', { error: 'The sequence-2 PatternStop ID is missing.' }); return; }
    if (!window.isSecureContext) { setStatus('error', { error: 'Live GPS requires HTTPS (localhost is supported).' }); return; }
    if (!navigator.geolocation) { setStatus('error', { error: 'This device does not support location.' }); return; }

    const handleLiveLocation = (body) => {
      if (active.current !== session || session.stopped || !body) return;
      session.serverLocation = body;
      // Keep the sequence-2 pointer until the backend has returned a non-null next ID.
      if (body.nextPatternStopId != null) {
        session.latestNextPatternStopId = body.nextPatternStopId;
        const serverIndex = session.stops.findIndex((stop) => String(patternStopId(stop)) === String(body.nextPatternStopId));
        if (serverIndex >= 0) {
          session.progress.currentIndex =  serverIndex - 1;
          session.progress.nextIndex = serverIndex < session.stops.length ? serverIndex : null;
          saveProgress(session.progress);
        }
      }
      const hasCoords = Number.isFinite(Number(body.latitude)) && Number.isFinite(Number(body.longitude));
      const responsePosition = hasCoords ? {
        lat: Number(body.latitude), lng: Number(body.longitude),
        latitude: Number(body.latitude), longitude: Number(body.longitude),
        headingDegrees: body.headingDegrees ?? session.latest?.headingDegrees,
      } : null;
      setStatus('sending', {
        ...(responsePosition ? { position: responsePosition } : {}),
        nextStop: body.nextStopName ? { name: body.nextStopName, id: body.nextStopId } : null,
        distanceToNext: body.nextStopDistanceMeters ?? null,
        remainingDistance: body.remainingDistanceMeters ?? null,
        speedKmh: body.speedKmh ?? (body.speedMetersPerSecond == null ? null : Number(body.speedMetersPerSecond) * 3.6),
        routeGeometry: body.routeGeometry ?? null,
        progress: session.progress,
      });
    };

    session.unsubscribeLocation = sharedStomp.subscribe(`/topic/trips/${encodeURIComponent(session.tripId)}/location`, handleLiveLocation);
    session.unsubscribeStatus = sharedStomp.subscribe(`/topic/trips/${encodeURIComponent(session.tripId)}/status`, (event) => {
      if (active.current !== session || session.stopped) return;
      const status = String(event?.status ?? event?.tripStatus ?? '').toUpperCase();
      if (status && status !== 'ACTIVE') {
        stopRef.current('trip-not-active');
        setState((current) => ({
          ...current,
          position: null,
          nextStop: null,
          remainingDistance: null,
          distanceToNext: null,
          speedKmh: null,
          progress: null,
          routeGeometry: null,
          lastSuccessAt: null,
        }));
      }
    });
    session.unsubscribe = () => {
      session.unsubscribeLocation?.();
      session.unsubscribeStatus?.();
    };

    const acquireWake = async () => {
      try {
        if ('wakeLock' in navigator) {
          session.wakeLock = await navigator.wakeLock.request('screen');
          setStatus('sending', { wakeLockAvailable: true });
        } else setStatus('sending', { wakeLockAvailable: false });
      } catch { setStatus('sending', { wakeLockAvailable: false }); }
    };
    const visibility = () => {
      if (document.visibilityState === 'visible' && !session.stopped) acquireWake();
    };
    session.visibility = visibility;
    document.addEventListener('visibilitychange', visibility);
    acquireWake();

    session.watchId = navigator.geolocation.watchPosition((pos) => {
      session.latest = {
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy ?? null, speedMetersPerSecond: pos.coords.speed ?? null,
        headingDegrees: pos.coords.heading ?? null,
        capturedAtMs: pos.timestamp || Date.now(),
        recordedAt: toLocalDateTimeString(pos.timestamp || Date.now()),
      };
      setStatus(Number(pos.coords.accuracy) > 50 ? 'weak-gps' : 'sending', {
        accuracy: pos.coords.accuracy ?? null,
        position: { lat: pos.coords.latitude, lng: pos.coords.longitude, latitude: pos.coords.latitude, longitude: pos.coords.longitude, headingDegrees: pos.coords.heading },
        error: '',
      });
      if (!session.firstPingSent) { session.firstPingSent = true; send(); }
    }, (err) => {
      if (err.code === 1) setStatus('location-off', { error: 'Location permission needed. Allow location access to share your trip.' });
      else setStatus('retrying', { error: 'GPS signal unavailable. Waiting for a new reading.' });
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 });

    function send() {
      if (session.stopped || active.current !== session || !session.latest || session.sending) return;
      if (!navigator.onLine) { setStatus('retrying', { error: 'Offline. Retrying location updates.' }); return; }
      const nextPatternStopId = session.latestNextPatternStopId;
      if (nextPatternStopId == null) { setStatus('retrying', { error: 'Waiting for the next stop from the server.' }); return; }
      session.sending = true;
      const payload = { ...session.latest, nextPatternStopId };
      const sent = sendDriverLocation(session.tripId, payload);
      session.sending = false;
      if (!sent) {
        setStatus('retrying', { error: 'Reconnecting to live tracking…' });
        return;
      }
      session.initialLocationReady = true;
      setStatus('sending', { lastSuccessAt: Date.now(), error: '' });
    }
    session.send = send;
    session.timer = setInterval(send, session.interval);
    setStatus('sending');
  }, []);

  useEffect(() => {
    if (!memberToken && active.current) stopRef.current('idle');
  }, [memberToken]);
  useEffect(() => () => stopRef.current('idle'), []);
  return <DriverLocationContext.Provider value={{ ...state, start, stop, isActive: Boolean(state.tripId) }}>{children}</DriverLocationContext.Provider>;
}

export function useDriverLocationSender() {
  const value = useContext(DriverLocationContext);
  if (!value) throw new Error('useDriverLocationSender must be used inside DriverLocationProvider');
  return value;
}
