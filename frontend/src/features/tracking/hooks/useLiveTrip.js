import { useEffect, useState } from 'react';
import sharedStomp from '../services/sharedStomp';
import { isLocationStale, isTripFinished } from '../services/liveLocationService';
import { getPassengerTripDetails } from '../../transports/services/passengerService';

export default function useLiveTrip(tripId, {
  accessType = 'PRIVATE',
  transportSystemId,
  enabled = Boolean(tripId),
} = {}) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(Boolean(tripId && enabled));
  const [error, setError] = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [snapKey, setSnapKey] = useState(0);

  useEffect(() => {
    if (!tripId || !enabled) {
      setLocation(null);
      setLoading(false);
      setError('');
      setReconnecting(false);
      setFinished(false);
      return undefined;
    }

    setLocation(null);
    setLoading(true);
    setError('');
    setReconnecting(false);
    setFinished(false);
    let alive = true;
    let receivedLocation = false;
    let initialStatusRequestDone = false;
    let timeoutStatusRequestDone = false;

    const fetchTripStatus = async (isTimeoutCheck = false) => {
      if (!alive || (isTimeoutCheck ? timeoutStatusRequestDone : initialStatusRequestDone)) return;
      if (isTimeoutCheck) timeoutStatusRequestDone = true;
      else initialStatusRequestDone = true;
      try {
        const trip = await getPassengerTripDetails({
          accessType,
          transportSystemId,
          id: tripId,
          isSchedule: false,
        });
        if (!alive) return;
        const status = String(trip?.status ?? trip?.tripStatus ?? '').toUpperCase();
        if (status && status !== 'ACTIVE') {
          setFinished(true);
          setLoading(false);
          setReconnecting(false);
        }
      } catch {
        // A status lookup is one-shot. Keep current UI state if the request fails.
      }
    };

    const onLocation = (value) => {
      if (!alive) return;
      receivedLocation = true;
      const next = value?.location ?? value?.liveLocation ?? value;
      setLocation(next);
      setLoading(false);
      setError('');
      setReconnecting(false);
      if (isTripFinished(value) || isTripFinished(next)) setFinished(true);
    };

    const onStatus = (event) => {
      if (!alive) return;
      const status = String(event?.status ?? event?.tripStatus ?? '').toUpperCase();
      if (status && status !== 'ACTIVE') {
        setFinished(true);
        setLoading(false);
        setReconnecting(false);
      }
    };

    const unsubscribeLocation = sharedStomp.subscribe(
      `/topic/trips/${encodeURIComponent(tripId)}/location`,
      onLocation,
    );
    const unsubscribeStatus = sharedStomp.subscribe(
      `/topic/trips/${encodeURIComponent(tripId)}/status`,
      onStatus,
    );

    // Fetch the current status once on tracking start. If no location arrives
    // in 45 seconds, make one additional status check and expose waiting/stale UI.
    fetchTripStatus(false);
    const staleCheckTimer = window.setTimeout(() => {
      if (!alive || receivedLocation) return;
      setLoading(false);
      setError('Waiting for live location…');
      setReconnecting(true);
      fetchTripStatus(true);
    }, 45000);

    const onVisibility = () => {
      if (!document.hidden && alive) setSnapKey((value) => value + 1);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      alive = false;
      window.clearTimeout(staleCheckTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribeLocation();
      unsubscribeStatus();
    };
  }, [tripId, accessType, transportSystemId, enabled]);

  return {
    location,
    loading,
    error,
    reconnecting,
    finished,
    stale: isLocationStale(location),
    snapKey,
    waiting: !loading && !location,
  };
}
