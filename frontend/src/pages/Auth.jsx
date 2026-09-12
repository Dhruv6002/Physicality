import { useEffect, useState } from "react";
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
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (params.get("error") === "google") setError("That google sign-in link expired or was already used - press the button once more.");
  }, [params]);

  useEffect(() => {
    if (user) navigate(params.get("next") || "/account");
  }, [user, navigate, params]);

  const googleSignIn = () => {
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

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
      <img src="/brand/logo-mark.png" alt="Physicality" className="h-16 w-auto mb-10" data-testid="auth-logo" />
      <SectionHeading index="The ledger" title={mode === "login" ? <>Sign <span className="italic">in</span></> : <>Open an <span className="italic">account</span></>} className="mb-12" />

      <Reveal>
        <button
          onClick={googleSignIn}
          data-testid="google-signin-button"
          className="w-full flex items-center justify-center gap-3 border border-ink text-ink px-6 py-4 font-mono-press text-xs uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#EA4335" d="M12 5.04c1.7 0 3.22.59 4.42 1.74l3.29-3.29C17.72 1.64 15.06.5 12 .5 7.58.5 3.77 3.03 1.84 6.68l3.83 2.97C6.62 6.9 9.05 5.04 12 5.04z"/>
            <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45c-.28 1.48-1.12 2.73-2.38 3.58l3.65 2.83c2.14-1.97 3.78-4.88 3.78-8.6z"/>
            <path fill="#FBBC05" d="M5.67 14.35a7.1 7.1 0 0 1 0-4.7L1.84 6.68a11.5 11.5 0 0 0 0 10.64l3.83-2.97z"/>
            <path fill="#34A853" d="M12 23.5c3.06 0 5.63-1.01 7.5-2.74l-3.65-2.83c-1.01.68-2.3 1.08-3.85 1.08-2.95 0-5.38-1.86-6.33-4.61l-3.83 2.97C3.77 20.97 7.58 23.5 12 23.5z"/>
          </svg>
          Continue with Google
        </button>

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
