import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const CartContext = createContext(null);
export const PROMO_CODE = "FREEHOSTEL5050";

function load() {
  try { return JSON.parse(localStorage.getItem("pe_cart")) || []; } catch { return []; }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [promo, setPromo] = useState(localStorage.getItem("pe_promo") || "");

  useEffect(() => { localStorage.setItem("pe_cart", JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem("pe_promo", promo); }, [promo]);

  const addItem = useCallback((item) => {
    setItems((prev) => [...prev, { ...item, key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }]);
  }, []);

  const removeItem = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
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
  const clear = useCallback(() => { setItems([]); setPromo(""); }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
    const promoOk = promo.trim().toUpperCase() === PROMO_CODE;
    const discount = promoOk
      ? items.reduce((s, i) => {
          const isEligiblePromoItem =
            (i.kind === "poster" || i.kind === "custom") &&
            (i.size === "A4" || i.size === "A3") &&
            (i.framing === "unframed" || (i.framing == null && i.size === "A4" || i.size === "A3"));
          return s + (isEligiblePromoItem ? Math.floor((i.unit_price * i.qty) / 2) : 0);
        }, 0)
      : 0;
    return { subtotal, discount, total: subtotal - discount, promoOk };
  }, [items, promo]);

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQty, updateItemPrice, clear, promo, setPromo, totals, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
