import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Footer() {
  const { user } = useAuth();
  return (
    <footer className="border-t border-ink bg-paper" data-testid="main-footer">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-6">
          <img src="/brand/logo-new.png" alt="Physicality" className="h-24 sm:h-32 w-auto max-w-[8rem] object-contain object-left" />
          <p className="mt-3 font-mono-press text-[10px] uppercase tracking-[0.2em] text-ink">Make Digital Tangible</p>
          <p className="mt-4 text-sm text-smoke leading-relaxed max-w-xs">
            Studio-crafted posters and physical cover boxes for the games you love.
            In an all-digital world, we keep the collection alive.
          </p>
        </div>
        <div className="md:col-span-3">
          <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke mb-4">Shop</p>
          <div className="flex flex-col gap-3 font-mono-press text-xs uppercase tracking-[0.15em]">
            <Link to="/shop" className="text-ink link-underline w-fit">Poster catalog</Link>
            <Link to="/custom" className="text-ink link-underline w-fit">Custom poster</Link>
            <Link to="/cover-art" className="text-ink link-underline w-fit">DVD cover boxes</Link>
          </div>
        </div>
        <div className="md:col-span-3">
          <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke mb-4">Support</p>
          <div className="flex flex-col gap-3 font-mono-press text-xs uppercase tracking-[0.15em]">
            <Link to="/track-order" className="text-ink link-underline w-fit">Track order</Link>
            <Link to="/account" className="text-ink link-underline w-fit">My orders</Link>
            {user?.role === "admin" && <Link to="/admin" className="text-ink link-underline w-fit">Admin</Link>}
            <a href="mailto:physicality.in@gmail.com" className="text-ink link-underline w-fit">physicality.in@gmail.com</a>
          </div>
        </div>
      </div>
      <div className="border-t border-ink">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-5 flex flex-col sm:flex-row justify-between gap-3">
          <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">
            Printed to order in India · Cover boxes ship without game discs
          </p>
          <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">
            Every DVD cover box includes a free A5 poster
          </p>
        </div>
      </div>
    </footer>
  );
}
