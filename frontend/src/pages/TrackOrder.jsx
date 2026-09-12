import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { SectionHeading } from "../components/Motion";

const STEPS = ["placed", "packed", "shipped", "delivered"];
const LABELS = { placed: "Placed", packed: "Packed", shipped: "Shipped", delivered: "Delivered" };

export default function TrackOrder() {
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (event) => {
    event.preventDefault();
    setBusy(true);
    setOrder(null);
    try {
      const { data } = await api.get("/orders/track", { params: { order_no: orderNo.trim(), email: email.trim() } });
      setOrder(data);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setBusy(false);
    }
  };

  const current = order ? STEPS.indexOf(order.status) : -1;

  return (
    <div className="mx-auto max-w-2xl px-5 md:px-8 py-16 md:py-24" data-testid="track-order-page">
      <SectionHeading index="The delivery desk" title={<>Track your <span className="italic">order</span></>} className="mb-10" />
      <div className="border border-ink p-6 md:p-10">
        <p className="text-sm text-smoke leading-relaxed mb-8">
          Enter the order number from your confirmation and the email used at checkout.
        </p>
        <form onSubmit={lookup} className="space-y-6">
          <input
            value={orderNo}
            onChange={(event) => setOrderNo(event.target.value)}
            placeholder="Order number · PE-1001"
            required
            data-testid="track-order-number"
            className="w-full bg-transparent border-b border-ink focus:border-terra outline-none py-3 font-mono-press text-sm text-ink placeholder:text-smoke/60"
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email used at checkout"
            required
            data-testid="track-order-email"
            className="w-full bg-transparent border-b border-ink focus:border-terra outline-none py-3 font-mono-press text-sm text-ink placeholder:text-smoke/60"
          />
          <button
            type="submit"
            disabled={busy}
            data-testid="track-order-submit"
            className="w-full bg-terra text-paper px-6 py-4 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors disabled:opacity-50"
          >
            {busy ? "Looking up the ledger…" : "Track order"}
          </button>
        </form>
      </div>

      {order && (
        <div className="border border-ink mt-8 p-6 md:p-10" data-testid="track-order-result">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-mono-press text-sm text-ink">{order.order_no}</span>
            <span className="font-mono-press text-xs uppercase tracking-widest text-terra">{LABELS[order.status]}</span>
          </div>
          <div className="flex items-center mt-8">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <span className={`w-6 h-6 border flex items-center justify-center ${index <= current ? "bg-terra border-terra text-paper" : "border-line text-transparent"}`}>•</span>
                  <span className={`font-mono-press text-[9px] uppercase tracking-[0.12em] ${index <= current ? "text-ink" : "text-smoke/60"}`}>{LABELS[step]}</span>
                </div>
                {index < STEPS.length - 1 && <div className={`h-px flex-1 mx-1 -mt-5 ${index < current ? "bg-terra" : "bg-line"}`} />}
              </div>
            ))}
          </div>
          {order.tracking_id ? (
            <p className="mt-8 border-t border-line pt-5 font-mono-press text-xs text-ink">
              <span className="uppercase tracking-[0.2em] text-smoke">Tracking · </span>
              {order.tracking_url ? <a href={order.tracking_url} target="_blank" rel="noreferrer" className="link-underline">{order.tracking_id}</a> : order.tracking_id}
              {order.courier && <span className="text-smoke"> — {order.courier}</span>}
            </p>
          ) : (
            <p className="mt-8 border-t border-line pt-5 font-mono-press text-[10px] uppercase tracking-[0.15em] text-smoke">
              Tracking details will appear when your parcel ships.
            </p>
          )}
        </div>
      )}
      <p className="mt-8 font-mono-press text-[10px] uppercase tracking-[0.15em] text-smoke">
        Have an account? <Link to="/auth" className="text-ink link-underline">Sign in to see your full order history.</Link>
      </p>
    </div>
  );
}
