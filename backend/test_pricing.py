import unittest
import os

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "physicality_test")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server


class PricingOfferTests(unittest.TestCase):
    def test_a4_unframed_buy_four_get_one(self):
        items = [dict(kind="poster", size="A4", framing="unframed", qty=5, unit_price=149)]
        self.assertEqual(server.offer_freebie_allocations(items), {0: 1})

    def test_a3_unframed_buy_five_get_one(self):
        items = [dict(kind="poster", size="A3", framing="unframed", qty=6, unit_price=179)]
        self.assertEqual(server.offer_freebie_allocations(items), {0: 1})

    def test_framed_offer_accepts_either_size_and_rewards_cheapest(self):
        items = [
            dict(kind="poster", size="A4", framing="framed", qty=2, unit_price=259),
            dict(kind="custom", size="A3", framing="framed", qty=4, unit_price=399),
        ]
        self.assertEqual(server.offer_freebie_allocations(items), {0: 1})

    def test_ineligible_and_below_threshold_items_get_no_freebies(self):
        items = [
            dict(kind="poster", size="A4", framing="unframed", qty=4, unit_price=149),
            dict(kind="poster", size="A5", framing="unframed", qty=20, unit_price=89),
        ]
        self.assertEqual(server.offer_freebie_allocations(items), {})

    def test_promo_code_is_exact_and_case_sensitive(self):
        self.assertEqual(server.PROMO_CODE, "tO+B3Pma)!:H3*6PsDtsA1Q@Q$b_XFUSy%syzm3Gmh5}iPz&[xR2<FPUDl@(dPW;")