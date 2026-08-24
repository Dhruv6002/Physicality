import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const LINKS = [
  { to: "/shop", label: "Posters" },
  { to: "/custom", label: "Custom Poster" },
  { to: "/cover-art", label: "DVD Cover" },
  { to: "/account", label: "Track Order" },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkCls = "font-mono-press text-xs uppercase tracking-[0.2em] text-ink link-underline";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-paper border-b border-ink" data-testid="main-nav">
      <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="nav-brand-link">
          <img src="/brand/logo-mark.png" alt="Physicality" className="h-9 w-auto" />
          <span className="font-mono-press text-sm tracking-[0.35em] text-ink">PHYSICALITY</span>
          <span className="hidden lg:inline font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">Press Nº 01</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={linkCls} data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {l.label}
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link to="/admin" className={`${linkCls} text-terra`} data-testid="nav-admin">Press Office</Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              <Link to="/account" className={linkCls} data-testid="nav-account">{user.name.split(" ")[0]}'s Shelf</Link>
              <button onClick={async () => { await logout(); navigate("/"); }} className={linkCls} data-testid="nav-logout-button">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className={linkCls} data-testid="nav-login">Sign in</Link>
          )}
          <Link
            to="/cart"
            data-testid="nav-cart"
            className="font-mono-press text-xs uppercase tracking-[0.2em] bg-ink text-paper px-4 py-2 hover:bg-terra transition-colors"
          >
            Cart&nbsp;·&nbsp;{count}
          </Link>
        </div>

        <button className="md:hidden text-ink" onClick={() => setOpen(!open)} data-testid="nav-menu-toggle" aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden overflow-hidden border-t border-line bg-paper"
            data-testid="nav-mobile-menu"
          >
            <div className="px-5 py-6 flex flex-col gap-5">
              {LINKS.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className={linkCls}>{l.label}</Link>
              ))}
              {user?.role === "admin" && <Link to="/admin" onClick={() => setOpen(false)} className={`${linkCls} text-terra`}>Press Office</Link>}
              {user ? (
                <>
                  <Link to="/account" onClick={() => setOpen(false)} className={linkCls}>My Shelf</Link>
                  <button onClick={async () => { await logout(); setOpen(false); navigate("/"); }} className={`${linkCls} text-left`}>Sign out</button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className={linkCls}>Sign in</Link>
              )}
              <Link to="/cart" onClick={() => setOpen(false)} className="font-mono-press text-xs uppercase tracking-[0.2em] bg-ink text-paper px-4 py-3 text-center">
                Cart · {count}
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
