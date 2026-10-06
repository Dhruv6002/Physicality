import api from "../lib/api";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Reveal, SectionHeading } from "../components/Motion";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const { user, login, register, setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const googleButtonRef = useRef(null);

  const startGoogleLogin = () => {
    if (!googleClientId) {
      setError("Google Sign-In is not configured yet.");
      return;
    }
    if (!window.google?.accounts?.id) {
      setError("Google Sign-In is still loading. Please try again in a moment.");
      return;
    }
    window.google.accounts.id.prompt();
  };

  useEffect(() => {
    let cancelled = false;
    const nextPath = params.get("next") || "/account";
    const handleCredential = async ({ credential }) => {
      setBusy(true);
      setError("");
      try {
        const { data } = await api.post("/auth/google", { credential });
        if (!data?.user || !data?.token) throw new Error("Google sign-in failed");
        setSession(data.user, data.token);
        navigate(nextPath, { replace: true });
      } catch (err) {
        setError(err?.response?.data?.detail || err?.message || "Google sign-in failed");
      } finally {
        setBusy(false);
      }
    };

    const renderGoogleButton = (googleClientId) => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleCredential });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_black",
        size: "large",
        text: "continue_with",
        shape: "rect",
        width: Math.min(400, Math.floor(googleButtonRef.current.getBoundingClientRect().width || 400)),
      });
      setGoogleReady(true);
    };

    let script;
    const loadGoogleIdentity = async () => {
      try {
        const { data } = await api.get("/auth/google/config");
        if (cancelled) return;
        setGoogleClientId(data?.client_id || "");

        if (!data?.client_id) {
          setGoogleReady(false);
          return;
        }

        if (window.google?.accounts?.id) {
          renderGoogleButton(data.client_id);
          return;
        }

        script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (!script) {
          script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }
        script.addEventListener("load", () => renderGoogleButton(data.client_id), { once: true });
        script.addEventListener("error", () => setError("Google Sign-In could not be loaded. Please try again."), { once: true });
        if (window.google?.accounts?.id) renderGoogleButton(data.client_id);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err?.message || "Google sign-in is not configured.");
      }
    };

    loadGoogleIdentity();

    return () => { cancelled = true; };
  }, [navigate, params, setSession]);

  useEffect(() => {
    if (user) navigate(params.get("next") || "/account");
  }, [user, navigate, params]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = mode === "login" ? await login(email, password) : await register(name, email, password);
    setBusy(false);
    if (res.ok) {
      navigate(params.get("next") || "/account");
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-20 md:py-28" data-testid="auth-page">
      <img src="/brand/logo-new.png" alt="Physicality" className="h-20 sm:h-24 w-auto max-w-full object-contain object-left mb-10" data-testid="auth-logo" />
      <SectionHeading title={mode === "login" ? <>Sign <span className="italic">in</span></> : <>Open an <span className="italic">account</span></>} className="mb-12" />

      <Reveal>
        <div className="mx-auto w-full max-w-[400px]">
          {!googleReady && (
            <button
              type="button"
              onClick={startGoogleLogin}
              className="group flex w-full items-center justify-center gap-3 border border-[#dadce0] bg-white px-5 py-4 font-sans text-sm font-medium text-[#3c4043] shadow-[0_1px_2px_rgba(60,64,67,0.15),0_1px_3px_1px_rgba(60,64,67,0.1)] transition-all duration-200 hover:bg-[#f8f9fa] hover:shadow-[0_1px_3px_rgba(60,64,67,0.2),0_2px_6px_rgba(60,64,67,0.15)]"
              data-testid="google-signin-button-fallback"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.3-.2-1.9H12Z"/>
                  <path fill="#34A853" d="M3.8 7.3l3.5 2.6c.9-1.8 2.9-3.1 4.7-3.1 1.9 0 3.2.8 4 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2c-3.4 0-6.3 1.9-8.2 4.7Z" opacity="0.9"/>
                  <path fill="#FBBC05" d="M3.8 16.7A10 10 0 0 1 12 13.2c1.8 0 3.4.6 4.6 1.7l3.3-3.1C18.9 8.5 15.8 6.7 12 6.7c-3.4 0-6.3 1.9-8.2 4.7l-.1.7Z" opacity="0.9"/>
                  <path fill="#4285F4" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.1-2.6c-.8.5-1.9.9-3.6.9-3.1 0-5.7-2.1-6.4-5.1l-3.2 2.5A10 10 0 0 0 12 22Z" opacity="0.9"/>
                </svg>
              </span>
              <span>Sign in with Google</span>
            </button>
          )}
          <div
            className={`mx-auto flex min-h-12 w-full justify-center ${googleReady ? "block" : "hidden"}`}
            data-testid="google-signin-button"
            ref={googleButtonRef}
          />
        </div>

        <div className="flex items-center gap-4 my-8">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">or with email</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="flex border border-ink w-fit mb-10" role="tablist">
          {[["login", "Sign in"], ["register", "Register"]].map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setError(""); }}
              data-testid={`auth-tab-${m}`}
              className={`px-6 py-3 font-mono-press text-xs uppercase tracking-widest transition-colors ${mode === m ? "bg-ink text-paper" : "text-ink hover:bg-paper2"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-7" data-testid="auth-form">
          <AnimatePresence mode="wait">
            {mode === "register" && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  data-testid="auth-name-input"
                  className="w-full bg-transparent border-b border-ink focus:border-terra outline-none py-3 text-base text-ink placeholder:text-smoke/60 transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            data-testid="auth-email-input"
            className="w-full bg-transparent border-b border-ink focus:border-terra outline-none py-3 text-base text-ink placeholder:text-smoke/60 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "register" ? "Password (min. 6 characters)" : "Password"}
            required
            minLength={6}
            data-testid="auth-password-input"
            className="w-full bg-transparent border-b border-ink focus:border-terra outline-none py-3 text-base text-ink placeholder:text-smoke/60 transition-colors"
          />

          {error && (
            <p className="font-mono-press text-xs uppercase tracking-[0.15em] text-terra border border-terra px-4 py-3" data-testid="auth-error">
              {error}
            </p>
          )}

          {mode === "register" && (
            <p className="font-mono-press text-[10px] uppercase tracking-[0.12em] text-smoke leading-relaxed">
              By creating an account, you agree to our <Link to="/terms" className="text-ink link-underline">Terms & Conditions</Link> and <Link to="/privacy-policy" className="text-ink link-underline">Privacy Policy</Link>.
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid="auth-submit-button"
            className="w-full bg-terra text-paper px-6 py-4 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors disabled:opacity-50"
          >
            {busy ? "One moment…" : mode === "login" ? "Sign in" : "Register"}
          </button>
        </form>

        <p className="mt-8 font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">
          An account keeps your commissions, order history and press progress on one shelf.
        </p>
        <p className="mt-3 font-mono-press text-[10px] uppercase tracking-[0.2em]">
          <Link to="/" className="text-ink link-underline">Back to the press</Link>
        </p>
      </Reveal>
    </div>
  );
}
