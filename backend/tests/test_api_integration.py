import io
import os
import zipfile
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def sample_zip_bytes():
    """Builds an in-memory sample project ZIP with a test file and store logic."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "store.py",
            (
                "def calculate_total(subtotal, discount):\n"
                "    return subtotal - (subtotal * discount / 100)\n\n"
                "def process_debit(balance, amount):\n"
                "    return balance - amount\n"
            ),
        )
        zf.writestr(
            "test_store.py",
            (
                "from store import calculate_total, process_debit\n\n"
                "def test_total():\n"
                "    assert calculate_total(100, 10) == 90\n\n"
                "def test_debit():\n"
                "    assert process_debit(100, 20) == 80\n"
            ),
        )
    buf.seek(0)
    return buf.getvalue()


@pytest.mark.anyio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"


@pytest.mark.anyio
async def test_end_to_end_project_upload_and_scan(sample_zip_bytes):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create Project
        proj_res = await client.post(
            "/api/v1/projects",
            json={"name": "Integration Test Project", "description": "Testing upload and scan pipeline"},
        )
        assert proj_res.status_code == 201
        proj_data = proj_res.json()
        project_id = proj_data["id"]

        # 2. Upload ZIP
        files = {"file": ("test_repo.zip", sample_zip_bytes, "application/zip")}
        upload_res = await client.post(f"/api/v1/projects/{project_id}/uploads", files=files)
        assert upload_res.status_code == 201
        upload_data = upload_res.json()
        upload_id = upload_data["upload_id"]
        assert len(upload_data["detected_tests"]) >= 1

        # 3. Trigger Scan
        scan_res = await client.post(
            f"/api/v1/projects/{project_id}/scans",
            json={
                "upload_id": upload_id,
                "selected_checks": ["pytest", "semgrep", "z3_invariants"],
            },
        )
        assert scan_res.status_code == 202
        scan_id = scan_res.json()["id"]

        # Wait briefly for background execution to complete
        import asyncio
        for _ in range(15):
            await asyncio.sleep(0.5)
            status_res = await client.get(f"/api/v1/scans/{scan_id}")
            if status_res.json()["status"] == "COMPLETED":
                break

        final_scan = (await client.get(f"/api/v1/scans/{scan_id}")).json()
        assert final_scan["status"] == "COMPLETED"
        assert final_scan["summary_counts"]["passed"] > 0

        # 4. Fetch Findings
        findings_res = await client.get(f"/api/v1/scans/{scan_id}/findings")
        assert findings_res.status_code == 200
        findings = findings_res.json()
        assert len(findings) > 0

        # 5. Fetch Report in Markdown
        report_res = await client.get(f"/api/v1/reports/{scan_id}?format=markdown")
        assert report_res.status_code == 200
        assert "# Neuro-Symbolic Verification Report" in report_res.text
