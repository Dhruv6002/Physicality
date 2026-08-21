import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Reveal, SectionHeading } from "../components/Motion";

const STEPS = ["placed", "packed", "shipped", "delivered"];
const LABELS = { placed: "Placed", packed: "Packed", shipped: "Shipped", delivered: "Delivered" };

function Timeline({ status }) {
  const current = STEPS.indexOf(status);
  return (
    <div className="flex items-center mt-5" data-testid="order-timeline">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <span
              className={`w-6 h-6 border flex items-center justify-center transition-colors ${
                i <= current ? "bg-terra border-terra text-paper" : "border-line text-transparent"
              }`}
            >
              <Check size={12} />
            </span>
            <span className={`font-mono-press text-[9px] uppercase tracking-[0.15em] ${i <= current ? "text-ink" : "text-smoke/60"}`}>
              {LABELS[s]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px flex-1 mx-1 -mt-5 ${i < current ? "bg-terra" : "bg-line"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Account() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [params] = useSearchParams();
  const placed = params.get("placed");

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/account");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    api.get("/orders")
      .then(({ data }) => setOrders(data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-5xl px-5 md:px-8 py-16 md:py-24" data-testid="account-page">
      <SectionHeading index="Your shelf" title={<>{user.name.split(" ")[0]}'s <span className="italic">collection</span></>} className="mb-10" />

      {placed && (
        <Reveal className="border border-terra bg-paper2 p-6 mb-10" data-testid="order-placed-banner">
          <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-terra">Order received by the press</p>
          <p className="font-serif-press italic text-2xl text-ink mt-2">
            {placed} is on the bench. We'll move it along below.
          </p>
        </Reveal>
      )}

      {fetching ? (
        <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-smoke">Opening the ledger…</p>
      ) : orders.length === 0 ? (
        <Reveal className="border border-line p-16 text-center" data-testid="no-orders">
          <p className="font-serif-press italic text-3xl text-ink">Your shelf is empty.</p>
          <p className="text-smoke text-sm mt-3">Commission a print or a cover and it will appear here, with its progress.</p>
        </Reveal>
      ) : (
        <div className="space-y-8">
          {orders.map((o, idx) => (
            <Reveal key={o.id} delay={idx * 0.05} className="border border-ink" data-testid={`order-card-${o.order_no}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink px-6 py-4 bg-paper2">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono-press text-sm text-ink" data-testid={`order-no-${o.order_no}`}>{o.order_no}</span>
                  <span className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke">
                    {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <span className="font-mono-press text-sm text-ink">₹{o.total}</span>
              </div>

              <div className="px-6 py-5">
                <ul className="space-y-2">
                  {o.items.map((i, k) => (
                    <li key={k} className="flex justify-between gap-4 text-sm">
                      <span className="text-ink">
                        <span className="font-serif-press italic text-base">{i.title}</span>
                        <span className="font-mono-press text-[10px] uppercase tracking-[0.15em] text-smoke ml-3">
                          {i.kind === "cover"
                            ? `Cover box · ${i.platform} · + free A5 poster`
                            : `${i.size}${i.framing ? ` · ${i.framing === "framed" ? "Framed" : "Unframed"}` : ""} · ${i.game || "print"}`} × {i.qty}
                        </span>
                      </span>
                      <span className="font-mono-press text-xs text-smoke shrink-0">₹{i.unit_price * i.qty}</span>
                    </li>
                  ))}
                </ul>

                <Timeline status={o.status} />

                <div className="mt-6 border-t border-line pt-4">
                  {o.tracking_id ? (
                    <p className="font-mono-press text-xs text-ink" data-testid={`tracking-${o.order_no}`}>
                      <span className="uppercase tracking-[0.2em] text-smoke">Tracking&nbsp;·&nbsp;</span>
                      {o.tracking_id}
                      {o.courier && <span className="text-smoke"> — {o.courier}</span>}
                    </p>
                  ) : o.promo_applied ? (
                    <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke" data-testid={`no-tracking-${o.order_no}`}>
                      Press-code order — a tracking number is not issued; progress above is your ledger.
                    </p>
                  ) : (
                    <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke" data-testid={`pending-tracking-${o.order_no}`}>
                      Tracking number & courier will appear here once your parcel ships.
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
