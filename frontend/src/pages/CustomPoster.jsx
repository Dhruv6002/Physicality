import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, X } from "lucide-react";
import api from "../lib/api";
import { saveArtwork } from "../lib/artworkStore";
import { useCart } from "../context/CartContext";
import { Reveal, SectionHeading, RegistrationMarks } from "../components/Motion";

const SIZES = ["A4", "A3", "A5"];
const FALLBACK = { A4: { framed: 259, unframed: 149 }, A3: { framed: 399, unframed: 179 }, A5: { unframed: 89 } };

export default function CustomPoster() {
  const { addItem } = useCart();
  const [pricing, setPricing] = useState(FALLBACK);
  const [size, setSize] = useState("A4");
  const [framing, setFraming] = useState("unframed");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [fileName, setFileName] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);
  const selectedFileRef = useRef(null);

  useEffect(() => {
    api.get("/pricing").then(({ data }) => setPricing(data.posters)).catch(() => {});
  }, []);

  const price = pricing[size]?.[framing] ?? pricing[size]?.unframed;

  const onFile = (file) => {
    if (!file) return;
    const extension = file.name?.split(".").pop()?.toLowerCase();
    const supportedExtensions = ["jpg", "jpeg", "png", "webp"];
    const supportedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if ((!file.type && !supportedExtensions.includes(extension)) || (file.type && !supportedTypes.includes(file.type))) {
      toast.error("Please choose a JPG, PNG or WEBP image");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8 MB");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localPreview = URL.createObjectURL(file);
    selectedFileRef.current = file;
    setPreviewUrl(localPreview);
    setDimensions(null);
    setFileName(file.name);
    const image = new Image();
    image.onload = () => setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = localPreview;
  };

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const add = async () => {
    if (!selectedFileRef.current) {
      toast.error("Choose an artwork image first");
      return;
    }
    setAdding(true);
    try {
      const pendingUploadId = await saveArtwork(selectedFileRef.current);
      addItem({ kind: "custom", title: "Custom poster", game: fileName || "Your artwork", size, framing, unit_price: price, qty: 1, pending_upload_id: pendingUploadId });
      toast.success(`Custom print · ${size} ${framing} — added to your cart`);
    } catch {
      toast.error("Could not save the artwork on this device. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const removeArtwork = (event) => {
    event.preventDefault();
    event.stopPropagation();
    selectedFileRef.current = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDimensions(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24" data-testid="custom-poster-page">
      <SectionHeading title="Custom poster" className="mb-14" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <Reveal>
          <div
            onClick={() => inputRef.current?.click()}
            data-testid="artwork-dropzone"
            className="relative cursor-pointer border border-dashed border-ink bg-paper2 hover:bg-line/40 transition-colors aspect-[1/1.25] flex items-center justify-center overflow-hidden"
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Your uploaded artwork" className="w-full h-full object-cover" data-testid="artwork-preview" />
                <RegistrationMarks />
                <button
                  type="button"
                  onClick={removeArtwork}
                  aria-label="Remove uploaded artwork"
                  data-testid="remove-artwork-button"
                  className="absolute top-3 right-3 grid place-items-center w-9 h-9 bg-paper border border-ink text-ink hover:bg-terra hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X size={17} />
                </button>
                <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono-press text-[10px] uppercase tracking-[0.2em] bg-paper border border-ink px-2 py-1">{fileName}</span>
                  {dimensions && <span className="font-mono-press text-[10px] uppercase tracking-[0.15em] bg-paper border border-ink px-2 py-1">{dimensions.width} × {dimensions.height}px</span>}
                </div>
              </>
            ) : (
              <div className="text-center px-8">
                <UploadCloud className="mx-auto text-terra" size={32} />
                <p className="font-serif-press italic text-2xl text-ink mt-5">
                  Drop your artwork here
                </p>
                <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke mt-3">JPG · PNG · WEBP — up to 8 MB</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              data-testid="artwork-file-input"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col">
          <p className="text-smoke text-base leading-relaxed max-w-md">
            One image, one print run of one. We trim it to true A-series proportions and press it
            on the same heavy stock as the catalogue editions — framed if you'd like it ready to hang.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-ink mb-3">Sheet size</p>
              <div className="flex border border-ink w-fit" role="group" aria-label="Sheet size">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSize(s); if (s === "A5") setFraming("unframed"); }}
                    data-testid={`custom-size-${s.toLowerCase()}`}
                    className={`px-6 py-3 font-mono-press text-xs uppercase tracking-widest transition-colors ${size === s ? "bg-ink text-paper" : "text-ink hover:bg-paper2"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-ink mb-3">Finish</p>
              <div className="flex border border-ink w-fit" role="group" aria-label="Finish">
                {["unframed", "framed"].map((f) => {
                  const disabled = size === "A5" && f === "framed";
                  return (
                    <button
                      type="button"
                      key={f}
                      disabled={disabled}
                      onClick={() => setFraming(f)}
                      data-testid={`custom-framing-${f}`}
                      aria-pressed={framing === f}
                      className={`px-6 py-3 font-mono-press text-xs uppercase tracking-widest transition-colors ${
                        framing === f ? "bg-ink text-paper" : disabled ? "text-smoke/40 cursor-not-allowed" : "text-ink hover:bg-paper2"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-auto pt-10 border-t border-line">
            <div className="flex items-center justify-between">
            <span className="font-mono-press text-lg text-ink" data-testid="custom-price">₹{price}</span>
            <button
              onClick={add}
              disabled={adding}
              data-testid="custom-add-to-cart-button"
              className="bg-terra text-paper px-6 py-3 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add to cart"}
            </button>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
