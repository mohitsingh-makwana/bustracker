import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/common/BrandLogo";
import Icon from "../../components/common/Icon";
import { handleIllustrationError } from "../../components/common/imageFallback";
import { initialsFromName, statusLabel } from "./driverUtils";

export function DriverHeader({ name = "Driver", activeTab = "home", compact = false }) {
    const navigate = useNavigate();
    return (
        <header className={`driver-header ${compact ? "driver-header--compact" : ""}`}>
            <button className="driver-header__brand" onClick={() => navigate("/driver")} aria-label="BusTrackr home">
                <BrandLogo size="md" />
            </button>
            {compact ? <span className="driver-header__route-title">{name}</span> : null}
            <button className="driver-avatar" onClick={() => navigate("/driver/profile")} aria-label="Open driver profile">
                {initialsFromName(name)}
            </button>
        </header>
    );
}

export function DriverStatusPill({ status, className = "" }) {
    const label = statusLabel(status);
    const tone = label === "On trip" ? "trip" : label === "Not available" ? "muted" : "available";
    return <span className={`driver-status driver-status--${tone} ${className}`}><i />{label}</span>;
}

export function DriverBottomNav({ active = "home" }) {
    const navigate = useNavigate();
    const items = [
        { id: "home", label: "Home", icon: "home", path: "/driver" },
        { id: "history", label: "History", icon: "history", path: "/driver/history" },
        { id: "profile", label: "Profile", icon: "user", path: "/driver/profile" },
    ];
    return (
        <nav className="driver-bottom-nav" aria-label="Driver navigation">
            {items.map((item) => (
                <button key={item.id} className={active === item.id ? "is-active" : ""} onClick={() => navigate(item.path)} aria-current={active === item.id ? "page" : undefined}>
                    <Icon name={item.icon} size={25} strokeWidth={active === item.id ? 2.5 : 1.8} />
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>
    );
}

export function DriverAppShell({ children, activeTab = "home", name = "Driver", hideNav = false, compactHeader = false, hideHeader = false }) {
    return (
        <main className={`driver-app-page ${hideNav ? "driver-app-page--no-nav" : ""}`}>
            <div className="driver-app-shell">
                {!hideHeader && <DriverHeader name={name} activeTab={activeTab} compact={compactHeader} />}
                {children}
            </div>
            {!hideNav && <DriverBottomNav active={activeTab} />}
        </main>
    );
}

export function DriverLoading({ message = "Loading your dashboard…" }) {
    return <div className="driver-loading" role="status"><span className="driver-spinner" /><p>{message}</p></div>;
}

export function DriverError({ message, onRetry }) {
    return (
        <div className="driver-inline-error" role="alert">
            <Icon name="alert" size={20} />
            <span>{message}</span>
            {onRetry && <button type="button" onClick={onRetry}>Try again</button>}
        </div>
    );
}

export function DriverEmptyState({ title = "No trips yet", description = "Your completed and cancelled trips will appear here.", actionLabel, onAction }) {
    return (
        <div className="driver-empty-state">
            <img src={new URL("../../assets/bustrackr/no-trips-art.png", import.meta.url).href} alt="Bus with a clock" onError={handleIllustrationError} />
            <h2>{title}</h2>
            <p>{description}</p>
            {actionLabel && <button className="driver-button driver-button--outline" onClick={onAction}>{actionLabel}</button>}
        </div>
    );
}

export function DriverConfirmDialog({ title, description, confirmLabel, cancelLabel = "Keep driving", onConfirm, onCancel, busy = false, warning = false }) {
    return (
        <div className="driver-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
            <section className="driver-dialog" role="dialog" aria-modal="true" aria-labelledby="driver-dialog-title">
                <div className={`driver-dialog__symbol ${warning ? "driver-dialog__symbol--warning" : ""}`}><Icon name={warning ? "alert" : "flag-checkered"} size={30} /></div>
                <h2 id="driver-dialog-title">{title}</h2>
                <p>{description}</p>
                <button className="driver-button driver-button--primary driver-button--wide" onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : confirmLabel}</button>
                <button className="driver-dialog__cancel" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
            </section>
        </div>
    );
}
