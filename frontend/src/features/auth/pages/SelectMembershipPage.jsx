import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function SelectMembershipPage() {
    const { selectTransportSystem, logout } = useAuth();
    const navigate = useNavigate();

    const [transportSystemId, setTransportSystemId] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const id = transportSystemId.trim();

        if (!/^[1-9]\d*$/.test(id)) {
            setError("Enter a valid transport system ID.");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await selectTransportSystem(id);
            navigate("/geolocation-test");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Unable to access this transport system."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main style={{ maxWidth: 500, margin: "40px auto", padding: 20 }}>
            <h1>Select Transport System</h1>
            <p>Enter the ID of your transport system.</p>

            <form onSubmit={handleSubmit}>
                <label htmlFor="transportSystemId">
                    Transport System ID
                </label>

                <input
                    id="transportSystemId"
                    type="number"
                    min="1"
                    step="1"
                    value={transportSystemId}
                    onChange={(event) =>
                        setTransportSystemId(event.target.value)
                    }
                    required
                    style={{
                        display: "block",
                        width: "100%",
                        padding: 10,
                        margin: "8px 0 16px",
                    }}
                />

                {error && <p role="alert" style={{ color: "red" }}>{error}</p>}

                <button type="submit" disabled={loading}>
                    {loading ? "Connecting..." : "Access Transport System"}
                </button>
            </form>

            <button
                type="button"
                onClick={() => {
                    logout();
                    navigate("/login", { replace: true });
                }}
                disabled={loading}
                style={{ marginTop: 12 }}
            >
                Log Out
            </button>
        </main>
    );
}