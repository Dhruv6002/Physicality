import { getOfferFreebies } from "./CartContext";

describe("getOfferFreebies", () => {
  const baseItems = (qty) => Array.from({ length: qty }, (_, index) => ({
    key: `base-${index}`,
    kind: "poster",
    size: "A4",
    framing: "framed",
    qty: 1,
    unit_price: 259,
  }));

  it("deducts ₹149 when A4 unframed is selected after four posters", () => {
    const rewards = getOfferFreebies([
      ...baseItems(4),
      { key: "free-a4", kind: "poster", size: "A4", framing: "unframed", qty: 1, unit_price: 149 },
    ]);

    expect(rewards).toEqual([{ key: "free-a4", qty: 1, amount: 149 }]);
  });

  it("deducts ₹399 when A3 framed is selected after five posters", () => {
    const rewards = getOfferFreebies([
      ...baseItems(5),
      { key: "free-a3", kind: "custom", size: "A3", framing: "framed", qty: 1, unit_price: 399 },
    ]);

    expect(rewards).toEqual([{ key: "free-a3", qty: 1, amount: 399 }]);
  });

  it("deducts ₹259 when A4 framed is selected after five posters", () => {
    const rewards = getOfferFreebies([
      ...baseItems(5),
      { key: "free-a4-framed", kind: "poster", size: "A4", framing: "framed", qty: 1, unit_price: 259 },
    ]);

    expect(rewards).toEqual([{ key: "free-a4-framed", qty: 1, amount: 259 }]);
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
