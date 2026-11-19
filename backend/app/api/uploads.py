import os
import shutil
import tempfile
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.app.db.database import DatabaseRepository
from backend.app.services.archive_service import ArchiveSecurityError, ArchiveService

router = APIRouter(prefix="/projects/{project_id}/uploads", tags=["Uploads"])

UPLOAD_STORAGE_DIR = os.path.abspath("./uploads_storage")
os.makedirs(UPLOAD_STORAGE_DIR, exist_ok=True)


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_project_archive(
    project_id: str,
    file: UploadFile = File(...),
):
    project = DatabaseRepository.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip archive formats are supported.")

    dest_filename = f"{project_id}_{file.filename}"
    saved_path = os.path.join(UPLOAD_STORAGE_DIR, dest_filename)

    try:
        with open(saved_path, "wb") as f:
            while content := await file.read(1024 * 64):
                f.write(content)

        # Preflight safe extraction verification
        temp_verify_dir = tempfile.mkdtemp()
        try:
            meta = ArchiveService.validate_and_extract_zip(saved_path, temp_verify_dir)
        finally:
            shutil.rmtree(temp_verify_dir, ignore_errors=True)

        upload_data = DatabaseRepository.create_upload(
            project_id=project_id,
            filename=file.filename,
            file_size_bytes=os.path.getsize(saved_path),
            storage_path=saved_path,
            detected_language="Python 3.12",
            detected_framework="FastAPI / Standard Python",
            detected_tests=meta["detected_tests"],
        )

        return {
            "upload_id": upload_data["id"],
            "project_id": project_id,
            "filename": upload_data["filename"],
            "file_size_bytes": upload_data["file_size_bytes"],
            "detected_language": upload_data["detected_language"],
            "detected_framework": upload_data["detected_framework"],
            "detected_tests": upload_data["detected_tests"],
            "supported_checks": ["pytest", "semgrep", "z3_invariants"],
        }

    except ArchiveSecurityError as sec_err:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=400, detail=str(sec_err))
    except Exception as e:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"Failed to process archive: {str(e)}")
