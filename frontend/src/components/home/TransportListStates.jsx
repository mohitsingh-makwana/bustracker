import Icon from "../common/Icon";
import Button from "../common/Button";
import appIcon from "../../assets/bustrackr/branding/app-icon.png";

export function TransportSkeletonList() {
    return (
        <div className="transport-skeleton-list" aria-label="Loading transport systems" aria-busy="true">
            {[1, 2, 3].map((item) => (
                <div className="transport-skeleton-card" key={item}>
                    <div className="skeleton skeleton-image" />
                    <div className="skeleton-content">
                        <div className="skeleton skeleton-line skeleton-title" />
                        <div className="skeleton skeleton-line skeleton-description" />
                        <div className="skeleton skeleton-line skeleton-city" />
                        <div className="skeleton skeleton-button" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function TransportEmptyState({ onClear }) {
    return (
        <section className="list-state list-state--empty" aria-live="polite">
            <div className="empty-illustration" aria-hidden="true">
                <div className="empty-city empty-city--one" />
                <div className="empty-city empty-city--two" />
                <div className="empty-road" />
                <div className="empty-bus"><Icon name="bus" size={66} strokeWidth={1.8} /></div>
                <div className="empty-magnifier"><Icon name="search" size={43} strokeWidth={2.8} /></div>
            </div>
            <h3>No transport systems found</h3>
            <p>Try adjusting your search or filters to find transport systems.</p>
            <Button variant="outline" full onClick={onClear}>Clear filters</Button>
        </section>
    );
}

export function TransportErrorState({ onRetry }) {
    return (
        <section className="list-state list-state--error" aria-live="polite">
            <div className="error-illustration" aria-hidden="true">
                <div className="empty-city empty-city--one" />
                <div className="empty-city empty-city--two" />
                <div className="empty-road" />
                <div className="error-brand-icon"><img src={appIcon} alt="" /></div>
                <div className="error-symbol"><Icon name="alert" size={31} strokeWidth={2.8} /></div>
            </div>
            <h3>Couldn't load transport systems</h3>
            <p>Something went wrong while loading the transport systems. Please try again.</p>
            <Button variant="amber" full onClick={onRetry}>
                <Icon name="refresh" size={18} /> Try again
            </Button>
        </section>
    );
}
