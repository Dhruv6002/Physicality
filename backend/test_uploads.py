import io
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import UploadFile

import server


class UploadFallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_upload_falls_back_to_mongodb_and_remains_retrievable(self):
        payload = b"test image bytes"
        file_record = {}
        files = SimpleNamespace(
            insert_one=AsyncMock(side_effect=lambda record: file_record.update(record)),
            find_one=AsyncMock(side_effect=lambda query: file_record),
        )
        db = SimpleNamespace(files=files)
        upload = UploadFile(filename="artwork.png", file=io.BytesIO(payload))

        with (
            tempfile.TemporaryDirectory() as temp_dir,
            patch.object(server, "db", db),
            patch.object(server, "UPLOAD_DIR", Path(temp_dir) / "uploads"),
            patch.object(server, "EMERGENT_KEY", ""),
            patch.object(server, "storage_key", None),
            patch.object(server, "decode_token"),
        ):
            self.assertIsNone(server.init_storage())
            result = await server.upload(upload, user=None)
            response = await server.download_file(
                result["path"], authorization="Bearer valid-test-token"
            )

        self.assertEqual(file_record["storage_path"], result["path"])
        self.assertEqual(file_record["driver"], "local")
        self.assertEqual(file_record["data"], payload)
        self.assertEqual(response.body, payload)
        self.assertEqual(response.media_type, "image/png")
