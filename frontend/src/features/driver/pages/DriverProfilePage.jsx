import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../services/apiClient";
import { getCurrentUser } from "../../auth/services/authService";
import { useAuth } from "../../../context/AuthContext";
import heroArt from "../../../assets/bustrackr/home-hero-art.png";
import { handleIllustrationError } from "../../../components/common/imageFallback";
import Icon from "../../../components/common/Icon";
import { formatLongDate, getErrorMessage, initialsFromName } from "../driverUtils";
import { DriverAppShell, DriverError, DriverLoading, DriverStatusPill } from "../components";
import "../../../styles/driver.css";

export default function DriverProfilePage() {
    const navigate = useNavigate();
    const { userId, transportSystemId, role, logout } = useAuth();
    const [driver, setDriver] = useState(null);
    const [user, setUser] = useState(null);
    const [system, setSystem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError("");
        const [driverResult, userResult, systemResult] = await Promise.allSettled([
            apiClient.get("/drivers/me").then((response) => response.data?.data ?? response.data),
            userId != null ? getCurrentUser(userId) : Promise.resolve(null),
            transportSystemId != null ? apiClient.get("/transport-systems").then((response) => response.data?.data ?? response.data) : Promise.resolve(null),
        ]);
        if (driverResult.status === "fulfilled") setDriver(driverResult.value?.driver ?? driverResult.value ?? null);
        else setError(getErrorMessage(driverResult.reason, "Driver profile couldn't be loaded."));
        if (userResult.status === "fulfilled") setUser(userResult.value);
        if (systemResult.status === "fulfilled") setSystem(systemResult.value);
        setLoading(false);
    }, [transportSystemId, userId]);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const name = driver?.name ?? user?.fullName ?? user?.name ?? "Driver";
    const phone = user?.phone ?? user?.phoneNumber ?? user?.mobileNumber ?? user?.mobile ?? null;
    const address = driver?.address ?? user?.address ?? null;
    const systemName = system?.name ?? system?.transportSystemName ?? "Transport system";
    const driverStatus = driver?.status ?? "AVAILABLE";

    function switchSystem() {
        navigate("/", { replace: true, state: { authNotice: "Choose a transport system to continue as a member." } });
    }

    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <DriverAppShell name={name} activeTab="profile">
            <section className="driver-profile-page">
                <div className="driver-profile-hero">
                    <img src={heroArt} alt="Bus in a city" onError={handleIllustrationError} />
                    <h1>Profile</h1>
                </div>
                {error && <DriverError message={error} onRetry={loadProfile} />}
                {loading ? <DriverLoading message="Loading your profile…" /> : <>
                    <section className="driver-profile-identity">
                        <div className="driver-profile-avatar">{initialsFromName(name)}</div>
                        <div className="driver-profile-identity__content"><h2>{name}</h2><DriverStatusPill status={driverStatus} /><p>{systemName} <span className="driver-profile-system-badge">{system?.accessType ?? "MEMBER"}</span></p></div>
                    </section>
                    <section className="driver-profile-info-card">
                        {phone ? <ProfileLine icon="phone" label="Phone" value={phone} /> : address ? <ProfileLine icon="pin" label="Address" value={address} /> : <ProfileLine icon="phone" label="Phone" value="Not provided" />}
                        <ProfileLine icon="id-card" label="Driving license number" value={driver?.licenseNumber ?? "Not provided"} />
                        <ProfileLine icon="calendar" label="License expiry date" value={formatLongDate(driver?.licenseExpiryDate, "Not provided")} />
                        <ProfileLine icon="user" label="Role" value={String(role ?? "DRIVER").replace(/^ROLE_/i, "").replaceAll("_", " ")} />
                    </section>
                    <button className="driver-button driver-button--outline driver-button--wide driver-switch-system" onClick={switchSystem}><Icon name="switch" size={21} /> Switch transport system</button>
                    <button className="driver-logout-button" onClick={handleLogout}><Icon name="logout" size={22} /> Logout</button>
                </>}
            </section>
        </DriverAppShell>
    );
}

function ProfileLine({ icon, label, value }) {
    return <div className="driver-profile-line"><Icon name={icon} size={24} /><div><small>{label}</small><strong>{value}</strong></div></div>;
}
