import { useCallback, useEffect, useRef, useState } from 'react';
import sharedStomp from '../../tracking/services/sharedStomp';
import { listPatternStops } from '../services/adminService';

const validCoordinate = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

/**
 * Shared admin live-buses subscription. STOMP messages are snapshots, so each
 * message replaces the previous array (rather than merging old trips back in).
 * The shared STOMP service parses message.body as JSON and restores this
 * destination subscription after reconnects.
 */
export default function useLiveBuses(transportSystemId, enabled, liveTrips = []) {
  const [locations, setLocations] = useState([]);
  const liveTripsRef = useRef(liveTrips);
  const patternStopsRef = useRef(new Map());

  // Keep callback metadata current without tearing down the topic subscription.
  liveTripsRef.current = liveTrips;

  useEffect(() => {
    if (!enabled || transportSystemId == null) {
      setLocations([]);
      return undefined;
    }

    let cancelled = false;
    const trips = liveTripsRef.current ?? [];
    Promise.all(trips.map(async (trip) => {
      const tripId = trip?.tripId ?? trip?.id;
      const patternId = trip?.routePatternId ?? trip?.routePattern?.id ?? trip?.patternId;
      if (tripId == null || patternId == null) return;
      const result = await listPatternStops(patternId).catch(() => []);
      const orderedStops = (Array.isArray(result) ? result : [])
        .slice()
        .sort((a, b) => Number(a.sequence) - Number(b.sequence))
        .map((stop) => ({
          latitude: stop.latitude ?? stop.stopLatitude ?? stop.stop?.latitude ?? stop.stop?.lat,
          longitude: stop.longitude ?? stop.stopLongitude ?? stop.stop?.longitude ?? stop.stop?.lng,
        }));
      if (!cancelled) patternStopsRef.current.set(String(tripId), orderedStops);
    })).catch(() => {});

    return () => { cancelled = true; };
  }, [enabled, transportSystemId, liveTrips]);

  const handleLocations = useCallback((payload) => {
    // The backend contract is List<LiveBusLocationDto>, a JSON array.
    // sharedStomp has already JSON.parse'd the frame body before invoking us.
    const received = Array.isArray(payload) ? payload : [];
    const tripById = new Map((liveTripsRef.current ?? []).map((trip) => [
      String(trip?.tripId ?? trip?.id), trip,
    ]));

    const nextLocations = received.map((location) => {
      if (location?.tripId == null || !validCoordinate(location.latitude) || !validCoordinate(location.longitude)) return null;
      const tripId = String(location.tripId);
      const trip = tripById.get(tripId) ?? {};
      return {
        ...trip,
        ...location,
        tripId: location.tripId,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        point: { lat: Number(location.latitude), lng: Number(location.longitude) },
        patternStops: patternStopsRef.current.get(tripId) ?? [],
        stale: Boolean(location.stale),
      };
    }).filter(Boolean);

    // Replace the snapshot. Trips missing from this message must disappear.
    setLocations(nextLocations);
  }, []);

  useEffect(() => {
    if (!enabled || transportSystemId == null) return undefined;
    const destination = `/topic/transport-systems/${encodeURIComponent(transportSystemId)}/live-buses`;
    return sharedStomp.subscribe(destination, handleLocations);
  }, [enabled, transportSystemId, handleLocations]);

  return locations;
}
