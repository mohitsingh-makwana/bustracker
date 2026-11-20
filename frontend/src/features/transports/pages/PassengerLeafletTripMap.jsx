import { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION, DEFAULT_MAP_CENTER, normalizePoint, toLeaflet } from '../../../components/maps/mapConfig';
import { createBusIcon } from '../../../components/maps/LeafletMap';
import '../../../components/maps/leaflet-map.css';
import './passenger-leaflet-trip-map.css';

const ROUTER = 'https://router.project-osrm.org/route/v1/driving';
function firstValue(...values) { return values.find((value) => value !== undefined && value !== null && value !== ''); }
function stopPoint(stop) {
  const lat = firstValue(stop?.latitude, stop?.lat, stop?.stopLatitude, stop?.stop?.latitude, stop?.stop?.lat, stop?.location?.latitude);
  const lng = firstValue(stop?.longitude, stop?.lng, stop?.stopLongitude, stop?.stop?.longitude, stop?.stop?.lng, stop?.location?.longitude);
  return normalizePoint({ lat, lng });
}
function stopIcon(index, state) {
  const label = state === 'passed' ? '✓' : state === 'destination' ? '⚑' : String(index + 1);
  return L.divIcon({ className: 'passenger-leaflet-stop-icon-wrap', html: `<span class="passenger-leaflet-stop-icon ${state}">${label}</span>`, iconSize: state === 'next' ? [36,36] : [29,29], iconAnchor: state === 'next' ? [18,18] : [14,14] });
}
function FitRoute({ points, busPoint }) {
  const map = useMap();
  const fittedRouteRef = useState(false);
  const hasFittedRoute = fittedRouteRef[0];
  const setHasFittedRoute = fittedRouteRef[1];
  useEffect(() => {
    if (points.length > 1 && !hasFittedRoute) {
      map.fitBounds(points.map(toLeaflet), { padding: [34, 34], maxZoom: 16 });
      setHasFittedRoute(true);
    } else if (points.length === 1 && !hasFittedRoute) {
      map.setView(toLeaflet(points[0]), 15);
      setHasFittedRoute(true);
    } else if (!points.length && busPoint && !hasFittedRoute) {
      map.setView(toLeaflet(busPoint), 15);
      setHasFittedRoute(true);
    }
  }, [map, points, busPoint?.lat, busPoint?.lng, hasFittedRoute, setHasFittedRoute]);
  useEffect(() => { const frame = requestAnimationFrame(() => map.invalidateSize({ pan: false })); return () => cancelAnimationFrame(frame); }, [map]);
  return null;
}
function PassengerMapControls({ busPoint, speedKmh }) {
  const map = useMap();
  return <div className="passenger-map-controls" aria-label="Map controls">
    <div className="passenger-map-speed" aria-label={`Current speed ${speedKmh == null ? "unavailable" : `${Math.round(Number(speedKmh))} km/h`}`}><strong>{speedKmh == null || !Number.isFinite(Number(speedKmh)) ? "---" : Math.round(Number(speedKmh))}</strong><small>km/h</small></div>
    <button type="button" className="passenger-map-recenter" disabled={!busPoint} onClick={() => busPoint && map.setView(toLeaflet(busPoint), Math.max(map.getZoom(), 16), { animate: true })} aria-label="Recenter on bus" title={busPoint ? 'Recenter on bus' : 'Bus location unavailable'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
    </button>
  </div>;
}
function RouteLegs({ points, nextIndex, finished, routeGeometry }) {
  const [legs, setLegs] = useState([]);
  const geometryPoints = useMemo(() => {
    const coordinates = routeGeometry?.type === 'LineString' ? routeGeometry.coordinates : null;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return [];
    return coordinates.map(([lng, lat]) => normalizePoint({ lat, lng })).filter(Boolean);
  }, [routeGeometry]);
  useEffect(() => {
    let cancelled = false;
    async function route() {
      if (geometryPoints.length >= 2) {
        if (!cancelled) setLegs([{ index: 0, points: geometryPoints, geometry: true }]);
        return;
      }
      if (points.length < 2) { setLegs([]); return; }
      const requests = points.slice(0, -1).map(async (point, index) => {
        const next = points[index + 1];
        const fallback = [point, next];
        try {
          const url = `${ROUTER}/${point.lng},${point.lat};${next.lng},${next.lat}?overview=full&geometries=geojson`;
          const response = await fetch(url, { headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error('Routing unavailable');
          const data = await response.json();
          const coords = data?.routes?.[0]?.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) throw new Error('No route geometry');
          return { index, points: coords.map(([lng, lat]) => ({ lat, lng })) };
        } catch { return { index, points: fallback }; }
      });
      const results = await Promise.all(requests);
      if (!cancelled) setLegs(results);
    }
    route();
    return () => { cancelled = true; };
  }, [points.map((p) => `${p.lat},${p.lng}`).join('|'), geometryPoints]);
  return <>{legs.map((leg) => <Polyline key={`route-casing-${leg.index}`} positions={leg.points.map(toLeaflet)} pathOptions={{ color: '#FFFFFF', weight: 11, opacity: .96, lineCap: 'round', lineJoin: 'round' }} />)}{legs.map((leg) => {
    const traveled = !leg.geometry && (finished || (nextIndex >= 0 && leg.index < nextIndex - 1));
    return <Polyline key={`route-color-${leg.index}`} positions={leg.points.map(toLeaflet)} pathOptions={{ color: traveled ? '#94A3B8' : '#F59E0B', weight: traveled ? 5 : 7, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />;
  })}</>;
}
export default function PassengerLeafletTripMap({ stops = [], locationData = null, locationLost = false, nextStopName = '', finished = false, height = 335, showStatus = true, routeGeometry = null }) {
  const validStops = useMemo(() => stops.map((stop) => ({ ...stop, _point: stopPoint(stop), _name: firstValue(stop?._name, stop?.stopName, stop?.name, stop?.stop?.name, 'Stop') })).filter((stop) => stop._point), [stops]);
  const busPoint = normalizePoint({ lat: firstValue(locationData?.latitude, locationData?.lat, locationData?.currentLatitude, locationData?.location?.latitude), lng: firstValue(locationData?.longitude, locationData?.lng, locationData?.currentLongitude, locationData?.location?.longitude) });
  const nextIndex = validStops.findIndex((stop) => stop._name.toLowerCase() === String(nextStopName || '').toLowerCase());
  const center = busPoint ?? validStops[0]?._point ?? DEFAULT_MAP_CENTER;
  const heading = firstValue(locationData?.headingDegrees, locationData?.heading, 0);
  const accuracy = Number(firstValue(locationData?.accuracyMeters, locationData?.accuracy, 30));
  const routePoints = useMemo(() => validStops.map((stop) => stop._point), [validStops]);
  return <div className="passenger-leaflet-map" style={{ height }}>
    <MapContainer center={toLeaflet(center)} zoom={13} scrollWheelZoom={true} zoomControl={false}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitRoute points={routePoints} busPoint={busPoint} />
      <PassengerMapControls busPoint={busPoint} speedKmh={locationData?.speedKmh} />
      <RouteLegs points={routePoints} nextIndex={nextIndex} finished={finished} routeGeometry={routeGeometry} />
      {validStops.map((stop, index) => {
        const state = finished || (nextIndex >= 0 && index < nextIndex) ? 'passed' : index === nextIndex ? 'next' : index === validStops.length - 1 ? 'destination' : 'upcoming';
        return <Marker key={`${stop.id ?? stop.stopId ?? index}-${stop._name}`} position={toLeaflet(stop._point)} icon={stopIcon(index, state)}>
          <Tooltip direction="top" offset={[0, -8]}>{stop._name}</Tooltip>
        </Marker>;
      })}
      {busPoint && <>
        {!locationLost && !finished && Number.isFinite(accuracy) && accuracy > 0 && <Circle center={toLeaflet(busPoint)} radius={Math.min(accuracy, 250)} pathOptions={{ color: '#F59E0B', weight: 1, opacity: .45, fillColor: '#F59E0B', fillOpacity: .12 }} />}
        <Marker position={toLeaflet(busPoint)} icon={createBusIcon(heading, locationLost || finished)} zIndexOffset={1000}>
          <Tooltip direction="top" offset={[0, -18]}>{finished ? 'Last reported bus location' : locationLost ? 'Last known location' : 'Live bus location'}</Tooltip>
        </Marker>
      </>}
    </MapContainer>
    {showStatus && <div className={`passenger-leaflet-map-status ${finished ? 'is-finished' : locationLost ? 'is-lost' : ''}`}><span className="passenger-map-status-dot" />{finished ? 'Tracking stopped' : locationLost ? 'Waiting for GPS' : 'Live bus location'}</div>}
  </div>;
}
