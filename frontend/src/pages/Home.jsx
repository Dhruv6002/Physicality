import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Marquee from "react-fast-marquee";
import { ArrowRight } from "lucide-react";
import { MaskedLines, Reveal } from "../components/Motion";

const GAMES = ["GTA VI", "Elden Ring", "Cyberpunk 2077", "The Last of Us", "God of War", "Spider-Man 2", "Red Dead Redemption", "Hollow Knight", "Minecraft", "Valorant"];

const STEPS = [
  { num: "I.", title: "Pick a title", body: "Name any game, browse the menu, or bring your own artwork." },
  { num: "II.", title: "Set the format", body: "A4, A3 or A5 for posters — framed or unframed. PlayStation, Xbox or PC for cover boxes." },
  { num: "III.", title: "Pay & track", body: "Razorpay checkout. Follow your order from press bench to your doorstep." },
];

export default function Home() {
  return (
    <div data-testid="home-page">
      {/* MASTHEAD RULE */}
      <div className="border-b border-ink" data-testid="masthead-bar">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-3 flex items-center justify-between font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">
          <span>Vol. I &nbsp;·&nbsp; Issue 01 &nbsp;·&nbsp; 2026</span>
          <span className="hidden md:inline">Printed in India &nbsp;·&nbsp; ₹89 – ₹399</span>
          <span>N° 001</span>
        </div>
      </div>

      {/* HERO */}
      <section className="border-b border-ink" data-testid="hero-section">
        <div className="mx-auto max-w-7xl px-5 md:px-8 pt-14 md:pt-20 pb-20 md:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.8 }}
              className="font-mono-press text-xs uppercase tracking-[0.2em] text-terra mb-8"
              data-testid="hero-eyebrow"
            >
              ✦ A physical games press
            </motion.p>
            <MaskedLines
              lines={[
                <>The archive</>,
                <>for players</>,
                <>who still</>,
                <><span className="italic text-terra">collect.</span></>,
              ]}
              className="font-serif-press text-6xl sm:text-7xl lg:text-8xl tracking-tighter leading-[0.95] text-ink"
              data-testid="hero-heading"
            />
          </div>
          <div className="lg:col-span-4 flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-base text-smoke leading-relaxed max-w-sm">
                Publishers went digital. Shelves went empty. We print the missing pieces —
                curator-grade game posters and boxed cover-art for PlayStation, Xbox and PC.
              </p>
              <div className="mt-8 flex flex-col gap-3 max-w-sm">
                <Link
                  to="/shop"
                  data-testid="hero-poster-catalog-button"
                  className="group flex items-center justify-between bg-ink text-paper px-6 py-4 font-mono-press text-xs uppercase tracking-[0.2em] hover:bg-terra transition-colors"
                >
                  Poster catalog
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/cover-art"
                  data-testid="hero-cover-box-button"
                  className="group flex items-center justify-between border border-ink text-ink px-6 py-4 font-mono-press text-xs uppercase tracking-[0.2em] hover:bg-ink hover:text-paper transition-colors"
                >
                  CD cover box
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BLACK GAME MARQUEE */}
      <div className="bg-ink py-4 overflow-hidden" data-testid="home-marquee">
        <Marquee speed={25} gradient={false}>
          {GAMES.map((g, i) => (
            <span key={i} className="flex items-center">
              <span className="font-serif-press italic text-2xl md:text-3xl text-paper mx-5">{g}</span>
              <span className="text-terra text-lg">✦</span>
            </span>
          ))}
        </Marquee>
      </div>

      {/* TWO PANELS */}
      <section className="border-b border-ink" data-testid="panels-section">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 border-x border-ink">
          <Reveal className="px-6 md:px-12 py-20 md:py-28 border-b md:border-b-0 md:border-r border-ink group hover:bg-paper2 transition-colors duration-500">
            <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">N° 01 / Posters</p>
            <h2 className="font-serif-press text-4xl md:text-5xl tracking-tight leading-[1.05] text-ink mt-6">
              A frame for<br /><span className="italic">every fan.</span>
            </h2>
            <p className="mt-6 text-sm text-smoke leading-relaxed max-w-xs">
              Any game you name. A4, A3 or A5 — framed or unframed. Museum-grade matte print, hand-cut in-studio.
            </p>
            <Link to="/shop" data-testid="panel-posters-link" className="group/l mt-10 inline-flex items-center gap-2 font-mono-press text-xs uppercase tracking-[0.2em] text-ink link-underline">
              Browse the catalog <ArrowRight size={13} className="transition-transform group-hover/l:translate-x-1" />
            </Link>
          </Reveal>
          <Reveal delay={0.12} className="px-6 md:px-12 py-20 md:py-28 group hover:bg-paper2 transition-colors duration-500">
            <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">N° 02 / DVD cover boxes</p>
            <h2 className="font-serif-press text-4xl md:text-5xl tracking-tight leading-[1.05] text-ink mt-6">
              A box for<br /><span className="italic">your digital.</span>
            </h2>
            <p className="mt-6 text-sm text-smoke leading-relaxed max-w-xs">
              PlayStation, Xbox or PC. Custom cover art in a real disc box — ₹199, with a free A5 poster inside.
              Disc not included; the shelf presence is.
            </p>
            <Link to="/cover-art" data-testid="panel-cover-link" className="group/l mt-10 inline-flex items-center gap-2 font-mono-press text-xs uppercase tracking-[0.2em] text-ink link-underline">
              Order a case <ArrowRight size={13} className="transition-transform group-hover/l:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* PROCESS */}
      <section className="border-b border-ink" data-testid="process-section">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-24 md:py-32">
          <Reveal>
            <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-terra mb-6">✦ The process</p>
            <h2 className="font-serif-press text-4xl md:text-6xl tracking-tight leading-[1.02] text-ink max-w-3xl">
              Choose, customise, <span className="italic">delivered.</span>
            </h2>
            <p className="mt-6 text-base text-smoke leading-relaxed max-w-lg">
              Every order is printed to spec and shipped within 5–7 working days.
              One order number follows it from the press bench to your door.
            </p>
          </Reveal>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.12} className="border-t border-ink pt-6">
                <p className="font-display-press text-4xl text-terra">{s.num}</p>
                <h3 className="font-serif-press text-2xl text-ink mt-4 tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm text-smoke leading-relaxed">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COLOPHON CTA */}
      <section className="bg-ink" data-testid="colophon-section">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-24 md:py-32 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-terra mb-6">✦ Colophon</p>
              <h2 className="font-serif-press text-4xl md:text-6xl tracking-tight leading-[1.02] text-paper">
                Ready to print something <span className="italic text-terra">worth keeping?</span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5 flex lg:justify-end">
            <Reveal delay={0.15}>
              <Link
                to="/custom"
                data-testid="colophon-custom-button"
                className="group inline-flex items-center justify-between gap-6 border border-paper text-paper px-6 py-4 font-mono-press text-xs uppercase tracking-[0.2em] hover:bg-paper hover:text-ink transition-colors min-w-[280px]"
              >
                Design your own poster
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
