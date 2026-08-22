import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const sessionId = new URLSearchParams(location.hash.replace(/^#/, "")).get("session_id");
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id: sessionId });
        setSession(data.user, data.token);
        navigate("/account", { replace: true, state: { user: data.user } });
      } catch (e) {
        navigate("/auth?error=google", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper" data-testid="auth-callback">
      <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-smoke">Signing you in…</p>
    </div>
  );
}
