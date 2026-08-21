import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import api, { fileUrl, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Reveal, SectionHeading, RegistrationMarks } from "../components/Motion";

const SIZES = ["A4", "A3", "A5"];
const FALLBACK = { A4: { framed: 259, unframed: 149 }, A3: { framed: 399, unframed: 179 }, A5: { unframed: 89 } };

export default function CustomPoster() {
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const [pricing, setPricing] = useState(FALLBACK);
  const [size, setSize] = useState("A4");
  const [framing, setFraming] = useState("unframed");
  const [imagePath, setImagePath] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get("/pricing").then(({ data }) => setPricing(data.posters)).catch(() => {});
  }, []);

  const price = pricing[size]?.[framing] ?? pricing[size]?.unframed;

  const onFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      setImagePath(data.path);
      setFileName(file.name);
      toast.success("Artwork received by the press");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  const add = () => {
    if (!imagePath) { toast.error("Upload your artwork first"); return; }
    addItem({ kind: "custom", title: "Custom Commission", game: fileName || "Your artwork", size, framing, unit_price: price, qty: 1, image_path: imagePath });
    toast.success(`Custom print · ${size} ${framing} — pressed into your cart`);
  };

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-32 text-center" data-testid="custom-auth-required">
        <h1 className="font-serif-press text-4xl text-ink tracking-tight">Sign in to commission a print</h1>
        <p className="text-smoke mt-4 text-base">Your artwork stays attached to your account, so we need to know who you are first.</p>
        <Link to="/auth?next=/custom" data-testid="custom-signin-button" className="mt-8 inline-block bg-terra text-paper px-6 py-3 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors">
          Sign in or register
        </Link>
      </div>
    );
  }

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
            {imagePath ? (
              <>
                <img src={fileUrl(imagePath)} alt="Your uploaded artwork" className="w-full h-full object-cover" data-testid="artwork-preview" />
                <RegistrationMarks />
                <span className="absolute bottom-3 left-3 font-mono-press text-[10px] uppercase tracking-[0.2em] bg-paper border border-ink px-2 py-1">
                  {fileName}
                </span>
              </>
            ) : (
              <div className="text-center px-8">
                <UploadCloud className="mx-auto text-terra" size={32} />
                <p className="font-serif-press italic text-2xl text-ink mt-5">
                  {uploading ? "Pressing your artwork…" : "Drop your artwork here"}
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
              Press into cart
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
