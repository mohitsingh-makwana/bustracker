import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { DriverLocationProvider } from "./features/tracking/context/DriverLocationContext.jsx";
import "./index.css";
import "./App.css";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <AuthProvider>
            <DriverLocationProvider>
                <App />
            </DriverLocationProvider>
        </AuthProvider>
    </StrictMode>
);
