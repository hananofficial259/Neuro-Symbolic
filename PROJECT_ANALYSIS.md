# Neuro-Symbolic Software Foundry — Project Analysis & Scope Specification

**Document Version:** 1.0.0  
**Status:** Approved Architectural Blueprint Baseline  
**Workspace:** `C:\Users\Hanan\OneDrive\Desktop\n`

---

## 1. Executive Summary & Problem Statement

Modern software engineering increasingly leverages Large Language Models (LLMs) to write, refactor, and generate code at high velocity. However, LLMs suffer from fundamental limitations:
1. **Hallucination of invariants and correctness:** Generative models output plausible-looking code that frequently contains edge-case regressions, logic bugs, or security vulnerabilities.
2. **Lack of deterministic guarantees:** Prompting an AI to "check its own code" or "verify this logic" produces high false-confidence with zero mathematical or empirical verification.

**The Neuro-Symbolic Software Foundry** solves this by enforcing a strict division of responsibility:
- **Neural (Generative AI):** Formulates hypotheses, translates human requirements into candidate invariant specifications, explains diagnostic findings, and crafts minimal patch candidates.
- **Symbolic & Deterministic (SMT Solvers & Execution Tools):** Evaluates mathematical SAT/UNSAT proofs via Z3, runs automated regression and property tests (Pytest/Hypothesis), executes static taint-analysis (Semgrep), and checks supply-chain risks (pip-audit). **Deterministic tool outcomes alone drive pass/fail status.**

---

## 2. Product Boundaries & Non-Negotiables

### 2.1 What the Platform Is
- An automated code verification and invariant testing platform for developers, SaaS teams, and agencies.
- A tool that accepts repository archives (ZIP) or Git connections, performs static and formal verification on targeted business logic, provides verifiable evidence, and proposes human-reviewed patches.
- An independent gatekeeper that reports ground truth with precision.

### 2.2 What the Platform Is NOT
- **Not an IDE or code generator replacement:** It does not compete with Antigravity, Claude Code, Cursor, or Gemini CLI.
- **Not a "100% bug-free" guarantee:** It makes no mathematical claims over unmodeled code paths or dynamic runtime environments.
- **Not an autonomous production deployer:** AI-generated patches are strictly non-authoritative proposals requiring human diff inspection, explicit approval, and re-verification.

### 2.3 Truthful Result State Invariants
Under no circumstances may a check result be misrepresented:

| State | Definition | UI Treatment |
| :--- | :--- | :--- |
| **Passed** | The specific deterministic check ran completely and verified without errors. | Emerald Badge `#247A48` |
| **Failed** | The check identified an invariant violation, failed test assertion, or security finding. | Crimson Badge `#B42318` |
| **Warning** | Potential risk, deprecation, or non-fatal anomaly requiring human review. | Amber Badge `#946200` |
| **Not Checked** | The check was not applicable or was excluded from the scan configuration. | Neutral Grey `#5F6672` |
| **Inconclusive** | Tool timed out, model was malformed, or solver returned `unknown`. | Slate Blue `#245C9B` |

*Rule:* Never display `Not Checked` or `Inconclusive` as `Passed`. Never fabricate percentage progress bars.

---

## 3. Core User Journeys

### 3.1 Primary Journey: ZIP Archive Verification & Patch Approval
1. **Authentication:** User registers or logs in via secure session/JWT.
2. **Project Creation & Upload:** User creates a project, drags and drops a project `.zip` archive.
3. **Pre-Flight Validation:** Backend validates file signature, size limit (50MB default for MVP), unpack ratio (zip-bomb defense), and directory structure.
4. **Detection & Scan Configuration:** System detects language (Python 3.12+), entry points, dependencies, and available test suites; user selects check modules (e.g. Pytest, Semgrep, Invariant Rules via Z3).
5. **Background Execution:** Celery worker coordinates execution in an isolated sandbox. Live stage events stream to the browser via Server-Sent Events (SSE).
6. **Results & Evidence Triage:** User inspects structured findings with exact file/line pointers, tool source, and mathematical counterexamples.
7. **AI Explanation & Patch Request:** User clicks "Explain Finding" or "Propose Patch". LangGraph orchestrates the patch agent to generate a minimal surgical diff.
8. **Human Diff Inspection & Approval:** User reviews side-by-side diff. If approved, the patch is applied to a working copy and re-verified.
9. **Export & Audit:** User downloads a signed verification report (JSON/Markdown).

---

## 4. MVP Scope Definition (Python Business Logic Focus)

To ensure high reliability, MVP focuses on **Python business logic invariants**:
- **Target Domains:** Payment calculations, discount thresholds, subscription billing rules, role-based access invariants, and state-machine transitions (e.g., order states).
- **Core Tool Matrix:**
  - Python 3.12+ runtime
  - Pytest (unit & integration discovery)
  - Z3 SMT Solver (pre-defined invariant models: balance bounds, idempotency constraints, discount caps)
  - Semgrep (OWASP Top 10 Python rulesets)
  - pip-audit (known CVE scanning)

---

## 5. Stakeholder & Risk Matrix

| Risk Factor | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Z3 Model Complexity** | Solver timeouts or invalid SAT outputs | Use bounded invariant templates; reject unmappable AST structures; strictly distinguish `unknown` from `unsat`. |
| **Untrusted Code Execution** | Host system compromise | Sandbox execution in disposable ephemeral containers; drop privileges; isolate network; strict CPU/RAM/PID quotas. |
| **AI Hallucinations in Patches** | Introduction of subtle bugs | Sandboxed re-execution of test suite; human approval gate before saving; automated regression checks. |
| **Prompt Injection via Repo Files** | Compromised agent behavior | Treat all repository text, comments, and docstrings as untrusted data; sanitize inputs; keep agent tools least-privileged. |
