# Neuro-Symbolic Software Foundry — API Specification & Plan

**Document Version:** 1.0.0  
**Status:** Approved Architectural Blueprint Baseline  
**Workspace:** `C:\Users\Hanan\OneDrive\Desktop\n`

---

## 1. API Design Principles & Global Standards

- **Base URL:** `/api/v1`
- **Protocol:** HTTPS (TLS 1.3)
- **Data Format:** JSON (`application/json`) for standard requests; `multipart/form-data` for file uploads; `text/event-stream` for live scan events.
- **Authentication:** Bearer token (JWT in `Authorization` header) for authenticated routes.
- **Tenant Isolation:** Every request verifies project/scan ownership against the authenticated user ID.
- **Standard Error Format:**
  ```json
  {
    "error": {
      "code": "ARCHIVE_TRAVERSAL_DETECTED",
      "message": "File entry attempts directory traversal outside destination root.",
      "details": { "entry": "../malicious.py" },
      "timestamp": "2026-11-19T09:30:00Z"
    }
  }
  ```

---

## 2. Endpoint Catalog

### 2.1 System & Health
- `GET /health` — Application health check (DB, Redis, Runner availability).
- `GET /api/v1/info` — API version, supported language runtimes, and active scanner capabilities.

### 2.2 Project Management
- `POST /api/v1/projects`
  - **Body:** `{ "name": "Payment Service", "description": "Core checkout business logic" }`
  - **Response:** `201 Created` with project entity.
- `GET /api/v1/projects`
  - **Response:** `200 OK` with paginated list of user's projects.
- `GET /api/v1/projects/{project_id}`
  - **Response:** `200 OK` with project details, upload status, and scan history.
- `DELETE /api/v1/projects/{project_id}`
  - **Response:** `204 No Content` (triggers safe cascade deletion of uploads, scans, and findings).

### 2.3 Upload Ingestion
- `POST /api/v1/projects/{project_id}/uploads`
  - **Content-Type:** `multipart/form-data` (file: `repo.zip`)
  - **Validation:** Max size 50MB, magic bytes verification (`PK\x03\x04`), safe unpacker scan.
  - **Response:** `201 Created`
  ```json
  {
    "upload_id": "upl_89234f9a",
    "project_id": "prj_1209384a",
    "filename": "checkout_service.zip",
    "file_size_bytes": 1048576,
    "detected_language": "Python 3.12",
    "detected_framework": "FastAPI",
    "detected_tests": ["tests/test_payments.py", "tests/test_discounts.py"],
    "supported_checks": ["pytest", "semgrep", "pip_audit", "z3_invariants"]
  }
  ```

### 2.4 Scan Management & Execution
- `POST /api/v1/projects/{project_id}/scans`
  - **Body:**
    ```json
    {
      "upload_id": "upl_89234f9a",
      "selected_checks": ["pytest", "semgrep", "pip_audit", "z3_invariants"],
      "rule_categories": ["payment_limits", "discount_bounds", "state_transitions"]
    }
    ```
  - **Response:** `202 Accepted` with `scan_id` and status `QUEUED`.
- `GET /api/v1/scans/{scan_id}`
  - **Response:** `200 OK` with current scan state, summary counts, and execution metrics.
- `GET /api/v1/scans/{scan_id}/events`
  - **Protocol:** Server-Sent Events (`text/event-stream`)
  - **Stream Data:** Stage transitions (`unpacking`, `testing`, `analyzing`, `verifying`, `completed`), live log lines, and execution heartbeats.
- `POST /api/v1/scans/{scan_id}/cancel`
  - **Response:** `200 OK` (terminates active runner processes and transitions status to `CANCELLED`).

### 2.5 Findings & Evidence
- `GET /api/v1/scans/{scan_id}/findings`
  - **Query Params:** `severity` (`critical`, `high`, `medium`, `low`, `info`), `tool` (`z3`, `pytest`, `semgrep`, `pip_audit`), `status` (`open`, `fixed`, `ignored`).
  - **Response:** `200 OK` with normalized findings list.
- `GET /api/v1/findings/{finding_id}`
  - **Response:** `200 OK` with detailed evidence snippet, AST path, SMT counterexample, and tool diagnostic stdout.

### 2.6 AI Explanations & Patch Review Loop
- `POST /api/v1/findings/{finding_id}/explanations`
  - **Body:** `{ "prompt_context": "Explain why this invariant failed and how to safely correct it." }`
  - **Response:** `200 OK` with Markdown explanation, root-cause analysis, and educational background.
- `POST /api/v1/findings/{finding_id}/patch-proposals`
  - **Body:** `{}`
  - **Response:** `201 Created`
  ```json
  {
    "patch_id": "ptc_490123",
    "finding_id": "fnd_781290",
    "diff": "--- a/checkout/calculator.py\n+++ b/checkout/calculator.py\n@@ -14,3 +14,3 @@\n-    total = subtotal - discount\n+    total = max(Decimal('0.00'), subtotal - discount)",
    "rationale": "Prevents discount from exceeding subtotal, maintaining the non-negative balance invariant proved by Z3.",
    "affected_files": ["checkout/calculator.py"],
    "status": "PENDING_APPROVAL"
  }
  ```
- `POST /api/v1/patches/{patch_id}/approve`
  - **Body:** `{ "confirmed": true }`
  - **Response:** `200 OK` (applies diff to sandbox working copy and queues re-verification job).
- `POST /api/v1/patches/{patch_id}/reject`
  - **Body:** `{ "reason": "Alternative architectural fix preferred" }`
  - **Response:** `200 OK`.
- `POST /api/v1/patches/{patch_id}/rechecks`
  - **Response:** `202 Accepted` (re-runs targeted Pytest and Z3 checks against patched code).

### 2.7 Reports & Exports
- `GET /api/v1/reports/{scan_id}`
  - **Query Params:** `format` (`json`, `markdown`)
  - **Response:** Downloadable signed verification report detailing tools run, exit codes, evidence, and pass/fail states.
