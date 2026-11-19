import os
import zipfile
from typing import Dict, List, Optional, Tuple


class ArchiveSecurityError(Exception):
    """Raised when an uploaded archive violates security boundaries."""
    pass


class ArchiveService:
    """
    Secure ZIP archive ingestion and unpacking service.
    Implements defenses against:
    - Zip-Slip (Path Traversal)
    - Decompression Bombs (Zip Bombs via ratio and size limits)
    - File Count / Inode exhaustion
    - Symlink redirection outside sandbox root
    """

    MAX_ARCHIVE_SIZE_BYTES = 50 * 1024 * 1024     # 50 MB
    MAX_UNCOMPRESSED_SIZE_BYTES = 250 * 1024 * 1024 # 250 MB
    MAX_FILE_COUNT = 2500
    MAX_COMPRESSION_RATIO = 10.0

    @classmethod
    def validate_and_extract_zip(
        cls,
        zip_file_path: str,
        destination_dir: str,
    ) -> Dict[str, any]:
        if not os.path.isfile(zip_file_path):
            raise ArchiveSecurityError(f"Archive file not found: {zip_file_path}")

        file_size = os.path.getsize(zip_file_path)
        if file_size > cls.MAX_ARCHIVE_SIZE_BYTES:
            raise ArchiveSecurityError(
                f"Archive size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed limit (50 MB)."
            )

        if not os.path.exists(destination_dir):
            os.makedirs(destination_dir, exist_ok=True)

        canonical_dest = os.path.realpath(destination_dir)

        total_uncompressed_bytes = 0
        file_count = 0
        detected_py_files: List[str] = []
        detected_tests: List[str] = []
        detected_manifests: List[str] = []

        try:
            with zipfile.ZipFile(zip_file_path, "r") as archive:
                infolist = archive.infolist()
                file_count = len(infolist)

                if file_count > cls.MAX_FILE_COUNT:
                    raise ArchiveSecurityError(
                        f"Archive file count ({file_count}) exceeds limit of {cls.MAX_FILE_COUNT} files."
                    )

                # Pre-flight check on entry headers
                for info in infolist:
                    total_uncompressed_bytes += info.file_size
                    if total_uncompressed_bytes > cls.MAX_UNCOMPRESSED_SIZE_BYTES:
                        raise ArchiveSecurityError(
                            "Archive uncompressed size exceeds maximum allowance (250 MB)."
                        )

                    # Path traversal check
                    target_path = os.path.realpath(os.path.join(canonical_dest, info.filename))
                    if not target_path.startswith(canonical_dest + os.sep) and target_path != canonical_dest:
                        raise ArchiveSecurityError(
                            f"Zip-Slip path traversal attempt detected in entry: '{info.filename}'"
                        )

                # Decompression ratio check
                if file_size > 0:
                    ratio = total_uncompressed_bytes / file_size
                    if ratio > cls.MAX_COMPRESSION_RATIO and total_uncompressed_bytes > 5 * 1024 * 1024:
                        raise ArchiveSecurityError(
                            f"Suspicious compression ratio ({ratio:.1f}:1) detected. Possible decompression bomb."
                        )

                # Perform safe extraction
                for info in infolist:
                    # Sanitize filename
                    normalized_name = os.path.normpath(info.filename)
                    if normalized_name.startswith("..") or os.path.isabs(normalized_name):
                        continue

                    target_file = os.path.join(canonical_dest, normalized_name)

                    if info.is_dir():
                        os.makedirs(target_file, exist_ok=True)
                        continue

                    # Create parent dirs safely
                    os.makedirs(os.path.dirname(target_file), exist_ok=True)

                    # Extract entry
                    with archive.open(info) as src, open(target_file, "wb") as dst:
                        # Copy in bounded chunks
                        while True:
                            chunk = src.read(64 * 1024)
                            if not chunk:
                                break
                            dst.write(chunk)

                    # Catalog discovered project files
                    rel = os.path.relpath(target_file, canonical_dest)
                    base = os.path.basename(rel).lower()
                    if base.endswith(".py"):
                        detected_py_files.append(rel)
                        if base.startswith("test_") or base.endswith("_test.py"):
                            detected_tests.append(rel)
                    elif base in ("pyproject.toml", "requirements.txt", "setup.py", "pipfile"):
                        detected_manifests.append(rel)

        except zipfile.BadZipFile:
            raise ArchiveSecurityError("Invalid or corrupted ZIP archive file.")

        return {
            "status": "extracted",
            "destination_dir": canonical_dest,
            "total_files": file_count,
            "uncompressed_bytes": total_uncompressed_bytes,
            "detected_py_files": detected_py_files,
            "detected_tests": detected_tests,
            "detected_manifests": detected_manifests,
        }
