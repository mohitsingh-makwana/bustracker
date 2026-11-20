import { useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import Icon from "./Icon";
import authIllustration from "../../assets/bustrackr/auth-illustration.jpg";
import { handleIllustrationError } from "./imageFallback";

export default function AuthPageShell({ title, subtitle, children, footer, infoBanner, variant = "login", backTo = "/", backState }) {
    const navigate = useNavigate();
    return (
        <main className={`auth-page auth-page--${variant}`}>
            <div className="auth-shell">
                <header className="auth-header">
                    <button type="button" className="auth-back" onClick={() => navigate(backTo, { state: backState })} aria-label={backTo === "/" ? "Back to home" : "Back to email verification"}>
                        <Icon name="chevron-right" size={23} className="auth-back-icon" />
                    </button>
                    <button type="button" className="auth-brand-button" onClick={() => navigate("/")} aria-label="BusTrackr home">
                        <BrandLogo size="sm" />
                    </button>
                    <span className="auth-header-spacer" />
                </header>

                <section className="auth-intro">
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                </section>

                <div className="auth-landscape" aria-hidden="true">
                    <img src={authIllustration} alt="" onError={handleIllustrationError} />
                </div>

                {infoBanner && <div className="auth-info-banner"><Icon name="info" size={18} /><span>{infoBanner}</span></div>}

                <section className="auth-form-area">{children}</section>

                {footer && <div className="auth-footer-copy">{footer}</div>}
                <div className="auth-bottom-art" style={{ backgroundImage: `url(${authIllustration})` }} aria-hidden="true" />
            </div>
        </main>
    );
}
