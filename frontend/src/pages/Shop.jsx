import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api, { productImage } from "../lib/api";
import { useCart } from "../context/CartContext";
import { Reveal, SectionHeading, RegistrationMarks } from "../components/Motion";

const SIZES = ["A4", "A3", "A5"];
const FALLBACK = { posters: { A4: { framed: 259, unframed: 149 }, A3: { framed: 399, unframed: 179 }, A5: { unframed: 89 } } };

function priceFor(pricing, size, framing) {
  const t = pricing?.posters?.[size];
  if (!t) return null;
  return t[framing] ?? t.unframed;
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
      .then(([p, pr]) => {
        setPosters(p.data);
        setPricing(pr.data);
        const s = {};
        p.data.forEach((x) => { s[x.id] = { size: "A4", framing: "unframed" }; });
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
    addItem({ kind: "poster", product_id: p.id, title: p.title, game: p.game, size, framing, unit_price: priceFor(pricing, size, framing), qty: 1, image_url: p.image_url, image_path: p.image_path });
    toast.success(`${p.title} · ${size} ${framing} — added to your cart`);
  };

  const addAnyGame = () => {
    if (!anyGame.trim()) { toast.error("Tell us which game first"); return; }
    const price = priceFor(pricing, anySize, anyFraming);
    addItem({ kind: "poster", title: `${anyGame.trim()} — Game Poster`, game: anyGame.trim(), size: anySize, framing: anyFraming, unit_price: price, qty: 1 });
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
              <span className="font-mono-press text-lg text-ink" data-testid="any-game-price">
                ₹{priceFor(pricing, anySize, anyFraming)}
              </span>
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
                <div className="relative overflow-hidden border-b border-line">
                  <img
                    src={productImage(p)}
                    alt={p.title}
                    className="w-full aspect-[1/1.25] object-cover grayscale-[35%] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-[1.03]"
                  />
                  <RegistrationMarks className="opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-terra">{p.game}</p>
                  <h3 className="font-serif-press italic text-2xl text-ink mt-1 leading-tight">{p.title}</h3>
                  <div className="mt-auto pt-5 space-y-4">
                    <Picker label="Size" options={SIZES} value={size} onChange={(s) => setCard(p.id, "size", s)} testPrefix={`size-${p.id}`} />
                    <Picker label="Finish" options={["unframed", "framed"]} value={framing} onChange={(f) => setCard(p.id, "framing", f)} disabledOption={(o) => size === "A5" && o === "framed"} testPrefix={`framing-${p.id}`} />
                    <div className="flex items-center justify-between">
                      <span className="font-mono-press text-sm text-ink" data-testid={`price-${p.id}`}>
                        ₹{priceFor(pricing, size, framing)}
                      </span>
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
