import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import HomePage from "./features/transports/pages/HomePage";
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import VerifyEmailPage from "./features/auth/pages/VerifyEmailPage";
import registrationFlowStore from "./services/registrationFlowStore";
import { hasValidRegistrationFlow } from "./features/auth/registrationFlowUtils";
import SelectMembershipPage from "./features/auth/pages/SelectMembershipPage";
import GeolocationTestPage from "./features/driver/pages/GeoLocationTestPage.jsx";
import PassengerHomePage from "./features/transports/pages/PassengerHomePage";
import PassengerTripDetailsPage from "./features/transports/pages/PassengerTripDetailsPage";
import DriverHomePage from "./features/driver/pages/DriverHomePage";
import DriverTripPage from "./features/driver/pages/DriverTripPage";
import DriverTripCompletedPage from "./features/driver/pages/DriverTripCompletedPage";
import DriverHistoryPage from "./features/driver/pages/DriverHistoryPage";
import DriverProfilePage from "./features/driver/pages/DriverProfilePage";
import AdminDashboardPage from "./features/admin/pages/AdminDashboardPage";
import CreateTransportSystemPage from "./features/transports/pages/CreateTransportSystemPage";

function AppRoutes() {
    const { isAuthenticated, isMemberAuthenticated } = useAuth();
    // Subscribe to location changes so route guards that read session-backed
    // state are recalculated after navigation (e.g. after OTP verification).
    useLocation();

    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/transport-systems/create" element={isAuthenticated ? <CreateTransportSystemPage /> : <Navigate to="/login" state={{ returnTo: "/transport-systems/create", authNotice: "Log in to create a transport system." }} replace />} />
            <Route path="/passenger" element={<PassengerHomePage />} />
            <Route path="/passenger/trips/:tripId" element={isAuthenticated ? <PassengerTripDetailsPage /> : <Navigate to="/login" replace state={{ authNotice: "Your session ended. Please log in again to continue tracking this trip." }} />} />
            <Route path="/driver" element={isMemberAuthenticated ? <DriverHomePage /> : <Navigate to={isAuthenticated ? "/select-membership" : "/login"} replace />} />
            <Route path="/driver/trips/completed" element={isMemberAuthenticated ? <DriverTripCompletedPage /> : <Navigate to={isAuthenticated ? "/select-membership" : "/login"} replace />} />
            <Route path="/driver/trips/:tripId" element={isMemberAuthenticated ? <DriverTripPage /> : <Navigate to={isAuthenticated ? "/select-membership" : "/login"} replace />} />
            <Route path="/driver/history" element={isMemberAuthenticated ? <DriverHistoryPage /> : <Navigate to={isAuthenticated ? "/select-membership" : "/login"} replace />} />
            <Route path="/driver/profile" element={isMemberAuthenticated ? <DriverProfilePage /> : <Navigate to={isAuthenticated ? "/select-membership" : "/login"} replace />} />
            <Route path="/admin/trips/:tripId/track" element={isMemberAuthenticated ? <PassengerTripDetailsPage /> : <Navigate to={isAuthenticated ? "/select-membership" : "/login"} replace />} />
            <Route path="/admin" element={isMemberAuthenticated ? <AdminDashboardPage /> : <Navigate to={isAuthenticated ? "/select-membership" : "/login"} replace />} />
            <Route path="/admin/*" element={isMemberAuthenticated ? <AdminDashboardPage /> : <Navigate to={isAuthenticated ? "/select-membership" : "/login"} replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register/verify" element={<VerifyEmailPage />} />
            <Route path="/register" element={hasValidRegistrationFlow(registrationFlowStore.read()) ? <RegisterPage /> : <Navigate to="/register/verify" replace />} />
            <Route
                path="/select-membership"
                element={isAuthenticated ? <SelectMembershipPage /> : <Navigate to="/login" replace />}
            />
            <Route
                path="/geolocation-test"
                element={isMemberAuthenticated ? <GeolocationTestPage /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}
