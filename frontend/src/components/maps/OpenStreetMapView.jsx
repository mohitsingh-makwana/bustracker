import { useMemo } from 'react';
import Icon from '../common/Icon';
import './open-street-map.css';

const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
function worldPoint(lat, lng, zoom) {
  const scale = 256 * (2 ** zoom);
  const sin = clamp(Math.sin((lat * Math.PI) / 180), -0.9999, 0.9999);
  return { x: ((lng + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}
function tileUrl(x, y, z) { return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`; }
function pointOf(item) {
  const lat = Number(item?.latitude ?? item?.lat ?? item?.location?.latitude);
  const lng = Number(item?.longitude ?? item?.lng ?? item?.location?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
export default function OpenStreetMapView({ markers = [], stops = [], height = 320, zoom = 13, center, onMarkerClick, label = 'Live bus map' }) {
  const validMarkers = useMemo(() => markers.map((item) => ({ ...item, point: pointOf(item) })).filter((item) => item.point), [markers]);
  const validStops = useMemo(() => stops.map((item) => ({ ...item, point: pointOf(item) })).filter((item) => item.point), [stops]);
  const mapCenter = center ?? validMarkers[0]?.point ?? validStops[0]?.point ?? DEFAULT_CENTER;
  const centerWorld = worldPoint(mapCenter.lat, mapCenter.lng, zoom);
  const tiles = useMemo(() => {
    const centerX = Math.floor(centerWorld.x / 256); const centerY = Math.floor(centerWorld.y / 256);
    const offsets = [-2, -1, 0, 1, 2]; const result = [];
    offsets.forEach((dy) => offsets.forEach((dx) => {
      const x = centerX + dx; const y = centerY + dy; const max = 2 ** zoom;
      if (y >= 0 && y < max) result.push({ x, y, z: zoom, left: x * 256 - centerWorld.x, top: y * 256 - centerWorld.y });
    }));
    return result;
  }, [centerWorld.x, centerWorld.y, zoom]);
  const position = (point) => { const p = worldPoint(point.lat, point.lng, zoom); return { left: `calc(50% + ${p.x - centerWorld.x}px)`, top: `calc(50% + ${p.y - centerWorld.y}px)` }; };
  return <div className="osm-map" style={{ height }} role="img" aria-label={label}>
    <div className="osm-map__tiles">{tiles.map((tile) => <img key={`${tile.z}/${tile.x}/${tile.y}`} src={tileUrl(tile.x, tile.y, tile.z)} alt="" draggable="false" style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }} loading="lazy" />)}</div>
    {validStops.map((stop, index) => <div key={`stop-${stop.id ?? stop.stopId ?? index}`} className="osm-map__stop-wrap" style={position(stop.point)} title={stop.stopName ?? stop.name ?? `Stop ${index + 1}`}><div className={`osm-map__stop ${index === 0 ? 'is-origin' : index === validStops.length - 1 ? 'is-destination' : ''}`}><span>{index + 1}</span></div><span className="osm-map__stop-label">{stop.stopName ?? stop.name ?? `Stop ${index + 1}`}</span></div>)}
    {validMarkers.map((marker, index) => <button key={`bus-${marker.tripId ?? marker.id ?? index}`} className={`osm-map__bus ${marker.stale ? 'is-stale' : ''}`} style={position(marker.point)} title={`${marker.routePatternCode ?? marker.busNumber ?? 'Bus'}${marker.stale ? ' · Location stale' : ''}`} onClick={() => onMarkerClick?.(marker)} aria-label={`Open ${marker.routePatternCode ?? marker.busNumber ?? 'bus'} details`}><span className="osm-map__bus-icon"><Icon name="bus" size={17}/></span>{(marker.routePatternCode || marker.busNumber) && <span className="osm-map__bus-label">{marker.routePatternCode ?? marker.busNumber}{marker.speed != null || marker.speedMetersPerSecond != null ? ` · ${Math.round(Number(marker.speed ?? marker.speedMetersPerSecond) * (marker.speed != null ? 1 : 3.6))} km/h` : ''}</span>}</button>)}
    <div className="osm-map__legend"><span><i className="is-live"/>Live bus</span><span><i className="is-stop"/>Stops</span></div>
    <div className="osm-map__attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></div>
    {!validMarkers.length && !validStops.length && <div className="osm-map__empty"><Icon name="map-pin" size={20}/><span>Waiting for GPS coordinates</span></div>}
  </div>;
}
