# Neuro-Symbolic Software Foundry — Tech Stack Decisions & Rationale

**Document Version:** 1.0.0  
**Status:** Approved Architectural Blueprint Baseline  
**Workspace:** `C:\Users\Hanan\OneDrive\Desktop\n`

---

## 1. Stack Selection Matrix

| Tier | Technology | Selected Version | Primary Purpose | Key Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 19.x (or latest stable) | Single Page Application UI | Component-based, vast ecosystem, strong TypeScript typing. |
| **Frontend Language** | TypeScript | 5.5+ | Client-side type safety | Complete type parity with backend Pydantic schemas. |
| **Build Tool** | Vite | 6.x | Fast build and HMR | Produces optimized, deployable static `dist/` bundle. |
| **Client Routing** | React Router | 6.x | Client-side page navigation | Declarative routing, nested layouts, history management. |
| **Client State / Async** | TanStack Query | 5.x | Server state & cache sync | Handles caching, optimistic updates, loading/error states. |
| **CSS & Styling** | Tailwind CSS | 3.4+ / 4.x | Utility-first styling | Rapid, consistent layout adhering to 4px spacing tokens. |
| **UI Icons** | Lucide React | Latest | Consistent icon family | Lightweight, accessible, cohesive design aesthetic. |
| **Backend Language** | Python | 3.12+ | Core API & Workflow engine | Native compatibility with Z3, LangGraph, Pytest, AST tools. |
| **Web API Framework** | FastAPI | 0.115+ | High-performance REST & SSE | Async-native, automatic OpenAPI documentation, Pydantic v2. |
| **Data Validation** | Pydantic | 2.9+ | Request/response & agent validation | High-speed schema validation and strict parsing. |
| **Database ORM** | SQLAlchemy | 2.0+ (async) | Database abstraction | Modern async/await ORM with transactional safety. |
| **Migrations** | Alembic | 1.13+ | Schema revision tracking | Automated version-controlled database migrations. |
| **Primary Database** | PostgreSQL | 16+ (SQLite for local unit tests) | Relational persistence | ACID compliance, JSONB support for complex scan findings. |
| **Job Queue & Broker** | Celery + Redis | Celery 5.4+, Redis 7+ | Distributed task execution | Decouples heavy scans from synchronous API requests. |
| **Workflow State Machine**| LangGraph | 0.2+ | Multi-agent coordination | Directed Cyclic Graphs, human-in-the-loop checkpoints. |
| **SMT Formal Solver** | Z3 (z3-solver) | 4.13+ | Constraint checking & proof | Industry standard theorem prover for first-order logic. |
| **Test Runner** | Pytest | 8.x | Test discovery & execution | Universal Python test runner with structured JSON output. |
| **Static Security Analysis**| Semgrep CLI | Latest | AST-based pattern matching | Fast, language-aware security rule scanning. |
| **Dependency Auditing** | pip-audit | Latest | Vulnerability (CVE) scanner | PyPA-supported audit for known package vulnerabilities. |
| **Property-Based Testing**| Hypothesis | 6.x | Fuzzing & invariant tests | Generates counterexamples for edge-case invariant violations. |
| **Sandboxed Execution** | Disposable Containers | Docker / Subprocess Jail | Untrusted code containment | Prevents host compromise during untrusted code execution. |

---

## 2. Detailed Rationale & Trade-off Analysis

### 2.1 Backend: FastAPI vs. Django / Flask
- **Chosen:** FastAPI.
- **Why:** FastAPI is asynchronous-first, which is critical for handling Server-Sent Events (SSE) connections without exhausting thread pools. Its deep integration with Pydantic v2 provides compile-time and runtime validation for all API inputs and agent outputs.
- **Trade-off:** Lacks built-in admin UI (unlike Django), but the application UI provides custom administrative inspection.

### 2.2 Orchestration: LangGraph vs. Native Celery Chains
- **Chosen:** LangGraph hosted inside Celery Worker tasks.
- **Why:** Celery alone is excellent for linear worker queues, but poorly suited for stateful multi-agent cyclic loops (e.g., *Architect* -> *Specifier* -> *Verifier* -> *Coder* -> *Verifier re-check* with conditional branches and human approval). LangGraph provides explicit state persistence, graph visualization, and checkpointing.
- **Boundary:** Celery handles process distribution and worker heartbeats; LangGraph handles domain reasoning state transitions within the task.

### 2.3 Verification: Z3 SMT Solver Strategy
- **Chosen:** Z3-solver Python bindings with predefined invariant templates.
- **Why:** Full automated decompilation of arbitrary dynamic Python into first-order SMT formulas is mathematically undecidable and prone to solver divergence (`unknown` / timeout).
- **Pragmatic Implementation:** We define formal invariant templates for common high-risk domains:
  1. *Monetary Math:* `amount > 0`, `balance_after == balance_before - debit`, non-negative totals.
  2. *Discount & Coupon Bounds:* `0 <= discount_percentage <= 100`, `final_price >= 0`.
  3. *State Transitions:* Order states (e.g. `PENDING` -> `PAID` -> `SHIPPED`; illegal transition: `REFUNDED` -> `SHIPPED`).
  4. *Access Control Boundaries:* Tenant isolation, role-based capabilities.

### 2.4 Sandboxing: Docker vs. Local Jail (Windows Dev Accommodation)
- **Production Target:** Disposable Docker containers with dropped capabilities (`CAP_DROP ALL`), read-only root filesystems, and strict resource cgroups.
- **Host Development Strategy (Windows without Docker in PATH):**
  - Implement a pluggable `SandboxRunner` interface:
    - `DockerSandboxRunner`: For CI/CD and Linux production environments.
    - `SubprocessSandboxRunner`: For local development on Windows, utilizing an isolated temporary directory, clean environment variables (no access to parent `.env` secrets), strict execution timeouts, and sanitized shell execution.

---

## 3. Configuration & Secrets Hierarchy

Configuration uses `pydantic-settings` to guarantee type safety and environment variable precedence:

1. **Host Environment Variables** (highest precedence).
2. **`.env` local file** (never committed to git).
3. **`.env.example`** (committed template with explicit documentation).

All secrets (`AI_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`) remain strictly server-side. No client-exposed prefixes (e.g. `VITE_*`) may ever contain private API keys.
