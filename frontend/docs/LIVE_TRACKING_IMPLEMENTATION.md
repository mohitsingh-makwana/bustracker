# BusTrackr live tracking implementation notes

## Implemented frontend flow

- App-level `DriverLocationProvider` starts after a successful trip start response and persists across route navigation.
- Browser GPS uses `watchPosition`; the latest reading is sent at the returned `pingIntervalSeconds` (default 5 seconds) to the established location POST contract.
- The active driver screen reads the provider's status and current GPS position. On HTTP 401, the sender tries the established transport-system access flow once to renew the member token, then presents sign-in if renewal fails. GPS watch, timer, wake lock, and listeners are cleaned up on stop/logout/provider unmount.
- `useLiveTrip(tripId)` subscribes to `/topic/trips/{tripId}/location` through the shared STOMP service and unsubscribes on unmount or when tracking is disabled. STOMP reconnect restores active subscriptions.
- Shared Leaflet map configuration reads tile URL and attribution from environment variables. App coordinates use `{lat,lng}`; conversion to `[lat,lng]` happens only at the Leaflet boundary.
- Stop create/edit now uses `StopPickerMap` with click-to-place, draggable pin, editable coordinate fields, current-location button, place search, optional reverse-geocode name suggestion, and a 50m nearby-stop warning.
- Admin home and live map receive active-bus coordinates from `/topic/transport-systems/{transportSystemId}/live-buses`; active-trip metadata and route stops remain loaded over HTTP.

## Local setup

1. Copy `frontend/.env.example` to `frontend/.env` and adjust `VITE_API_BASE_URL` if needed.
2. Configure `VITE_WS_URL` to the backend STOMP endpoint (default: `ws://localhost:8080/ws`). From `frontend/`, run `npm install` to install dependencies.
3. Run `npm run dev` and test using Chrome DevTools → Sensors → Location.
4. Run `npm test` for pure utility tests and `npm run build`.

## STOMP location transport\n\n- One shared raw STOMP 1.2 client multiplexes subscriptions by destination and reconnects with active subscriptions restored.\n- Member tokens are sent as `Authorization: Bearer <token>` in the STOMP CONNECT frame when present; public sessions connect without the header. Auth changes trigger reconnection.\n- Driver location publishes to `/app/trips/{tripId}/locations`. The initial `nextPatternStopId` comes from the sequence-2 PatternStop; subsequent non-null values come from the driver trip subscription.\n- Passenger and driver trip screens use `/topic/trips/{tripId}/location`.\n\n## Verification status

The five pure utility tests pass and all 49 JavaScript/JSX source files passed a TypeScript transpile syntax check. A Vite production build could not be run in the authoring environment because npm registry DNS resolution failed and Vite/Leaflet dependencies were not installed in the uploaded archive. Browser-level testing, including a 10-minute memory-growth check, remains to be done in the local project environment.
