import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const highlights = [
  {
    title: "Professional craft",
    body: "We are a focused team of makers, designers, and print specialists who treat every order like a collector-grade piece.",
  },
  {
    title: "High-grade matte finishes",
    body: "Our posters are printed on premium matte stock with rich color depth, soft texture, and a clean, gallery-inspired finish.",
  },
  {
    title: "Built for collectors",
    body: "From personal shelves to statement walls, every piece is designed to feel premium, durable, and worth keeping.",
  },
];

const videos = [
  {
    title: "Inside our print process",
    src: "/videos/WhatsApp Video 2026-09-28 at 11.21.43 PM.mp4",
    description: "This is how we turn game art into premium physical pieces that feel elevated and collectible.",
  },
  {
    title: "Our work, in motion",
    src: "/videos/WhatsApp Video 2026-09-28 at 11.22.00 PM.mp4",
    description: "A look at the detail, care, and precision behind every poster and box we produce for collectors.",
  },
];

export default function OurStory() {
  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24">
      <header className="border border-ink bg-paper2 p-8 md:p-12">
        <p className="font-mono-press text-[10px] uppercase tracking-[0.25em] text-terra">Our story</p>
        <h1 className="mt-6 font-serif-press text-5xl md:text-7xl tracking-tight leading-none text-ink">
          Built for fans who want<br />
          <span className="italic">their games to feel real.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base md:text-lg text-smoke leading-relaxed">
          Physicality was created for the people who still love the shelf, the frame, and the ritual of owning a piece of their favorite game world. We are professionals in design, printing, and presentation — and we build every product to feel premium from the first glance to the final unboxing.
        </p>
      </header>

      <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {highlights.map((item, index) => (
          <div key={item.title} className="border border-ink bg-paper p-6 md:p-8">
            <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">{String(index + 1).padStart(2, "0")}</p>
            <h2 className="mt-4 font-serif-press text-3xl text-ink">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-smoke">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 border-t border-ink pt-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="font-mono-press text-[10px] uppercase tracking-[0.25em] text-terra">Why we do it</p>
            <h2 className="mt-4 font-serif-press text-4xl md:text-5xl text-ink">Premium print, curated for collectors.</h2>
          </div>
          <Link
            to="/shop"
            className="group inline-flex items-center gap-2 font-mono-press text-[10px] uppercase tracking-[0.2em] text-ink link-underline"
          >
            Explore the catalog
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {videos.map((video) => (
            <article key={video.title} className="border border-ink bg-paper2 overflow-hidden">
              <video
                controls
                preload="metadata"
                playsInline
                className="w-full h-[320px] object-cover bg-ink"
              >
                <source src={video.src} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="p-6 md:p-8">
                <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">Featured video</p>
                <h3 className="mt-4 font-serif-press text-3xl text-ink">{video.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-smoke">{video.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 border border-ink bg-ink text-paper p-8 md:p-12">
        <p className="font-mono-press text-[10px] uppercase tracking-[0.22em] text-paper/80">Our promise</p>
        <p className="mt-5 max-w-3xl text-lg md:text-2xl leading-relaxed text-paper">
          We use high-grade matte prints, careful finishing, and a collector-first mindset so every piece looks intentional, durable, and worthy of display.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link
            to="/custom"
            className="inline-flex items-center justify-center bg-paper text-ink px-6 py-4 font-mono-press text-[10px] uppercase tracking-[0.24em] transition-colors hover:bg-terra hover:text-paper"
          >
            Custom poster
          </Link>
          <Link
            to="/cover-art"
            className="inline-flex items-center justify-center border border-paper px-6 py-4 font-mono-press text-[10px] uppercase tracking-[0.24em] text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            DVD cover boxes
          </Link>
        </div>
      </section>
    </div>
  );
}
