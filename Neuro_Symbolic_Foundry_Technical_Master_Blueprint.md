# Neuro-Symbolic Software Foundry
## Consolidated Technical Master Blueprint for Antigravity / Gemini

**Document purpose:** Research-grounded technical plan, stack decisions, architecture, implementation phases, API integration map, deliverables, risks, acceptance criteria, and final audit checklist.  
**Status:** Proposed architecture—not an implemented or validated product.

---

## 1. Product Definition and Boundaries

Build a web-based code verification platform for developers, small software agencies, and SaaS teams. Users connect a GitHub repository or upload a ZIP, choose a scan, and receive test, security, and supported business-rule results with evidence. AI may explain findings and propose a patch, but deterministic tool outputs—not AI confidence—drive pass/fail statuses.

**Positioning:** AI can write code. This product independently checks selected code paths, requirements, tests, security findings, and formalizable business rules. It is not a replacement for Antigravity, Claude Code, Gemini, or human review.

**MVP focus:** choose one initial language/runtime and a narrow workflow (recommended prototype: Python business logic, such as payment/order rules or access-control checks). Do not claim universal language or bug coverage.

### Result states
- **Passed:** the named check ran and passed.
- **Failed:** the named check ran and failed or returned a supported finding.
- **Warning:** potential risk or review-needed result.
- **Not checked:** not run or not applicable.
- **Inconclusive:** tool/model could not produce a reliable determination, including timeouts.

Never present Not checked or Inconclusive as Passed. Never claim “100% bug-free.”

---

## 2. User Journeys

### Primary journey: ZIP scan
1. Create account / sign in.
2. Create project and upload ZIP.
3. Validate upload (size, archive paths, file count, decompression limits); store privately.
4. Detect language, framework, manifests, test commands, and supported checks.
5. Show detected project and a scan plan; user confirms.
6. Create a background scan job.
7. Show stages and truthful progress: queued → unpacking → detection → planning → running tests/scanners → rule verification → summarizing → completed/partial/failed.
8. User reviews findings by severity/category/file; expands evidence and limitations.
9. AI explains selected findings and may suggest a patch.
10. User inspects diff, approves/rejects; approved patch applies only to a working branch/copy.
11. Run relevant tests/scans again and compare.
12. Save report and scan history; user can export and delete according to retention policy.

### GitHub journey (later MVP phase)
OAuth/GitHub App installation with minimum permissions → choose repo/branch/PR → fetch only required content → scan in worker → publish a status/check → optional comment or patch branch only after user permission.

### UX principles
- Clear path for beginner, detailed evidence for experienced developers.
- Explain scan scope and what is not checked before execution.
- Do not fabricate percentage progress.
- Preserve input and context after errors.
- Confirm destructive actions.
- Accessible keyboard navigation and focus.
- Fully designed empty/loading/success/warning/error/partial/cancelled/timeout states.

---

## 3. Stack Decisions — What, Why, and Where

### Frontend
- **React + TypeScript:** application UI, dashboard, upload flow, project and scan screens, results, diff review, settings.
- **Vite:** local development and static production build. Build output (`dist/`) can be uploaded to ordinary Linux shared hosting.
- **React Router:** routes and navigation.
- **TanStack Query:** API data fetching, caching, invalidation, loading/error states.
- **React Hook Form + Zod:** forms and client-side schema validation; backend validation remains authoritative.
- **Tailwind CSS or CSS Modules:** choose ONE styling approach after design prototype; do not mix styling systems without reason.
- **Lucide icons:** one consistent icon family.
- **Monaco Editor (optional, later):** code snippets/diff view; assess bundle size and mobile fallback before inclusion.

### Backend and workflow
- **Python 3.12+ (confirm supported version at build time):** primary backend language.
- **FastAPI:** HTTP API, auth integration, upload endpoints, project/scan CRUD, result/report endpoints, webhook receiver. FastAPI is not the long-running workflow engine.
- **LangGraph:** agent/workflow state machine for orchestrating Architect, FormalSpecifier, Coder, Verifier, SecurityAuditor, loops, conditional branches, checkpoints, and human approval. Start with a small graph; avoid agent complexity where deterministic functions suffice.
- **Celery + Redis:** background job queue for long scans and worker scheduling/retries. Redis is queue/cache/broker support, not permanent source of truth.
- **PostgreSQL:** durable application data, user/project records, scan states, findings, rules, approvals, audit events, usage.
- **SQLAlchemy + Alembic:** ORM and database migrations.
- **Pydantic:** structured request/response schemas and inter-agent output validation.
- **SSE (Server-Sent Events) or WebSocket:** live scan stage/log updates. Prefer SSE for one-way progress unless interactive two-way communication is needed.

### Verification tools
- **Pytest:** test discovery/execution and structured test results.
- **Hypothesis:** property-based tests for supported Python modules; not a universal automatic correctness tool.
- **Semgrep:** static pattern analysis; configure supported rules and severity.
- **Bandit (Python-focused, optional):** additional Python security linting; evaluate overlap with Semgrep.
- **Dependency audit:** use ecosystem-specific tools such as pip-audit for Python dependency risks; add other ecosystems only as supported.
- **Z3 (z3-solver):** check explicit constraints and formalized business rules. Use only where a model can be created and interpreted correctly.
- **Coverage.py (optional):** code coverage metrics; coverage is not correctness.
- **Git subprocess / GitPython (choose based on needs):** repo operations in controlled worker, never expose unrestricted host shell.

### Execution and infrastructure
- **Docker:** disposable worker containers for code/tests/scanners; not a sufficient security boundary by itself. Use hardened configuration, no privileged containers, no host Docker socket inside scanned code, no secrets, resource limits, restricted network, and evaluate gVisor/Firecracker or isolated runner VMs for stronger containment.
- **Redis + Celery workers:** queue and execute scan jobs. Separate API and worker processes.
- **Object storage (S3-compatible, MinIO locally or managed storage):** private ZIP uploads, artifacts, logs, report files; short-lived signed download links where appropriate.
- **Nginx/Caddy:** reverse proxy and TLS on VPS if self-managed.
- **Docker Compose:** development/small initial deployment orchestration. Kubernetes is not required for initial MVP; add only after operational complexity and scaling needs justify it.

### Observability and operations
- Structured logging (Python logging/structlog—choose one).
- OpenTelemetry tracing when workflows span API, queue, agents, and runner.
- Error monitoring (e.g., Sentry—optional; confirm privacy settings).
- Metrics (Prometheus-compatible metrics, optional early-stage).
- Backup/restore procedure for PostgreSQL and object storage; test restore.

---

## 4. Architecture and Component Boundaries

### Logical architecture
Browser (React static app) → HTTPS API (FastAPI) → PostgreSQL (persistent state) + Redis (queue/cache) → Celery workers → LangGraph workflow → AI provider adapter / deterministic tools → isolated execution runner → scan artifacts and evidence → API → UI/report.

**Important separation:** API process handles short requests; queue/workers handle long scans; sandbox executes untrusted project code; LangGraph coordinates workflow steps. Docker/Kubernetes provide runtime/deployment orchestration, not the product's reasoning graph.

### Suggested monorepo structure
```text
neuro-foundry/
  frontend/
    src/
      app/
      components/
      features/
        projects/
        scans/
        findings/
        reports/
        settings/
      api/
      styles/
  backend/
    app/
      main.py
      api/
      auth/
      schemas/
      db/
      services/
      workflows/
        graph.py
        state.py
        nodes/
          architect.py
          formal_specifier.py
          coder.py
          verifier.py
          security_auditor.py
      scanners/
        detection/
        pytest_runner/
        semgrep/
        dependency_audit/
        z3/
      workers/
      integrations/
        ai/
        github/
        storage/
      security/
      observability/
    tests/
  runner/
    images/
    entrypoint/
    policies/
  docs/
    architecture/
    api/
    security/
  docker-compose.yml
  .env.example
  README.md
```
Keep agent nodes thin: each agent returns validated structured data. Put deterministic logic in normal Python services, not in prompts.

---

## 5. Agent Responsibilities and Workflow Graph

### FoundryOrchestrator (LangGraph)
- Owns scan state and stage transitions.
- Calls deterministic tools and agents in the correct order.
- Applies retry ceilings, timeouts, and token/cost budgets.
- Routes failed verification back to Coder only within a bounded loop.
- Stores checkpoints; supports pause, cancellation, recovery, and approval.
- Records why a node ran and its output.

### Architect
Input: detected project metadata, user scan scope, requirements.  
Output: modules/targets, relevant files, test strategy, scope limitations.  
Must not assert unsupported language capabilities.

### FormalSpecifier
Input: user-approved requirements or templates, selected code context.  
Output: versioned formal rules, assumptions, variables, preconditions, postconditions, boundary cases, and candidate Z3 model.  
Rules require review/validation; AI-generated constraints are not trusted by default.

### Coder / Patch proposer
In MVP, do not make broad autonomous rewrites. Generate a patch proposal against a finding, with a minimal diff, rationale, and impacted files. No direct production branch writes.

### Verifier
Runs test suite, supported property tests, Z3 checks, and relevant re-checks. Returns structured evidence: command/tool version, exit code, duration, artifacts, test counts, and counterexample if available.

### SecurityAuditor
Runs configured static/security/dependency/secret checks. Treat findings as signals with tool evidence, not a guarantee that the project is safe.

### Human approval
Required before patch application, PR creation, merging, deployment, or any destructive action. Show before/after diff and checks affected.

### Bounded fix loop
Verification failure → summarize failure/evidence → limited patch proposal → approval → re-run affected checks and regression suite. Maximum attempts and cost/time limits are configurable. If still failing or solver returns unknown/timeout, stop and label accurately.

---

## 6. APIs and Integrations

### Internal API (initial contracts; final names may be adjusted during implementation)
- `POST /api/v1/projects` — create project.
- `POST /api/v1/projects/{project_id}/uploads` — initiate/upload ZIP; validate size and ownership.
- `POST /api/v1/projects/{project_id}/scans` — create scan with selected checks and scope.
- `GET /api/v1/scans/{scan_id}` — scan state and summary.
- `GET /api/v1/scans/{scan_id}/events` — SSE progress stream.
- `GET /api/v1/scans/{scan_id}/findings` — paginated/filterable findings.
- `GET /api/v1/findings/{finding_id}` — evidence and details.
- `POST /api/v1/findings/{finding_id}/explanations` — AI explanation on demand.
- `POST /api/v1/findings/{finding_id}/patch-proposals` — create patch proposal.
- `POST /api/v1/patches/{patch_id}/approve` — user approval action.
- `POST /api/v1/patches/{patch_id}/reject` — rejection.
- `POST /api/v1/patches/{patch_id}/rechecks` — re-run relevant checks.
- `GET /api/v1/reports/{scan_id}` — report metadata/download.
- `DELETE /api/v1/projects/{project_id}` — delete project and associated data per policy.
- GitHub webhook endpoint: verify signature and replay protections before processing.

API contracts must be documented in OpenAPI, versioned, authenticated, rate-limited, and ownership-checked. Avoid leaking raw stack traces or secrets.

### External integrations
**AI provider:** choose one primary provider initially (OpenAI or Gemini; make provider interface swappable). API calls only from backend. Use structured outputs/schema validation where supported. AI use cases: requirement clarification, rule drafting, test ideas, finding explanation, patch proposal. AI is not the authority for tool status or pass/fail.

**GitHub App/API (later phase):** repo access, commit/PR metadata, check runs, webhook events. Use least-privilege permissions; do not request write permissions until a feature requires them. Verify webhook signatures, handle duplicates, and use idempotency.

**Email provider (optional):** verification, reset, scan-finished notification. Keep email outside core scan path.

**Payments (later, after beta validation):** Stripe or a region-appropriate provider; do not implement before usage costs and willingness-to-pay are tested.

### API key/setup map
- `AI_API_KEY`: backend secret only, never in frontend env prefixed for client exposure.
- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`: only when GitHub integration is built; secrets vault/environment, rotate on exposure.
- Database credentials: backend/worker only.
- Redis credentials: private network only.
- Object storage credentials: scoped permissions.
- Email credentials: optional provider.
- Payment credentials: later.
Create `.env.example` with placeholders, never commit real secrets.

---

## 7. Data Model (first-pass entities)

- User / Auth identity
- Organization / Team (defer if MVP is solo-user)
- Project
- Repository connection (encrypted credential/token reference, never raw token in logs)
- Upload / Artifact metadata
- Scan (state, config, tool versions, timestamps, cost, limits)
- ScanStage / Job execution
- Finding (category, severity, status, title, file/line, evidence, confidence, tool source)
- VerificationRule (rule definition, version, assumptions, owner, review status)
- TestResult (command, tool version, counts, exit code, duration)
- PatchProposal (diff, rationale, base revision, approval state)
- Approval / Audit event
- Report metadata
- Usage record
- Retention/deletion record

Use tenant/project ownership checks in every query. Store large artifacts in object storage, not in database blobs by default. Define retention and deletion behavior.

---

## 8. Scan Engine and Code Detection

### Detection
Identify supported language/runtime using manifests and file patterns; report confidence and competing signals. Detect framework and package manager only when evidence exists. Do not execute install scripts just to identify a project.

### MVP support matrix
Start with one language and one primary test runner. Suggested first target: Python.
- Python: `pyproject.toml`, requirements files, Python files; Pytest; Semgrep Python rules; pip-audit; selected Hypothesis tests.
- Other languages: display detected-but-not-supported and explain; do not silently skip.
- Avoid running package installation from untrusted projects in a network-enabled environment.
- Lock tool versions and runner images for reproducibility.

### Results normalization
Normalize tool output into a common schema but preserve original evidence and raw artifact reference. Findings should include:
- Stable finding ID and tool/rule ID
- Severity and category
- File/line/column when available
- Short human-readable explanation
- Evidence/snippet safely redacted
- Confidence or triage label (do not invent precision)
- Suggested remediation
- Check status and limitations

---

## 9. Z3 / Formal Verification Strategy

Z3 is not a general bug detector and cannot prove an entire arbitrary application correct by itself. It checks the modeled constraints.

Start with a small library of explicit business-rule templates:
- Payment amount positive and within configured maximum.
- Discount within allowed bounds.
- Refund not exceeding captured amount.
- Inventory cannot become negative.
- Role/action authorization constraints.
- Duplicate operation/idempotency constraints, where state model supports it.

For every rule:
1. Describe it in plain language.
2. Define variables, units, types, preconditions, and assumptions.
3. Build the solver model.
4. Add a counterexample search for violation.
5. Test expected SAT/UNSAT outcomes using known valid/invalid cases.
6. Distinguish solver `sat`, `unsat`, `unknown`, timeout, malformed model, and unsupported condition.
7. Save model/version and evidence.
8. Require review for AI-generated rules.

Do not translate arbitrary code directly to Z3 without a supported semantic mapping. Clearly label what portion was modeled.

---

## 10. Code Execution Security — Non-negotiable

Uploaded repositories and code are untrusted. Security is a launch blocker.

- Never execute code inside FastAPI/API process.
- Use disposable isolated runners; Docker is one layer, not a complete security guarantee.
- No privileged containers; never mount host Docker socket into untrusted runner.
- Non-root; drop capabilities; restricted filesystem; limit CPU, RAM, disk, PIDs, output, and duration.
- Default deny outbound network; explicitly controlled network only when justified.
- Do not mount secrets or production credentials.
- Protect against archive traversal, symlinks, decompression bombs, oversized uploads, and path manipulation.
- Separate control plane (API, DB, queue) from runner plane.
- Runner images are pinned, patched, and minimal.
- Cleanup runner, workspace, logs, and temporary artifacts after completion according to retention.
- Test hostile samples and sandbox escape threat scenarios before public beta.
- Consider stronger sandboxing (gVisor, Firecracker, dedicated runner VMs) before handling arbitrary public uploads at scale.
- Treat code, comments, docs, issues, logs, and test output as prompt-injection-capable untrusted data.
- AI agents receive least privilege and cannot issue unrestricted shell/network actions.
- Human approval before patches, GitHub writes, merges, deployments, or destructive actions.

---

## 11. UI Design Rules (light-first)

### Direction
Clean, calm, developer-focused SaaS. Light theme is primary. Avoid dashboard clichés, clutter, huge empty blocks, excessive gradients, glow, glassmorphism, and unnecessary animation.

### Fonts
- **Inter:** all UI, headings, body, forms, tables.
- **JetBrains Mono:** code, logs, file paths, technical IDs.
- Use system fallbacks and optimize font loading.

### Type scale
- Body default 16px.
- 15px is the minimum for normal text/helper/labels; never below 15px except documented code/compact technical exceptions that remain readable.
- H1 32–40px desktop; H2 24–32px; H3 20–24px; body 16px; compact 15px; buttons/labels 15–16px.
- Responsive scaling, paragraph line-height 1.45–1.65, headings 1.2–1.35.

### Palette tokens
- Background `#F7F8FA`
- Surface `#FFFFFF`
- Primary text `#333333`
- Secondary text `#5F6672` (contrast must be checked)
- Border `#E3E7ED`
- Primary `#315FCE`; hover `#244DAE`
- Success `#247A48`; warning `#946200`; error `#B42318`; info `#245C9B`
Use 3–4 identity colors; status colors are semantic. Validate WCAG 2.2 AA contrast; revise tokens if needed.
For dark code panels, near-white text `#F2F4F7`/`#EEEEEE`. Status is never conveyed by color alone.

### Consistency and accessibility
- Spacing based on 4px scale (4, 8, 12, 16, 24, 32, 40, 48, 64).
- Shared heading, section, button, table, badge, card, input, breadcrumb patterns.
- Keyboard accessible, visible focus, 44x44 touch targets where practical, reduced motion.
- Responsive checks at 320, 360, 390, 768, 1024, 1280, 1440px; no page overflow.
- Design all states: empty, loading, success, warning, error, disabled, focus, partial, timeout, cancelled, offline.
- Explain technical terms in plain language; allow expandable advanced evidence.
- Do not use fake progress or fake metrics.

---

## 12. Public Website and SEO Rules

Marketing site sections: Home, Features, How it Works, Supported Checks, Security & Privacy, Pricing (only when defined), Documentation, Contact. Do not fabricate customer logos, testimonials, statistics, certifications, or claims.

- Unique meta title per public page, maximum 60 characters; brand prefix when natural.
- Meta description maximum 150 characters.
- One H1 per page and logical H2/H3 structure.
- Canonicals, sitemap, robots directives, social metadata, favicon, alt text, and accessible link names.
- Authenticated dashboard, scan reports, uploaded code, and private routes must not be publicly accessible or indexable. Robots directives are not security.
- Use clear, non-hype English; avoid keyword stuffing.

---

## 13. Hosting and Deployment

### Shared Linux hosting
Can host built static frontend files only: React/Vite build produces HTML, CSS, JS, assets in `dist/`; upload the build output to the web root. Ensure SPA rewrite rules if routing needs them. It does not normally run the complete Python worker, Docker runner, Redis, or Z3 workflow.

### VPS/backend
Run FastAPI, PostgreSQL, Redis, Celery workers, LangGraph workflow, object storage integration, and isolated runner service on a separate VPS or managed infrastructure. Reverse proxy and TLS; firewall; separate secrets; backups; monitoring.

### Deployment topology
- `app.example.com`: static frontend on shared hosting/CDN.
- `api.example.com`: FastAPI on VPS.
- Private worker network: Celery, Redis, DB; runners isolated from control-plane services.
- Storage: private object bucket.
- Optional later: Kubernetes if multi-node scaling, scheduling, autoscaling, and operational maturity justify it. Do not use Kubernetes just because it is associated with orchestration; LangGraph handles app workflow, Celery distributes jobs, Docker runs isolated tasks, Kubernetes manages deployment infrastructure.

### Deployment deliverables
- Local development Compose file.
- `.env.example`.
- VPS deployment guide.
- Shared hosting upload guide.
- Domain/DNS/TLS guide.
- DB migration and backup/restore procedure.
- Upgrade and rollback plan.
- Health checks and monitoring.

---

## 14. Timeline and Build Phases

Timeline is a planning estimate for a small experienced team, not a guarantee. Validate technical risks first. **Suggested 8–10 week MVP after the initial research/POC**, depending on team size, scope, and security work.

### Phase 0 — Product validation (Week 1)
**Build/perform:** interview 5–10 developers/agencies; select a niche and first use case; obtain sample repositories; agree on data privacy and success metrics.  
**Output:** validated problem statement, first supported use case, success criteria, test repository set.  
**Exit:** stakeholders agree on scope and measurable prototype goal.

### Phase 1 — Technical proof (Weeks 1–2)
**Build:** one Python sample project; 3–5 rules; Z3 models; Pytest runner; Semgrep; known bug fixtures; simple report.  
**Output:** working CLI/backend proof, baseline benchmark, rule limitations.  
**Exit:** known-good and known-bad samples produce expected outcomes; unsupported/unknown statuses handled.

### Phase 2 — Foundation (Weeks 2–3)
**Build:** repo structure, React/Vite UI shell, FastAPI, auth, PostgreSQL, migrations, Redis/Celery, storage, API schemas, logging.  
**Output:** user can sign in, create project, upload safely, create scan job and see job state.  
**Exit:** API/frontend integration tests pass; upload abuse limits verified.

### Phase 3 — Scan engine MVP (Weeks 3–5)
**Build:** language detection, scan plan, runner images, Pytest, Semgrep, dependency audit, normalized findings, artifacts.  
**Output:** real scan results, supported checks matrix, evidence-backed findings.  
**Exit:** repeatable scan on test fixtures; isolation tests; failure and timeout states correctly represented.

### Phase 4 — LangGraph workflow (Weeks 4–6)
**Build:** workflow graph, structured agent outputs, Architect, FormalSpecifier, Verifier, SecurityAuditor; bounded loops, checkpoint, cancellation and recovery. Keep deterministic tools as normal code.  
**Output:** traceable workflow with stored state and stage events.  
**Exit:** graph transitions and retry/stop conditions tested; no infinite loops; cost/time budgets enforced.

### Phase 5 — UX, findings, report (Weeks 5–7)
**Build:** dashboard, project list, scan detail, finding filters, evidence drawer, report export, empty/loading/error states, responsive layouts, accessibility.  
**Output:** user can complete full scan journey and understand results.  
**Exit:** E2E tests for upload → scan → results → report; visual review desktop/mobile.

### Phase 6 — AI explanation and patch review (Weeks 6–8)
**Build:** provider adapter, on-demand explanations, test/rule suggestions, patch generation, diff viewer, approve/reject, re-check.  
**Output:** controlled AI assist and re-test loop.  
**Exit:** provider failures/cost limits handled; patch never auto-applies without approval; regression tests run.

### Phase 7 — GitHub integration (Weeks 7–9, optional MVP)
**Build:** GitHub App, minimum permissions, repo selection, webhooks, status checks on PR. Begin read-only; add write features only after approval.  
**Output:** repository/PR scan workflow.  
**Exit:** signature/replay, duplicate event, revoked permissions, private repository access tests.

### Phase 8 — Beta readiness (Weeks 9–10)
**Build:** quotas, usage accounting, privacy/retention, deletion, backups, monitoring, deployment, support docs, incident response.  
**Output:** controlled beta release.  
**Exit:** restore drill, security review, benchmark, cost report, release checklist, unresolved-risk signoff.

### Later, not MVP
Additional languages/frameworks; team roles; billing; advanced rule library; long-term agent memory; deeper CI/CD; enterprise/private deployments; Kubernetes if justified; stronger sandboxing/runner fleet.

---

## 15. Phase Acceptance and Definition of Done

A phase is not complete merely because screens or code exist. Each phase must:
- Have code committed and documented.
- Have relevant tests executed, with exact results recorded.
- Pass lint/type checks/build for touched modules.
- Have security implications reviewed.
- Have UI states and accessibility checked where relevant.
- Have a list of known limitations and remaining tasks.
- Be reviewed before the next major phase.

Do not invent completion dates. Use the timeline above as an estimate and adjust based on actual progress.

---

## 16. Risks and Mitigation

| Risk | Mitigation / decision |
|---|---|
| False positives and missed bugs | Evidence, benchmark, limitations, not-checked/unknown statuses |
| Incorrect formal rules | Human review, rule tests, versioning, explicit assumptions |
| Unsafe code execution | Isolated disposable runners, resource/network restrictions, stronger isolation evaluation |
| Prompt injection in repo | Treat all repository content as untrusted data; least-privilege agents |
| AI patch regression | Diff approval, re-run affected and regression tests |
| AI/API cost | Usage budgets, selective context, model routing later, per-scan limits |
| Large projects/queue overload | Job quotas, worker scaling, timeouts, concurrency caps |
| Provider outage | Retry with backoff, circuit breaker, graceful non-AI scan mode |
| GitHub permission abuse | GitHub App, minimum permissions, signed webhooks, audit |
| Privacy/trust | Clear data flow, retention, deletion, encryption, no secret logging |
| Overbuilding agents | Start with deterministic workflow and a few agents; add only proven value |
| Weak differentiation | Focus niche, measurable verification evidence, customer validation |

---

## 17. Cost and Usage Controls

Record per scan:
- Model/provider, request count, input/output tokens when available.
- AI spend estimate and provider response time.
- Runner CPU, memory, duration, disk and output volume.
- Queue wait time.
- Scan completion/failure/cancellation.
- Storage/artifact size.

Use budgets: maximum agent iterations, provider calls, tokens, wall-clock time, tool execution time, retries, and concurrency. Avoid unlimited scan plans at launch. Pricing must be decided after cost measurement and beta feedback.

---

## 18. Benchmark and Product Validation

Build a repeatable benchmark set:
- Sample repositories with expected behavior.
- Intentionally introduced bugs for known detection checks.
- Valid and invalid business-rule cases.
- Edge cases, malformed inputs, timeouts, unsupported code.
- Security test fixtures, including malicious archives and hostile project content.

Track:
- True positives / false positives where ground truth exists.
- Known bug detection recall for the benchmark only.
- Rule coverage and checks actually run.
- Scan duration and cost.
- Fix re-check outcome and regressions.
- Beta users’ usefulness feedback and repeat usage.

Do not extrapolate benchmark results to all real-world bugs or all codebases.

---

## 19. Initial Priorities (Do Not Build Everything at Once)

**P0 — prove core value:** one language, 3–5 formalizable rules, test runner, one scanner, evidence report, safe sandbox proof.  
**P1 — usable MVP:** auth, project upload, scan queue, dashboard, findings, history, report export.  
**P2 — AI loop:** explanations, test/rule suggestions, patch diff, approval, re-check.  
**P3 — GitHub:** repository integration, PR checks and webhooks.  
**P4 — commercial and scale:** billing, teams, quotas, additional language support, stronger runner fleet/Kubernetes if needed.

---

## 20. Final Repository Audit Checklist

Create `FINAL_AUDIT_CHECKLIST.md` and complete it at the end. For each item use **Pass / Fail / Partial / Not tested**, include evidence (actual command, screenshot, file, test result), issue, and next action.

### Product / scope
- [ ] First target customer and use case clear
- [ ] MVP scope respected; unsupported promises removed
- [ ] Supported language/tool matrix accurate

### Frontend / UX
- [ ] All routes/screens reviewed
- [ ] Light-first design consistency
- [ ] Inter and JetBrains Mono applied consistently
- [ ] Body 16px; compact text minimum 15px
- [ ] Palette and contrast verified
- [ ] 320px through desktop responsive tests completed
- [ ] No horizontal overflow
- [ ] Keyboard, focus, labels, reduced motion checked
- [ ] All loading, empty, success, error, partial, timeout, cancellation states
- [ ] No dead buttons, placeholder links, fake data in live paths
- [ ] Findings and diff are readable and usable

### Backend / APIs
- [ ] Auth and authorization/tenant ownership checked
- [ ] API schema validation and rate limits
- [ ] Database migrations and rollback reviewed
- [ ] Scan creation idempotency and state transitions
- [ ] Queue retry, cancellation, timeout, recovery
- [ ] SSE events truthful and reconnect behavior
- [ ] AI provider adapter validated and secret-safe
- [ ] GitHub integration permissions/webhooks verified if implemented
- [ ] Report generation and export verified

### Verification
- [ ] Language/framework detection tested
- [ ] Pytest runner tested with valid/invalid samples
- [ ] Semgrep and dependency checks run and normalized
- [ ] Z3 models reviewed, versioned, and tested
- [ ] SAT/UNSAT/unknown/timeout outcomes handled distinctly
- [ ] Findings contain evidence, source, file/line where available
- [ ] Re-check detects fixed/still-failing/regression outcomes

### Security / privacy
- [ ] ZIP path traversal and archive-bomb tests
- [ ] Untrusted code never executes in API process
- [ ] Sandbox limits and network policy tested
- [ ] No privileged container/host socket/secrets
- [ ] Prompt injection from repository files considered
- [ ] SSRF, CORS, CSRF, XSS, auth, IDOR/BOLA checks
- [ ] Webhook signature/replay protection
- [ ] Secrets redacted in logs and reports
- [ ] Retention/deletion verified
- [ ] Data flow and AI-provider disclosure documented
- [ ] Backup restore tested

### Performance / operations / release
- [ ] Build, lint, type checks and tests run
- [ ] Load/queue tests performed at expected beta scale
- [ ] Resource and AI cost budgets enforced
- [ ] Logs/metrics/alerts and health checks
- [ ] Failure/degradation behavior tested
- [ ] Deployment/rollback docs tested
- [ ] Dependency/license review
- [ ] User docs, privacy notice, terms, support process
- [ ] Remaining blockers and risks listed

### Final audit report format
`Item | Status | Evidence | Problem | Fix/Next action`

**Rules:** inspect the entire repo, not just recently edited files. Run checks rather than assuming. Review screenshots at desktop and mobile. Fix critical/high issues before release where feasible. Re-run checks after fixes. If a check cannot be run, mark **Not tested** and explain why. Do not call the product production-ready without evidence and risk signoff.

---

## 21. Instructions for Antigravity

1. Read this blueprint fully and inspect the current repository before coding.
2. Compare current files and architecture against this document; do not overwrite existing work without reviewing it.
3. First produce `PROJECT_ANALYSIS.md`, `ARCHITECTURE.md`, `TECH_STACK_DECISIONS.md`, `ROADMAP.md`, `API_PLAN.md`, `SECURITY_THREAT_MODEL.md`, and `UX_PLAN.md`.
4. Identify contradictions, uncertain assumptions, and high-risk items. Explicitly report them.
5. Do not begin full implementation until the plan and first design direction are presented for review.
6. After approval, implement in phases and keep `TASKS.md` and phase acceptance checklists updated.
7. Build actual working functionality; do not substitute mock data, static fake scan results, or buttons without actions.
8. Keep provider credentials server-side. Use `.env.example` with placeholders only.
9. Before changing files, create a backup/checkpoint and record what will be changed.
10. At the end of each phase, report: files changed, features built, commands/tests actually run, results, limitations, and next phase.
11. At the end of the project, perform the full checklist in Section 20 and create `FINAL_AUDIT_CHECKLIST.md`.
12. Be honest: distinguish implemented, tested, partially tested, not tested, blocked, and planned. Never claim full correctness, complete security, or universal bug detection.

## 22. Source basis and what remains to validate

This blueprint consolidates the supplied team guide and Roman Urdu business plan. The source documents propose the agents, Z3, Pytest/MCP sandbox, GitHub CI/webhooks, memory, and human checkpoints. The business plan recommends a narrow initial customer/use-case focus, a prototype before dashboard expansion, and validation with real developers.

Stack versions, provider selection, runner isolation, supported languages, formal-rule templates, costs, timeline, and deployment design are **engineering recommendations to validate during the prototype**, not confirmed existing capabilities. Product-market fit, detection quality, and production security remain unproven until tested.
