import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthPageShell from "../../../components/common/AuthPageShell";
import Icon from "../../../components/common/Icon";
import InputField from "../../../components/common/InputField";
import Button from "../../../components/common/Button";
import registrationFlowStore from "../../../services/registrationFlowStore";
import { formatOtpCountdown, getOtpActionState, getVerificationResult, normalizeEmail } from "../registrationFlowUtils";
import { sendRegistrationOtp, verifyRegistrationOtp } from "../services/authService";

export const OTP_RESEND_SECONDS = 120;

function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(normalizeEmail(email));
}

function getServerMessage(error) {
    return error?.response?.data?.message
        || error?.response?.data?.msg
        || error?.response?.data?.error
        || (error?.response ? "We couldn't complete that request. Please try again." : "Network error. Check your connection and try again.");
}

export default function VerifyEmailPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const storedFlow = registrationFlowStore.read();
    const [email, setEmail] = useState(location.state?.email || storedFlow?.email || "");
    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("info");
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [hasSentOtp, setHasSentOtp] = useState(false);
    const [resendAt, setResendAt] = useState(0);
    const [remaining, setRemaining] = useState(0);
    const otpRef = useRef(null);

    useEffect(() => {
        if (!resendAt) return undefined;
        const update = () => {
            const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
            setRemaining(seconds);
            if (seconds === 0) setResendAt(0);
        };
        update();
        const timer = window.setInterval(update, 1000);
        return () => window.clearInterval(timer);
    }, [resendAt]);

    function handleEmailChange(value) {
        const nextEmail = value;
        const previousNormalized = normalizeEmail(email);
        const nextNormalized = normalizeEmail(nextEmail);
        if (previousNormalized !== nextNormalized) registrationFlowStore.clear();
        setEmail(nextEmail);
        setOtp("");
        setMessage("");
        setMessageType("info");
        setHasSentOtp(false);
        setResendAt(0);
        setRemaining(0);
    }

    async function handleSendOtp() {
        if (!isValidEmail(email) || sending || verifying || remaining > 0) return;
        setSending(true);
        setMessage("");
        try {
            const returnedMessage = await sendRegistrationOtp(email);
            const text = returnedMessage || "OTP sent.";
            setMessage(text);
            setMessageType(/otp already sent/i.test(text) ? "info" : "success");
            setHasSentOtp(true);
            setResendAt(Date.now() + OTP_RESEND_SECONDS * 1000);
            setRemaining(OTP_RESEND_SECONDS);
            otpRef.current?.focus();
        } catch (error) {
            setMessage(getServerMessage(error));
            setMessageType("error");
        } finally {
            setSending(false);
        }
    }

    async function handleVerify() {
        if (!isValidEmail(email) || !/^\d{6}$/.test(otp) || verifying || sending) return;
        setVerifying(true);
        setMessage("");
        try {
            const response = await verifyRegistrationOtp(email, otp);
            const result = getVerificationResult(response);
            const verificationToken = result.verificationToken;
            if (!result.verified) {
                setMessage(result.message || "Email verification failed. Please check the code and try again.");
                setMessageType("error");
                return;
            }
            const savedFlow = registrationFlowStore.save({
                email: result.email || normalizeEmail(email),
                verificationToken,
                receivedAt: Date.now(),
            });

            // Confirm the session-backed flow is valid before entering the
            // guarded registration route.
            if (!savedFlow || !registrationFlowStore.read()) {
                setMessage("Email was verified, but the verification session could not be saved. Please try again.");
                setMessageType("error");
                return;
            }

            // Replace the verification step only after the token is safely
            // persisted; React Router then renders the guarded registration route.
            navigate("/register", {
                replace: true,
                state: {
                    verificationMessage: result.message || "Email verified successfully.",
                    privateSystem: location.state?.privateSystem,
                },
            });
        } catch (error) {
            setMessage(getServerMessage(error));
            setMessageType("error");
        } finally {
            setVerifying(false);
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        if (!hasSentOtp) handleSendOtp();
        else handleVerify();
    }

    const sendState = getOtpActionState({ email, sending: sending || verifying, remainingSeconds: remaining, hasSentOtp });
    const sendLabel = sending ? "Sending..." : remaining > 0 ? `Resend in ${formatOtpCountdown(remaining)}` : "Send";

    return (
        <AuthPageShell
            title="Verify your email"
            subtitle="We'll send a one-time code to confirm it's you"
            variant="register"
        >
            <form className="auth-form auth-form--register verify-email-form" onSubmit={handleSubmit} noValidate>
                <InputField
                    id="verify-email"
                    name="email"
                    label="Email"
                    type="email"
                    icon="mail"
                    value={email}
                    onChange={(event) => handleEmailChange(event.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                />
                <div className="form-field">
                    <label htmlFor="verify-otp">One-time password</label>
                    <div className="otp-input-row">
                        <div className="form-input-wrap">
                            <Icon name="lock" size={19} className="form-input-icon" />
                            <input
                                ref={otpRef}
                                id="verify-otp"
                                name="otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                value={otp}
                                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="Enter 6-digit code"
                                aria-label="Six-digit verification code"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="amber"
                            className="otp-send-button"
                            disabled={sendState.sendDisabled}
                            onClick={handleSendOtp}
                        >
                            {sendLabel}
                        </Button>
                    </div>
                </div>
                <div className={`registration-message registration-message--${messageType}`} role="status" aria-live="polite">
                    {message}
                </div>
                <Button
                    type="submit"
                    variant="amber"
                    size="large"
                    full
                    className="auth-submit"
                    disabled={!isValidEmail(email) || !/^\d{6}$/.test(otp) || verifying || sending}
                >
                    {verifying ? <><span className="button-spinner" aria-hidden="true" />Verifying...</> : "Verify"}
                </Button>
            </form>
            <p className="auth-switch-copy">Already have an account? <Link to="/login" state={location.state?.privateSystem ? { privateSystem: location.state.privateSystem } : undefined}>Login here</Link></p>
            <p className="register-brand-tagline">Connecting People.<br />Moving Cities.</p>
        </AuthPageShell>
    );
}
