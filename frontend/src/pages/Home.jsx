import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Marquee from "react-fast-marquee";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../components/Motion";

const GAMES = [
  "Forza HORIZON 5",
  "Valorant",
  "Elden Ring",
  "God of War Ragnork",
  "Resident Evil Requiem",
  "The Ghost of Yotei",
  "The Last of Us Part 2 Remastered",
  "Grand Theft Auto VI",
  "The Last of Us Part 2",
  "Minecraft",
  "Red Dead Redemption",
  "Uncharted 4: A Thief's End",
  "Cyberpunk 2077",
  "God of War",
  "Counter-Strike 2",
  "007 First Light",
];

const STEPS = [
  { num: "I.", title: "Pick a title", body: "Name any game, browse the menu, or bring your own artwork." },
  { num: "II.", title: "Set the format", body: "A4, A3 or A5 for posters — framed or unframed. PlayStation 5, PlayStation 4, Xbox or PC for cover boxes." },
  { num: "III.", title: "Pay & track", body: "Razorpay checkout. Follow your order from cart to your doorstep." },
];

export default function Home() {
  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="border-b border-ink" data-testid="hero-section">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="overflow-hidden border border-ink bg-ink aspect-[16/9]">
            <img
              src="/images/WhatsApp%20Image%202026-10-07%20at%208.59.58%20PM.jpeg"
              alt="Physicality poster collection and current poster offers"
              className="block w-full h-full object-cover"
              fetchPriority="high"
            />
          </div>
          <div className="py-4 lg:py-8">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.8 }}
              className="font-mono-press text-xs uppercase tracking-[0.2em] text-ink font-bold mb-5"
              data-testid="hero-eyebrow"
            >
              Physical editions for game collectors
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif-press text-5xl sm:text-6xl xl:text-7xl leading-[0.98] text-ink"
              data-testid="hero-heading"
            >
              A new era<br />of posters<br /><span className="italic">Physicality.</span>
            </motion.h1>
            <p className="mt-6 max-w-md text-base text-smoke leading-relaxed">
              Bring the worlds you love off the screen and onto your walls, printed for collectors.
            </p>
            <Link
              to="/shop"
              data-testid="hero-poster-catalog-button"
              className="group mt-8 inline-flex items-center justify-between gap-8 bg-ink text-paper px-6 py-4 font-mono-press text-xs uppercase tracking-[0.2em] hover:bg-terra transition-colors"
            >
              Shop now
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* BLACK GAME MARQUEE */}
      <div className="bg-ink py-4 overflow-hidden" data-testid="home-marquee">
        <Marquee speed={25} gradient={false}>
          {GAMES.map((g, i) => (
            <span key={i} className="flex items-center">
              <span className="font-serif-press italic text-2xl md:text-3xl text-paper mx-5">{g}</span>
              <span className="text-paper text-lg font-bold">✦</span>
            </span>
          ))}
        </Marquee>
      </div>

      {/* TWO PANELS */}
      <section className="border-b border-ink" data-testid="panels-section">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 border-x border-ink">
          <Reveal className="px-6 md:px-12 py-20 md:py-28 border-b md:border-b-0 md:border-r border-ink group hover:bg-paper2 transition-colors duration-500">
            <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">Posters</p>
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
            <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">DVD cover boxes</p>
            <h2 className="font-serif-press text-4xl md:text-5xl tracking-tight leading-[1.05] text-ink mt-6">
              A box for<br /><span className="italic">your digital.</span>
            </h2>
            <p className="mt-6 text-sm text-smoke leading-relaxed max-w-xs">
              PlayStation 5, PlayStation 4, Xbox or PC. Custom cover art in a real disc box — ₹199, with a free A5 poster inside.
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
            <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-ink font-bold mb-6">✦ The process</p>
            <h2 className="font-serif-press text-4xl md:text-6xl tracking-tight leading-[1.02] text-ink max-w-3xl">
              Choose, customise, <span className="italic">delivered.</span>
            </h2>
            <p className="mt-6 text-base text-smoke leading-relaxed max-w-lg">
              Every order is printed to spec and shipped within 5–7 working days.
              One order number follows it from the cart to your door.
            </p>
          </Reveal>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.12} className="border-t border-ink pt-6">
                <p className="font-display-press text-4xl text-ink font-bold">{s.num}</p>
                <h3 className="font-serif-press text-2xl text-ink mt-4 tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm text-smoke leading-relaxed">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink" data-testid="colophon-section">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-20 flex justify-center lg:justify-end">
          <Reveal>
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
      </section>

    </div>
  );
}
