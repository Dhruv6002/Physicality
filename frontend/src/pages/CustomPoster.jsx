import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import api, { fileUrl, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Reveal, SectionHeading, RegistrationMarks } from "../components/Motion";

const SIZES = ["A4", "A3", "A5"];
const FALLBACK = { A4: { framed: 259, unframed: 149 }, A3: { framed: 399, unframed: 179 }, A5: { unframed: 89 } };

export default function CustomPoster() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [pricing, setPricing] = useState(FALLBACK);
  const [size, setSize] = useState("A4");
  const [framing, setFraming] = useState("unframed");
  const [imagePath, setImagePath] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get("/pricing").then(({ data }) => setPricing(data.posters)).catch(() => {});
  }, []);

  const price = pricing[size]?.[framing] ?? pricing[size]?.unframed;

  const onFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WEBP image");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8 MB");
      return;
    }
    if (!user) { navigate(`/auth?next=${encodeURIComponent(location.pathname)}`); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setDimensions(null);
    setImagePath(null);
    setFileName(file.name);
    setUploadProgress(0);
    const image = new Image();
    image.onload = () => setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = localPreview;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      setImagePath(data.path);
      setUploadProgress(100);
      toast.success("Artwork received by the press");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const add = () => {
    if (!user) { navigate(`/auth?next=${encodeURIComponent(location.pathname)}`); return; }
    if (!imagePath) { toast.error("Upload your artwork first"); return; }
    addItem({ kind: "custom", title: "Custom Commission", game: fileName || "Your artwork", size, framing, unit_price: price, qty: 1, image_path: imagePath });
    toast.success(`Custom print · ${size} ${framing} — added to your cart`);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24" data-testid="custom-poster-page">
      <SectionHeading index="N° 03" title={<>A custom <span className="italic">commission</span></>} className="mb-14" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <Reveal>
          <div
            onClick={() => inputRef.current?.click()}
            data-testid="artwork-dropzone"
            className="relative cursor-pointer border border-dashed border-ink bg-paper2 hover:bg-line/40 transition-colors aspect-[1/1.25] flex items-center justify-center overflow-hidden"
          >
            {previewUrl ? (
              <>
                <img src={previewUrl || fileUrl(imagePath)} alt="Your uploaded artwork" className="w-full h-full object-cover" data-testid="artwork-preview" />
                <RegistrationMarks />
                <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono-press text-[10px] uppercase tracking-[0.2em] bg-paper border border-ink px-2 py-1">{fileName}</span>
                  {dimensions && <span className="font-mono-press text-[10px] uppercase tracking-[0.15em] bg-paper border border-ink px-2 py-1">{dimensions.width} × {dimensions.height}px</span>}
                </div>
                {uploading && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-paper/70" aria-label={`Uploading ${uploadProgress}%`}>
                    <div className="h-full bg-terra transition-[width]" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center px-8">
                <UploadCloud className="mx-auto text-terra" size={32} />
                <p className="font-serif-press italic text-2xl text-ink mt-5">
                  {uploading ? `Pressing your artwork… ${uploadProgress}%` : "Drop your artwork here"}
                </p>
                <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke mt-3">JPG · PNG · WEBP — up to 8 MB</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
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
                      key={f}
                      disabled={disabled}
                      onClick={() => setFraming(f)}
                      data-testid={`custom-framing-${f}`}
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
          <div className="mt-auto pt-10 flex items-center justify-between border-t border-line">
            <span className="font-mono-press text-lg text-ink" data-testid="custom-price">₹{price}</span>
            <button
              onClick={add}
              disabled={uploading}
              data-testid="custom-add-to-cart-button"
              className="bg-terra text-paper px-6 py-3 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors disabled:opacity-50"
            >
              Add to cart
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
