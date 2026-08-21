import { useState } from "react";
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
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

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
