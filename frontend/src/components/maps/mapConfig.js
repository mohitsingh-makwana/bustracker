import L from 'leaflet';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';
import marker from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Keep tile configuration in one place. Components never hard-code tile URLs.
export const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';
export const GEOCODER_URL = import.meta.env.VITE_GEOCODER_URL || 'https://nominatim.openstreetmap.org/search';
export const GEOCODER_PROVIDER = import.meta.env.VITE_GEOCODER_PROVIDER || 'nominatim';
export const DEFAULT_MAP_CENTER = { lat: 22.7196, lng: 75.8577 };

// Vite-safe Leaflet marker assets (prevents broken default marker icons).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerRetina, iconUrl: marker, shadowUrl: markerShadow });

export const toLeaflet = ({ lat, lng }) => [Number(lat), Number(lng)];
export const validCoordinate = (point) => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) && Number(point.lat) >= -90 && Number(point.lat) <= 90 && Number(point.lng) >= -180 && Number(point.lng) <= 180;
export const normalizePoint = (point) => validCoordinate(point) ? { lat: Number(point.lat), lng: Number(point.lng) } : null;

export { headingWedgeStyle, haversineMeters } from './geoUtils';
