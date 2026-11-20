import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../common/BrandLogo";
import Icon from "../common/Icon";
import Button from "../common/Button";

function initialsFrom(user) {
    const name = user?.fullName || user?.name || user?.displayName;
    if (name) {
        return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    }
    const email = user?.email;
    return email ? email[0].toUpperCase() : "ME";
}

export default function HomeHeader({ user, onMySystems }) {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function closeOnOutsideClick(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
        }
        function closeOnEscape(event) {
            if (event.key === "Escape") setMenuOpen(false);
        }
        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    return (
        <header className="home-header">
            <button className="brand-home-button" type="button" onClick={() => navigate("/")} aria-label="BusTrackr home">
                <BrandLogo size="sm" />
            </button>

            {!isAuthenticated ? (
                <div className="header-auth-actions">
                    <Button variant="outline" size="small" onClick={() => navigate("/login")}>Login</Button>
                    <Button variant="amber" size="small" onClick={() => navigate("/register")}>Register</Button>
                </div>
            ) : (
                <div className="profile-menu-wrap" ref={menuRef}>
                    <button
                        type="button"
                        className="profile-avatar"
                        aria-label="Open profile menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        {initialsFrom(user)}
                    </button>
                    {menuOpen && (
                        <div className="profile-menu" role="menu">
                            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onMySystems?.(); }}>
                                <Icon name="settings" size={17} />
                                <span>My systems</span>
                            </button>
                            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); logout(); navigate("/", { replace: true }); }}>
                                <Icon name="logout" size={17} />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </header>
    );
}
