import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { deleteArtwork } from "../lib/artworkStore";

const CartContext = createContext(null);
export const PROMO_CODE = "tO+B3Pma)!:H3*6PsDtsA1Q@Q$b_XFUSy%syzm3Gmh5}iPz&[xR2<FPUDl@(dPW;";

export function getOfferFreebies(items) {
  const groups = [
    { threshold: 4, matches: (item) => item.size === "A4" && item.framing === "unframed" },
    { threshold: 5, matches: (item) => item.size === "A3" && item.framing === "unframed" },
    { threshold: 5, matches: (item) => ["A3", "A4"].includes(item.size) && item.framing === "framed" },
  ];
  const rewards = [];
  let posterCount = 0;
  let posterCountAtLastReward = 0;
  items.forEach((item) => {
    if (item.kind !== "poster" && item.kind !== "custom") return;
    for (let unit = 0; unit < item.qty; unit += 1) {
      const group = groups.find((offer) =>
        offer.matches(item) && posterCount - posterCountAtLastReward >= offer.threshold);
      if (group) {
        const reward = rewards.find((entry) => entry.key === item.key);
        if (reward) {
          reward.qty += 1;
          reward.amount += item.unit_price;
        } else {
          rewards.push({ key: item.key, qty: 1, amount: item.unit_price });
        }
        posterCountAtLastReward = posterCount;
      } else {
        posterCount += 1;
      }
    }
  });
  return rewards;
}

function load() {
  try { return JSON.parse(localStorage.getItem("pe_cart")) || []; } catch { return []; }
}

export function calculateCartTotals(items, promo) {
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.qty, 0);
  const promoOk = promo.trim() === PROMO_CODE;
  const promoDiscount = promoOk ? subtotal - items.reduce((sum, item) => sum + item.qty, 0) : 0;
  const freebies = promoOk ? [] : getOfferFreebies(items);
  const offerDiscount = freebies.reduce((sum, reward) => sum + reward.amount, 0);
  const discount = promoDiscount + offerDiscount;
  return {
    subtotal,
    discount,
    promoDiscount,
    offerDiscount,
    total: subtotal - discount,
    promoOk,
    freebies,
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [promo, setPromo] = useState(localStorage.getItem("pe_promo") || "");

  useEffect(() => { localStorage.setItem("pe_cart", JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem("pe_promo", promo); }, [promo]);

  const addItem = useCallback((item) => {
    setItems((prev) => [...prev, { ...item, key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }]);
  }, []);

  const removeItem = useCallback((key) => {
    const removed = items.find((item) => item.key === key);
    if (removed?.pending_upload_id) deleteArtwork(removed.pending_upload_id).catch(() => {});
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, [items]);
  const setQty = useCallback((key, qty) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(20, qty)) } : i)));
  }, []);
  const updateItemPrice = useCallback((key, unitPrice, listUnitPrice) => {
    setItems((prev) => {
      const current = prev.find((item) => item.key === key);
      if (!current || (current.unit_price === unitPrice && current.list_unit_price === listUnitPrice)) return prev;
      return prev.map((item) => item.key === key
        ? { ...item, unit_price: unitPrice, list_unit_price: listUnitPrice }
        : item);
    });
  }, []);
  const updateItemImagePath = useCallback((key, imagePath) => {
    setItems((prev) => prev.map((item) => item.key === key
      ? { ...item, image_path: imagePath, pending_upload_id: null }
      : item));
  }, []);
  const clear = useCallback(() => {
    items.forEach((item) => {
      if (item.pending_upload_id) deleteArtwork(item.pending_upload_id).catch(() => {});
    });
    setItems([]);
    setPromo("");
  }, [items]);

  const totals = useMemo(() => calculateCartTotals(items, promo), [items, promo]);

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQty, updateItemPrice, updateItemImagePath, clear, promo, setPromo, totals, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
