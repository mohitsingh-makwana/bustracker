import appIcon from "../../assets/bustrackr/branding/app-icon.png";
import horizontalLogo from "../../assets/bustrackr/branding/logo-horizontal.png";

export function BrandMark({ size = 44, className = "" }) {
    return (
        <img
            className={`brand-mark ${className}`.trim()}
            src={appIcon}
            width={size}
            height={size}
            alt="BusTrackr icon"
            draggable="false"
        />
    );
}

export default function BrandLogo({ size = "md", showWordmark = true, className = "" }) {
    const markSize = size === "sm" ? 34 : size === "lg" ? 54 : 44;

    return (
        <span className={`brand-logo brand-logo--${size} ${className}`.trim()}>
            {showWordmark ? (
                <img
                    className="brand-logo__image"
                    src={horizontalLogo}
                    alt="BusTrackr"
                    draggable="false"
                />
            ) : (
                <BrandMark size={markSize} />
            )}
        </span>
    );
}
