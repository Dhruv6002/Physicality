import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";
import { useCart } from "../context/CartContext";
import { Reveal, SectionHeading, RegistrationMarks } from "../components/Motion";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";

const SIZES = ["A4", "A3", "A5"];
const FALLBACK = {
  posters: { A4: { framed: 254, unframed: 154 }, A3: { framed: 400, unframed: 200 }, A5: { unframed: 81 } },
  poster_list_prices: { A4: { framed: 363, unframed: 220 }, A3: { framed: 571, unframed: 285 }, A5: { unframed: 116 } },
  poster_discount_percent: 30,
};
const LOCAL_POSTERS = [
  ["Forza HORIZON 5", "WhatsApp Image 2026-09-14 at 7.59.46 PM.jpeg", "WhatsApp Image 2026-09-14 at 7.59.47 PM.jpeg"],
  ["Valorant", "WhatsApp Image 2026-09-14 at 7.59.48 PM.jpeg", "WhatsApp Image 2026-09-14 at 7.59.50 PM.jpeg"],
  ["Elden Ring", "WhatsApp Image 2026-09-14 at 7.59.50 PM (1).jpeg", "WhatsApp Image 2026-09-14 at 7.59.50 PM (2).jpeg"],
  ["God of War Ragnork", "WhatsApp Image 2026-09-14 at 7.59.51 PM.jpeg", "WhatsApp Image 2026-09-14 at 7.59.52 PM.jpeg"],
  ["Resident Evil Requiem", "WhatsApp Image 2026-09-14 at 7.59.53 PM (1).jpeg", "WhatsApp Image 2026-09-14 at 7.59.53 PM (2).jpeg"],
  ["Forza HORIZON 5", "WhatsApp Image 2026-09-14 at 7.59.54 PM.jpeg", "WhatsApp Image 2026-09-14 at 7.59.57 PM.jpeg"],
  ["Valorant", "WhatsApp Image 2026-09-14 at 7.59.57 PM (1).jpeg", "WhatsApp Image 2026-09-14 at 7.59.57 PM (2).jpeg"],
  ["The Ghost of Yotei", "WhatsApp Image 2026-09-14 at 7.59.59 PM.jpeg", "WhatsApp Image 2026-09-14 at 8.00.01 PM.jpeg"],
  ["The Last of Us Part 2 Remastered", "WhatsApp Image 2026-09-14 at 8.00.01 PM (1).jpeg", "WhatsApp Image 2026-09-14 at 8.00.04 PM.jpeg"],
  ["Grand Theft Auto VI", "WhatsApp Image 2026-09-14 at 8.00.04 PM (1).jpeg", "WhatsApp Image 2026-09-14 at 8.00.05 PM.jpeg"],
  ["Elden Ring", "WhatsApp Image 2026-09-14 at 8.00.05 PM (1).jpeg", "WhatsApp Image 2026-09-14 at 8.00.06 PM.jpeg"],
  ["The Last of Us Part 2", "WhatsApp Image 2026-09-14 at 8.00.06 PM (1).jpeg", "WhatsApp Image 2026-09-14 at 8.00.06 PM (2).jpeg"],
  ["Minecraft", "WhatsApp Image 2026-09-14 at 8.00.07 PM.jpeg", "WhatsApp Image 2026-09-14 at 8.00.07 PM (1).jpeg"],
  ["The Last of Us Part 2", "WhatsApp Image 2026-09-14 at 8.00.08 PM.jpeg", "WhatsApp Image 2026-09-14 at 8.00.08 PM (1).jpeg"],
  ["Red Dead Redemption", "WhatsApp Image 2026-09-14 at 8.00.08 PM (2).jpeg", "WhatsApp Image 2026-09-14 at 8.00.09 PM.jpeg"],
  ["Uncharted 4 : A Thiefs End", "WhatsApp Image 2026-09-14 at 8.00.09 PM (1).jpeg", "WhatsApp Image 2026-09-14 at 8.00.09 PM (2).jpeg"],
  ["Cyberpunk 2077", "WhatsApp Image 2026-09-14 at 8.00.10 PM.jpeg", "WhatsApp Image 2026-09-14 at 8.00.10 PM (1).jpeg"],
  ["God of War", "WhatsApp Image 2026-09-19 at 3.50.10 PM.jpeg", "WhatsApp Image 2026-09-19 at 3.50.09 PM.jpeg"],
  ["Counter-Strike 2", "WhatsApp Image 2026-09-19 at 3.50.12 PM.jpeg", "WhatsApp Image 2026-09-19 at 3.50.10 PM (2).jpeg"],
  ["007 First Light", "WhatsApp Image 2026-09-19 at 3.50.11 PM (1).jpeg", "WhatsApp Image 2026-09-19 at 3.50.12 PM (1).jpeg"],
  ["Uncharted 4: A Thief's End", "WhatsApp Image 2026-09-19 at 3.50.12 PM (2).jpeg", "WhatsApp Image 2026-09-19 at 3.50.13 PM.jpeg"],
  ["The Last of Us Part 2", "WhatsApp Image 2026-09-19 at 4.15.37 PM.jpeg", "WhatsApp Image 2026-09-19 at 3.50.10 PM (1).jpeg"],
].map(([game, first, second], index) => ({
  edition: String(index + 1).padStart(3, "0"),
  title: game,
  game,
  images: [`/images/${first}`, `/images/${second}`],
}));

function priceFor(pricing, size, framing) {
  const t = pricing?.posters?.[size];
  if (!t) return null;
  return t[framing] ?? t.unframed;
}

function listPriceFor(pricing, size, framing) {
  const t = pricing?.poster_list_prices?.[size];
  return t?.[framing] ?? t?.unframed ?? priceFor(pricing, size, framing);
}

function PriceTag({ pricing, size, framing, testId }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1" data-testid={testId}>
      <s className="font-mono-press text-xs text-smoke">₹{listPriceFor(pricing, size, framing)}</s>
      <span className="font-mono-press text-sm text-ink">₹{priceFor(pricing, size, framing)}</span>
      <span className="font-mono-press text-[9px] uppercase tracking-widest text-terra">{pricing?.poster_discount_percent ?? 30}% off</span>
    </span>
  );
}

function Picker({ label, options, value, onChange, disabledOption, testPrefix }) {
  return (
    <div>
      <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-ink mb-2">{label}</p>
      <div className="flex border border-ink w-fit" role="group" aria-label={label}>
        {options.map((o) => {
          const disabled = disabledOption && disabledOption(o);
          return (
            <button
              key={o}
              disabled={disabled}
              onClick={() => onChange(o)}
              data-testid={`${testPrefix}-${o.toLowerCase()}`}
              className={`px-4 py-2 font-mono-press text-[11px] uppercase tracking-widest transition-colors ${
                value === o ? "bg-ink text-paper" : disabled ? "text-smoke/40 cursor-not-allowed" : "text-ink hover:bg-paper2"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PosterGallery({ poster }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const startX = useRef(null);
  const didSwipe = useRef(false);
  const currentImage = poster.images[imageIndex];

  useEffect(() => {
    poster.images.forEach((image) => {
      const preload = new Image();
      preload.src = image;
    });
  }, [poster.images]);

  const showImage = (nextIndex) => {
    setImageIndex(Math.max(0, Math.min(poster.images.length - 1, nextIndex)));
  };

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    startX.current = event.clientX;
    didSwipe.current = false;
  };

  const handlePointerMove = (event) => {
    if (startX.current == null) return;
    const distance = event.clientX - startX.current;
    if (Math.abs(distance) > 24) {
      didSwipe.current = true;
      showImage(imageIndex + (distance < 0 ? 1 : -1));
      startX.current = null;
    }
  };

  const handlePointerUp = () => {
    startX.current = null;
  };

  return (
    <div
      className="relative overflow-hidden border-b border-line touch-pan-y select-none"
      data-testid={`poster-gallery-${poster.id}`}
    >
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { startX.current = null; }}
        onClick={() => {
          if (!didSwipe.current) setIsViewerOpen(true);
          didSwipe.current = false;
        }}
        aria-label={`View ${poster.title} image at full size`}
        className="block w-full bg-paper2 cursor-zoom-in"
      >
        <img
          src={currentImage}
          alt={`${poster.title} ${imageIndex === 0 ? "framed poster" : "poster in a room"}`}
          className="w-full aspect-[1/1.25] object-contain grayscale-[20%]"
          draggable="false"
        />
      </button>
      <button
        type="button"
        onClick={() => showImage(imageIndex - 1)}
        disabled={imageIndex === 0}
        aria-label="Show previous poster image"
        className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 bg-paper/90 text-ink disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => showImage(imageIndex + 1)}
        disabled={imageIndex === poster.images.length - 1}
        aria-label="Show next poster image"
        className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 bg-paper/90 text-ink disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={18} />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-label="Poster image position">
        {poster.images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => showImage(index)}
            aria-label={`Show poster image ${index + 1}`}
            className={`w-2 h-2 rounded-full border border-paper ${imageIndex === index ? "bg-paper" : "bg-paper/40"}`}
          />
        ))}
      </div>
      <RegistrationMarks className="opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent
          className="w-[calc(100vw-2rem)] max-w-7xl border-ink bg-ink p-3 sm:p-5"
          closeButtonClassName="right-3 top-3 z-10 rounded-full bg-paper p-2 text-ink opacity-100 hover:bg-terra hover:text-paper focus:ring-paper"
        >
          <DialogTitle className="sr-only">{poster.title} full-size image</DialogTitle>
          <img
            src={currentImage}
            alt={`${poster.title} full-size ${imageIndex === 0 ? "framed poster" : "poster in a room"}`}
            className="max-h-[90vh] w-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Shop() {
  const [posters, setPosters] = useState([]);
  const [pricing, setPricing] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState({});
  const [anyGame, setAnyGame] = useState("");
  const [anySize, setAnySize] = useState("A4");
  const [anyFraming, setAnyFraming] = useState("unframed");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("edition");
  const { addItem } = useCart();

  const visiblePosters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...posters]
      .filter((poster) => !needle || `${poster.title} ${poster.game}`.toLowerCase().includes(needle))
      .sort((left, right) => {
        if (sort === "price-low") return priceFor(pricing, left.default_size || "A4", "unframed") - priceFor(pricing, right.default_size || "A4", "unframed");
        if (sort === "price-high") return priceFor(pricing, right.default_size || "A4", "unframed") - priceFor(pricing, left.default_size || "A4", "unframed");
        return String(left.edition).localeCompare(String(right.edition), undefined, { numeric: true });
      });
  }, [posters, pricing, query, sort]);

  useEffect(() => {
    Promise.all([api.get("/products/posters"), api.get("/pricing")])
      .then(([{ data: products }, { data: pricingData }]) => {
        const productsByEdition = new Map(products.map((product) => [product.edition, product]));
        const catalog = LOCAL_POSTERS.map((poster) => {
          const product = productsByEdition.get(poster.edition);
          if (!product?.id || !/^[0-9a-f]{24}$/i.test(product.id)) {
            throw new Error(`Poster ${poster.edition} is missing its MongoDB product ID`);
          }
          return { ...poster, id: product.id };
        });
        setPosters(catalog);
        setPricing(pricingData);
        const s = {};
        catalog.forEach((x) => { s[x.id] = { size: "A4", framing: "unframed" }; });
        setSel(s);
      })
      .catch(() => toast.error("Could not load the catalogue"))
      .finally(() => setLoading(false));
  }, []);

  const cardSel = (id) => sel[id] || { size: "A4", framing: "unframed" };
  const setCard = (id, k, v) =>
    setSel((prev) => {
      const next = { ...(prev[id] || { size: "A4", framing: "unframed" }), [k]: v };
      if (next.size === "A5") next.framing = "unframed";
      return { ...prev, [id]: next };
    });

  const addCatalog = (p) => {
    const { size, framing } = cardSel(p.id);
    addItem({ kind: "poster", product_id: p.id, title: p.title, game: p.game, size, framing, unit_price: priceFor(pricing, size, framing), list_unit_price: listPriceFor(pricing, size, framing), qty: 1, image_url: p.image_url || p.images?.[0], image_path: p.image_path });
    toast.success(`${p.title} · ${size} ${framing} — added to your cart`);
  };

  const addAnyGame = () => {
    if (!anyGame.trim()) { toast.error("Tell us which game first"); return; }
    const price = priceFor(pricing, anySize, anyFraming);
    addItem({ kind: "poster", title: `${anyGame.trim()} — Game Poster`, game: anyGame.trim(), size: anySize, framing: anyFraming, unit_price: price, list_unit_price: listPriceFor(pricing, anySize, anyFraming), qty: 1 });
    toast.success(`${anyGame.trim()} · ${anySize} ${anyFraming} — added to your cart`);
    setAnyGame("");
  };

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24" data-testid="shop-page">
      <SectionHeading title={<>Poster <span className="italic">catalog</span></>} className="mb-14" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8" data-testid="catalog-filters">
        <label className="flex-1 max-w-xl">
          <span className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">Search the archive</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by game or title"
            data-testid="catalog-search"
            className="mt-2 w-full bg-transparent border-b border-ink focus:border-terra outline-none py-2 font-serif-press italic text-2xl text-ink placeholder:text-smoke/50"
          />
        </label>
        <label className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value)} data-testid="catalog-sort" className="block mt-2 bg-paper border border-ink px-3 py-2 text-ink outline-none">
            <option value="edition">Edition</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
      </div>

      {/* ANY GAME PANEL */}
      <Reveal className="border border-ink p-6 md:p-10 mb-16 bg-paper2/50" data-testid="any-game-panel">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-terra">Not on the menu?</p>
            <h2 className="font-serif-press text-3xl md:text-4xl tracking-tight text-ink mt-3">
              Name any game — <span className="italic">we print it.</span>
            </h2>
            <input
              value={anyGame}
              onChange={(e) => setAnyGame(e.target.value)}
              placeholder="e.g. Bloodborne"
              data-testid="any-game-input"
              className="mt-6 w-full bg-transparent border-b border-ink focus:border-terra outline-none py-3 font-serif-press italic text-2xl md:text-3xl text-ink placeholder:text-smoke/50 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-6 lg:items-end">
            <div className="flex flex-wrap gap-8">
              <Picker label="Sheet size" options={SIZES} value={anySize} onChange={(s) => { setAnySize(s); if (s === "A5") setAnyFraming("unframed"); }} testPrefix="any-size" />
              <Picker label="Finish" options={["unframed", "framed"]} value={anyFraming} onChange={setAnyFraming} disabledOption={(o) => anySize === "A5" && o === "framed"} testPrefix="any-framing" />
            </div>
            <div className="flex items-center gap-6">
              <PriceTag pricing={pricing} size={anySize} framing={anyFraming} testId="any-game-price" />
              <button
                onClick={addAnyGame}
                data-testid="any-game-add-button"
                className="bg-terra text-paper px-6 py-3 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors"
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* CATALOG GRID */}
      {loading ? (
        <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-smoke" data-testid="shop-loading">Loading the catalogue…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line" data-testid="catalog-grid">
          {visiblePosters.map((p, i) => {
            const { size, framing } = cardSel(p.id);
            return (
              <Reveal key={p.id} delay={(i % 4) * 0.07} className="bg-paper flex flex-col group" data-testid={`poster-card-${p.id}`}>
                <PosterGallery poster={p} />
                <div className="p-5 flex flex-col flex-1">
                  <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-terra">{p.game}</p>
                  <h3 className="font-serif-press italic text-2xl text-ink mt-1 leading-tight">{p.title}</h3>
                  <div className="mt-auto pt-5 space-y-4">
                    <Picker label="Size" options={SIZES} value={size} onChange={(s) => setCard(p.id, "size", s)} testPrefix={`size-${p.id}`} />
                    <Picker label="Finish" options={["unframed", "framed"]} value={framing} onChange={(f) => setCard(p.id, "framing", f)} disabledOption={(o) => size === "A5" && o === "framed"} testPrefix={`framing-${p.id}`} />
                    <div className="flex items-center justify-between">
                      <PriceTag pricing={pricing} size={size} framing={framing} testId={`price-${p.id}`} />
                      <button
                        onClick={() => addCatalog(p)}
                        data-testid={`add-to-cart-${p.id}`}
                        className="font-mono-press text-xs uppercase tracking-widest bg-terra text-paper px-4 py-2 hover:bg-terra-dark transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
      {!loading && visiblePosters.length === 0 && (
        <p className="border border-line p-10 text-center font-mono-press text-xs uppercase tracking-[0.15em] text-smoke" data-testid="catalog-no-results">
          No editions match that search.
        </p>
      )}
    </div>
  );
}
