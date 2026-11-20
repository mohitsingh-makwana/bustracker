import { useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useDriverGeolocation } from "../hooks/useDriverGeolocation";
import { sendDriverLocation } from "../services/driverService";

export default function GeolocationTestPage() {
    const { role, transportSystemId, logout } = useAuth();

    const [tripId, setTripId] = useState("");
    const [tracking, setTracking] = useState(false);
    const [latestPosition, setLatestPosition] = useState(null);
    const [requestStatus, setRequestStatus] = useState("Not started");
    const [error, setError] = useState("");

    const lastSentAtRef = useRef(0);
    const sendingRef = useRef(false);

    const isDriver =
        role?.replace(/^ROLE_/i, "").toUpperCase() === "DRIVER";

    async function handleLocation(position) {
        setLatestPosition(position);
        setError("");

        // Send at most one request every five seconds.
        // Also prevent overlapping HTTP requests.
        const now = Date.now();

        if (
            sendingRef.current ||
            now - lastSentAtRef.current < 5000
        ) {
            return;
        }

        sendingRef.current = true;
        lastSentAtRef.current = now;
        setRequestStatus("Sending location...");

        try {
            await sendDriverLocation(tripId, position);

            setRequestStatus(
                `Location submitted at ${new Date().toLocaleTimeString()}`
            );
        } catch (err) {
            setRequestStatus("Location request failed");

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Unable to send the location to the backend."
            );
        } finally {
            sendingRef.current = false;
        }
    }

    const { status: gpsStatus, error: gpsError } =
        useDriverGeolocation({
            enabled: tracking,
            onLocation: handleLocation,
        });

    function startTracking(event) {
        event.preventDefault();

        if (!isDriver) {
            setError("The selected membership must have the DRIVER role.");
            return;
        }

        const id = tripId.trim();

        if (!/^[1-9]\d*$/.test(id)) {
            setError("Enter a valid positive Trip ID.");
            return;
        }

        setError("");
        setLatestPosition(null);
        setRequestStatus("Waiting for GPS...");
        lastSentAtRef.current = 0;
        sendingRef.current = false;
        setTracking(true);
    }

    function stopTracking() {
        setTracking(false);
        setRequestStatus("Tracking stopped");
    }

    function handleLogout() {
        setTracking(false);
        logout();
    }

    return (
        <main style={{ maxWidth: 650, margin: "40px auto", padding: 20 }}>
            <h1>BusTrackr — GPS Test</h1>

            <p>
                Transport system: {transportSystemId ?? "Not selected"}
            </p>
            <p>Role: {role ?? "Unknown"}</p>

            <hr />

            <h2>Trip Tracking</h2>

            <form onSubmit={startTracking}>
                <label htmlFor="tripId">Active Trip ID</label>

                <input
                    id="tripId"
                    type="number"
                    min="1"
                    step="1"
                    value={tripId}
                    onChange={(event) => setTripId(event.target.value)}
                    disabled={tracking}
                    required
                    style={{
                        display: "block",
                        boxSizing: "border-box",
                        width: "100%",
                        padding: 10,
                        margin: "8px 0 16px",
                    }}
                />

                <button type="submit" disabled={tracking || !isDriver}>
                    Start Tracking
                </button>

                <button
                    type="button"
                    onClick={stopTracking}
                    disabled={!tracking}
                    style={{ marginLeft: 10 }}
                >
                    Stop Tracking
                </button>
            </form>

            {!isDriver && (
                <p>
                    Select a transport membership with the DRIVER role
                    before starting GPS tracking.
                </p>
            )}

            <hr />

            <h2>GPS Status</h2>
            <p>{gpsStatus}</p>

            {gpsError && (
                <p role="alert" style={{ color: "crimson" }}>
                    GPS error: {gpsError}
                </p>
            )}

            <h2>Latest Coordinates</h2>

            {latestPosition ? (
                <>
                    <p>Latitude: {latestPosition.latitude}</p>
                    <p>Longitude: {latestPosition.longitude}</p>
                    <p>
                        Accuracy: {latestPosition.accuracyMeters} metres
                    </p>
                    <p>
                        Speed:{" "}
                        {latestPosition.speedMetersPerSecond == null
                            ? "Unavailable"
                            : `${latestPosition.speedMetersPerSecond} m/s`}
                    </p>
                    <p>
                        Captured at:{" "}
                        {new Date(
                            latestPosition.capturedAtMs
                        ).toLocaleString()}
                    </p>
                </>
            ) : (
                <p>No GPS position received yet.</p>
            )}

            <h2>Backend Request</h2>
            <p>{requestStatus}</p>

            {error && (
                <p role="alert" style={{ color: "crimson" }}>
                    {error}
                </p>
            )}

            <hr />

            <button type="button" onClick={handleLogout}>
                Log Out
            </button>
        </main>
    );
}