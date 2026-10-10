import { calculateCartTotals, getOfferFreebies } from "./CartContext";

describe("getOfferFreebies", () => {
  const expectCartSavings = (eligibleItems, freeItem, amount) => {
    const totals = calculateCartTotals([...eligibleItems, freeItem], "");
    const subtotal = [...eligibleItems, freeItem].reduce((sum, item) => sum + item.unit_price * item.qty, 0);

    expect(totals.offerDiscount).toBe(amount);
    expect(totals.total).toBe(subtotal - amount);
  };

  const baseItems = (qty) => Array.from({ length: qty }, (_, index) => ({
    key: `base-${index}`,
    kind: "poster",
    size: "A4",
    framing: "framed",
    qty: 1,
    unit_price: 259,
  }));

  it("deducts ₹149 when A4 unframed is selected after four posters", () => {
    const qualifyingItems = baseItems(4);
    const freeItem = { key: "free-a4", kind: "poster", size: "A4", framing: "unframed", qty: 1, unit_price: 149 };

    const rewards = getOfferFreebies([...qualifyingItems, freeItem]);
    expect(rewards).toEqual([{ key: "free-a4", qty: 1, amount: 149 }]);
    expectCartSavings(qualifyingItems, freeItem, 149);
  });

  it("deducts ₹399 when A3 framed is selected after five posters", () => {
    const qualifyingItems = baseItems(5);
    const freeItem = { key: "free-a3", kind: "custom", size: "A3", framing: "framed", qty: 1, unit_price: 399 };

    const rewards = getOfferFreebies([...qualifyingItems, freeItem]);
    expect(rewards).toEqual([{ key: "free-a3", qty: 1, amount: 399 }]);
    expectCartSavings(qualifyingItems, freeItem, 399);
  });

  it("deducts ₹259 when A4 framed is selected after five posters", () => {
    const qualifyingItems = baseItems(5);
    const freeItem = { key: "free-a4-framed", kind: "poster", size: "A4", framing: "framed", qty: 1, unit_price: 259 };

    const rewards = getOfferFreebies([...qualifyingItems, freeItem]);
    expect(rewards).toEqual([{ key: "free-a4-framed", qty: 1, amount: 259 }]);
    expectCartSavings(qualifyingItems, freeItem, 259);
  });

  it("deducts ₹179 when A3 unframed is selected after five posters", () => {
    const qualifyingItems = baseItems(5);
    const freeItem = { key: "free-a3-unframed", kind: "poster", size: "A3", framing: "unframed", qty: 1, unit_price: 179 };

    const rewards = getOfferFreebies([...qualifyingItems, freeItem]);
    expect(rewards).toEqual([{ key: "free-a3-unframed", qty: 1, amount: 179 }]);
    expectCartSavings(qualifyingItems, freeItem, 179);
  });

  it("marks only the first eligible item added after qualifying as free", () => {
    const rewards = getOfferFreebies([
      ...baseItems(5),
      { key: "first-free-choice", kind: "poster", size: "A3", framing: "framed", qty: 1, unit_price: 399 },
      { key: "later-choice", kind: "poster", size: "A4", framing: "framed", qty: 1, unit_price: 259 },
    ]);

    expect(rewards).toEqual([{ key: "first-free-choice", qty: 1, amount: 399 }]);
  });

  it("does not apply a second offer to the same qualifying purchases", () => {
    const rewards = getOfferFreebies([
      ...baseItems(4),
      { key: "first-free-choice", kind: "poster", size: "A4", framing: "unframed", qty: 1, unit_price: 149 },
      { key: "later-choice", kind: "poster", size: "A3", framing: "framed", qty: 1, unit_price: 399 },
    ]);

    expect(rewards).toEqual([{ key: "first-free-choice", qty: 1, amount: 149 }]);
  });
});
