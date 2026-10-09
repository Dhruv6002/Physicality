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

    def test_client_uses_trimmed_environment_credentials_as_auth_tuple(self):
        with (
            patch.dict(os.environ, {
                "RAZORPAY_KEY_ID": " rzp_test_key_id ",
                "RAZORPAY_KEY_SECRET": " test_secret ",
            }),
            patch.object(server.razorpay, "Client") as client_factory,
        ):
            server.razorpay_client()

        client_factory.assert_called_once_with(auth=("rzp_test_key_id", "test_secret"))

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

    async def test_authentication_failure_logs_safe_diagnostics(self):
        key = "rzp_test_123456789"
        secret = "super-secret-value"
        razorpay = MagicMock()
        razorpay.order.create.side_effect = RuntimeError(
            f"Authentication failed for {key}; secret={secret}"
        )

        with (
            patch.object(server, "razorpay_client", return_value=razorpay),
            patch.object(server, "get_payable_order", new=AsyncMock(return_value=self.order)),
            patch.object(server, "db", self.db),
            patch.dict(os.environ, {
                "RAZORPAY_KEY_ID": key,
                "RAZORPAY_KEY_SECRET": secret,
            }),
            self.assertLogs(server.logger, level="ERROR") as logs,
            self.assertRaises(server.HTTPException),
        ):
            await server.create_razorpay_order({"order_id": "mongo-order-id"}, self.user)

        diagnostic = "\n".join(logs.output)
        self.assertIn("key_id_present=True", diagnostic)
        self.assertIn("key_secret_present=True", diagnostic)
        self.assertIn("key_id_prefix=rzp_test_123", diagnostic)
        self.assertIn("Authentication failed", diagnostic)
        self.assertNotIn(key, diagnostic)
        self.assertNotIn(secret, diagnostic)

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
