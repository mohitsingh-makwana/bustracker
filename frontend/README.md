# BusTrackr Frontend

Mobile-first React + Vite frontend for BusTrackr. The supplied UI reference images are the source of truth for layout and styling, with Android phone viewports prioritized. The visual system uses the supplied BusTrackr app icon and horizontal wordmark with amber/orange, white, cream, and navy.

## Requirements

- Node.js version supported by the Vite toolchain
- npm
- BusTrackr Spring Boot API for API-backed states

## Run locally

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env` and set the API base URL if needed:

   ```env
   VITE_API_BASE_URL=http://localhost:8080/api/v1
   ```

3. Start the frontend:

   ```bash
   npm run dev
   ```

4. Check lint/build:

   ```bash
   npm run lint
   npm run build
   ```

## Implemented screens and flows

- Guest and logged-in Home / transport discovery views
- Login and registration pages with validation, loading, and error feedback
- Private membership UI states: request access, pending, rejected/retry, active/open
- Transport-list loading skeleton, empty state, and retryable error state
- Passenger system home: system header, warm BusTrackr hero banner (“Find your bus. Travel smarter.”), search/filter entry point, time chips, Live now list, upcoming single trips, and regular schedules grouped by Today/Tomorrow
- Passenger “Find a bus” bottom sheet with route dropdown search, stop suggestions, time chips, and date/time input
- Trip cards normalize single-trip and trip-schedule responses into a reusable UI model
- Scheduled trip details route with timing, bus/driver/route summary, stop timeline, and disabled pre-start tracking action
- Live trip details route with location status, responsive route map canvas, next-stop/destination summary, bus/driver summary, stop timeline, and location refresh
- Reusable “This trip hasn’t started yet” state and larger BusTrackr-style no-results illustration
- Existing membership-selection and driver GPS test routes are preserved
- Supplied app icon and horizontal logo are used without recreating the logo artwork; registration keeps the line “Connecting People. Moving Cities.”

## API integration

All paths below are relative to `VITE_API_BASE_URL`, expected to include `/api/v1`. Public transport-context requests use the exact `X-Transport-System` header. Private passenger requests use the selected member token.

### Discovery and account

- `GET /transport-systems/public?page=0&size=50` with optional `name` and `city` filters
- `GET /transport-systems/route-count`
- `GET /transport-systems/active-trip-count`
- `POST /auth/register` sends `{ fullName, email, phone, password }`
- `POST /auth/login` sends `{ username: email, password }`
- `GET /users/{id}` loads user details from the user ID in the USER JWT
- `GET /transport-systems/my?page=0&size=10` loads the current user's systems
- `GET /transport-systems/{id}/membership-check` runs when the user selects a transport system
- `POST /transport-systems/{id}/membership-request` requests access using the USER token
- `POST /transport-systems/{id}/access` is called after a membership check confirms an ACTIVE member; expects `{ token, msg }`
- `GET /public/transport-systems/{id}` and `GET /transport-systems/{id}` load selected-system details for public/private mode respectively

### Passenger Home

- Live and single-trip listings: public `GET /transport-system/public?status=ACTIVE|SCHEDULED&page=0&size=50` with `X-Transport-System`; private `GET /trips/transport-system?status=ACTIVE|SCHEDULED&page=0&size=50` with member token
- Regular schedules: public `GET /trip-schedules/public?page=0&size=50` with `X-Transport-System`; private `GET /trip-schedules?page=0&size=50` with member token
- Filtered trip search: public `GET /passengers/public/search`; private `GET /passengers/search`
- Route options for the filter sheet: public `GET /routes/public?page=0&size=50`; private `GET /routes?page=0&size=50`
- Stop options for the filter sheet: public `GET /stops/public?page=0&size=50`; private `GET /stops?page=0&size=50`

Live cards intentionally do not request or display next-stop information. The live detail screen reads `nextStopName` and distance values from the live-location payload if present; otherwise it labels those values unavailable instead of inventing them. No fares, seat data, ratings, minute-based ETAs, or fabricated GPS locations are shown.

## Integration notes / remaining backend dependencies

- Trip details use private `GET /trips/{id}` or public `GET /trips/public/{id}`; trip stop timelines use private `GET /trips/{id}/stops` or public `GET /trips/{id}/stops/public`. Schedule details use private `GET /trip-schedules/{id}` or public `GET /trip-schedules/public/{id}`.
- Private live tracking polls `GET /trips/{id}/live-location` every 12 seconds. The current SecurityFilterChain shown during development does not expose a public live-location endpoint, so a guest viewing a public transport system gets a clear unavailable/location-lost state instead of fabricated GPS data. Add a corresponding public endpoint and matcher to support public live tracking.
- The illustrated route canvas projects actual GPS onto stop coordinates when those coordinates exist. It is not yet backed by street-map tiles; if the response has no stop coordinates, it keeps the route schematic and does not place the bus at a guessed location. A map provider/tile layer can be added after choosing the map solution for the project.
- Scheduled schedule responses may provide only `routePatternId` and times. If the response does not include stop details and the trip-stop endpoint is not available for that schedule, the details page displays the known endpoints and explains that intermediate stops are unavailable rather than inventing them.
- The Home page expects listing responses to include the agreed route-pattern display fields (`routePatternName`, `routePatternCode`, `originStopName`, `destinationStopName`, `busNumber`, `driverName`, time fields, `operatingDays`, and `status`) where those are needed. If the schedule endpoint returns only raw IDs, enrich that response or provide a lookup strategy to avoid per-card requests.
- Syntax checks passed for all JS/JSX source files in this environment. A full Vite production build and browser screenshot comparison could not be completed because dependency installation timed out and the cached Rolldown/Vite native binding is for Windows, not Linux. Run `npm ci`, `npm run lint`, and `npm run build` on the development machine before merging.

Do not commit `.env`, credentials, or real tokens. Share only `.env.example` with non-secret defaults.

## Admin Dashboard (mobile-first implementation)

Open `/admin` after selecting a transport system with an active ADMIN membership. This module follows the approved mobile app structure: **Home, Trips, Members, Requests, More** in a five-item bottom navigation; a compact BusTrackr header; cream/white surfaces; navy text; amber primary actions; Manrope typography; cards and bottom sheets. Dedicated full-page forms are used for Create Trip, Create Bus, Create Route, Create Stop, Create Pattern, and Add Member.

Implemented Admin areas:
- **Home:** summary cards from `GET /admin/dashboard/summary`, live-bus map preview, attention items, today’s trips and quick actions.
- **Live map:** route filters and active-trip list. Bus markers are explicitly schematic because no admin live-location endpoint was provided.
- **Trips:** Live, Upcoming, Completed and Schedules tabs; server-side route/driver/date/time filters for trips; create trip flow with route-pattern, bus and driver selection; optional return trip; cancellation for scheduled trips.
- **Buses:** paginated list, status filters, create/edit forms, details, availability state, delete action.
- **Routes and patterns:** active/inactive route filters and status toggle, expandable patterns, ordered stop selection/reordering, pattern detail and route-pattern stop update.
- **Stops:** searchable list and schematic Map view; create/edit form with coordinate fields and browser current-location action.
- **Members and requests:** Admin/Driver/Passenger tabs, membership status filters, driver availability controls (disabled when ON_TRIP), role editing, request approval with role selection, and rejection.
- **More:** Routes, Stops, Buses, Live map, Settings placeholder, Switch system and Logout.

The implementation uses the supplied endpoint names and relative paths from the Admin API contract. Every path is relative to `VITE_API_BASE_URL` (which should include `/api/v1`) and authenticated requests use the existing member-token Axios client.

Known limits:
- The overview/live-map background is a branded schematic, not a live street-map provider. No admin location-feed endpoint has been specified, so marker positions are not presented as current bus GPS coordinates.
- Stop name geocoding and map-tile selection are not wired because no map/geocoding provider contract was supplied. “Use my current location” reads browser geolocation into latitude/longitude fields.
- Settings have no backend contract yet, so this entry shows a clear placeholder. Admin alerts on Home are derived from the available summary counts and resource state, not from a dedicated alerts endpoint.
- Full Vite production build/browser testing could not run in this Linux environment because the cached dependency tree lacks the Linux-native Rolldown binding and package-registry access was unavailable. All JS/JSX files passed TypeScript parser checks, Admin CSS parsed successfully, and relative imports resolved. Run `npm ci`, `npm run lint`, and `npm run build` on your development machine before merging.

Endpoint mapping:
- Overview: `GET /admin/dashboard/summary`
- Buses: `GET /buses`, `GET /buses/{id}`, `POST /buses`, `PATCH /buses/{id}`, `DELETE /buses/{id}`
- Trips: `GET /trips/transport-system`, `GET /trips/{id}`, `POST /trips`, `PATCH /trips/{id}/cancel`
- Schedules: `GET /trip-schedules/transport-system`, `GET /trip-schedules/{id}`, `POST /trip-schedules`, `PATCH /trip-schedules/{id}/status`, `DELETE /trip-schedules/{id}`
- Routes: `GET /routes`, `GET /routes/{id}`, `POST /routes`, `PATCH /routes/{id}`, `DELETE /routes/{id}`
- Stops: `GET /stops`, `GET /stops/{id}`, `POST /stops`, `PATCH /stops/{id}`, `DELETE /stops/{id}`
- Route patterns and ordered stops: `GET /route-patterns`, `GET /route-patterns/{id}`, `POST /route-patterns`, `PATCH /route-patterns/{id}`, `DELETE /route-patterns/{id}`, `GET /pattern-stops/{routePatternId}`, `PUT /pattern-stops/by-pattern/{routePatternId}`
- Members: `GET /transport-members`, `GET /transport-members/{id}`, `POST /transport-members/admin`, `PATCH /transport-members/{id}`, `DELETE /transport-members/{id}`
- Membership requests: `GET /transport-members/membership-requests`, `PATCH /transport-members/membership-requests/{memberId}/approve`, `PATCH /transport-members/membership-requests/{memberId}/reject`
- Driver profiles/availability: `GET /drivers`, `GET /drivers/{id}`, `POST /transport-members/driver`, `PATCH /drivers/{id}`, `PATCH /drivers/{id}/update-status`, `DELETE /drivers/{id}`

Approval and rejection both use the `membership-requests` path segment. Member role filters and role-changing requests send the `ROLE_*` enum values expected by `TransportMemberRole`. The driver availability control is disabled for `ON_TRIP` drivers; the backend remains authoritative for eligibility.
