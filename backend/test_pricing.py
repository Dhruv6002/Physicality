import unittest
import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "physicality_test")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server


class PricingOfferTests(unittest.TestCase):
    def test_a4_unframed_buy_four_get_one(self):
        items = [
            dict(kind="poster", size="A3", framing="framed", qty=4, unit_price=399),
            dict(kind="poster", size="A4", framing="unframed", qty=1, unit_price=149),
        ]
        allocations = server.offer_freebie_allocations(items)
        self.assertEqual(allocations, {1: 1})
        self.assertEqual(sum(items[index]["unit_price"] * qty for index, qty in allocations.items()), 149)

    def test_a3_unframed_buy_five_get_one(self):
        items = [
            *[dict(kind="poster", size="A4", framing="framed", qty=1, unit_price=259) for _ in range(5)],
            dict(kind="poster", size="A3", framing="unframed", qty=1, unit_price=179),
        ]
        allocations = server.offer_freebie_allocations(items)
        self.assertEqual(allocations, {5: 1})
        self.assertEqual(sum(items[index]["unit_price"] * qty for index, qty in allocations.items()), 179)

    def test_framed_offer_rewards_the_item_that_qualifies_the_order(self):
        items = [
            *[dict(kind="poster", size="A5", framing="unframed", qty=1, unit_price=89) for _ in range(5)],
            dict(kind="custom", size="A3", framing="framed", qty=1, unit_price=399),
        ]
        allocations = server.offer_freebie_allocations(items)
        self.assertEqual(allocations, {5: 1})
        self.assertEqual(sum(items[index]["unit_price"] * qty for index, qty in allocations.items()), 399)

    def test_a4_framed_freebie_saves_259(self):
        items = [
            *[dict(kind="poster", size="A3", framing="unframed", qty=1, unit_price=179) for _ in range(5)],
            dict(kind="poster", size="A4", framing="framed", qty=1, unit_price=259),
        ]
        allocations = server.offer_freebie_allocations(items)
        self.assertEqual(allocations, {5: 1})
        self.assertEqual(sum(items[index]["unit_price"] * qty for index, qty in allocations.items()), 259)

    def test_a3_unframed_freebie_saves_179(self):
        items = [
            *[dict(kind="poster", size="A4", framing="framed", qty=1, unit_price=259) for _ in range(5)],
            dict(kind="poster", size="A3", framing="unframed", qty=1, unit_price=179),
        ]
        allocations = server.offer_freebie_allocations(items)
        self.assertEqual(allocations, {5: 1})
        self.assertEqual(sum(items[index]["unit_price"] * qty for index, qty in allocations.items()), 179)

    def test_ineligible_and_below_threshold_items_get_no_freebies(self):
        items = [
            *[dict(kind="poster", size="A4", framing="framed", qty=1, unit_price=259) for _ in range(4)],
            dict(kind="poster", size="A5", framing="unframed", qty=20, unit_price=89),
        ]
        self.assertEqual(server.offer_freebie_allocations(items), {})

    def test_only_first_free_poster_after_qualifying_purchases_is_discounted(self):
        items = [
            *[dict(kind="poster", size="A4", framing="framed", qty=1, unit_price=259) for _ in range(4)],
            dict(kind="poster", size="A4", framing="unframed", qty=1, unit_price=149),
            dict(kind="poster", size="A3", framing="framed", qty=1, unit_price=399),
        ]
        self.assertEqual(server.offer_freebie_allocations(items), {4: 1})

    def test_promo_code_is_exact_and_case_sensitive(self):
        self.assertEqual(server.PROMO_CODE, "tO+B3Pma)!:H3*6PsDtsA1Q@Q$b_XFUSy%syzm3Gmh5}iPz&[xR2<FPUDl@(dPW;")