import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, UploadCloud } from "lucide-react";
import api, { fileUrl, formatApiError, productImage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { SectionHeading } from "../components/Motion";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";

const STATUSES = ["placed", "packed", "shipped", "delivered"];
const EMPTY_FORM = { title: "", game: "", edition: "", blurb: "", image_url: "", image_path: "" };

const inputCls = "w-full bg-transparent border-b border-ink focus:border-terra outline-none py-1.5 text-sm text-ink placeholder:text-smoke/50 transition-colors";

function ImageField({ value, onUrl, onUpload, testPrefix }) {
  const ref = useRef(null);
  return (
    <div className="flex items-center gap-3">
      <input
        value={value.image_url}
        onChange={(e) => onUrl(e.target.value)}
        placeholder="Image URL (or upload →)"
        data-testid={`${testPrefix}-image-url`}
        className={`${inputCls} font-mono-press text-xs flex-1`}
      />
      <button
        onClick={() => ref.current?.click()}
        data-testid={`${testPrefix}-upload-button`}
        className="shrink-0 inline-flex items-center gap-2 border border-ink px-3 py-2 font-mono-press text-[10px] uppercase tracking-widest text-ink hover:bg-ink hover:text-paper transition-colors"
      >
        <UploadCloud size={12} /> {value.image_path ? "Uploaded" : "Upload"}
      </button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" data-testid={`${testPrefix}-file-input`}
        onChange={(e) => onUpload(e.target.files?.[0])} />
    </div>
  );
}

function EditionsManager() {
  const [posters, setPosters] = useState([]);
  const [edits, setEdits] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState("");

  const load = () =>
    api.get("/products/posters").then(({ data }) => {
      setPosters(data);
      const e = {};
      data.forEach((p) => {
        e[p.id] = { title: p.title, game: p.game, edition: p.edition, blurb: p.blurb || "", image_url: p.image_url || "", image_path: p.image_path || "" };
      });
      setEdits(e);
    }).catch(() => toast.error("Could not load editions"));

  useEffect(() => { load(); }, []);

  const uploadImage = async (file, cb) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd);
      cb(data.path);
      toast.success("Artwork uploaded to the press");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const clean = (v) => ({ ...v, image_url: v.image_url || null, image_path: v.image_path || null, edition: v.edition || undefined });

  const save = async (id) => {
    setBusy(id);
    try {
      await api.put(`/admin/products/${id}`, clean(edits[id]));
      toast.success("Edition updated");
      load();
    } catch (e) { toast.error(formatApiError(e)); } finally { setBusy(""); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this edition from the catalogue?")) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success("Edition removed");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const create = async () => {
    if (!form.title.trim() || !form.game.trim()) { toast.error("Title and game are required"); return; }
    try {
      await api.post("/admin/products", clean(form));
      setForm(EMPTY_FORM);
      toast.success("Edition added to the catalogue");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const setEdit = (id, k, v) => setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [k]: v } }));

  return (
    <div data-testid="editions-manager">
      {/* NEW EDITION */}
      <div className="border border-ink p-6 mb-10 bg-paper2/50" data-testid="new-edition-form">
        <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-terra mb-5">Add a new edition</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Print title" data-testid="new-edition-title" className={inputCls} />
          <input value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })} placeholder="Game" data-testid="new-edition-game" className={inputCls} />
          <input value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} placeholder={`Edition (auto: Nº ${String(posters.length + 1).padStart(3, "0")})`} data-testid="new-edition-number" className={inputCls} />
          <input value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} placeholder="One-line blurb" data-testid="new-edition-blurb" className={`${inputCls} md:col-span-3`} />
          <div className="md:col-span-3">
            <ImageField value={form} onUrl={(v) => setForm({ ...form, image_url: v, image_path: "" })}
              onUpload={(f) => uploadImage(f, (p) => setForm((prev) => ({ ...prev, image_path: p, image_url: "" })))} testPrefix="new-edition" />
          </div>
        </div>
        <button onClick={create} data-testid="new-edition-add-button" className="mt-6 bg-terra text-paper px-6 py-3 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors">
          Add edition
        </button>
      </div>

      {/* EXISTING EDITIONS */}
      <div className="space-y-6" data-testid="editions-list">
        {posters.map((p) => (
          <div key={p.id} className="border border-line p-5 flex gap-6 flex-col md:flex-row" data-testid={`edition-row-${p.id}`}>
            <div className="w-24 shrink-0 border border-line bg-paper2 overflow-hidden self-start">
              {productImage(p) ? (
                <img src={productImage(p)} alt={p.title} className="w-full aspect-[1/1.25] object-cover" />
              ) : (
                <div className="w-full aspect-[1/1.25] flex items-center justify-center font-mono-press text-[9px] text-smoke uppercase tracking-widest text-center p-2">No art</div>
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <input value={edits[p.id]?.title ?? ""} onChange={(e) => setEdit(p.id, "title", e.target.value)} placeholder="Title" data-testid={`edition-title-${p.id}`} className={inputCls} />
              <input value={edits[p.id]?.game ?? ""} onChange={(e) => setEdit(p.id, "game", e.target.value)} placeholder="Game" data-testid={`edition-game-${p.id}`} className={inputCls} />
              <input value={edits[p.id]?.edition ?? ""} onChange={(e) => setEdit(p.id, "edition", e.target.value)} placeholder="Edition Nº" data-testid={`edition-number-${p.id}`} className={inputCls} />
              <input value={edits[p.id]?.blurb ?? ""} onChange={(e) => setEdit(p.id, "blurb", e.target.value)} placeholder="Blurb" data-testid={`edition-blurb-${p.id}`} className={`${inputCls} md:col-span-3`} />
              <div className="md:col-span-3">
                <ImageField value={edits[p.id] || EMPTY_FORM} onUrl={(v) => setEdit(p.id, "image_url", v) || setEdit(p.id, "image_path", "")}
                  onUpload={(f) => uploadImage(f, (path) => { setEdit(p.id, "image_path", path); setEdit(p.id, "image_url", ""); })} testPrefix={`edition-${p.id}`} />
              </div>
            </div>
            <div className="flex md:flex-col gap-3 shrink-0 self-start">
              <button onClick={() => save(p.id)} disabled={busy === p.id} data-testid={`edition-save-${p.id}`}
                className="bg-ink text-paper px-4 py-2 font-mono-press text-[10px] uppercase tracking-widest hover:bg-terra transition-colors disabled:opacity-50">
                {busy === p.id ? "…" : "Save"}
              </button>
              <button onClick={() => remove(p.id)} data-testid={`edition-delete-${p.id}`}
                className="border border-ink text-ink px-4 py-2 font-mono-press text-[10px] uppercase tracking-widest hover:bg-terra hover:border-terra hover:text-paper transition-colors inline-flex items-center gap-2">
                <Trash2 size={12} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState("");
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [artworkPreview, setArtworkPreview] = useState(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) navigate("/");
  }, [user, loading, navigate]);

  const load = async () => {
    setFetching(true);
    setLoadError("");
    try {
      const { data } = await api.get("/admin/orders");
      setOrders(data);
      const e = {};
      data.forEach((o) => { e[o.id] = { status: o.status, tracking_id: o.tracking_id || "", courier: o.courier || "", delivery_option: o.delivery_option || "", tracking_url: o.tracking_url || "" }; });
      setEdits(e);
    } catch (err) {
      const message = formatApiError(err);
      setLoadError(message);
      toast.error(message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading || !user || user.role !== "admin") return null;

  const setEdit = (id, k, v) => setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [k]: v } }));

  const save = async (id) => {
    setSaving(id);
    try {
      const { data } = await api.patch(`/admin/orders/${id}`, edits[id]);
      if (data.email_notification === "failed") {
        toast.error("Order updated");
      } else if (data.email_notification === "sent") {
        toast.success("Order updated — customer notification emailed");
      } else {
        toast.success("Order updated");
      }
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving("");
    }
  };

  const counts = STATUSES.map((s) => ({ s, n: orders.filter((o) => o.status === s).length }));

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24" data-testid="admin-page">
      <SectionHeading index="The press office" title={tab === "orders" ? <>Order <span className="italic">record</span></> : <>Catalogue <span className="italic">editions</span></>} className="mb-10" />

      <div className="flex border border-ink w-fit mb-12" role="tablist">
        {[["orders", "Order record"], ["editions", "Editions"]].map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} data-testid={`admin-tab-${t}`}
            className={`px-6 py-3 font-mono-press text-xs uppercase tracking-widest transition-colors ${tab === t ? "bg-ink text-paper" : "text-ink hover:bg-paper2"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "editions" ? (
        <EditionsManager />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line mb-12" data-testid="admin-stats">
            {counts.map((c) => (
              <div key={c.s} className="bg-paper p-5">
                <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">{c.s}</p>
                <p className="font-display-press text-3xl text-ink mt-1">{c.n}</p>
              </div>
            ))}
          </div>

          {loadError && (
            <div className="border border-terra p-5 mb-6 flex items-center justify-between gap-4" role="alert">
              <p className="font-mono-press text-xs text-ink">{loadError}</p>
              <button onClick={load} disabled={fetching} className="bg-ink text-paper px-4 py-2 font-mono-press text-[10px] uppercase tracking-widest disabled:opacity-50">
                {fetching ? "Loading…" : "Retry"}
              </button>
            </div>
          )}

          {fetching && orders.length === 0 ? (
            <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-smoke">Loading orders…</p>
          ) : loadError && orders.length === 0 ? (
            <div className="border border-line p-16 text-center" data-testid="admin-orders-error">
              <p className="font-serif-press italic text-3xl text-ink">Orders could not be loaded.</p>
              <p className="font-mono-press text-xs text-smoke mt-3">Your saved order data has not been cleared.</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="border border-line p-16 text-center" data-testid="admin-no-orders">
              <p className="font-serif-press italic text-3xl text-ink">No orders yet.</p>
            </div>
          ) : (
            <div className="border border-ink overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]" data-testid="admin-orders-table">
                <thead>
                  <tr className="border-b border-ink bg-paper2">
                    {["Order", "Customer", "Items", "Total", "Status", "Delivery option", "Tracking", "Courier", "Partner link", ""].map((h) => (
                      <th key={h} className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke px-4 py-3 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-line align-top" data-testid={`admin-row-${o.order_no}`}>
                      <td className="px-4 py-4">
                        <p className="font-mono-press text-xs text-ink">{o.order_no}</p>
                        <p className="font-mono-press text-[10px] text-smoke mt-1">
                          {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                        {o.promo_applied && (
                          <span className="inline-block mt-2 font-mono-press text-[9px] uppercase tracking-[0.15em] text-terra border border-terra px-2 py-0.5" data-testid={`promo-flag-${o.order_no}`}>
                            Coded
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-ink">{o.shipping?.name}</p>
                        <p className="font-mono-press text-[10px] text-smoke mt-1">{o.user_email}</p>
                        <p className="font-mono-press text-[10px] text-smoke mt-1">
                          {o.shipping?.city} {o.shipping?.pincode}
                        </p>
                      </td>
                      <td className="px-4 py-4 max-w-[220px]">
                        <ul className="space-y-1">
                          {o.items.map((i, k) => (
                            <li key={k} className="flex items-start gap-2 text-xs text-smoke leading-snug">
                              {i.kind === "custom" && i.image_path && (
                                <button
                                  type="button"
                                  onClick={() => setArtworkPreview({
                                    src: fileUrl(i.image_path),
                                    title: `${o.order_no} — ${i.title}`,
                                  })}
                                  aria-label={`View custom poster artwork for ${o.order_no}`}
                                  className="shrink-0 text-left"
                                  data-testid={`custom-artwork-${o.order_no}-${k}`}
                                >
                                  <img
                                    src={fileUrl(i.image_path)}
                                    alt="Customer's custom poster artwork"
                                    className="w-16 h-20 border border-line object-cover"
                                  />
                                  <span className="mt-1 block font-mono-press text-[9px] uppercase tracking-wider text-terra">
                                    View artwork
                                  </span>
                                </button>
                              )}
                              <span>
                                <span className="text-ink">{i.title}</span>
                                <span className="font-mono-press text-[10px]"> · {i.kind === "cover" ? `${i.platform} · +A5 free` : `${i.size}${i.framing ? ` ${i.framing}` : ""}`} × {i.qty}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-4 font-mono-press text-xs text-ink">
                        ₹{o.total}
                        {o.discount > 0 && <p className="text-[10px] text-terra mt-1">−₹{o.discount}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={edits[o.id]?.status || o.status}
                          onChange={(e) => setEdit(o.id, "status", e.target.value)}
                          data-testid={`status-select-${o.order_no}`}
                          className="bg-paper border border-ink font-mono-press text-xs uppercase tracking-widest text-ink px-2 py-2 outline-none focus:border-terra"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          value={edits[o.id]?.delivery_option ?? ""}
                          onChange={(e) => setEdit(o.id, "delivery_option", e.target.value)}
                          placeholder="e.g. Speed Post"
                          data-testid={`delivery-option-input-${o.order_no}`}
                          className="w-32 bg-transparent border-b border-ink focus:border-terra outline-none py-1 font-mono-press text-xs text-ink placeholder:text-smoke/50"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          value={edits[o.id]?.tracking_id ?? ""}
                          onChange={(e) => setEdit(o.id, "tracking_id", e.target.value)}
                          placeholder="e.g. 7845123690"
                          data-testid={`tracking-input-${o.order_no}`}
                          className="w-36 bg-transparent border-b border-ink focus:border-terra outline-none py-1 font-mono-press text-xs text-ink placeholder:text-smoke/50"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          value={edits[o.id]?.courier ?? ""}
                          onChange={(e) => setEdit(o.id, "courier", e.target.value)}
                          placeholder="e.g. Delhivery"
                          data-testid={`courier-input-${o.order_no}`}
                          className="w-32 bg-transparent border-b border-ink focus:border-terra outline-none py-1 font-mono-press text-xs text-ink placeholder:text-smoke/50"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          value={edits[o.id]?.tracking_url ?? ""}
                          onChange={(e) => setEdit(o.id, "tracking_url", e.target.value)}
                          placeholder="https://partner.app/..."
                          data-testid={`tracking-url-input-${o.order_no}`}
                          className="w-44 bg-transparent border-b border-ink focus:border-terra outline-none py-1 font-mono-press text-xs text-ink placeholder:text-smoke/50"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => save(o.id)}
                          disabled={saving === o.id}
                          data-testid={`save-order-${o.order_no}`}
                          className="bg-ink text-paper px-4 py-2 font-mono-press text-[10px] uppercase tracking-widest hover:bg-terra transition-colors disabled:opacity-50"
                        >
                          {saving === o.id ? "…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Dialog open={Boolean(artworkPreview)} onOpenChange={(open) => { if (!open) setArtworkPreview(null); }}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl border-ink bg-ink p-3 sm:p-4">
              <DialogTitle className="sr-only">{artworkPreview?.title} full-size artwork</DialogTitle>
              {artworkPreview && (
                <img
                  src={artworkPreview.src}
                  alt={`${artworkPreview.title} full-size custom poster artwork`}
                  className="max-h-[80vh] w-full object-contain"
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
