import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import AuthPageShell from "../../../components/common/AuthPageShell";
import Icon from "../../../components/common/Icon";
import InputField from "../../../components/common/InputField";
import { buildRegistrationPayload, register as registerRequest } from "../services/authService";
import registrationFlowStore from "../../../services/registrationFlowStore";
import Button from "../../../components/common/Button";

function isEmailTaken(error) {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || error?.response?.data?.msg || error?.response?.data?.error || error?.message || "");
    return status === 409 || /email.*(already|exist|taken|registered)|duplicate.*email/i.test(message);
}

export default function RegisterPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const privateSystem = location.state?.privateSystem;
    const initialFlow = registrationFlowStore.read();
    const [flow] = useState(initialFlow);
    const [remainingSeconds, setRemainingSeconds] = useState(() => initialFlow ? Math.max(0, Math.ceil((initialFlow.expiresAt - Date.now()) / 1000)) : 0);
    const [verificationExpired, setVerificationExpired] = useState(() => !initialFlow || initialFlow.expiresAt <= Date.now());
    const verificationMessage = location.state?.verificationMessage || "Email verified successfully.";
    const [fieldErrors, setFieldErrors] = useState({});

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);
    const [legalDocument, setLegalDocument] = useState("");

    useEffect(() => {
        if (!flow) return undefined;
        const update = () => {
            const seconds = Math.max(0, Math.ceil((flow.expiresAt - Date.now()) / 1000));
            setRemainingSeconds(seconds);
            if (seconds === 0) {
                setVerificationExpired(true);
                registrationFlowStore.clear();
            }
        };
        update();
        const timer = window.setInterval(update, 1000);
        return () => window.clearInterval(timer);
    }, [flow]);

    async function handleSubmit(event) {
        event.preventDefault();
        setEmailError("");
        setFormError("");
        setFieldErrors({});

        const trimmedName = fullName.trim();
        const trimmedEmail = flow?.email || "";
        const digits = phone.replace(/\D/g, "");

        if (verificationExpired || !flow?.verificationToken) {
            setVerificationExpired(true);
            return;
        }
        if (!trimmedName) {
            setFormError("Enter your full name.");
            return;
        }
        if (!/^\d{10}$/.test(digits)) {
            setFormError("Enter a valid 10-digit mobile number.");
            return;
        }
        if (password.length < 8) {
            setFormError("Your password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setFormError("Passwords do not match.");
            return;
        }
        if (!acceptedTerms) {
            setFormError("Please agree to the Terms of Service and Privacy Policy.");
            return;
        }

        setLoading(true);
        try {
            await registerRequest(buildRegistrationPayload({
                fullName: trimmedName,
                email: flow.email,
                phone: digits,
                password,
                verificationToken: flow.verificationToken,
            }));
            registrationFlowStore.clear();

            try {
                await login(trimmedEmail, password);
                navigate("/", {
                    replace: true,
                    state: privateSystem
                        ? { privateSystem, authNotice: `Account created. Request access to ${privateSystem.name} below.` }
                        : { authNotice: "Your BusTrackr account has been created." },
                });
            } catch {
                navigate("/login", {
                    replace: true,
                    state: {
                        email: trimmedEmail,
                        privateSystem,
                        authNotice: "Your account was created. Please log in to continue.",
                    },
                });
            }
        } catch (error) {
            const status = error?.response?.status;
            const message = error?.response?.data?.message || error?.response?.data?.msg || error?.response?.data?.error;
            if (isEmailTaken(error)) setEmailError(message || "This email is already registered");
            else if (status === 401 || status === 403 || /verification.*(invalid|expired)|token.*(invalid|expired)/i.test(String(message || ""))) {
                registrationFlowStore.clear();
                setVerificationExpired(true);
                setFormError("Verification expired or invalid. Please verify your email again.");
            } else {
                const errors = error?.response?.data?.errors || error?.response?.data?.fieldErrors;
                if (errors && typeof errors === "object") {
                    const mapped = {};
                    Object.entries(errors).forEach(([key, value]) => { mapped[key] = Array.isArray(value) ? value[0] : String(value); });
                    setFieldErrors(mapped);
                }
                setFormError(message || "Unable to create your account right now. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <AuthPageShell title="Create your account" subtitle="Join BusTrackr and start your journey" variant="register" backTo="/register/verify" backState={{ email: flow?.email || "", privateSystem }}>
                <form className="auth-form auth-form--register" onSubmit={handleSubmit} noValidate>
                    <InputField
                        id="register-full-name"
                        label="Full Name"
                        icon="user"
                        value={fullName}
                        onChange={(event) => { setFullName(event.target.value); setFormError(""); }}
                        placeholder="Enter your full name"
                        autoComplete="name"
                        required
                        error={fieldErrors.fullName || fieldErrors.name}
                    />
                    <div className="form-field">
                        <label>Verified email</label>
                        <div className="form-input-wrap verified-email-row">
                            <Icon name="mail" size={19} className="form-input-icon" />
                            <span>{flow?.email || ""}</span>
                            <strong className="verified-badge"><Icon name="check-circle" size={13} />Verified</strong>
                        </div>
                    </div>
                    <p className="registration-verified-message" role="status">{verificationMessage}</p>
                    <p className={`registration-countdown ${verificationExpired ? "is-expired" : ""}`} aria-live="polite">
                        {verificationExpired ? "Verification expired. Please verify your email again." : `Verification valid for ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`}
                    </p>
                    {verificationExpired && <Button type="button" variant="amber" full onClick={() => navigate("/register/verify", { state: { email: flow?.email || "" } })}>Verify again</Button>}
                    <div className="form-field">
                        <label htmlFor="register-phone">Phone number</label>
                        <div className="phone-input-row">
                            <div className="phone-prefix" aria-label="Country code India +91"><span className="india-flag" aria-hidden="true"><i /><b /><em /></span><strong>+91</strong></div>
                            <div className="form-input-wrap phone-number-input">
                                <input
                                    id="register-phone"
                                    name="phone"
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel-national"
                                    value={phone}
                                    onChange={(event) => { setPhone(event.target.value.replace(/\D/g, "").slice(0, 10)); setFormError(""); }}
                                    placeholder="Enter 10 digit number"
                                    maxLength={10}
                                    required
                                    aria-label="10-digit phone number"
                                    aria-invalid={Boolean(fieldErrors.phone || fieldErrors.phoneNumber || fieldErrors.mobileNumber)}
                                />
                            </div>
                        </div>
                        {(fieldErrors.phone || fieldErrors.phoneNumber || fieldErrors.mobileNumber) && <p className="field-error" role="alert">{fieldErrors.phone || fieldErrors.phoneNumber || fieldErrors.mobileNumber}</p>}
                    </div>
                    <InputField
                        id="register-password"
                        label="Password"
                        icon="lock"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => { setPassword(event.target.value); setFormError(""); }}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        hint="At least 8 characters"
                        error={fieldErrors.password}
                        rightControl={<button type="button" className="input-icon-action" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}><Icon name={showPassword ? "eye-off" : "eye"} size={19} /></button>}
                    />
                    <InputField
                        id="register-confirm-password"
                        label="Confirm Password"
                        icon="lock"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => { setConfirmPassword(event.target.value); setFormError(""); }}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        required
                        rightControl={<button type="button" className="input-icon-action" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}><Icon name={showConfirmPassword ? "eye-off" : "eye"} size={19} /></button>}
                    />

                    <label className="terms-row">
                        <input type="checkbox" checked={acceptedTerms} onChange={(event) => { setAcceptedTerms(event.target.checked); setFormError(""); }} />
                        <span>I agree to the <button type="button" className="inline-link" onClick={() => setLegalDocument("Terms of Service")}>Terms of Service</button> and <button type="button" className="inline-link" onClick={() => setLegalDocument("Privacy Policy")}>Privacy Policy</button></span>
                    </label>

                    {emailError && <p className="auth-inline-error" role="alert"><Icon name="alert" size={19} />{emailError} <Link to="/login" state={{ email: flow?.email }}>Login instead</Link></p>}
                    {formError && <p className="auth-inline-error" role="alert"><Icon name="alert" size={19} />{formError}</p>}
                    {!formError && verificationExpired && <p className="auth-inline-error" role="alert"><Icon name="alert" size={19} />Verification expired. Please verify your email again.</p>}
                    <Button type="submit" variant="amber" size="large" full className="auth-submit" disabled={loading || verificationExpired}>
                        {loading ? <><span className="button-spinner" aria-hidden="true" />Creating account...</> : "Create Account"}
                    </Button>
                </form>
                <p className="auth-switch-copy">Already have an account? <Link to="/login" state={privateSystem ? { privateSystem } : undefined}>Login here</Link></p>
                <p className="register-brand-tagline">Connecting People.<br />Moving Cities.</p>
            </AuthPageShell>
            {legalDocument && (
                <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLegalDocument(""); }}>
                    <section className="system-preview-dialog legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-title">
                        <button type="button" className="dialog-close" onClick={() => setLegalDocument("")} aria-label="Close"><Icon name="x" size={20} /></button>
                        <h2 id="legal-title">{legalDocument}</h2>
                        <p>This document has not been added to the frontend yet. The link is ready to connect when the approved legal content is available.</p>
                        <button type="button" className="button button--navy button--full" onClick={() => setLegalDocument("")}>Close</button>
                    </section>
                </div>
            )}
        </>
    );
}
