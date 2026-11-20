
export function isTripFinished(location) { return ['COMPLETED','CANCELLED','TERMINATED'].includes(String(location?.status ?? location?.tripStatus ?? '').toUpperCase()); }
export function isLocationStale(location, now=Date.now()) {
  if (location?.stale === true) return true;
  if (!location?.updatedAt) return false;
  const updated=Date.parse(location.updatedAt); return Number.isFinite(updated) && now-updated>30000;
}
export function interpolatePoint(from,to,t) { return {lat:Number(from.lat)+(Number(to.lat)-Number(from.lat))*t,lng:Number(from.lng)+(Number(to.lng)-Number(from.lng))*t}; }
export function createThrottle(intervalMs=5000, send) { let last=0;return (value,now=Date.now())=>{if(now-last<intervalMs)return false;last=now;send(value);return true;}; }
