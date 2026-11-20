/** LocalTime helpers. Values are plain clock strings; never pass them through Date. */
export function parseStopArrivalTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const match = String(value).match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatStopArrivalTime(value) {
  const totalSeconds = parseStopArrivalTime(value);
  if (totalSeconds === null) return '--';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

export function serializeStopArrivalTime(value) {
  const totalSeconds = parseStopArrivalTime(value);
  if (totalSeconds === null) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function compareStopArrivalTimes(left, right) {
  const a = parseStopArrivalTime(left);
  const b = parseStopArrivalTime(right);
  if (a === null || b === null) return null;
  return a === b ? 0 : a < b ? -1 : 1;
}

export function validatePatternStopTimes(stops) {
  return stops.map((stop, index) => {
    if (!stop.stopArrivalTime) return 'Arrival time is required.';
    if (parseStopArrivalTime(stop.stopArrivalTime) === null) return 'Enter a valid time.';
    if (index === 0) return '';
    const previous = parseStopArrivalTime(stops[index - 1]?.stopArrivalTime);
    const current = parseStopArrivalTime(stop.stopArrivalTime);
    if (previous === null || current === null || current >= previous) return '';
    return `Must not be earlier than the previous stop (${formatStopArrivalTime(stops[index - 1].stopArrivalTime)})`;
  });
}

/** Build the ordered backend request from the current stop list. */
export function buildPatternStopRequests(stops) {
  return stops.map((stop, index) => ({
    stopId: Number(stop.stopId),
    sequence: index + 1,
    stopArrivalTime: serializeStopArrivalTime(stop.stopArrivalTime),
  }));
}
