# Neuro-Symbolic Software Foundry — System Architecture

**Document Version:** 1.0.0  
**Status:** Approved Architectural Blueprint Baseline  
**Workspace:** `C:\Users\Hanan\OneDrive\Desktop\n`

---

## 1. System Topology & Logical Architecture

The system decouples synchronous request handling, asynchronous long-running scans, workflow agent state machines, and untrusted execution sandboxes:

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Browser)"]
        UI["React 19 + TypeScript + Vite SPA"]
        SSEListener["SSE Event Stream Listener"]
    end

    subgraph APILayer ["API & Ingestion Plane (FastAPI)"]
        API["FastAPI App (REST API)"]
        AuthService["Auth & Tenant Controller"]
        UploadHandler["Zip Upload & Safe Validator"]
        SSEHub["SSE Event Dispatcher"]
    end

    subgraph StorageLayer ["Persistence & Messaging"]
        Postgres[("PostgreSQL 16 (Durable DB)")]
        RedisQueue[("Redis (Broker & Pub/Sub)")]
        ObjectStore[("Object Storage (S3 / Local Vault)")]
    end

    subgraph WorkerPlane ["Workflow & Worker Plane (Celery)"]
        CeleryWorker["Celery Worker Nodes"]
        LangGraphRuntime["LangGraph State Machine Engine"]
        
        subgraph Agents ["Workflow Agents"]
            ArchitectNode["Architect Agent"]
            SpecifierNode["FormalSpecifier (Z3 Model)"]
            CoderNode["Coder (Patch Generator)"]
            VerifierNode["Verifier Node"]
            SecurityNode["SecurityAuditor Node"]
        end
    end

    subgraph SandboxLayer ["Isolated Execution Sandbox"]
        RunnerEngine["Disposable Runner (Docker / Jail)"]
        PytestRunner["Pytest Test Discovery & Runner"]
        Z3Engine["Z3 SMT Invariant Solver"]
        SemgrepEngine["Semgrep Security Scanner"]
        AuditEngine["pip-audit CVE Scanner"]
    end

    UI -->|HTTPS REST| API
    UI -->|Receive SSE Events| SSEHub
    API -->|Read / Write State| Postgres
    API -->|Store Archives & Artifacts| ObjectStore
    API -->|Enqueue Scan Tasks| RedisQueue
    RedisQueue -->|Dequeue Job| CeleryWorker
    CeleryWorker -->|Execute StateGraph| LangGraphRuntime
    LangGraphRuntime --> Agents
    Agents -->|Dispatch Sandbox Runs| RunnerEngine
    RunnerEngine --> PytestRunner
    RunnerEngine --> Z3Engine
    RunnerEngine --> SemgrepEngine
    RunnerEngine --> AuditEngine
    RunnerEngine -->|Return Exit Codes & Evidence| VerifierNode
    CeleryWorker -->|Publish Progress Events| RedisQueue
    RedisQueue -->|Relay Stage Events| SSEHub
```

---

## 2. Component Separation & Boundaries

### 2.1 Frontend Single Page Application (React 19 + TypeScript + Vite)
- **Deployment:** Compiled static assets (`dist/`) hostable on standard Linux hosting, Vercel, Netlify, or AWS CloudFront/S3.
- **Responsibility:** User interface, upload drag-and-drop, scan stage stepper, filterable findings matrix, side-by-side diff review, and report export.
- **Strict Boundary:** No direct communication with workers, database, or LLM providers. All communication routes through FastAPI `/api/v1/*`.

### 2.2 API Layer (FastAPI)
- **Role:** Synchronous ingress, authentication (JWT/OAuth), project metadata management, upload security validation, scan initialization, and SSE event streaming.
- **Strict Boundary:** Never executes scanned project code, test runners, or heavy AI workflows in the API request lifecycle. Dispatches all long-running tasks to Celery.

### 2.3 Task Queue & Pub/Sub (Celery + Redis)
- **Role:** Distributed background job queue. Handles retry ceilings, rate limits, timeout enforcement, and progress pub/sub messaging.
- **Strict Boundary:** Redis serves as an ephemeral message broker and cache; durable state is strictly committed to PostgreSQL.

### 2.4 Workflow State Machine (LangGraph)
- **Role:** Orchestrates the multi-agent decision cycle:
  - `Architect`: Analyzes project manifest and selects verification targets.
  - `FormalSpecifier`: Maps target logic to mathematical invariant constraints.
  - `Verifier`: Coordinates test execution and SMT constraint proofs.
  - `SecurityAuditor`: Triggers static and supply chain scans.
  - `Coder`: Proposes surgical diff patches upon failure.
- **Strict Boundary:** Evaluates structured data only; all tool executions take place in isolated runner processes.

### 2.5 Isolated Execution Sandbox (Runner)
- **Role:** Executes untrusted user code, unit tests, and security scans.
- **Constraints:**
  - Non-root user execution (`uid 10001:10001`).
  - Read-only root filesystem with an ephemeral `/tmp` volume.
  - Default drop of all Linux capabilities (`CAP_DROP ALL`).
  - Strict CPU (max 2 cores), Memory (max 2GB), and PIDs (max 100) quotas.
  - Outbound network egress disabled (`--network none`) except for designated pre-fetch steps.

---

## 3. Scan Lifecycle & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Frontend UI
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Queue as Redis / Celery
    participant LG as LangGraph Workflow
    participant SB as Isolated Sandbox

    User->>Web: Uploads repo.zip & triggers scan
    Web->>API: POST /api/v1/projects/{id}/scans
    API->>API: Safe ZIP validation (size, ratio, traversal)
    API->>DB: Create Scan record (status: QUEUED)
    API->>Queue: Enqueue ScanJob(scan_id)
    API-->>Web: Return scan_id & SSE stream URL

    Web->>API: GET /api/v1/scans/{id}/events (SSE connection)
    Queue->>LG: Worker picks up scan & initializes StateGraph

    LG->>DB: Update status to UNPACKING & RUNNING
    LG->>Queue: Publish SSE Event ("STAGE_STARTED", stage="unpacking")
    Queue-->>API: SSE relay
    API-->>Web: Push stage update to UI

    LG->>SB: Execute Pytest, Semgrep & pip-audit
    SB-->>LG: Raw stdout, exit codes, JSON outputs

    LG->>SB: Execute Z3 Invariant Solver on formalized rules
    SB-->>LG: SAT/UNSAT/UNKNOWN + Counterexamples

    LG->>DB: Persist normalized Findings & TestResults
    LG->>Queue: Publish SSE Event ("SCAN_COMPLETED")
    Queue-->>API: SSE relay
    API-->>Web: Push completion event to UI
    Web->>API: GET /api/v1/scans/{id}/findings
    API-->>Web: Render Findings & Invariant Evidence
```

---

## 4. LangGraph State Machine Specification

The scan execution workflow is modeled as a stateful graph:

```python
class FoundryWorkflowState(TypedDict):
    scan_id: str
    project_id: str
    repo_path: str
    detected_framework: str
    selected_checks: list[str]
    current_stage: str
    pytest_results: Optional[dict]
    semgrep_findings: list[dict]
    audit_findings: list[dict]
    z3_results: list[dict]
    active_findings: list[dict]
    patch_proposal: Optional[dict]
    approval_granted: bool
    retry_count: int
    error: Optional[str]
```

### Graph Transitions:
1. `detect_environment` -> `run_static_scans` & `run_tests` (parallel or staged)
2. `run_formal_verification` -> evaluates Z3 SMT invariants
3. `aggregate_findings` -> normalizes outputs and determines overall status
4. **Conditional Branch:** If findings exist and user requests patch -> `propose_patch` -> `wait_for_human_approval`
5. On approval -> `apply_patch_working_copy` -> `re_verify` -> `finalize_report`
