import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Reveal, SectionHeading } from "../components/Motion";

const STATUSES = ["placed", "packed", "shipped", "delivered"];

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) navigate("/");
  }, [user, loading, navigate]);

  const load = () => {
    api.get("/admin/orders")
      .then(({ data }) => {
        setOrders(data);
        const e = {};
        data.forEach((o) => { e[o.id] = { status: o.status, tracking_id: o.tracking_id || "", courier: o.courier || "" }; });
        setEdits(e);
      })
      .catch((err) => toast.error(formatApiError(err)))
      .finally(() => setFetching(false));
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
      await api.patch(`/admin/orders/${id}`, edits[id]);
      toast.success("Ledger updated");
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
      <SectionHeading index="The press office" title={<>Order <span className="italic">ledger</span></>} className="mb-10" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line mb-12" data-testid="admin-stats">
        {counts.map((c) => (
          <div key={c.s} className="bg-paper p-5">
            <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">{c.s}</p>
            <p className="font-display-press text-3xl text-ink mt-1">{c.n}</p>
          </div>
        ))}
      </div>

      {fetching ? (
        <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-smoke">Reading the ledger…</p>
      ) : orders.length === 0 ? (
        <div className="border border-line p-16 text-center" data-testid="admin-no-orders">
          <p className="font-serif-press italic text-3xl text-ink">No orders yet.</p>
        </div>
      ) : (
        <div className="border border-ink overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]" data-testid="admin-orders-table">
            <thead>
              <tr className="border-b border-ink bg-paper2">
                {["Order", "Customer", "Items", "Total", "Status", "Tracking", "Courier", ""].map((h) => (
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
                        <li key={k} className="text-xs text-smoke leading-snug">
                          <span className="text-ink">{i.title}</span>
                          <span className="font-mono-press text-[10px]"> · {i.kind === "cover" ? `${i.platform} · +A5 free` : `${i.size}${i.framing ? ` ${i.framing}` : ""}`} × {i.qty}</span>
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
    </div>
  );
}
