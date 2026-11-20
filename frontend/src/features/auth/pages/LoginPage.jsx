import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import AuthPageShell from "../../../components/common/AuthPageShell";
import Icon from "../../../components/common/Icon";
import InputField from "../../../components/common/InputField";
import Button from "../../../components/common/Button";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const privateSystem = location.state?.privateSystem;

    const [email, setEmail] = useState(location.state?.email || "");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email.trim(), password);
            navigate(location.state?.returnTo || "/", {
                replace: true,
                state: privateSystem ? { privateSystem } : { authNotice: location.state?.returnTo ? "You're now logged in. Continue creating your transport system." : "You're now logged in." },
            });
        } catch (err) {
            const status = err?.response?.status;
            const serverMessage = String(err?.response?.data?.message || err?.response?.data?.msg || err?.response?.data?.error || "");
            if (status === 401 || status === 400 || /bad credential|invalid.*(email|password)|credential/i.test(serverMessage)) {
                setError("Invalid email or password");
            } else {
                setError(serverMessage || "We couldn't sign you in. Check your connection and try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthPageShell
            title="Welcome back!"
            subtitle="Login to continue to BusTrackr"
            variant="login"
            infoBanner={privateSystem?.name ? `Login to request access to ${privateSystem.name}` : null}
        >
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <InputField
                    id="login-email"
                    name="email"
                    label="Email"
                    type="email"
                    icon="mail"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); setError(""); }}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                />
                <InputField
                    id="login-password"
                    name="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    icon="lock"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setError(""); }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    rightControl={(
                        <button type="button" className="input-icon-action" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                            <Icon name={showPassword ? "eye-off" : "eye"} size={19} />
                        </button>
                    )}
                />

                {location.state?.authNotice && !error && <p className="auth-success-notice" role="status"><Icon name="info" size={18} />{location.state.authNotice}</p>}
                {error && <p className="auth-inline-error" role="alert"><Icon name="alert" size={19} />{error}</p>}

                <Button type="submit" variant="amber" size="large" full className="auth-submit" disabled={loading || !email.trim() || !password}>
                    {loading ? <><span className="button-spinner" aria-hidden="true" />Logging in...</> : "Login"}
                </Button>
            </form>
            <p className="auth-switch-copy">New to BusTrackr? <Link to="/register/verify" state={privateSystem ? { privateSystem } : undefined}>Create an account</Link></p>
        </AuthPageShell>
    );
}
