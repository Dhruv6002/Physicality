import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from bson import ObjectId

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "physicality_test")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server


class AdminOrderTests(unittest.IsolatedAsyncioTestCase):
    async def test_admin_order_list_handles_existing_tracking_number(self):
        order = {
            "_id": ObjectId(),
            "order_no": "PE-1001",
            "items": [],
            "subtotal": 259,
            "discount": 0,
            "total": 259,
            "status": "shipped",
            "payment_status": "paid",
            "created_at": datetime.now(timezone.utc),
            "tracking_id": "123456789012",
            "courier": "Delhivery",
        }
        cursor = MagicMock()
        cursor.sort.return_value = cursor
        cursor.to_list = AsyncMock(return_value=[order])
        db = SimpleNamespace(orders=SimpleNamespace(find=MagicMock(return_value=cursor)))

        with patch.object(server, "db", db):
            response = await server.admin_orders({"_id": "admin"})

        self.assertEqual(
            response[0]["tracking_url"],
            "https://www.delhivery.com/track/package/123456789012",
        )

    def test_tracking_url_encodes_reserved_characters(self):
        self.assertEqual(
            server.tracking_url("123/45&67", "India Post"),
            "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/"
            "trackconsignment.aspx?consignment=123%2F45%2667",
        )
