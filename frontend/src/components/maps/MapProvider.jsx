import { createContext, useContext, useMemo } from 'react';
import { TileLayer } from 'react-leaflet';
import { TILE_ATTRIBUTION, TILE_URL } from './mapConfig';
const MapConfigContext = createContext({ tileUrl: TILE_URL, attribution: TILE_ATTRIBUTION });
export function MapProvider({ children, tileUrl = TILE_URL, attribution = TILE_ATTRIBUTION }) {
  const value = useMemo(() => ({ tileUrl, attribution }), [tileUrl, attribution]);
  return <MapConfigContext.Provider value={value}>{children}</MapConfigContext.Provider>;
}
export function MapTiles() {
  const config = useContext(MapConfigContext);
  return <TileLayer url={config.tileUrl} attribution={config.attribution} />;
}
export function useMapConfig() { return useContext(MapConfigContext); }
