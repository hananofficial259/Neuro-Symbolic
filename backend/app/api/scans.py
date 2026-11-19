import asyncio
import json
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from fastapi.responses import StreamingResponse

import io
import os
import zipfile
from backend.app.db.database import DatabaseRepository
from backend.app.schemas.scan import FindingResponse, ScanCreate, ScanResponse
from backend.app.services.event_hub import event_hub
from backend.app.services.scan_service import ScanExecutionService

router = APIRouter(tags=["Scans"])


@router.post("/demo/benchmark-scan", status_code=status.HTTP_201_CREATED)
async def launch_benchmark_demo_scan(background_tasks: BackgroundTasks):
    """
    One-click benchmark verification runner:
    Packages samples/benchmark_store, creates project, and triggers full verification pipeline.
    """
    proj = DatabaseRepository.create_project(
        user_id="usr_foundry_admin",
        name="E-Commerce Payment & Pricing Engine (Benchmark)",
        description="Checkout payment bounds, discount invariants, and order lifecycle testbed",
    )

    # Package samples/benchmark_store into a real zip file
    samples_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../samples/benchmark_store"))
    storage_dir = os.path.abspath("./uploads_storage")
    os.makedirs(storage_dir, exist_ok=True)
    zip_dest = os.path.join(storage_dir, f"benchmark_{proj['id']}.zip")

    with zipfile.ZipFile(zip_dest, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(samples_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, samples_dir)
                zf.write(full_path, rel_path)

    upload = DatabaseRepository.create_upload(
        project_id=proj["id"],
        filename="benchmark_store.zip",
        file_size_bytes=os.path.getsize(zip_dest),
        storage_path=zip_dest,
        detected_language="Python 3.12",
        detected_framework="FastAPI / E-Commerce Backend",
        detected_tests=["test_store.py"],
    )

    scan = DatabaseRepository.create_scan(
        project_id=proj["id"],
        upload_id=upload["id"],
        selected_checks=["pytest", "semgrep", "z3_invariants"],
    )

    background_tasks.add_task(ScanExecutionService.run_scan_job, scan["id"])

    return {
        "project_id": proj["id"],
        "scan_id": scan["id"],
        "upload_id": upload["id"],
        "status": scan["status"],
    }


@router.post("/projects/{project_id}/scans", response_model=ScanResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_scan(
    project_id: str,
    payload: ScanCreate,
    background_tasks: BackgroundTasks,
):
    project = DatabaseRepository.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    upload = DatabaseRepository.get_upload(payload.upload_id)
    if not upload or upload["project_id"] != project_id:
        raise HTTPException(status_code=400, detail="Invalid upload_id for this project")

    scan = DatabaseRepository.create_scan(
        project_id=project_id,
        upload_id=payload.upload_id,
        selected_checks=payload.selected_checks,
    )

    # Launch background scan execution
    background_tasks.add_task(ScanExecutionService.run_scan_job, scan["id"])

    return scan


@router.get("/scans/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str):
    scan = DatabaseRepository.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/scans/{scan_id}/events")
async def stream_scan_events(scan_id: str):
    scan = DatabaseRepository.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    queue = event_hub.subscribe(scan_id)

    async def event_generator():
        try:
            # Yield initial state
            yield f"event: init\ndata: {json.dumps({'stage': scan['current_stage'], 'status': scan['status']})}\n\n"

            while True:
                msg = await queue.get()
                event_type = msg.get("event", "message")
                data_str = json.dumps(msg.get("data", {}))
                yield f"event: {event_type}\ndata: {data_str}\n\n"

                if event_type in ("scan_completed", "scan_failed"):
                    break
        finally:
            event_hub.unsubscribe(scan_id, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/scans/{scan_id}/findings", response_model=List[FindingResponse])
async def list_findings(
    scan_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    tool_filter: Optional[str] = Query(None, alias="tool"),
    severity_filter: Optional[str] = Query(None, alias="severity"),
):
    return DatabaseRepository.list_findings(
        scan_id=scan_id,
        status_filter=status_filter,
        tool_filter=tool_filter,
        severity_filter=severity_filter,
    )


@router.get("/findings/{finding_id}", response_model=FindingResponse)
async def get_finding(finding_id: str):
    finding = DatabaseRepository.get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding
