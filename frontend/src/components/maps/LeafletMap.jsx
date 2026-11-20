import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapProvider, MapTiles } from './MapProvider';
import { DEFAULT_MAP_CENTER, normalizePoint, toLeaflet, headingWedgeStyle } from './mapConfig';
import './leaflet-map.css';

function iconSvg() { return `<div class="bt-bus-marker"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 10h16M8 6h.01M16 6h.01M7 18v3M17 18v3M7 14h.01M17 14h.01"/></svg></div>`; }
export function createBusIcon(heading, stale = false) {
  const wedgeStyle = headingWedgeStyle(heading); const wedge = !wedgeStyle ? '' : `<i class="bt-bus-wedge" style="transform:rotate(${Number(heading)}deg)"></i>`;
  return L.divIcon({ className:'', html:iconSvg().replace('</div>', `${wedge}</div>`).replace('bt-bus-marker', `bt-bus-marker${stale ? ' is-stale' : ''}`), iconSize:[40,40], iconAnchor:[20,20] });
}
function existingStopIcon() { return L.divIcon({className:'',html:'<span style="display:block;width:10px;height:10px;border-radius:50%;background:#94a3b8;border:2px solid white;box-shadow:0 1px 4px #0f172a55"></span>',iconSize:[14,14],iconAnchor:[7,7]}); }
function stopIcon(index, status = 'upcoming') {
  const content = status === 'passed' ? '✓' : status === 'destination' ? '⚑' : String(index + 1);
  return L.divIcon({ className:'', html:`<span class="bt-stop-marker ${status === 'passed' ? 'is-passed' : status === 'next' ? 'is-next' : status === 'destination' ? 'is-destination' : ''}">${content}</span>`, iconSize: status === 'next' ? [36,36] : [28,28], iconAnchor: status === 'next' ? [18,18] : [14,14] });
}
function SizeInvalidator({ trigger }) { const map = useMap(); useEffect(() => { const id = requestAnimationFrame(() => map.invalidateSize({ pan:false })); return () => cancelAnimationFrame(id); }, [map, trigger]); return null; }
function FitBounds({ points, fitKey }) { const map = useMap(); const done = useRef(false); useEffect(() => { if (done.current || !points.length) return; map.fitBounds(points.map(toLeaflet), { padding:[28,28], maxZoom:15 }); done.current = true; }, [map, points, fitKey]); return null; }
function RecenterPoint({ point }) { const map=useMap(); useEffect(()=>{ if(point && normalizePoint(point)) map.panTo(toLeaflet(point),{animate:true,duration:.25}); },[map,point?.lat,point?.lng]); return null; }
function ClickCapture({ onClick, onDragStart }) { useMapEvents({ click(e) { onClick?.({ lat:e.latlng.lat, lng:e.latlng.lng }); }, dragstart() { onDragStart?.(); } }); return null; }
function FollowBus({ point, follow, snapKey }) { const map = useMap(); const previousSnap = useRef(snapKey); useEffect(() => { if (!point || !follow) return; if (previousSnap.current !== snapKey) { map.setView(toLeaflet(point), Math.max(map.getZoom(), 15), { animate:false }); previousSnap.current = snapKey; } else map.panTo(toLeaflet(point), { animate:true, duration:.35 }); }, [map, point, follow, snapKey]); return null; }
function RecenterAll({ points, trigger }) { const map = useMap(); useEffect(() => { if (!trigger || !points.length) return; if (points.length === 1) map.setView(toLeaflet(points[0]), Math.max(map.getZoom(), 15), { animate: true }); else map.fitBounds(points.map(toLeaflet), { padding: [36, 36], maxZoom: 15, animate: true }); }, [map, points, trigger]); return null; }
function RoadRoute({ points, enabled, routeGeometry = null }) {
  const [geometry, setGeometry] = useState([]);
  const suppliedGeometry = useMemo(() => {
    const coordinates = routeGeometry?.type === 'LineString' ? routeGeometry.coordinates : null;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return [];
    return coordinates.map(([lng, lat]) => normalizePoint({ lat, lng })).filter(Boolean);
  }, [routeGeometry]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (suppliedGeometry.length >= 2) { setGeometry(suppliedGeometry); return; }
      if (!enabled || points.length < 2) { setGeometry([]); return; }
      try {
        const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Routing unavailable');
        const data = await response.json();
        const raw = data?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(raw) || raw.length < 2) throw new Error('Route geometry missing');
        if (!cancelled) setGeometry(raw.map(([lng, lat]) => ({ lat, lng })));
      } catch { if (!cancelled) setGeometry(points); }
    }
    load();
    return () => { cancelled = true; };
  }, [enabled, points.map(p => `${p.lat},${p.lng}`).join('|'), suppliedGeometry]);
  if (!geometry.length) return null;
  return <><Polyline positions={geometry.map(toLeaflet)} pathOptions={{ color: '#FFFFFF', weight: 11, opacity: .96, lineCap: 'round', lineJoin: 'round' }} /><Polyline positions={geometry.map(toLeaflet)} pathOptions={{ color: '#F59E0B', weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round' }} /></>;
}
const AnimatedBus = memo(function AnimatedBus({ bus, follow, snapKey, onClick }) {
  const markerRef = useRef(null); const frameRef = useRef(0); const visualRef = useRef(bus.point); const initialPosition = useRef(toLeaflet(bus.point)); const lastSnapKey = useRef(snapKey);
  useEffect(() => {
    const target = normalizePoint(bus.point); if (!target || !markerRef.current) return;
    cancelAnimationFrame(frameRef.current);
    const from = visualRef.current ?? target;
    const distance = Math.hypot((target.lat-from.lat)*111000, (target.lng-from.lng)*80000);
    const visibilityChanged = lastSnapKey.current !== snapKey; lastSnapKey.current = snapKey;
    if (!visualRef.current || distance > 1500 || bus.snap || visibilityChanged) { visualRef.current = target; markerRef.current.setLatLng(toLeaflet(target)); return; }
    const start = performance.now(); const duration = 3800;
    const tick = (now) => { const t = Math.min(1, (now-start)/duration); const p = { lat:from.lat+(target.lat-from.lat)*t, lng:from.lng+(target.lng-from.lng)*t }; visualRef.current=p; markerRef.current?.setLatLng(toLeaflet(p)); if (t<1) frameRef.current=requestAnimationFrame(tick); };
    frameRef.current=requestAnimationFrame(tick); return () => cancelAnimationFrame(frameRef.current);
  }, [bus.point?.lat, bus.point?.lng, bus.snap, snapKey]);
  useEffect(() => { if (markerRef.current) markerRef.current.setIcon(createBusIcon(bus.heading, bus.stale)); }, [bus.heading, bus.stale]);
  return <Marker ref={markerRef} position={initialPosition.current} icon={createBusIcon(bus.heading,bus.stale)} eventHandlers={{ click:()=>onClick?.(bus) }} />;
});

export default function LeafletMap({ height = 320, center = DEFAULT_MAP_CENTER, zoom = 13, stops = [], buses = [], onMapClick, onBusClick, selectedPoint, onPointChange, existingStops = [], follow = false, onFollowChange, fitRoute = false, showStopConnections = true, numberedStopsOnly = false, roadRoute = false, roadRoutes = [], adminRecenter = false, invalidateKey = 0, className = '', speedKmh = null, routeGeometry = null }) {
  const validStops = useMemo(() => stops.map((s) => ({ ...s, point:normalizePoint({ lat:s.latitude ?? s.lat, lng:s.longitude ?? s.lng }) })).filter(s=>s.point), [stops]);
  const validBuses = useMemo(() => buses.map((b) => ({ ...b, point:normalizePoint(b.point ?? {lat:b.latitude ?? b.lat,lng:b.longitude ?? b.lng}), heading:b.headingDegrees ?? b.heading, stale:Boolean(b.stale), snap:Boolean(b.snap) })).filter(b=>b.point), [buses]);
  const points = useMemo(() => [...validStops.map(s=>s.point), ...validBuses.map(b=>b.point)], [validStops,validBuses]);
  const [followEnabled,setFollowEnabled] = useState(follow);
  const [visibilitySnap,setVisibilitySnap] = useState(0);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  useEffect(()=>setFollowEnabled(follow),[follow]);
  useEffect(()=>{const onVisibility=()=>{if(!document.hidden)setVisibilitySnap(v=>v+1);};document.addEventListener('visibilitychange',onVisibility);return()=>document.removeEventListener('visibilitychange',onVisibility);},[]);
  return <div className={`bt-map ${className}`} style={{ height, minHeight:height }}>
    <MapProvider><MapContainer center={toLeaflet(normalizePoint(center) ?? DEFAULT_MAP_CENTER)} zoom={zoom} zoomControl={true} scrollWheelZoom style={{height:'100%',width:'100%',minHeight:height}}>
      <MapTiles /><SizeInvalidator trigger={invalidateKey} /><RecenterPoint point={selectedPoint} />
      {fitRoute && <FitBounds points={points} fitKey={validStops.length} />}
      {adminRecenter && <RecenterAll points={points} trigger={recenterTrigger} />}
      {roadRoute && <RoadRoute points={validStops.map(s => s.point)} enabled={roadRoute} routeGeometry={routeGeometry} />}
      {roadRoutes.map((route, index) => <RoadRoute key={`admin-road-${index}`} points={(route ?? []).map(point => normalizePoint({ lat: point.latitude ?? point.lat, lng: point.longitude ?? point.lng })).filter(Boolean)} enabled />)}
      <ClickCapture onClick={onMapClick} onDragStart={()=>{setFollowEnabled(false);onFollowChange?.(false);}} />
      {validStops.map((stop,index)=>{const status=numberedStopsOnly?'upcoming':String(stop.statusKey ?? (stop.passed?'passed':index===validStops.length-1?'destination':'upcoming')).toLowerCase();return <Marker key={`stop-${stop.id ?? stop.stopId ?? index}`} position={toLeaflet(stop.point)} icon={stopIcon(index, status)} eventHandlers={{click:()=>onPointChange?.(stop.point)}} />;})}
      {showStopConnections && !roadRoute && validStops.slice(0,-1).map((stop,index)=>{const passed=String(stop.statusKey ?? '').toLowerCase()==='passed'||Boolean(stop.passed);return <Polyline key={`route-segment-${stop.id ?? index}`} positions={[toLeaflet(stop.point),toLeaflet(validStops[index+1].point)]} pathOptions={{color:passed?'#94A3B8':'#F59E0B',weight:5,opacity:.9}} />;})}
      {existingStops.map((stop,index)=>{ const p=normalizePoint({lat:stop.latitude ?? stop.lat,lng:stop.longitude ?? stop.lng}); return p ? <Marker key={`existing-${stop.id ?? index}`} position={toLeaflet(p)} opacity={.75} icon={existingStopIcon()} title={stop.name ?? stop.stopName} /> : null; })}
      {selectedPoint && normalizePoint(selectedPoint) && <Marker position={toLeaflet(selectedPoint)} draggable eventHandlers={{dragend(e){const p=e.target.getLatLng();onPointChange?.({lat:Number(p.lat.toFixed(6)),lng:Number(p.lng.toFixed(6))});}}} />}
      {validBuses.map(bus=><AnimatedBus key={String(bus.tripId ?? bus.id)} bus={bus} follow={follow} snapKey={`${invalidateKey}-${visibilitySnap}`} onClick={onBusClick} />)}
      {validBuses.length===1 && follow && <FollowBus point={validBuses[0].point} follow={followEnabled} snapKey={invalidateKey} />}
    </MapContainer></MapProvider>
    {(adminRecenter || validBuses.length===1) && speedKmh !== undefined && speedKmh !== null && <div className="bt-map-speed-control" aria-label={`Current speed ${Math.round(Number(speedKmh))} km/h`}>{Number.isFinite(Number(speedKmh)) ? `${Math.round(Number(speedKmh))}` : '---'}<small>km/h</small></div>}
    {(adminRecenter || validBuses.length===1) && <button className="bt-map-control bt-map-recenter-control" style={{position:'absolute',right:12,bottom:42,zIndex:500}} onClick={()=>{if(adminRecenter){setRecenterTrigger(v=>v+1);} else if(!followEnabled){setFollowEnabled(true);onFollowChange?.(true);} }} aria-label={adminRecenter ? 'Recenter map' : 'Recenter on bus'} title={adminRecenter ? 'Recenter map' : 'Recenter on bus'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
    </button>}
  </div>;
}
export function MapClickLayer({ onClick }) { return <ClickCapture onClick={onClick} />; }
