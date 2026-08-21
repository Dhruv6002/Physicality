import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X, Minus, Plus } from "lucide-react";
import api, { fileUrl, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Reveal, SectionHeading } from "../components/Motion";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function Cart() {
  const { user } = useAuth();
  const { items, removeItem, setQty, clear, promo, setPromo, totals } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [shipping, setShipping] = useState({ name: "", phone: "", address: "", city: "", state: "", pincode: "" });

  const setField = (k) => (e) => setShipping((s) => ({ ...s, [k]: e.target.value }));

  const placeOrder = async () => {
    if (!user) { navigate("/auth?next=/cart"); return; }
    if (items.length === 0) { toast.error("Your cart is empty"); return; }
    for (const [k, v] of Object.entries(shipping)) {
      if (!v.trim()) { toast.error(`Please fill in your ${k}`); return; }
    }
    setBusy(true);
    try {
      const payload = {
        items: items.map((i) => ({
          kind: i.kind, product_id: i.product_id, size: i.size, framing: i.framing, platform: i.platform,
          game_name: (i.kind === "cover" || (i.kind === "poster" && !i.product_id)) ? i.game : undefined,
          image_path: i.image_path, qty: i.qty,
        })),
        promo_code: promo || null,
        shipping,
      };
      const { data: order } = await api.post("/orders", payload);
      const { data: cfg } = await api.get("/payments/config");
      if (cfg.configured) {
        const { data: rz } = await api.post("/payments/razorpay-order", { order_id: order.id });
        const ok = await loadRazorpay();
        if (!ok) throw new Error("Could not load the payment gateway — check your connection");
        const rzp = new window.Razorpay({
          key: rz.key_id,
          amount: rz.amount,
          currency: rz.currency,
          name: "Physicality",
          description: `Order ${order.order_no}`,
          order_id: rz.razorpay_order_id,
          prefill: { name: shipping.name, email: user.email, contact: shipping.phone },
          theme: { color: "#C85A43" },
          modal: { ondismiss: () => setBusy(false) },
          handler: async (resp) => {
            try {
              await api.post("/payments/verify", { order_id: order.id, ...resp });
              clear();
              navigate(`/account?placed=${order.order_no}`);
            } catch (e) {
              toast.error(formatApiError(e));
              setBusy(false);
            }
          },
        });
        rzp.open();
      } else {
        await api.post("/payments/mock-pay", { order_id: order.id });
        clear();
        navigate(`/account?placed=${order.order_no}`);
      }
    } catch (e) {
      toast.error(formatApiError(e));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24" data-testid="cart-page">
      <SectionHeading index="The counter" title={<>Your <span className="italic">order slip</span></>} className="mb-14" />

      {items.length === 0 ? (
        <Reveal className="border border-line p-16 text-center" data-testid="cart-empty">
          <p className="font-serif-press italic text-3xl text-ink">Nothing pressed yet.</p>
          <Link to="/shop" data-testid="cart-empty-shop-link" className="mt-6 inline-block bg-terra text-paper px-6 py-3 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors">
            Browse the catalogue
          </Link>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <div className="border border-line" data-testid="cart-items-list">
              {items.map((i, idx) => (
                <div key={i.key} className={`flex gap-5 p-5 ${idx > 0 ? "border-t border-line" : ""}`} data-testid={`cart-item-${idx}`}>
                  <div className="w-20 shrink-0 border border-line bg-paper2 overflow-hidden">
                    {i.image_url ? (
                      <img src={i.image_url} alt={i.title} className="w-full aspect-[1/1.25] object-cover" />
                    ) : i.image_path ? (
                      <img src={fileUrl(i.image_path)} alt={i.title} className="w-full aspect-[1/1.25] object-cover" />
                    ) : (
                      <div className="w-full aspect-[1/1.25] flex items-center justify-center font-mono-press text-[10px] text-smoke uppercase tracking-widest p-2 text-center">
                        DVD box
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-terra">
                      {i.kind === "cover"
                        ? `DVD cover box · ${i.platform} · + free A5 poster`
                        : `${i.kind === "custom" ? "Custom print" : i.game} · ${i.size} · ${i.framing === "framed" ? "Framed" : "Unframed"}`}
                    </p>
                    <h3 className="font-serif-press italic text-xl text-ink leading-tight truncate">{i.title}</h3>
                    <p className="font-mono-press text-xs text-smoke mt-1">
                      ₹{i.unit_price} each
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex border border-ink">
                        <button onClick={() => setQty(i.key, i.qty - 1)} className="px-2 py-1 text-ink hover:bg-paper2" data-testid={`qty-minus-${idx}`} aria-label="Decrease">
                          <Minus size={12} />
                        </button>
                        <span className="px-3 py-1 font-mono-press text-xs" data-testid={`qty-value-${idx}`}>{i.qty}</span>
                        <button onClick={() => setQty(i.key, i.qty + 1)} className="px-2 py-1 text-ink hover:bg-paper2" data-testid={`qty-plus-${idx}`} aria-label="Increase">
                          <Plus size={12} />
                        </button>
                      </div>
                      <button onClick={() => removeItem(i.key)} className="text-smoke hover:text-terra transition-colors" data-testid={`remove-item-${idx}`} aria-label="Remove">
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="font-mono-press text-sm text-ink shrink-0">₹{i.unit_price * i.qty}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 border border-line p-6">
              <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-ink mb-4">Deliver to</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {[["name", "Full name"], ["phone", "Phone"], ["address", "Street address"], ["city", "City"], ["state", "State"], ["pincode", "Pincode"]].map(([k, label]) => (
                  <div key={k} className={k === "address" ? "sm:col-span-2" : ""}>
                    <input
                      value={shipping[k]}
                      onChange={setField(k)}
                      placeholder={label}
                      data-testid={`shipping-${k}-input`}
                      className="w-full bg-transparent border-b border-ink focus:border-terra outline-none py-2 text-base text-ink placeholder:text-smoke/60 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="border border-ink p-6 sticky top-24" data-testid="cart-summary">
              <p className="font-mono-press text-xs uppercase tracking-[0.2em] text-ink">Summary</p>

              <div className="mt-6">
                <label className="font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke" htmlFor="promo">
                  Press code (if you hold one)
                </label>
                <input
                  id="promo"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Enter code"
                  data-testid="promo-input"
                  className="mt-2 w-full bg-transparent border-b border-ink focus:border-terra outline-none py-2 font-mono-press text-sm uppercase tracking-widest text-ink placeholder:text-smoke/50 transition-colors"
                />
                {promo && (
                  <p className={`mt-2 font-mono-press text-[10px] uppercase tracking-[0.2em] ${totals.promoOk ? "text-terra" : "text-smoke"}`} data-testid="promo-status">
                    {totals.promoOk ? "Code accepted — 50% off prints. No tracking number is issued for coded orders." : "Code not recognised"}
                  </p>
                )}
              </div>

              <div className="mt-8 space-y-3 font-mono-press text-sm text-ink border-t border-line pt-5">
                <div className="flex justify-between"><span className="text-smoke">Subtotal</span><span data-testid="summary-subtotal">₹{totals.subtotal}</span></div>
                <div className="flex justify-between"><span className="text-smoke">Press-code discount</span><span data-testid="summary-discount" className={totals.discount ? "text-terra" : ""}>−₹{totals.discount}</span></div>
                <div className="flex justify-between"><span className="text-smoke">Shipping</span><span>On the house</span></div>
                <div className="flex justify-between text-lg border-t border-ink pt-4"><span>Total</span><span data-testid="summary-total">₹{totals.total}</span></div>
              </div>

              <button
                onClick={placeOrder}
                disabled={busy}
                data-testid="checkout-button"
                className="mt-8 w-full bg-terra text-paper px-6 py-4 font-mono-press text-xs uppercase tracking-widest hover:bg-terra-dark transition-colors disabled:opacity-50"
              >
                {busy ? "Pressing your order…" : user ? "Pay & place order" : "Sign in to place order"}
              </button>
              <p className="mt-4 font-mono-press text-[10px] uppercase tracking-[0.2em] text-smoke leading-relaxed">
                Secure checkout via Razorpay. Coded orders show press progress only; uncoded orders also receive a tracking number.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
