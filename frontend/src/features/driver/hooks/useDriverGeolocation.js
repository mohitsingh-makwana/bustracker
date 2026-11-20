import { useEffect, useRef, useState } from "react";

export function useDriverGeolocation({ enabled, onLocation }) {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);

    const onLocationRef = useRef(onLocation);

    useEffect(() => {
        onLocationRef.current = onLocation;
    }, [onLocation]);

    useEffect(() => {
        if (!enabled) {
            setStatus("idle");
            setError(null);
            return;
        }

        if (!navigator.geolocation) {
            setStatus("error");
            setError("Geolocation is not supported by this browser.");
            return;
        }

        setStatus("starting");
        setError(null);

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const coords = position.coords;

                setStatus("tracking");
                setError(null);

                onLocationRef.current?.({
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracyMeters: coords.accuracy,
                    speedMetersPerSecond: coords.speed,
                    headingDegrees: coords.heading,
                    capturedAtMs: position.timestamp,
                });
            },
            (geoError) => {
                setStatus("error");

                switch (geoError.code) {
                    case 1:
                        setError("Location permission was denied.");
                        break;
                    case 2:
                        setError("Your current location is unavailable.");
                        break;
                    case 3:
                        setError("Getting your location timed out.");
                        break;
                    default:
                        setError("Unable to retrieve your location.");
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 3000,
                timeout: 15000,
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [enabled]);

    return { status, error };
}