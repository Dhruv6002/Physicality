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
    async def test_order_status_changes_send_customer_email(self):
        for status in ("placed", "packed", "shipped", "delivered"):
            with self.subTest(status=status):
                previous_status = "packed" if status == "placed" else "placed"
                order = {
                    "_id": ObjectId(),
                    "order_no": "PE-1004",
                    "user_email": "customer@example.com",
                    "items": [{"title": "Custom poster", "size": "A4", "qty": 1}],
                    "subtotal": 149,
                    "discount": 0,
                    "total": 149,
                    "status": status,
                    "payment_status": "paid",
                    "created_at": datetime.now(timezone.utc),
                    "shipping": {"name": "Customer"},
                }
                db = SimpleNamespace(
                    orders=SimpleNamespace(
                        find_one=AsyncMock(side_effect=[{**order, "status": previous_status}, order]),
                        update_one=AsyncMock(),
                    )
                )
                send_email = AsyncMock()

                with (
                    patch.object(server, "db", db),
                    patch.object(server, "send_email", send_email),
                ):
                    response = await server.admin_update_order(
                        str(order["_id"]),
                        server.AdminOrderUpdate(status=status),
                        {"_id": "admin"},
                    )

                self.assertEqual(response["email_notification"], "sent")
                send_email.assert_awaited_once()
                self.assertEqual(send_email.await_args.kwargs["to"], "customer@example.com")
                self.assertIn(server.STATUS_HEADLINES[status], send_email.await_args.kwargs["subject"])

    async def test_status_email_failure_is_reported_after_order_update(self):
        order = {
            "_id": ObjectId(),
            "order_no": "PE-1005",
            "user_email": "customer@example.com",
            "items": [],
            "subtotal": 149,
            "discount": 0,
            "total": 149,
            "status": "packed",
            "payment_status": "paid",
            "created_at": datetime.now(timezone.utc),
        }
        db = SimpleNamespace(
            orders=SimpleNamespace(
                find_one=AsyncMock(side_effect=[{**order, "status": "placed"}, order]),
                update_one=AsyncMock(),
            )
        )

        with (
            patch.object(server, "db", db),
            patch.object(server, "send_email", new=AsyncMock(side_effect=RuntimeError("email unavailable"))),
            self.assertLogs(server.logger, level="ERROR"),
        ):
            response = await server.admin_update_order(
                str(order["_id"]),
                server.AdminOrderUpdate(status="packed"),
                {"_id": "admin"},
            )

        self.assertEqual(response["email_notification"], "failed")

    async def test_promo_order_tracking_details_are_returned_to_the_customer(self):
        order = {
            "_id": ObjectId(),
            "order_no": "PE-1002",
            "user_id": "customer",
            "items": [],
            "subtotal": 6,
            "discount": 0,
            "total": 6,
            "promo_applied": True,
            "status": "shipped",
            "payment_status": "paid",
            "created_at": datetime.now(timezone.utc),
            "tracking_id": "TRACK-123",
            "courier": "Delhivery",
            "tracking_url": "https://partner.example/track/123",
        }
        cursor = MagicMock()
        cursor.sort.return_value = cursor
        cursor.to_list = AsyncMock(return_value=[order])
        db = SimpleNamespace(
            orders=SimpleNamespace(
                find=MagicMock(return_value=cursor),
                find_one=AsyncMock(return_value=order),
            )
        )

        with patch.object(server, "db", db):
            response = await server.my_orders({"_id": "customer"})
            tracked_order = await server.track_order(order_no="PE-1002", email="customer@example.com")

        self.assertEqual(response[0]["tracking_id"], "TRACK-123")
        self.assertEqual(response[0]["courier"], "Delhivery")
        self.assertEqual(response[0]["tracking_url"], "https://partner.example/track/123")
        self.assertEqual(tracked_order["tracking_id"], "TRACK-123")
        self.assertEqual(tracked_order["courier"], "Delhivery")
        self.assertEqual(tracked_order["tracking_url"], "https://partner.example/track/123")

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

    def test_promo_shipment_email_includes_partner_tracking_details(self):
        email = server.status_email_html(
            {
                "order_no": "PE-1003",
                "promo_applied": True,
                "shipping": {"name": "Customer"},
                "items": [],
                "tracking_id": "TRACK-123",
                "courier": "Delhivery",
                "tracking_url": "https://partner.example/track/123",
                "delivery_option": "Express",
            },
            "shipped",
        )

        self.assertIn('href="https://partner.example/track/123"', email)
        self.assertIn("TRACK-123", email)
        self.assertIn("Delhivery", email)
        self.assertIn("Express", email)
