import { useState, useEffect,} from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { validatePasswordStrength, getLoginAttempts } from "../utils/security";
import { COUNTRIES } from "../utils/currencyData";
import { validateEmail,validatePhoneForCountry } from "../utils/userUtils";
import {
  Mail, Lock, User, ShieldCheck, Landmark, Globe,
  TrendingUp, Sparkles, ArrowLeft, AlertCircle,
  Eye, EyeOff, Phone, WifiOff, CheckCircle2,
  Inbox, RefreshCw, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/useTheme";
import ConvertXIcon from "../components/exchange/ConvertXIcon";
import Toast from "../components/Toast";
import { CountryDropdown } from "../components/CountryDropdowns";

function Field({ id, label, required, Icon, type = "text", value, onChange,
  placeholder, err, autoComplete, rightEl,
  focusedField, setFocusedField, disabled }) {
  return (
    <div>
      <label htmlFor={id} className="gs2-label">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className={`gs2-input-wrap ${focusedField === id ? "gs2-focused" : ""} ${err ? "gs2-error" : ""}`}>
        {Icon && <Icon className="gs2-icon" />}
        <input
          id={id} type={type} value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          onFocus={() => setFocusedField(id)}
          onBlur={() => setFocusedField(null)}
          className="gs2-input"
          style={{ paddingLeft: Icon ? 34 : 12 }}
        />
        {rightEl}
      </div>
      {err && <p className="gs2-err-msg"><AlertCircle className="w-3 h-3 shrink-0" />{err}</p>}
    </div>
  );
}

const LIVE_RATES = [
  { pair: "EUR/USD", val: "1.0842", dir: "up" },
  { pair: "GBP/USD", val: "1.2719", dir: "down" },
  { pair: "USD/JPY", val: "157.32", dir: "up" },
  { pair: "USD/NGN", val: "1,605",  dir: "up" },
  { pair: "AUD/USD", val: "0.6583", dir: "down" },
  { pair: "USD/CAD", val: "1.3684", dir: "up" },
  { pair: "USD/CHF", val: "0.8991", dir: "down" },
  { pair: "EUR/GBP", val: "0.8523", dir: "up" },
];

function LiveRateTicker() {
  const doubled = [...LIVE_RATES, ...LIVE_RATES];
  return (
    <div className="overflow-hidden w-full">
      <div className="gs2-ticker flex gap-4">
        {doubled.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md gs2-ticker-pill">
            <span style={{ fontSize:9, fontWeight:700, color:"var(--gs2-ticker-pair)", letterSpacing:"0.1em", textTransform:"uppercase" }}>{r.pair}</span>
            <span style={{ fontSize:10, fontWeight:900, color:"var(--gs2-ticker-val)" }}>{r.val}</span>
            <span style={{ fontSize:8, fontWeight:900, color: r.dir === "up" ? "#34d399" : "#f87171" }}>
              {r.dir === "up" ? "▲" : "▼"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GetStarted() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { signUp, signIn, signInWithGoogle, requestPasswordReset, verifyEmailActionCode, resendVerificationEmail } = useAuth();

  const [isSignUp, setIsSignUp]             = useState(false);
  const [surname, setSurname]               = useState("");
  const [firstName, setFirstName]           = useState("");
  const [otherName, setOtherName]           = useState("");
  const [phoneDialCode, setPhoneDialCode]   = useState("+1");
  const [phoneCountryCode, setPhoneCountryCode] = useState("US");
  const [phoneLocal, setPhoneLocal]         = useState("");
  const [country, setCountry]               = useState("");
  const [errors, setErrors]                 = useState({});
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [acceptTerms, setAcceptTerms]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [resetLoading, setResetLoading]     = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [showPassword, setShowPassword]     = useState(false);
  const [isOffline, setIsOffline]           = useState(!navigator.onLine);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verifiedEmail, setVerifiedEmail]   = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [toastConfig, setToastConfig]       = useState({ show: false, type: "success", title: "", message: "", onConfirm: null });
  const [focusedField, setFocusedField]     = useState(null);

  useEffect(() => {
    const on  = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;

    const check = async () => {
      const emailKey = email.trim().toLowerCase();
      if (!emailKey) return;

      try {
        const { isFirebaseEnabled } = await import("../services/firebase");

        if (isFirebaseEnabled) {
          const d = await getLoginAttempts(emailKey);
          if (cancelled) return;
          if (d.lockUntil && Date.now() < d.lockUntil) {
            setLockoutTimeLeft(Math.ceil((d.lockUntil - Date.now()) / 1000));
            setError("Too many failed login attempts. Account locked.");
          } else {
            setLockoutTimeLeft(0);
            setError(p => (p && p.includes("locked") ? "" : p));
          }
        } else {
          const key = `login_attempts_${emailKey}`;
          const d = JSON.parse(localStorage.getItem(key) || '{"count":0,"lockUntil":0}');
          if (cancelled) return;
          if (d.lockUntil && Date.now() < d.lockUntil) {
            setLockoutTimeLeft(Math.ceil((d.lockUntil - Date.now()) / 1000));
            setError("Too many failed login attempts. Account locked.");
          } else {
            setLockoutTimeLeft(0);
            setError(p => (p && p.includes("locked") ? "" : p));
          }
        }
      } catch {
        setLockoutTimeLeft(0);
      }
    };

    check();
    const t = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [email]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    const p    = new URLSearchParams(window.location.search);
    const mode = p.get("mode");
    const code = p.get("oobCode");
    if (mode === "verifyEmail" && code) {
      (async () => {
        try {
          await verifyEmailActionCode(code);
          setIsSignUp(false);
          setVerificationPending(false);
          setToastConfig({ show: true, type: "success", variant: "toast", title: "Email Verified",
            message: "Your email has been verified. Sign in to continue.",
            autoClose: true, duration: 6000, showConfirm: false,
            onClose: () => setToastConfig(x => ({ ...x, show: false })) });
        } catch (e) { setError(e.message || "Failed to verify email."); }
      })();
    }
  }, [verifyEmailActionCode]);

  const handleGoogleSignIn = async () => {
    setError(""); setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.cancelled) { setLoading(false); return; }
      setSuccess(true); navigate("/");
    } catch (e) {
      const msg = e.message || "Google Sign-In failed.";
      setError(msg);
      setToastConfig({ show: true, type: "error", title: "Google Sign-In Failed", message: msg,
        onClose: () => setToastConfig(x => ({ ...x, show: false })) });
    } finally { setLoading(false); }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setError(""); setResendingEmail(true);
    try {
      const addr = verifiedEmail || email.trim().toLowerCase();
      await resendVerificationEmail(addr, password);
      setToastConfig({ show: true, type: "success", title: "Email Resent",
        message: "A new verification link has been sent to your inbox.",
        onConfirm: () => setToastConfig(x => ({ ...x, show: false })),
        onClose:   () => setToastConfig(x => ({ ...x, show: false })) });
      setResendCooldown(60);
    } catch (e) {
      const msg = e.message || "Failed to resend.";
      setError(msg);
      setToastConfig({ show: true, type: "error", title: "Resend Failed", message: msg,
        onClose: () => setToastConfig(x => ({ ...x, show: false })) });
    } finally { setResendingEmail(false); }
  };

  const handleCountryChange = (name) => {
    setCountry(name);
    setErrors(p => ({ ...p, country: "" }));
    const obj = COUNTRIES.find(c => c.name === name);
    if (obj) { setPhoneDialCode(obj.dialCode); setPhoneCountryCode(obj.code); }
  };

  const handleToggleMode = (mode) => {
    if ((mode === "signup" && isSignUp) || (mode === "signin" && !isSignUp)) return;
    setIsSignUp(mode === "signup");
    setError(""); setErrors({}); setSuccess(false);
    setSurname(""); setFirstName(""); setOtherName(""); setPhoneLocal("");
    setPhoneDialCode("+1"); setPhoneCountryCode("US"); setCountry("");
    setEmail(""); setPassword(""); setAcceptTerms(false);
    setVerificationPending(false); setVerifiedEmail("");
  };

  const validateForm = () => {
    const e = {};
    const nameRe = /^[a-zA-ZÀ-ÖØ-öø-ÿ'']+(\s[a-zA-ZÀ-ÖØ-öø-ÿ'']+)*$/;
    if (isSignUp) {
      if (!firstName.trim())                   e.firstName = "Required.";
      else if (!nameRe.test(firstName.trim())) e.firstName = "Letters only.";
      else if (firstName.trim().length < 2)    e.firstName = "Min. 2 chars.";

      if (!surname.trim())                     e.surname = "Required.";
      else if (!nameRe.test(surname.trim()))   e.surname = "Letters only.";
      else if (surname.trim().length < 2)      e.surname = "Min. 2 chars.";

      if (!otherName.trim())                   e.otherName = "Required.";
      else if (!nameRe.test(otherName.trim())) e.otherName = "Letters only.";
      else if (otherName.trim().length < 2)    e.otherName = "Min. 2 chars.";

      if (!country)                            e.country = "Select your country.";
      if (!phoneLocal.trim())     { e.phone = "Phone number is required."; }
      else {
        const result = validatePhoneForCountry(phoneLocal, phoneCountryCode);
        if (!result.valid) e.phone = result.message;
      }
      if (!acceptTerms)                        e.acceptTerms = "Accept terms to continue.";
    }
    if (!email.trim())          e.email = "Email is required.";
    else if (!validateEmail(email)) e.email = "Enter a valid email.";

    if (!password)              e.password = "Password is required.";
    else if (isSignUp) {
      if (validatePasswordStrength(password).score < 3) e.password = "Must meet at least 'Medium' strength.";
    } else if (password.length < 6) e.password = "Min. 6 characters.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError(""); setErrors({}); setSuccess(false);
    if (lockoutTimeLeft > 0) { setError(`Account locked. Wait ${lockoutTimeLeft}s.`); return; }
    if (!validateForm()) return;
    if (!navigator.onLine) { setIsOffline(true); return; }
    setLoading(true);
    try {
      if (isSignUp) {
        const res = await signUp(firstName, surname, otherName, email, password,
          `${phoneDialCode} ${phoneLocal.trim()}`, country);
        if (res?.verificationRequired) {
          setVerifiedEmail(res.email || email.trim().toLowerCase());
          setVerificationPending(true);
          setToastConfig({ show: true, type: "success", title: "Verify Your Email",
            message: "A verification link has been sent to your inbox.",
            onConfirm: () => setToastConfig(x => ({ ...x, show: false })),
            onClose:   () => setToastConfig(x => ({ ...x, show: false })) });
          return;
        }
        setToastConfig({ show: true, type: "success", title: "Account Created!",
          message: "Welcome to ConvertX! Your account is ready.",
          onConfirm: () => { setToastConfig(x => ({ ...x, show: false })); setSuccess(true); navigate("/"); } });
      } else {
        const res = await signIn(email, password);
        if (res?.verificationRequired) {
          setVerifiedEmail(res.email || email.trim().toLowerCase());
          setVerificationPending(true);
          setToastConfig({ show: true, type: "error", title: "Verify Email First",
            message: "Click the link in your email then sign in again.",
            onClose: () => setToastConfig(x => ({ ...x, show: false })) });
          return;
        }
        setToastConfig({ show: true, type: "success", title: "Welcome Back!",
          message: "Login successful. Redirecting…",
          onConfirm: () => { setToastConfig(x => ({ ...x, show: false })); setSuccess(true); navigate("/"); } });
      }
    } catch (e) {
      const msg = e.message || "Authentication error.";
      setError(msg);
      setToastConfig({ show: true, type: "error",
        title: isSignUp ? "Sign Up Failed" : "Sign In Failed", message: msg,
        onClose: () => setToastConfig(x => ({ ...x, show: false })) });
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    setError(""); setErrors(p => ({ ...p, email: "" }));
    if (!email.trim())       { setErrors(p => ({ ...p, email: "Enter your email first." })); return; }
    if (!validateEmail(email)) { setErrors(p => ({ ...p, email: "Enter a valid email." })); return; }
    if (!navigator.onLine)  { setIsOffline(true); return; }
    setResetLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setToastConfig({ show: true, type: "success", title: "Reset Email Sent",
        message: `Password reset link sent to ${res.email}.`,
        onConfirm: () => setToastConfig(x => ({ ...x, show: false })),
        onClose:   () => setToastConfig(x => ({ ...x, show: false })) });
    } catch (e) {
      const msg = e.message || "Unable to send reset email.";
      setError(msg);
      setToastConfig({ show: true, type: "error", title: "Reset Failed", message: msg,
        onClose: () => setToastConfig(x => ({ ...x, show: false })) });
    } finally { setResetLoading(false); }
  };

  if (isOffline) {
    return (
      <div style={{ background: "linear-gradient(135deg,#060b18,#0a1628)", minHeight: "100vh" }}
        className="flex items-center justify-center p-6">
        <div className="text-center max-w-xs p-8 rounded-3xl border border-white/10 bg-white/4 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
            <WifiOff className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">No Connection</h2>
          <p className="text-sm text-white/40 leading-relaxed mb-6">
            ConvertX needs an active internet connection to authenticate you securely.
          </p>
          <button onClick={() => { if (navigator.onLine) setIsOffline(false); }}
            className="w-full py-3 rounded-xl font-bold text-sm text-black"
            style={{ background: "linear-gradient(135deg,#E88F2B,#d97706)" }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const pwStrength = password ? validatePasswordStrength(password) : null;
  const selectedPhoneCountry = COUNTRIES.find(c => c.code === phoneCountryCode);


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@600;700;800;900&display=swap');

        body { margin: 0; }
        .gs2-page { font-family: 'Inter', system-ui, sans-serif; }
        .gs2-heading { font-family: 'Outfit', 'Inter', sans-serif; }

        .gs2-bg { min-height: 100vh; background: var(--gs2-page-bg); transition: background 0.3s; }

        .gs2-dots {
          background-image: radial-gradient(circle, var(--gs2-dot-color) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .gs2-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 32px;
          border-bottom: 1px solid var(--gs2-header-border);
        }
        .gs2-back-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--gs2-back-color);
          border: 1px solid var(--gs2-back-border);
          background: var(--gs2-back-bg);
          text-decoration: none;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .gs2-back-pill:hover {
          color: var(--gs2-back-hover-color);
          background: var(--gs2-back-hover-bg);
          border-color: var(--gs2-back-hover-border);
        }

        .gs2-card {
          background: var(--gs2-card-bg);
          border: 1px solid var(--gs2-card-border);
          border-radius: 22px;
          box-shadow: var(--gs2-card-shadow);
        }

        .gs2-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px;
          padding: 3px;
          border-radius: 12px;
          background: var(--gs2-tab-bar-bg);
          border: 1px solid var(--gs2-tab-bar-border);
        }
        .gs2-tab {
          padding: 8px 0;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.18s;
          letter-spacing: 0.01em;
        }
        .gs2-tab-on  { background: var(--gs2-tab-on-bg); color: var(--gs2-tab-on-color); box-shadow: 0 1px 6px rgba(15,23,42,0.09); }
        .gs2-tab-off { color: #94a3b8; }
        .gs2-tab-off:hover { color: var(--gs2-tab-off-hover); }

        .gs2-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 5px;
        }

        .gs2-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          border-radius: 10px;
          border: 1.5px solid var(--gs2-input-border);
          background: var(--gs2-input-bg);
          transition: border-color 0.18s, box-shadow 0.18s;
          overflow: hidden;
        }
        .gs2-input-wrap.gs2-focused {
          border-color: #E88F2B;
          box-shadow: 0 0 0 3px rgba(232,143,43,0.11);
        }
        .gs2-input-wrap.gs2-error {
          border-color: #f43f5e;
          box-shadow: 0 0 0 3px rgba(244,63,94,0.09);
        }
        .gs2-input-wrap.gs2-valid {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.09);
        }
        .gs2-icon {
          position: absolute;
          left: 10px;
          width: 13px;
          height: 13px;
          color: #94a3b8;
          pointer-events: none;
          flex-shrink: 0;
          z-index: 1;
        }
        .gs2-input {
          width: 100%;
          padding: 9px 10px 9px 34px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--gs2-input-text);
          background: transparent;
          outline: none;
          border: none;
          min-width: 0;
        }
        .gs2-input::placeholder { color: #94a3b8; font-weight: 400; font-size: 12px; }
        .gs2-input:disabled     { opacity: 0.5; cursor: not-allowed; }
        .gs2-err-msg {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          font-size: 10px;
          font-weight: 600;
          color: #f43f5e;
        }

        .gs2-phone-wrap {
          position: relative;
          display: flex;
          align-items: center;
          border-radius: 10px;
          border: 1.5px solid var(--gs2-input-border);
          background: var(--gs2-input-bg);
          transition: border-color 0.18s, box-shadow 0.18s;
          overflow: hidden;
        }
        .gs2-phone-wrap.gs2-focused {
          border-color: #E88F2B;
          box-shadow: 0 0 0 3px rgba(232,143,43,0.11);
        }
        .gs2-phone-wrap.gs2-error {
          border-color: #f43f5e;
          box-shadow: 0 0 0 3px rgba(244,63,94,0.09);
        }
        .gs2-phone-wrap.gs2-valid {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.09);
        }
        .gs2-phone-prefix {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0 8px 0 10px;
          border-right: 1.5px solid var(--gs2-input-border);
          height: 36px;
          flex-shrink: 0;
          background: var(--gs2-phone-prefix-bg);
        }
        .gs2-phone-prefix img { width: 18px; height: 12px; object-fit: cover; border-radius: 2px; }
        .gs2-phone-prefix-text { font-size: 11px; font-weight: 700; color: var(--gs2-phone-prefix-text); font-family: monospace; white-space: nowrap; }
        .gs2-phone-input {
          flex: 1;
          padding: 9px 10px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--gs2-input-text);
          background: transparent;
          outline: none;
          border: none;
          min-width: 0;
        }
        .gs2-phone-input::placeholder { color: #94a3b8; font-size: 12px; }
        .gs2-phone-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .gs2-cta {
          width: 100%;
          padding: 11px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 800;
          color: #000;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: linear-gradient(135deg, #E88F2B 0%, #d97706 100%);
          box-shadow: 0 6px 20px rgba(232,143,43,0.28);
          transition: transform 0.14s, box-shadow 0.14s;
          letter-spacing: 0.01em;
        }
        .gs2-cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(232,143,43,0.36); }
        .gs2-cta:active:not(:disabled){ transform: scale(0.98); }
        .gs2-cta:disabled { opacity: 0.55; cursor: not-allowed; }

        .gs2-google {
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          border: 1.5px solid var(--gs2-google-border);
          background: var(--gs2-google-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--gs2-google-text);
          cursor: pointer;
          transition: all 0.18s;
        }
        .gs2-google:hover:not(:disabled) {
          background: var(--gs2-google-hover-bg);
          border-color: var(--gs2-google-hover-border);
          box-shadow: 0 2px 10px rgba(15,23,42,0.07);
        }
        .gs2-google:disabled { opacity: 0.5; cursor: not-allowed; }

        .gs2-divider { height: 1px; background: var(--gs2-divider); flex: 1; }

        .gs2-err-banner {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(244,63,94,0.07);
          border: 1px solid rgba(244,63,94,0.18);
          color: #f43f5e;
          font-size: 11.5px;
          font-weight: 500;
          margin-bottom: 12px;
        }
        .gs2-suc-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(16,185,129,0.18);
          color: #10b981;
          font-size: 11.5px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .gs2-bar { height: 3px; border-radius: 99px; transition: background 0.35s; }

        @keyframes gs2-tick {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .gs2-ticker { animation: gs2-tick 30s linear infinite; width: max-content; }
        .gs2-ticker:hover { animation-play-state: paused; }
        .gs2-ticker-pill { background: var(--gs2-ticker-bg); border: 1px solid var(--gs2-ticker-border); }

        .gs2-feat {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          background: var(--gs2-feat-bg);
          border: 1px solid var(--gs2-feat-border);
          transition: border-color 0.2s, background 0.2s;
        }
        .gs2-feat:hover { background: var(--gs2-feat-hover-bg); border-color: rgba(232,143,43,0.22); }
        .gs2-feat-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          background: var(--gs2-feat-icon-bg);
          border: 1px solid var(--gs2-feat-icon-border);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        @keyframes gs2-float-a { 0%,100%{ transform:translateY(0) scale(1);} 50%{ transform:translateY(-20px) scale(1.04);} }
        @keyframes gs2-float-b { 0%,100%{ transform:translateY(0) scale(1);} 50%{ transform:translateY(16px)  scale(0.97);} }
        .gs2-orb-a { animation: gs2-float-a 9s ease-in-out infinite; }
        .gs2-orb-b { animation: gs2-float-b 11s ease-in-out infinite; }
        .gs2-orb-c { animation: gs2-float-a 14s ease-in-out infinite reverse; }

        .gs2-verify {
          background: linear-gradient(145deg,rgba(232,143,43,0.07),rgba(217,119,6,0.05));
          border: 1px solid rgba(232,143,43,0.15);
          border-radius: 16px;
          padding: 22px;
        }

        .gs2-check { width: 15px; height: 15px; accent-color: #E88F2B; border-radius: 4px; cursor: pointer; flex-shrink: 0; margin-top: 1px; }

        @media (max-width: 640px) {
          .gs2-header { padding: 14px 16px; }
          .gs2-grid2  { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="gs2-page gs2-bg relative overflow-x-hidden" style={darkMode ? {
          "--gs2-page-bg":           "linear-gradient(160deg,#000000 0%,#000000 60%,#000000 100%)",
          "--gs2-dot-color":         "rgba(255,255,255,0.055)",
          "--gs2-header-border":     "rgba(255,255,255,0.05)",
          "--gs2-back-color":        "rgba(255,255,255,0.45)",
          "--gs2-back-border":       "rgba(255,255,255,0.08)",
          "--gs2-back-bg":           "rgba(255,255,255,0.04)",
          "--gs2-back-hover-color":  "#fff",
          "--gs2-back-hover-bg":     "rgba(255,255,255,0.09)",
          "--gs2-back-hover-border": "rgba(255,255,255,0.18)",
          "--gs2-card-bg":           "rgba(255,255,255,0.02)",
          "--gs2-card-border":       "rgba(255,255,255,0.07)",
          "--gs2-card-shadow":       "0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
          "--gs2-tab-bar-bg":        "rgba(0,0,0,0.35)",
          "--gs2-tab-bar-border":    "rgba(255,255,255,0.06)",
          "--gs2-tab-on-bg":         "rgba(232,143,43,0.1)",
          "--gs2-tab-on-color":      "#E88F2B",
          "--gs2-tab-off-hover":     "#cbd5e1",
          "--gs2-input-border":      "rgba(255,255,255,0.1)",
          "--gs2-input-bg":          "rgba(255,255,255,0.05)",
          "--gs2-input-text":        "#f1f5f9",
          "--gs2-phone-prefix-bg":   "rgba(255,255,255,0.06)",
          "--gs2-phone-prefix-text": "#94a3b8",
          "--gs2-google-border":     "rgba(255,255,255,0.1)",
          "--gs2-google-bg":         "rgba(255,255,255,0.05)",
          "--gs2-google-text":       "#e2e8f0",
          "--gs2-google-hover-bg":   "rgba(255,255,255,0.09)",
          "--gs2-google-hover-border":"rgba(255,255,255,0.18)",
          "--gs2-divider":           "rgba(255,255,255,0.08)",
          "--gs2-ticker-bg":         "rgba(232,143,43,0.06)",
          "--gs2-ticker-border":     "rgba(232,143,43,0.12)",
          "--gs2-ticker-pair":       "rgba(255,255,255,0.4)",
          "--gs2-ticker-val":        "rgba(255,255,255,0.8)",
          "--gs2-feat-bg":           "rgba(255,255,255,0.035)",
          "--gs2-feat-border":       "rgba(255,255,255,0.065)",
          "--gs2-feat-hover-bg":     "rgba(255,255,255,0.06)",
          "--gs2-feat-icon-bg":      "rgba(255,255,255,0.055)",
          "--gs2-feat-icon-border":  "rgba(255,255,255,0.08)",
        } : {
          "--gs2-page-bg":           "linear-gradient(160deg,#ffffff 0%,#f8f9fa 50%,#ffffff 100%)",
          "--gs2-dot-color":         "rgba(232,143,43,0.06)",
          "--gs2-header-border":     "rgba(0,0,0,0.07)",
          "--gs2-back-color":        "#475569",
          "--gs2-back-border":       "rgba(0,0,0,0.1)",
          "--gs2-back-bg":           "rgba(255,255,255,0.7)",
          "--gs2-back-hover-color":  "#0f172a",
          "--gs2-back-hover-bg":     "rgba(255,255,255,0.95)",
          "--gs2-back-hover-border": "rgba(0,0,0,0.2)",
          "--gs2-card-bg":           "rgba(255,255,255,0.95)",
          "--gs2-card-border":       "rgba(203,213,225,0.6)",
          "--gs2-card-shadow":       "0 16px 48px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
          "--gs2-tab-bar-bg":        "rgba(248,249,250,1)",
          "--gs2-tab-bar-border":    "rgba(226,232,240,0.8)",
          "--gs2-tab-on-bg":         "#fff",
          "--gs2-tab-on-color":      "#0f172a",
          "--gs2-tab-off-hover":     "#475569",
          "--gs2-input-border":      "#e2e8f0",
          "--gs2-input-bg":          "#f8fafc",
          "--gs2-input-text":        "#1e293b",
          "--gs2-phone-prefix-bg":   "#f1f5f9",
          "--gs2-phone-prefix-text": "#475569",
          "--gs2-google-border":     "#e2e8f0",
          "--gs2-google-bg":         "#fff",
          "--gs2-google-text":       "#374151",
          "--gs2-google-hover-bg":   "#f8fafc",
          "--gs2-google-hover-border":"#cbd5e1",
          "--gs2-divider":           "#e2e8f0",
          "--gs2-ticker-bg":         "rgba(232,143,43,0.06)",
          "--gs2-ticker-border":     "rgba(232,143,43,0.12)",
          "--gs2-ticker-pair":       "#64748b",
          "--gs2-ticker-val":        "#1e293b",
          "--gs2-feat-bg":           "rgba(255,255,255,0.65)",
          "--gs2-feat-border":       "rgba(203,213,225,0.7)",
          "--gs2-feat-hover-bg":     "rgba(255,255,255,0.9)",
          "--gs2-feat-icon-bg":      "rgba(248,249,250,0.9)",
          "--gs2-feat-icon-border":  "rgba(203,213,225,0.6)",
        }}>

        <div className="absolute inset-0 gs2-dots opacity-40 pointer-events-none" />
        <div className="gs2-orb-a absolute w-125 h-125 rounded-full pointer-events-none"
          style={{ background: darkMode
            ? "radial-gradient(circle,rgba(232,143,43,0.08),transparent 70%)"
            : "radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)",
            top: "-15%", right: "-10%" }} />
        <div className="gs2-orb-b absolute w-100 h-100 rounded-full pointer-events-none"
          style={{ background: darkMode
            ? "radial-gradient(circle,rgba(99,102,241,0.07),transparent 70%)"
            : "radial-gradient(circle,rgba(232,143,43,0.1),transparent 70%)",
            bottom: "5%", left: "-8%" }} />
        <div className="gs2-orb-c absolute w-75 h-75 rounded-full pointer-events-none"
          style={{ background: darkMode
            ? "radial-gradient(circle,rgba(217,119,6,0.06),transparent 70%)"
            : "radial-gradient(circle,rgba(217,119,6,0.08),transparent 70%)",
            top: "30%", left: "20%" }} />

        <header className="gs2-header relative z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,#E88F2B,#d97706)", boxShadow: "0 4px 14px rgba(232,143,43,0.28)" }}>
              <ConvertXIcon size={18} stroke="#000" />
            </div>
            <div>
              <span className="gs2-heading text-[15px] font-black tracking-wide"
                style={{ color: darkMode ? "#fff" : "#0f172a" }}>ConvertX</span>
              <p className="text-[9px] font-semibold tracking-widest uppercase leading-none mt-0.5"
                style={{ color: darkMode ? "rgba(255,255,255,0.3)" : "#64748b" }}>Secure Currency Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
              style={{ background: "rgba(232,143,43,0.08)", border: "1px solid rgba(232,143,43,0.18)", color: "#E88F2B" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live Rates
            </span>
            <Link to="/" className="gs2-back-pill">
              <ArrowLeft className="w-3 h-3" />
              Back to Home
            </Link>
          </div>
        </header>

        <main className="relative z-10 flex flex-col items-center px-4 py-8 sm:py-10">

          <motion.div
            className="w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="gs2-card p-6 sm:p-7">

              <div className="flex items-center gap-3 mb-5 pb-4"
                style={{ borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.07)" : "rgba(203,213,225,0.6)"}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background:"linear-gradient(135deg,#E88F2B,#d97706)", boxShadow:"0 4px 12px rgba(232,143,43,0.25)" }}>
                  {isSignUp
                    ? <User style={{ width:16, height:16, color:"#000" }} />
                    : <Lock style={{ width:14, height:14, color:"#000" }} />
                  }
                </div>
                <div>
                  <p className="gs2-heading font-black text-[13px] tracking-wide"
                    style={{ color: darkMode ? "#f1f5f9" : "#0f172a", lineHeight:1.2 }}>
                    {isSignUp ? "Create Account" : "Welcome Back"}
                  </p>
                  <p style={{ fontSize:10, color:"#94a3b8", fontWeight:500, marginTop:2 }}>
                    {isSignUp
                      ? "Fill in your details to get started"
                      : "Sign in to your ConvertX account"}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background:"rgba(232,143,43,0.08)", border:"1px solid rgba(232,143,43,0.18)",
                      fontSize:8, fontWeight:800, color:"#E88F2B", letterSpacing:"0.08em", textTransform:"uppercase" }}>
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    Secure
                  </span>
                </div>
              </div>

              <div className="gs2-tabs mb-4">
                <button type="button" onClick={() => handleToggleMode("signin")}
                  className={`gs2-tab ${!isSignUp ? "gs2-tab-on" : "gs2-tab-off"}`}>
                  Sign In
                </button>
                <button type="button" onClick={() => handleToggleMode("signup")}
                  className={`gs2-tab ${isSignUp ? "gs2-tab-on" : "gs2-tab-off"}`}>
                  Create Account
                </button>
              </div>


              <AnimatePresence>
                {error && (
                  <motion.div key="err" initial={{ opacity:0,y:-6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }}
                    className="gs2-err-banner">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {success && (
                  <motion.div key="suc" initial={{ opacity:0,y:-6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }}
                    className="gs2-suc-banner">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>{isSignUp ? "Account created! Redirecting…" : "Access granted! Redirecting…"}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {verificationPending ? (
                <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} className="space-y-4">
                  <div className="gs2-verify text-center">
                    <div className="flex justify-center mb-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>
                        <CheckCircle2 className="w-2.5 h-2.5" /> Email Registered
                      </span>
                    </div>
                    <div className="flex justify-center mb-3">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(232,143,43,0.1)", border: "1px solid rgba(232,143,43,0.18)" }}>
                        <Inbox className="w-7 h-7 text-[#E88F2B]" />
                      </div>
                    </div>
                    <h4 className="gs2-heading text-lg font-black text-slate-900 mb-1">Check Your Inbox</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      We sent a link to <span className="font-bold text-[#E88F2B]">{verifiedEmail || email.trim()}</span>
                    </p>
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[10px] font-semibold text-slate-600 leading-relaxed">
                        Click the link in your email to activate your account.
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">Can't find it? Check spam.</p>
                    </div>
                  </div>
                  <button type="button" disabled={resendingEmail || resendCooldown > 0}
                    onClick={handleResendVerification} className="gs2-cta">
                    <RefreshCw className={`w-3.5 h-3.5 ${resendingEmail ? "animate-spin" : ""}`} />
                    {resendingEmail ? "Resending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Verification Email"}
                  </button>
                  <button type="button"
                    onClick={() => { setVerificationPending(false); setVerifiedEmail(""); }}
                    className="w-full text-[11px] font-bold text-slate-400 hover:text-slate-700 transition py-1 cursor-pointer">
                    ← Back to Login
                  </button>
                </motion.div>
              ) : (

                <form onSubmit={handleSubmit} className="space-y-3" noValidate>

                  <AnimatePresence mode="wait">
                    {isSignUp && (
                      <motion.div key="signup-fields"
                        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                        exit={{ opacity:0, y:-8 }} transition={{ duration:0.22 }}
                        className="space-y-3">

                        <div className="grid grid-cols-2 gap-2.5 gs2-grid2">
                          <Field id="fn" label="First Name" required Icon={User}
                            value={firstName}
                            onChange={e => { setFirstName(e.target.value); setErrors(p=>({...p,firstName:""})); }}
                            placeholder="John" autoComplete="given-name" err={errors.firstName}
                            focusedField={focusedField} setFocusedField={setFocusedField}
                            disabled={loading || success || lockoutTimeLeft > 0} />
                          <Field id="sn" label="Surname" required Icon={User}
                            value={surname}
                            onChange={e => { setSurname(e.target.value); setErrors(p=>({...p,surname:""})); }}
                            placeholder="Smith" autoComplete="family-name" err={errors.surname}
                            focusedField={focusedField} setFocusedField={setFocusedField}
                            disabled={loading || success || lockoutTimeLeft > 0} />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 gs2-grid2">
                          <Field id="mn" label="Middle Name" required Icon={User}
                            value={otherName}
                            onChange={e => { setOtherName(e.target.value); setErrors(p=>({...p,otherName:""})); }}
                            placeholder="Michael" autoComplete="additional-name" err={errors.otherName}
                            focusedField={focusedField} setFocusedField={setFocusedField}
                            disabled={loading || success || lockoutTimeLeft > 0} />
                          <div>
                            <label className="gs2-label">Country</label>
                            <CountryDropdown value={country} onChange={handleCountryChange}
                              error={errors.country} disabled={loading || success || lockoutTimeLeft > 0} />
                            {errors.country && <p className="gs2-err-msg"><AlertCircle className="w-3 h-3" />{errors.country}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 gs2-grid2">

                          {(() => {
                            const digits = phoneLocal.replace(/[\s\-().+]/g, "").replace(/\D/g, "");
                            const liveResult = digits.length > 0
                              ? validatePhoneForCountry(phoneLocal, phoneCountryCode)
                              : null;
                            const phoneMsg = errors.phone ||
                              (liveResult && !liveResult.valid && digits.length >= 3 ? liveResult.message : "");
                            const isValid   = digits.length > 0 && !phoneMsg && liveResult?.valid;
                            const isError   = Boolean(phoneMsg);

                            return (
                              <div>
                                <label className="gs2-label">Phone Number</label>
                                <div className={`gs2-phone-wrap
                                  ${focusedField === "phone" ? "gs2-focused" : ""}
                                  ${isError ? "gs2-error" : isValid ? "gs2-valid" : ""}`}>
                                  <div className="gs2-phone-prefix">
                                    {selectedPhoneCountry ? (
                                      <img
                                        src={`https://flagcdn.com/w40/${phoneCountryCode.toLowerCase()}.png`}
                                        alt={selectedPhoneCountry.name}
                                        style={{ width:18, height:12, objectFit:"cover", borderRadius:2 }} />
                                    ) : (
                                      <Phone style={{ width:12, height:12, color:"#94a3b8" }} />
                                    )}
                                    <span className="gs2-phone-prefix-text">{phoneDialCode}</span>
                                  </div>
                                  <input
                                    id="phone"
                                    type="tel"
                                    value={phoneLocal}
                                    onChange={e => {
                                      setPhoneLocal(e.target.value);
                                      setErrors(p => ({ ...p, phone: "" }));
                                    }}
                                    disabled={loading || success || lockoutTimeLeft > 0}
                                    placeholder="Phone number"
                                    onFocus={() => setFocusedField("phone")}
                                    onBlur={() => setFocusedField(null)}
                                    className="gs2-phone-input"
                                  />
                                </div>
                                {phoneMsg && (
                                  <p className="gs2-err-msg">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    {phoneMsg}
                                  </p>
                                )}
                              </div>
                            );
                          })()}

                          <div>
                            <label htmlFor="su-email" className="gs2-label">Email Address</label>
                            <div className={`gs2-input-wrap ${focusedField === "su-email" ? "gs2-focused" : ""} ${errors.email ? "gs2-error" : ""}`}>
                              <Mail className="gs2-icon" />
                              <input id="su-email" type="email" value={email}
                                onChange={e => { setEmail(e.target.value); setErrors(p=>({...p,email:""})); }}
                                disabled={loading || success || lockoutTimeLeft > 0}
                                placeholder="you@example.com" autoComplete="email"
                                onFocus={() => setFocusedField("su-email")}
                                onBlur={() => setFocusedField(null)}
                                className="gs2-input"
                                style={{ paddingLeft: 34, paddingRight: email.trim() && !errors.email ? 30 : 10 }}
                              />
                              {email.trim() && !errors.email && (
                                <div className="absolute right-8 top-1/2 -translate-y-1/2"
                                  style={{ color: validateEmail(email) ? "#10b981" : "#f43f5e" }}>
                                  {validateEmail(email) ? <CheckCircle2 style={{width:12,height:12}} /> : <AlertCircle style={{width:12,height:12}} />}
                                </div>
                              )}
                            </div>
                            {errors.email && <p className="gs2-err-msg"><AlertCircle className="w-3 h-3 shrink-0" />{errors.email}</p>}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isSignUp && (
                    <motion.div key="si-email" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}>
                      <label htmlFor="si-email" className="gs2-label">Email Address</label>
                      <div className={`gs2-input-wrap ${focusedField === "si-email" ? "gs2-focused" : ""} ${errors.email ? "gs2-error" : ""}`}>
                        <Mail className="gs2-icon" />
                        <input id="si-email" type="email" value={email}
                          onChange={e => { setEmail(e.target.value); setErrors(p=>({...p,email:""})); }}
                          disabled={loading || success || lockoutTimeLeft > 0}
                          placeholder="you@example.com" autoComplete="email"
                          onFocus={() => setFocusedField("si-email")}
                          onBlur={() => setFocusedField(null)}
                          className="gs2-input" />
                      </div>
                      {errors.email && <p className="gs2-err-msg"><AlertCircle className="w-3 h-3 shrink-0" />{errors.email}</p>}
                    </motion.div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="pwd" className="gs2-label" style={{ marginBottom: 0 }}>Password</label>
                      {!isSignUp && (
                        <button type="button" disabled={loading || resetLoading || success}
                          onClick={handleForgotPassword}
                          className="text-[10px] font-bold text-[#E88F2B] hover:text-[#E88F2B] transition disabled:opacity-50 cursor-pointer">
                          {resetLoading ? "Sending…" : "Forgot password?"}
                        </button>
                      )}
                    </div>
                    <div className={`gs2-input-wrap ${focusedField === "pwd" ? "gs2-focused" : ""} ${errors.password ? "gs2-error" : ""}`}>
                      <Lock className="gs2-icon" />
                      <input id="pwd" type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setErrors(p=>({...p,password:""})); }}
                        disabled={loading || success || lockoutTimeLeft > 0}
                        placeholder={isSignUp ? "Min. 8 chars — e.g. Abc@1234" : "Enter your password"}
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        onFocus={() => setFocusedField("pwd")}
                        onBlur={() => setFocusedField(null)}
                        className="gs2-input" style={{ paddingLeft: 34, paddingRight: 36 }} />
                      <button type="button" tabIndex={-1}
                        disabled={loading || success || lockoutTimeLeft > 0}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer disabled:opacity-50">
                        {showPassword ? <EyeOff style={{ width:14,height:14 }} /> : <Eye style={{ width:14,height:14 }} />}
                      </button>
                    </div>
                    {errors.password && <p className="gs2-err-msg"><AlertCircle className="w-3 h-3 shrink-0" />{errors.password}</p>}

                    {isSignUp && password && pwStrength && (
                      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Strength</span>
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                            style={{
                              background: pwStrength.score <= 2 ? "rgba(244,63,94,0.1)" : pwStrength.score === 3 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                              color:      pwStrength.score <= 2 ? "#f43f5e"             : pwStrength.score === 3 ? "#f59e0b"             : "#10b981"
                            }}>
                            {pwStrength.label}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className="gs2-bar flex-1"
                              style={{ background: i <= pwStrength.score
                                ? (pwStrength.score <= 2 ? "#f43f5e" : pwStrength.score === 3 ? "#f59e0b" : "#10b981")
                                : "#e2e8f0" }} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {isSignUp && (
                    <div>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" id="terms" className="gs2-check"
                          checked={acceptTerms}
                          disabled={loading || success || lockoutTimeLeft > 0}
                          onChange={e => { setAcceptTerms(e.target.checked); setErrors(p=>({...p,acceptTerms:""})); }} />
                        <label htmlFor="terms" className="text-[11px] text-slate-400 leading-normal cursor-pointer select-none">
                          I agree to the{" "}
                          <a href="#" className="text-[#E88F2B] hover:underline font-semibold">Terms of Service</a>
                          {" "}and{" "}
                          <a href="#" className="text-[#E88F2B] hover:underline font-semibold">Privacy Policy</a>
                        </label>
                      </div>
                      {errors.acceptTerms && <p className="gs2-err-msg mt-1"><AlertCircle className="w-3 h-3 shrink-0" />{errors.acceptTerms}</p>}
                    </div>
                  )}

                  <button type="submit" disabled={loading || success || lockoutTimeLeft > 0} className="gs2-cta">
                    {loading ? (
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                            className="w-1.5 h-1.5 rounded-full bg-black/30"
                          />
                        ))}
                      </div>
                    ) : lockoutTimeLeft > 0 ? (
                      <span>Locked ({lockoutTimeLeft}s)</span>
                    ) : (
                      <>
                        <span>{isSignUp ? "Create Free Account" : "Access Converter"}</span>
                        <ChevronRight style={{ width:15,height:15 }} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2.5">
                    <div className="gs2-divider" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">or</span>
                    <div className="gs2-divider" />
                  </div>

                  <button type="button" onClick={handleGoogleSignIn}
                    disabled={loading || success || lockoutTimeLeft > 0} className="gs2-google">
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>

                  <p className="text-center text-[11px] text-slate-400">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button type="button"
                      onClick={() => handleToggleMode(isSignUp ? "signin" : "signup")}
                      className="text-[#E88F2B] font-bold hover:text-[#E88F2B] transition cursor-pointer">
                      {isSignUp ? "Sign in" : "Create one"}
                    </button>
                  </p>
                </form>
              )}
            </div>


          </motion.div>

          <motion.div
            className="w-full max-w-2xl mt-12 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
          >
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4"
                style={{ background:"rgba(232,143,43,0.08)", border:"1px solid rgba(232,143,43,0.18)", color:"#E88F2B" }}>
                <Sparkles style={{ width:11,height:11 }} />
                Join the Institutional Network
              </span>
              <h1 className="gs2-heading text-3xl sm:text-4xl font-black leading-tight tracking-tight"
                style={{ color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                A smarter way to manage{" "}
                <span style={{ WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                  backgroundImage:"linear-gradient(135deg,#E88F2B,#818cf8)" }}>
                  global conversions.
                </span>
              </h1>
              <p className="text-sm leading-relaxed mt-3 max-w-md mx-auto"
                style={{ color: darkMode ? "rgba(255,255,255,0.4)" : "#64748b" }}>
                Access real-time institutional exchange indices, interactive charts, and zero-spread market indicators — all in one place.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                { icon: <Globe style={{width:15,height:15,color:"#E88F2B"}} />, title:"180+ Supported Assets",
                  desc:"Real-time conversion feeds across global currencies instantly." },
                { icon: <Landmark style={{width:15,height:15,color:"#34d399"}} />, title:"Bank Rate Preview",
                  desc:"Compare commercial bank spreads vs live mid-market rates." },
                { icon: <TrendingUp style={{width:15,height:15,color:"#a78bfa"}} />, title:"Market Insights",
                  desc:"Monitor pricing spreads, volatility and reserve indices." },
              ].map((f, i) => (
                <motion.div key={i} className="gs2-feat"
                  initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay: 0.35 + i * 0.1, duration: 0.4 }}>
                  <div className="gs2-feat-icon">{f.icon}</div>
                  <div>
                    <h4 className="text-[12px] font-bold"
                      style={{ color: darkMode ? "#f1f5f9" : "#1e293b" }}>{f.title}</h4>
                    <p className="text-[10px] leading-relaxed mt-0.5"
                      style={{ color: darkMode ? "rgba(255,255,255,0.35)" : "#64748b" }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl py-1"
              style={{
                background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(99,102,241,0.05)",
                border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(99,102,241,0.1)"
              }}>
              <LiveRateTicker />
            </div>

            <p className="text-center text-[10px] font-medium mt-6"
              style={{ color: darkMode ? "rgba(255,255,255,0.2)" : "#94a3b8" }}>
              © {new Date().getFullYear()} ConvertX Financial Inc. All rights reserved.
            </p>
          </motion.div>
        </main>
      </div>

      <Toast {...toastConfig} onClose={() => setToastConfig(p => ({ ...p, show: false }))} />
    </>
  );
}
