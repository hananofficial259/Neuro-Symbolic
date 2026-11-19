# Neuro-Symbolic Software Foundry — UX & Design System Specification

**Document Version:** 1.0.0  
**Status:** Approved Architectural Blueprint Baseline  
**Workspace:** `C:\Users\Hanan\OneDrive\Desktop\n`

---

## 1. Design Direction & Aesthetic Philosophy

The platform user experience is **clean, calm, and developer-focused**. It deliberately avoids dashboard clichés: no gratuitous glowing gradients, no glassmorphism, no fake animated dials, and no deceptive percentage progress bars.

- **Theme Mode:** Light-first SaaS as primary. Dark mode code panels are isolated to logs, diffs, and AST/SMT formula views.
- **Tone:** Technical, precise, transparent, trustworthy.

---

## 2. Design Tokens & Palette

### 2.1 Color Tokens (WCAG 2.2 AA Verified)
- **App Background:** `#F7F8FA` (subtle off-white slate)
- **Card / Surface Background:** `#FFFFFF`
- **Primary Text:** `#333333` (contrast ratio 12.6:1 against white)
- **Secondary / Helper Text:** `#5F6672` (contrast ratio 5.1:1 against white; meets AA 4.5:1 standard)
- **Subtle Border:** `#E3E7ED`
- **Primary Accent:** `#315FCE` | Hover: `#244DAE`
- **Dark Code Surface:** `#1E222B` | Code Text: `#F2F4F7`

### 2.2 Semantic Status Tokens
| Semantic Role | Token Hex | Background Tint | Meaning & Usage |
| :--- | :--- | :--- | :--- |
| **Passed / Verified** | `#247A48` | `#EBF6EE` | Deterministic proof passed or clean test suite. |
| **Failed / Violation** | `#B42318` | `#FEF3F2` | Invariant broken, test failed, or vulnerability found. |
| **Warning / Review** | `#946200` | `#FEF7EB` | Deprecated dependency, lint anomaly, or boundary edge. |
| **Inconclusive** | `#245C9B` | `#EEF4FC` | Tool timeout, unresolvable AST, solver `unknown`. |
| **Not Checked** | `#5F6672` | `#F2F4F7` | Out of scan scope or unconfigured check. |

*Rule:* Status is never conveyed by color alone. Every badge includes an icon and clear uppercase label (e.g. `[FAILED]`, `[PASSED]`, `[INCONCLUSIVE]`).

---

## 3. Typography & Spacing System

### 3.1 Font Families
- **UI & Prose Font:** `Inter`, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Monospace Code Font:** `JetBrains Mono`, "SFMono-Regular", Consolas, "Liberation Mono", monospace.

### 3.2 Type Scale
- **H1 (Page Title):** Desktop 32px–40px (Bold / 700), Line-height 1.2.
- **H2 (Section Header):** 24px–28px (SemiBold / 600), Line-height 1.3.
- **H3 (Card Header):** 20px–22px (Medium / 500), Line-height 1.35.
- **Body Text (Default):** 16px (Regular / 400), Line-height 1.55.
- **Compact Text (Labels / Meta):** 15px minimum. (Never below 15px except documented code annotations).
- **Code Snippets:** 14px–15px (JetBrains Mono).

### 3.3 4px Spacing Scale
All margins, paddings, and layout gaps adhere strictly to multiples of 4px:  
`4px (0.25rem)`, `8px (0.5rem)`, `12px (0.75rem)`, `16px (1rem)`, `24px (1.5rem)`, `32px (2rem)`, `48px (3rem)`, `64px (4rem)`.

---

## 4. Key Workflows & Component Specifications

### 4.1 Project ZIP Upload Flow
- Dropzone supporting drag-and-drop `.zip` files.
- Client pre-flight checks: file size check (<50MB) and extension validation.
- Upload progress bar backed by actual bytes transmitted (no artificial pauses).
- Automatic extraction preview: detected language runtime, framework, and discovered test scripts.

### 4.2 Truthful Live Scan Stage Stepper
Instead of synthetic percentage counters, the scan progress displays an authentic multi-stage timeline:
1. `Queued` -> In worker queue waiting for slot.
2. `Unpacking` -> Validating archive and extracting to sandbox.
3. `Detecting` -> Parsing manifests (`pyproject.toml`, test structure).
4. `Running Tests` -> Pytest executing in isolated container.
5. `Static Security` -> Semgrep & pip-audit scanning dependencies.
6. `Formal Verification` -> Z3 checking invariant models.
7. `Summarizing` -> Generating structured report and normalizing findings.

### 4.3 Findings Matrix & Evidence Drawer
- Filter controls: Filter by Severity (`Critical`, `High`, `Medium`, `Low`, `Info`), Tool (`Z3`, `Pytest`, `Semgrep`, `pip-audit`), and Invariant Rule.
- Finding row: Displays tool badge, file path with line number (e.g. `billing/calculator.py:42`), short title, and severity pill.
- Slide-out Evidence Drawer:
  - Full diagnostic output safely rendered.
  - SMT Counterexample panel: Exact variable values that violate the invariant (e.g. `subtotal = 50.00`, `discount = 75.00`, `resulting_balance = -25.00`).
  - Action buttons: "Explain with AI" and "Propose Patch".

### 4.4 Side-by-Side Patch Diff Review
- Unified or split diff viewer rendered in JetBrains Mono.
- Red highlighting for deleted lines; green highlighting for additions.
- AI Rationale card explaining why the change preserves invariants without side effects.
- Strict action buttons:
  - Primary button: `Approve & Re-Verify` (Triggers targeted re-run).
  - Secondary button: `Reject Proposal` (Leaves original code intact).

---

## 5. Comprehensive State Matrix

Every view is designed with explicit support for all 10 system states:
1. **Empty State:** Friendly guidance explaining how to upload a repository or configure initial rules.
2. **Loading State:** Skeleton loaders maintaining layout dimensions without layout shift.
3. **Success State:** Clear visual confirmation with actionable next steps.
4. **Warning State:** Non-fatal advisories (e.g., outdated dependency found) highlighted with amber indicators.
5. **Error State:** Human-readable explanations, error codes, and a "Retry" or "Contact Support" trigger.
6. **Partial State:** Partial scan results when some checks passed and others timed out.
7. **Timeout State:** Clear indication that a runner step exceeded its time limit, marked as `Inconclusive`.
8. **Cancelled State:** Scan terminated by user action with preserved partial artifacts.
9. **Focus State:** High-contrast 2px outline for all keyboard navigation (`focus-visible`).
10. **Offline State:** Unobtrusive banner alerting that real-time SSE stream is disconnected and attempting reconnect.
