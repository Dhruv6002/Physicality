import { getOfferFreebies } from "./CartContext";

describe("getOfferFreebies", () => {
  it("deducts the A3 unframed price for the item that reaches the offer threshold", () => {
    const rewards = getOfferFreebies([
      { key: "a3", kind: "poster", size: "A3", framing: "unframed", qty: 6, unit_price: 179 },
    ]);

    expect(rewards).toEqual([{ key: "a3", qty: 1, amount: 179 }]);
  });

  it("uses the price of the first framed size added after five qualifying items", () => {
    const rewards = getOfferFreebies([
      { key: "first-five", kind: "poster", size: "A4", framing: "framed", qty: 5, unit_price: 259 },
      { key: "qualifying-item", kind: "custom", size: "A3", framing: "framed", qty: 1, unit_price: 399 },
    ]);

    expect(rewards).toEqual([{ key: "qualifying-item", qty: 1, amount: 399 }]);
  });

  it("deducts the A4 framed price when an A4 framed item reaches the threshold", () => {
    const rewards = getOfferFreebies([
      { key: "a4", kind: "poster", size: "A4", framing: "framed", qty: 6, unit_price: 259 },
    ]);

    expect(rewards).toEqual([{ key: "a4", qty: 1, amount: 259 }]);
  });
});
