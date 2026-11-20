# Live tracking contract notes and gaps

## Confirmed contracts used

- `GET /trips/my/current` returns the current-trip summary including `tripId`; it does not include the PatternStop list in the contract supplied.
- `GET /trips/{tripId}/stops` returns each PatternStop as `{ id, routePatternId, routePatternCode, stopId, stopName, sequence, longitude, latitude }`. The `id` field is the PatternStop ID; `stopId` is the physical stop ID.
- `POST /trips/{tripId}/locations` accepts `latitude`, `longitude`, `accuracyMeters`, `speedMetersPerSecond`, `headingDegrees`, `recordedAt`, and required `nextPatternStopId`.
- `GET /trips/{tripId}/live-location` and public variant return `tripId`, `latitude`, `longitude`, `accuracy`, `speedMetersPerSecond`, `speedKmh`, `capturedAt`, `updatedAt`, `stale`, `nextPatternStopId`, `nextStopId`, `nextStopSequence`, `nextStopName`, `nextStopDistanceMeters`, `remainingDistanceMeters`, and `totalRouteDistanceMeters`.

## Client implementation notes

- Stops are sorted by `sequence` and normalized with `patternStopId: stop.id`. Never use `stop.stopId` as the progress pointer.
- Progress is stored in the shared driver location provider and sessionStorage (`tripId`, `currentIndex`). First stop is treated as reached on fresh start; the next pointer starts at sequence 2.
- Live GET is used on tracking start and when returning to foreground to restore/reconcile server progress. A server pointer is only adopted when it maps to the known stop list and is farther forward.
- POST uses only fields in the confirmed request DTO; `currentPatternStopId` and distance values are not sent because the DTO does not define them.
- `speedKmh` from the live-location response is used for the driver's display; if POST does not return it, the sender derives display speed from the submitted m/s reading.
- The client exposes server-reported `nextStopDistanceMeters` and `remainingDistanceMeters` as distance display values when available.

## Gaps / confirmation needed

1. **POST response schema:** the exact response DTO for `POST /trips/{tripId}/locations` has not been provided. The sender reads optional `nextPatternStopId` and next-stop/distance fields if present, otherwise it relies on the confirmed live-location GET response.
2. **POST server-side correction / rejection:** confirm whether POST returns `nextPatternStopId`, and the exact validation error / conflict semantics. A 400/409 triggers one live GET reconciliation and one retry when a valid next PatternStop can be mapped.
3. **OSRM routing:** no OSRM service contract or environment variable has been provided in the repository. Road-distance calculation remains a gap; current display uses backend live-location distances where available and does not fabricate OSRM results.
4. **Arrival progression authority:** the backend request DTO only accepts `nextPatternStopId`; there is no confirmed dedicated arrival endpoint. The driver's Arrived action advances the client pointer and the next location ping carries the newly selected ID. Confirm backend expectations for this progression.
5. **`recordedAt` format:** the DTO uses `LocalDateTime`; the client currently submits a local date-time string derived from the device timestamp. Confirm the desired server timezone semantics.
6. **Admin bulk-live-trips endpoint:** no contract was supplied. Do not invent a bulk URL.

