import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import server


class RazorpayOrderTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.order = {
            "_id": "mongo-order-id",
            "order_no": "PE-1001",
            "total": 259,
            "payment_status": "pending",
        }
        self.user = {"_id": "user-id"}
        self.db = SimpleNamespace(
            orders=SimpleNamespace(update_one=AsyncMock(), delete_one=AsyncMock())
        )

    async def test_creates_order_with_supported_razorpay_fields(self):
        razorpay = MagicMock()
        razorpay.order.create.return_value = {
            "id": "order_razorpay123",
            "amount": 25900,
            "currency": "INR",
        }

        with (
            patch.object(server, "razorpay_client", return_value=razorpay),
            patch.object(server, "get_payable_order", new=AsyncMock(return_value=self.order)),
            patch.object(server, "db", self.db),
            patch.dict(os.environ, {"RAZORPAY_KEY_ID": "rzp_test_key"}),
        ):
            response = await server.create_razorpay_order(
                {"order_id": "mongo-order-id"}, self.user
            )

        razorpay.order.create.assert_called_once_with(
            {"amount": 25900, "currency": "INR", "receipt": "PE-1001"}
        )
        self.db.orders.update_one.assert_awaited_once()
        self.db.orders.delete_one.assert_not_awaited()
        self.assertEqual(response["razorpay_order_id"], "order_razorpay123")

    async def test_gateway_failure_removes_unpaid_order(self):
        razorpay = MagicMock()
        razorpay.order.create.side_effect = RuntimeError("temporary gateway error")

        with (
            patch.object(server, "razorpay_client", return_value=razorpay),
            patch.object(server, "get_payable_order", new=AsyncMock(return_value=self.order)),
            patch.object(server, "db", self.db),
            patch.dict(os.environ, {"RAZORPAY_KEY_ID": "rzp_test_key"}),
            self.assertRaises(server.HTTPException) as error,
        ):
            await server.create_razorpay_order({"order_id": "mongo-order-id"}, self.user)

        self.assertEqual(error.exception.status_code, 502)
        self.db.orders.delete_one.assert_awaited_once_with({
            "_id": "mongo-order-id",
            "payment_status": "pending",
            "status": "pending_payment",
        })

    async def test_reuses_existing_razorpay_order(self):
        order = {**self.order, "razorpay_order_id": "order_existing123"}
        razorpay = MagicMock()

        with (
            patch.object(server, "razorpay_client", return_value=razorpay),
            patch.object(server, "get_payable_order", new=AsyncMock(return_value=order)),
            patch.object(server, "db", self.db),
            patch.dict(os.environ, {"RAZORPAY_KEY_ID": "rzp_test_key"}),
        ):
            response = await server.create_razorpay_order(
                {"order_id": "mongo-order-id"}, self.user
            )

        razorpay.order.create.assert_not_called()
        self.assertEqual(response["razorpay_order_id"], "order_existing123")
        self.assertEqual(response["amount"], 25900)
