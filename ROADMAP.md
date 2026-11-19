# Neuro-Symbolic Software Foundry — Phased Implementation Roadmap

**Document Version:** 1.0.0  
**Status:** Approved Architectural Blueprint Baseline  
**Workspace:** `C:\Users\Hanan\OneDrive\Desktop\n`

---

## 1. Phase Overview & Priority Matrix

| Phase | Title | Priority | Core Objective | Estimated Window |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Product & Domain Validation | P0 | Define invariant rules and sample project benchmarks | Week 1 |
| **Phase 1** | Technical Proof (CLI & SMT) | P0 | Prove Z3 invariant engine, Pytest runner, and Semgrep CLI | Weeks 1–2 |
| **Phase 2** | Architecture Foundation | P1 | Scaffold monorepo, FastAPI backend, React UI, and DB | Weeks 2–3 |
| **Phase 3** | Scan Engine & Execution Runner | P1 | Implement safe unpacker, language detection, and sandbox | Weeks 3–5 |
| **Phase 4** | LangGraph Agent Workflow | P1 | Build multi-agent state machine and checkpointing | Weeks 4–6 |
| **Phase 5** | Production UI & Findings Dashboard| P1 | Responsive React UI, SSE event streaming, report export | Weeks 5–7 |
| **Phase 6** | AI Explanation & Patch Loop | P2 | On-demand Gemini explanations, diff preview & approval | Weeks 6–8 |
| **Phase 7** | GitHub Integration | P3 | GitHub App OAuth, PR check runs, webhook verification | Weeks 7–9 |
| **Phase 8** | Hardening, Beta Audit & Release | P4 | STRIDE audit, backup drills, rate limits, documentation | Weeks 9–10 |

---

## 2. Detailed Phase Deliverables & Definition of Done (DoD)

### Phase 1: Technical Proof (CLI & SMT Engines)
- **Deliverables:**
  - `verification_engine/z3_verifier.py`: Z3 rule engine with 5 core invariant templates (e.g. monetary non-negativity, discount bounds, state transitions).
  - `verification_engine/pytest_runner.py`: Programmatic Pytest discovery and execution parser.
  - `verification_engine/semgrep_runner.py`: Semgrep CLI execution and JSON normalization.
  - Benchmark sample suite containing known valid code and known bug injections.
- **Definition of Done:**
  - Automated tests pass proving expected `sat`, `unsat`, and `unknown` outcomes.
  - Zero unhandled exceptions on malformed input.

### Phase 2: Architecture Foundation
- **Deliverables:**
  - Monorepo directory structure (`frontend/`, `backend/`, `runner/`, `docs/`).
  - FastAPI application with health check and OpenAPI documentation.
  - SQLAlchemy async models (`User`, `Project`, `Scan`, `Finding`, `VerificationRule`).
  - Alembic migrations directory and initial schema.
  - React + TypeScript + Vite frontend scaffold with Tailwind CSS and Lucide icons.
- **Definition of Done:**
  - Backend starts cleanly and passes all initial unit tests.
  - Frontend builds with zero TypeScript errors and produces static output in `dist/`.

### Phase 3: Scan Engine & Execution Sandbox
- **Deliverables:**
  - Secure ZIP extraction service: validates size (<50MB), ratio (<10:1), and enforces canonical path traversal checks.
  - Language and manifest detector (`pyproject.toml`, `requirements.txt`).
  - Ephemeral sandbox runner with timeouts and resource quotas.
  - Findings normalization service converting Pytest, Semgrep, pip-audit, and Z3 outputs into a unified schema.
- **Definition of Done:**
  - Malicious ZIP archives (Zip-Slip, zip-bombs) rejected with HTTP 400.
  - Scans complete and produce normalized JSON findings records.

### Phase 4: LangGraph Workflow Engine
- **Deliverables:**
  - Compiled LangGraph `StateGraph` linking `detect_environment`, `run_tests`, `run_static_scans`, `run_z3_invariants`, and `aggregate_findings`.
  - Checkpoint persistence in database.
  - Celery background worker consuming scan jobs from Redis queue.
  - SSE progress broadcaster streaming live stage events to subscribers.
- **Definition of Done:**
  - Scan state transitions reliably: `QUEUED` -> `UNPACKING` -> `ANALYZING` -> `TESTING` -> `VERIFYING` -> `COMPLETED`.
  - SSE endpoint streams stage transitions to browser without dropped connections.

### Phase 5: Production UI & Findings Dashboard
- **Deliverables:**
  - Light-first SaaS theme adhering to design tokens (`#F7F8FA`, `#315FCE`, Inter, JetBrains Mono).
  - Project upload interface with drag-and-drop file validation.
  - Scan detail page with live SSE progress stepper.
  - Filterable findings table with severity badges, category pills, and evidence drawers.
  - Report export in Markdown and JSON formats.
- **Definition of Done:**
  - Tested across responsive breakpoints (320px to 1440px) with zero horizontal overflow.
  - WCAG 2.2 AA color contrast verified across all text and badge states.

### Phase 6: AI Explanation & Human-in-the-Loop Patching
- **Deliverables:**
  - Backend integration with Google Gemini API via official SDK.
  - "Explain Finding" drawer providing plain-language breakdown and suggested fixes.
  - "Generate Patch Proposal" endpoint emitting unified diff.
  - Frontend side-by-side diff viewer.
  - "Approve & Re-verify" workflow applying patch to working copy and re-running targeted tests.
- **Definition of Done:**
  - Patches cannot be applied without explicit human approval action.
  - Re-verification detects whether bug is resolved or if regressions were introduced.

### Phase 7 & 8: Beta Hardening & Release Audit
- **Deliverables:**
  - Rate limiting on API endpoints.
  - Complete execution of Section 20 checklist (`FINAL_AUDIT_CHECKLIST.md`).
  - Docker Compose configuration for multi-container deployment.
  - Documentation covering setup, API specs, and local testing.
- **Definition of Done:**
  - Zero critical security vulnerabilities in dependency audit.
  - 100% pass on core unit, integration, and E2E verification suites.
