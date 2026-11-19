# Neuro-Symbolic Software Foundry

> **Independent Code Verification & Formal Invariant Engine**  
> *AI proposes, explains, and drafts; deterministic SMT proofs and test runners decide.*

---

## 1. Executive Overview

The **Neuro-Symbolic Software Foundry** is an automated code verification platform built for developers, agencies, and SaaS engineering teams. Modern AI assistants can rapidly write code, but generative models cannot mathematically prove correctness or guarantee the absence of edge-case regressions.

This platform bridges the neural and symbolic worlds:
- **Neural Plane (AI Assistants):** Synthesizes plain-language diagnostic explanations, formulates candidate invariant rules, and generates surgical unified diffs.
- **Symbolic Plane (Deterministic Engines):** Evaluates mathematical SAT/UNSAT proofs via the **Z3 SMT Solver**, executes unit and property suites via **Pytest**, and detects execution sinks via **Semgrep AST** analysis.

**Truthful Status Invariant:** Pass/fail statuses are driven exclusively by deterministic tool evidence. The platform never fabricates percentage progress bars and never misrepresents unverified paths as passed.

---

## 2. Architecture & Monorepo Structure

```text
neuro-foundry/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & CORS
│   │   ├── api/                     # REST & SSE routers
│   │   │   ├── projects.py          # Project management
│   │   │   ├── uploads.py           # Secure ZIP ingestion & preflight
│   │   │   ├── scans.py             # Scan lifecycle & live event stream
│   │   │   ├── patches.py           # AI surgical patches & human approval
│   │   │   └── reports.py           # Markdown & JSON report generator
│   │   ├── db/
│   │   │   ├── database.py          # SQLite repository & schema
│   │   │   └── models.py            # Relational models
│   │   ├── schemas/                 # Pydantic v2 validation contracts
│   │   ├── services/
│   │   │   ├── archive_service.py   # Zip-Slip & bomb validation
│   │   │   ├── event_hub.py         # SSE broadcast queue
│   │   │   └── scan_service.py      # Scan execution coordinator
│   │   └── verification/
│   │       ├── models.py            # Normalized finding schemas
│   │       ├── z3_verifier.py       # Z3 SMT solver & symbolic model checker
│   │       ├── pytest_runner.py     # Subprocess test discovery & execution
│   │       └── semgrep_runner.py    # AST security & secrets scanner
│   ├── tests/
│   │   ├── test_verification_engine.py  # Unit tests for SMT & AST
│   │   └── test_api_integration.py      # E2E API & scan pipeline tests
│   └── run_server.py                # Backend server runner
├── frontend/                        # React 19 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/              # Header, Sidebar, StageStepper, FindingsTable, DiffViewer
│   │   ├── pages/                   # Dashboard, ProjectDetail, RulesLibrary, PublicLanding
│   │   ├── api/                     # Type-safe API client
│   │   └── types/                   # Frontend TypeScript interfaces
│   ├── index.html
│   ├── tailwind.config.js           # Light-first WCAG 2.2 AA design tokens
│   └── vite.config.ts
├── samples/
│   └── benchmark_store/             # Known-vulnerable e-commerce testbed
└── docs/                            # Planning & threat model specifications
```

---

## 3. Supported Formal Invariant Templates

| Rule ID | Domain | Invariant Condition | Tool Source |
| :--- | :--- | :--- | :--- |
| `RULE_PAY_NON_NEGATIVE` | Financial Logic | `∀ debit, bal : (debit > 0 ∧ debit ≤ limit) ⟹ (bal - debit ≥ 0)` | Z3 SMT Solver |
| `RULE_DISCOUNT_BOUNDS` | Pricing | `0 ≤ discount_pct ≤ 70 ∧ final_price ≥ 0` | Z3 SMT Solver |
| `RULE_ORDER_STATE_MACHINE`| Lifecycle | Prohibits illegal transitions (e.g. `REFUNDED → SHIPPED`) | Z3 SMT Solver |
| `RULE_TENANT_ISOLATION` | Security Gate | `req_tenant == res_tenant ∨ is_platform_admin == True` | Z3 SMT Solver |
| `RULE_COMMAND_INJECTION` | Static AST | Elimination of direct `os.system()` and `subprocess(shell=True)` sinks | Semgrep AST |

---

## 4. Quickstart Guide

### Prerequisites
- Python 3.12+
- Node.js v20+ / v24+

### 1. Run Verification Engine Unit Tests
```bash
python -m pytest backend/tests/test_verification_engine.py
```

### 2. Run API Integration Tests
```bash
python -m pytest backend/tests/test_api_integration.py
```

### 3. Start the FastAPI Backend Server
```bash
python backend/run_server.py
```
*API Swagger Documentation will be available at: `http://localhost:8000/docs`*

### 4. Start the Frontend Development Console
```bash
cd frontend
npm.cmd run dev
```
*Frontend Console will be available at: `http://localhost:5173`*

---

## 5. Security Non-Negotiables

1. **Untrusted Code Execution:** Scanned code is strictly executed in ephemeral, isolated sandboxes. Untrusted code is never executed inside the main API process.
2. **Decompression Bomb & Zip-Slip Defense:** Archives are strictly inspected before extraction: max compressed size 50MB, max uncompressed size 250MB, max compression ratio 10:1, and canonical path traversal validation.
3. **Zero Autonomous Writes:** AI patch proposals are strictly advisory. Patches are applied to an isolated working copy only after explicit human diff review and approval, immediately triggering re-verification tests.
