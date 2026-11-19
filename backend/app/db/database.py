import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

DB_FILE = os.path.abspath("./neuro_foundry.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        full_name TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        detected_language TEXT DEFAULT 'Python 3.12',
        detected_framework TEXT,
        detected_tests TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        upload_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'QUEUED',
        current_stage TEXT NOT NULL DEFAULT 'queued',
        selected_checks TEXT,
        summary_counts TEXT,
        duration_seconds REAL DEFAULT 0.0,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL,
        tool TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        file_path TEXT,
        line_number INTEGER,
        evidence TEXT,
        counterexample TEXT,
        suggested_remediation TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS patch_proposals (
        id TEXT PRIMARY KEY,
        finding_id TEXT NOT NULL,
        diff TEXT NOT NULL,
        rationale TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
        created_at TEXT NOT NULL,
        FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE
    );
    """)

    # Default system user
    cursor.execute("""
    INSERT OR IGNORE INTO users (id, email, hashed_password, full_name, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        "usr_foundry_admin",
        "admin@neurofoundry.local",
        "local_dev_secret",
        "Lead Verification Engineer",
        1,
        datetime.now(timezone.utc).isoformat(),
    ))

    conn.commit()
    conn.close()

# Auto-initialize on import so tables always exist
init_db()


class DatabaseRepository:
    """Standardized Repository Pattern for database CRUD operations."""

    @staticmethod
    def create_project(user_id: str, name: str, description: Optional[str] = None) -> dict:
        conn = get_connection()
        cursor = conn.cursor()
        project_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT INTO projects (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)",
            (project_id, user_id, name, description, created_at),
        )
        conn.commit()
        conn.close()
        return {
            "id": project_id,
            "user_id": user_id,
            "name": name,
            "description": description,
            "created_at": created_at,
        }

    @staticmethod
    def list_projects(user_id: str) -> List[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def get_project(project_id: str) -> Optional[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def delete_project(project_id: str):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        conn.close()

    @staticmethod
    def create_upload(
        project_id: str,
        filename: str,
        file_size_bytes: int,
        storage_path: str,
        detected_language: str,
        detected_framework: Optional[str],
        detected_tests: List[str],
    ) -> dict:
        conn = get_connection()
        cursor = conn.cursor()
        upload_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO uploads (id, project_id, filename, file_size_bytes, storage_path, detected_language, detected_framework, detected_tests, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (upload_id, project_id, filename, file_size_bytes, storage_path, detected_language, detected_framework, json.dumps(detected_tests), created_at),
        )
        conn.commit()
        conn.close()
        return {
            "id": upload_id,
            "project_id": project_id,
            "filename": filename,
            "file_size_bytes": file_size_bytes,
            "storage_path": storage_path,
            "detected_language": detected_language,
            "detected_framework": detected_framework,
            "detected_tests": detected_tests,
            "created_at": created_at,
        }

    @staticmethod
    def get_upload(upload_id: str) -> Optional[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM uploads WHERE id = ?", (upload_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["detected_tests"] = json.loads(d["detected_tests"]) if d["detected_tests"] else []
        return d

    @staticmethod
    def create_scan(project_id: str, upload_id: str, selected_checks: List[str]) -> dict:
        conn = get_connection()
        cursor = conn.cursor()
        scan_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        initial_counts = {"passed": 0, "failed": 0, "warning": 0, "inconclusive": 0, "not_checked": 0}
        cursor.execute(
            """
            INSERT INTO scans (id, project_id, upload_id, status, current_stage, selected_checks, summary_counts, duration_seconds, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (scan_id, project_id, upload_id, "QUEUED", "queued", json.dumps(selected_checks), json.dumps(initial_counts), 0.0, created_at),
        )
        conn.commit()
        conn.close()
        return {
            "id": scan_id,
            "project_id": project_id,
            "upload_id": upload_id,
            "status": "QUEUED",
            "current_stage": "queued",
            "selected_checks": selected_checks,
            "summary_counts": initial_counts,
            "duration_seconds": 0.0,
            "created_at": created_at,
            "completed_at": None,
        }

    @staticmethod
    def get_scan(scan_id: str) -> Optional[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM scans WHERE id = ?", (scan_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["selected_checks"] = json.loads(d["selected_checks"]) if d["selected_checks"] else []
        d["summary_counts"] = json.loads(d["summary_counts"]) if d["summary_counts"] else {}
        return d

    @staticmethod
    def update_scan_stage(scan_id: str, stage: str, status: Optional[str] = None):
        conn = get_connection()
        cursor = conn.cursor()
        if status:
            cursor.execute("UPDATE scans SET current_stage = ?, status = ? WHERE id = ?", (stage, status, scan_id))
        else:
            cursor.execute("UPDATE scans SET current_stage = ? WHERE id = ?", (stage, scan_id))
        conn.commit()
        conn.close()

    @staticmethod
    def finalize_scan(scan_id: str, status: str, summary: dict, duration: float):
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            UPDATE scans
            SET status = ?, current_stage = 'completed', summary_counts = ?, duration_seconds = ?, completed_at = ?
            WHERE id = ?
            """,
            (status, json.dumps(summary), duration, now, scan_id),
        )
        conn.commit()
        conn.close()

    @staticmethod
    def insert_finding(
        scan_id: str,
        tool: str,
        severity: str,
        status: str,
        title: str,
        description: str,
        file_path: Optional[str] = None,
        line_number: Optional[int] = None,
        evidence: Optional[str] = None,
        counterexample: Optional[dict] = None,
        suggested_remediation: Optional[str] = None,
    ) -> str:
        conn = get_connection()
        cursor = conn.cursor()
        finding_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO findings (id, scan_id, tool, severity, status, title, description, file_path, line_number, evidence, counterexample, suggested_remediation, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                finding_id,
                scan_id,
                tool,
                severity,
                status,
                title,
                description,
                file_path,
                line_number,
                evidence,
                json.dumps(counterexample) if counterexample else None,
                suggested_remediation,
                created_at,
            ),
        )
        conn.commit()
        conn.close()
        return finding_id

    @staticmethod
    def list_findings(
        scan_id: str,
        status_filter: Optional[str] = None,
        tool_filter: Optional[str] = None,
        severity_filter: Optional[str] = None,
    ) -> List[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        query = "SELECT * FROM findings WHERE scan_id = ?"
        params = [scan_id]

        if status_filter:
            query += " AND status = ?"
            params.append(status_filter.upper())
        if tool_filter:
            query += " AND tool = ?"
            params.append(tool_filter.upper())
        if severity_filter:
            query += " AND severity = ?"
            params.append(severity_filter.upper())

        query += " ORDER BY created_at ASC"
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        conn.close()

        results = []
        for r in rows:
            d = dict(r)
            d["counterexample"] = json.loads(d["counterexample"]) if d["counterexample"] else None
            results.append(d)
        return results

    @staticmethod
    def get_finding(finding_id: str) -> Optional[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM findings WHERE id = ?", (finding_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["counterexample"] = json.loads(d["counterexample"]) if d["counterexample"] else None
        return d

    @staticmethod
    def insert_patch_proposal(finding_id: str, diff: str, rationale: str) -> str:
        conn = get_connection()
        cursor = conn.cursor()
        patch_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO patch_proposals (id, finding_id, diff, rationale, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (patch_id, finding_id, diff, rationale, "PENDING_APPROVAL", created_at),
        )
        conn.commit()
        conn.close()
        return patch_id

    @staticmethod
    def list_patches_for_finding(finding_id: str) -> List[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patch_proposals WHERE finding_id = ?", (finding_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def decide_patch(patch_id: str, confirmed: bool) -> Optional[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        new_status = "APPROVED" if confirmed else "REJECTED"
        cursor.execute("UPDATE patch_proposals SET status = ? WHERE id = ?", (new_status, patch_id))
        conn.commit()

        cursor.execute("SELECT * FROM patch_proposals WHERE id = ?", (patch_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
