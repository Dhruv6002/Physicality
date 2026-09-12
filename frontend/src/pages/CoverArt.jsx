import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Disc3, Gift } from "lucide-react";
import api from "../lib/api";
import { useCart } from "../context/CartContext";
import { Reveal, SectionHeading } from "../components/Motion";

const DVD_CASE = "/images/ChatGPT Image Sep 12, 2026, 10_11_11 PM.png";

export default function CoverArt() {
  const { addItem } = useCart();
  const [game, setGame] = useState("");
  const [platform, setPlatform] = useState("PlayStation 5");
  const [price, setPrice] = useState(199);
  const [platforms, setPlatforms] = useState(["PlayStation 5", "PlayStation 4", "Xbox", "PC"]);

  useEffect(() => {
    api.get("/pricing").then(({ data }) => {
      setPrice(data.cover);
      setPlatforms(data.platforms);
    }).catch(() => {});
  }, []);

  const add = () => {
    if (!game.trim()) { toast.error("Tell us which game first"); return; }
    addItem({ kind: "cover", title: `${game.trim()} — DVD Cover Box`, game: game.trim(), platform, unit_price: price, qty: 1 });
    toast.success(`${game.trim()} · ${platform} — added to your cart`);
    setGame("");
  };

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24" data-testid="cover-art-page">
      <SectionHeading title={<>DVD cover <span className="italic">boxes</span></>} className="mb-14" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <Reveal className="relative">
          <div className="relative border border-ink">
            <img src={DVD_CASE} alt="A DVD box awaiting its cover art" className="w-full aspect-square object-cover" />
          </div>
          <div className="mt-4 border border-terra bg-paper2 p-5 flex items-start gap-4">
            <Gift size={20} className="text-terra shrink-0 mt-0.5" />
            <p className="text-sm text-ink leading-relaxed" data-testid="cover-art-freebie">
              Every cover box ships with a <span className="font-medium">free A5 poster</span> of the same game.
            </p>
          </div>
          <div className="mt-4 border border-line bg-paper2 p-5">
            <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-terra mb-2">Read this first</p>
            <p className="text-sm text-smoke leading-relaxed" data-testid="cover-art-disclaimer">
              You receive a disc box with the cover art of your chosen game, printed and bound for your
              platform. <span className="text-ink font-medium">No game disc is included</span> — this is an
              artwork edition for collectors, not the game itself.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col">
          <label className="font-mono-press text-xs uppercase tracking-[0.2em] text-ink" htmlFor="game-name">
            Which game?
          </label>
          <input
            id="game-name"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder="e.g. Bloodborne"
            data-testid="cover-art-game-input"
            className="mt-3 bg-transparent border-b border-ink focus:border-terra outline-none py-3 font-serif-press italic text-3xl text-ink placeholder:text-smoke/50 transition-colors"
          />

          <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-ink mt-12 mb-3">Platform</p>
          <div className="flex border border-ink w-fit flex-wrap" role="group" aria-label="Platform">
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                data-testid={`platform-${p.toLowerCase().replace(/\s+/g, "-")}`}
                className={`px-6 py-3 font-mono-press text-xs uppercase tracking-widest transition-colors ${platform === p ? "bg-ink text-paper" : "text-ink hover:bg-paper2"}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-12 flex items-start gap-3 text-smoke">
            <Disc3 size={18} className="text-terra shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              Cover art is sourced and pressed per platform — PlayStation 5, PlayStation 4, Xbox and PC boxes differ in size
              and spine, and we match the one your shelf already holds.
            </p>
          </div>

          <div className="mt-auto pt-10 flex items-center justify-between border-t border-line">
            <div>
              <span className="font-mono-press text-lg text-ink" data-testid="cover-art-price">₹{price}</span>
              <span className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke ml-3">+ free A5 poster</span>
            </div>
            <button
              onClick={add}
              data-testid="cover-art-add-button"
              className="bg-terra text-paper px-6 py-3 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors"
            >
              Add to cart
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
