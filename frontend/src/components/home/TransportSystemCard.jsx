import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Icon from "../common/Icon";
import Button from "../common/Button";
import publicImage from "../../assets/bustrackr/transport-public.jpg";
import privateImage from "../../assets/bustrackr/transport-private.jpg";
import { handleIllustrationError } from "../common/imageFallback";

function normalizeStatus(status) {
    return String(status ?? "").toUpperCase();
}

export default function TransportSystemCard({
    system,
    membership,
    onRequestAccess,
    onSelectSystem,
}) {
    const { isAuthenticated } = useAuth();
    const [requesting, setRequesting] = useState(false);
    const [localError, setLocalError] = useState("");

    const isPublic = normalizeStatus(system.accessType) === "PUBLIC";
    const status = normalizeStatus(membership?.status);
    const image = isPublic ? publicImage : privateImage;

    async function handleRequestAccess() {
        setLocalError("");
        setRequesting(true);
        try {
            await onRequestAccess(system);
        } catch (error) {
            setLocalError(error?.message || "Unable to submit your request. Please try again.");
        } finally {
            setRequesting(false);
        }
    }

    function handleSelectSystem() {
        onSelectSystem?.(system);
    }

    let privateButton;
    if (isPublic) {
        // Public transport remains explorable even if a previous membership
        // request is pending or rejected. An active member still checks access
        // and receives a MEMBER token on selection.
        if (isAuthenticated && (status === "ACTIVE" || (membership?.fromMySystems && !status))) {
            privateButton = <Button variant="navy" full onClick={handleSelectSystem}>Open <Icon name="arrow-right" size={18} /></Button>;
        } else {
            privateButton = <Button variant="navy" full onClick={handleSelectSystem}>Explore transport <Icon name="arrow-right" size={19} /></Button>;
        }
    } else if (!isAuthenticated) {
        privateButton = <Button variant="request" full onClick={handleSelectSystem}><Icon name="lock" size={18} /> Login to request access</Button>;
    } else if (status === "ACTIVE" || (membership?.fromMySystems && !status)) {
        privateButton = <Button variant="navy" full onClick={handleSelectSystem}>Open <Icon name="arrow-right" size={18} /></Button>;
    } else if (status === "PENDING") {
        // Visual state is retained, but selection performs a fresh membership check.
        privateButton = <Button variant="disabled" full onClick={handleSelectSystem}><Icon name="clock" size={17} /> Request pending</Button>;
    } else if (status === "REJECTED") {
        privateButton = (
            <div className="rejected-actions">
                <Button variant="rejected" full onClick={handleSelectSystem}><Icon name="x" size={17} /> Request rejected</Button>
                <button type="button" className="text-action text-action--retry" onClick={handleRequestAccess} disabled={requesting}>{requesting ? "Sending request…" : "Try again"}</button>
            </div>
        );
    } else {
        privateButton = <Button variant="amber" full onClick={handleSelectSystem}><Icon name="lock" size={18} /> Request access</Button>;
    }

    const city = system.city || system.area || "Location not specified";
    const description = system.description || (isPublic ? "Routes, stops and live bus tracking" : "Private transport for approved members");

    return (
        <article className="transport-card">
            <button className="transport-card__image-button" type="button" onClick={handleSelectSystem} aria-label={`View ${system.name}`}>
                <img className="transport-card__image" src={image} alt="" loading="lazy" onError={handleIllustrationError} />
            </button>
            <div className="transport-card__body">
                <button className="transport-card__title-row" type="button" onClick={handleSelectSystem}>
                    <span className="transport-card__title-copy">
                        <span className="transport-card__name">{system.name}</span>
                        <span className="transport-card__description">{description}</span>
                    </span>
                    <Icon name="chevron-right" size={22} />
                </button>
                <div className="transport-card__city"><Icon name="pin" size={17} /> <span>{city}</span></div>
                {isPublic && (
                    <div className="transport-card__stats" aria-label="Transport statistics">
                        <span className="transport-card__stat transport-card__stat--live">
                            <Icon name="activity" size={17} />
                            <strong>{Number(system.activeTripCount ?? 0)} live now</strong>
                        </span>
                        <span className="transport-card__stat">
                            <Icon name="route" size={17} />
                            <strong>{Number(system.routeCount ?? 0)} routes</strong>
                        </span>
                    </div>
                )}
                <div className="transport-card__action">
                    {privateButton}
                </div>
                {localError && <p className="inline-error transport-card__error" role="alert">{localError}</p>}
            </div>
        </article>
    );
}
