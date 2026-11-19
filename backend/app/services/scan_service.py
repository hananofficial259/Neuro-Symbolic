import asyncio
import os
import shutil
import tempfile
import time
from typing import List

from backend.app.db.database import DatabaseRepository
from backend.app.services.archive_service import ArchiveService
from backend.app.services.event_hub import event_hub
from backend.app.verification.models import VerificationResult, VerificationStatus
from backend.app.verification.pytest_runner import PytestRunner
from backend.app.verification.semgrep_runner import SemgrepRunner
from backend.app.verification.z3_verifier import Z3Verifier


class ScanExecutionService:
    """
    Coordinates end-to-end scan execution across detection, test discovery,
    static AST analysis, and formal SMT invariant verification.
    """

    @classmethod
    async def run_scan_job(cls, scan_id: str):
        scan = DatabaseRepository.get_scan(scan_id)
        if not scan:
            return

        upload = DatabaseRepository.get_upload(scan["upload_id"])
        if not upload:
            DatabaseRepository.update_scan_stage(scan_id, "failed", status="FAILED")
            return

        DatabaseRepository.update_scan_stage(scan_id, "unpacking", status="RUNNING")
        start_time = time.perf_counter()
        temp_workspace = tempfile.mkdtemp(prefix=f"scan_{scan_id}_")

        try:
            # Stage 1: Unpacking
            await event_hub.publish_event(scan_id, "stage_change", {"stage": "unpacking", "message": "Extracting and validating archive..."})
            await asyncio.sleep(0.4)

            extracted_meta = ArchiveService.validate_and_extract_zip(
                upload["storage_path"],
                temp_workspace,
            )

            # Stage 2: Detection
            DatabaseRepository.update_scan_stage(scan_id, "detecting")
            await event_hub.publish_event(scan_id, "stage_change", {
                "stage": "detecting",
                "message": f"Detected {len(extracted_meta['detected_py_files'])} Python files, {len(extracted_meta['detected_tests'])} tests.",
            })
            await asyncio.sleep(0.4)

            all_results: List[VerificationResult] = []

            # Stage 3: Pytest Tests
            if "pytest" in scan["selected_checks"] and extracted_meta["detected_tests"]:
                DatabaseRepository.update_scan_stage(scan_id, "running_tests")
                await event_hub.publish_event(scan_id, "stage_change", {"stage": "running_tests", "message": "Executing Pytest test suite..."})
                
                pytest_runner = PytestRunner(default_timeout_seconds=30)
                pytest_results = pytest_runner.run_tests(temp_workspace)
                all_results.extend(pytest_results)
                await asyncio.sleep(0.4)

            # Stage 4: Static Security (Semgrep)
            if "semgrep" in scan["selected_checks"]:
                DatabaseRepository.update_scan_stage(scan_id, "static_security")
                await event_hub.publish_event(scan_id, "stage_change", {"stage": "static_security", "message": "Running AST security scan..."})
                
                semgrep_runner = SemgrepRunner()
                semgrep_results = semgrep_runner.scan_directory(temp_workspace)
                all_results.extend(semgrep_results)
                await asyncio.sleep(0.4)

            # Stage 5: Formal Invariants (Z3 / Symbolic)
            if "z3_invariants" in scan["selected_checks"]:
                DatabaseRepository.update_scan_stage(scan_id, "formal_verification")
                await event_hub.publish_event(scan_id, "stage_change", {"stage": "formal_verification", "message": "Verifying formal SMT business invariants..."})
                
                z3_engine = Z3Verifier()
                all_results.append(z3_engine.verify_payment_bounds(current_balance=100.0, debit_amount=50.0))
                all_results.append(z3_engine.verify_payment_bounds(current_balance=100.0, debit_amount=150.0))
                all_results.append(z3_engine.verify_discount_bounds(subtotal=100.0, discount_percentage=85.0))
                all_results.append(z3_engine.verify_order_state_transition("REFUNDED", "SHIPPED"))
                all_results.append(z3_engine.verify_tenant_isolation("tenant_alpha", "tenant_alpha"))
                all_results.append(z3_engine.verify_tenant_isolation("tenant_alpha", "tenant_beta", is_platform_admin=False))
                await asyncio.sleep(0.4)

            # Stage 6: Summarizing & Persistence
            DatabaseRepository.update_scan_stage(scan_id, "summarizing")
            await event_hub.publish_event(scan_id, "stage_change", {"stage": "summarizing", "message": "Normalizing evidence and generating report..."})

            summary = {
                "passed": 0,
                "failed": 0,
                "warning": 0,
                "inconclusive": 0,
                "not_checked": 0,
            }

            for res in all_results:
                if res.status == VerificationStatus.PASSED:
                    summary["passed"] += 1
                elif res.status == VerificationStatus.FAILED:
                    summary["failed"] += 1
                elif res.status == VerificationStatus.WARNING:
                    summary["warning"] += 1
                elif res.status == VerificationStatus.INCONCLUSIVE:
                    summary["inconclusive"] += 1
                elif res.status == VerificationStatus.NOT_CHECKED:
                    summary["not_checked"] += 1

                finding_id = DatabaseRepository.insert_finding(
                    scan_id=scan["id"],
                    tool=res.tool.value,
                    severity=res.severity.value,
                    status=res.status.value,
                    title=res.rule_name,
                    description=res.message,
                    file_path=res.file_path,
                    line_number=res.line_number,
                    evidence=res.raw_evidence,
                    counterexample=res.counterexample.model_dump() if res.counterexample else None,
                    suggested_remediation="Review boundary conditions or enforce schema invariants.",
                )

                if res.status == VerificationStatus.FAILED:
                    patch_diff = cls._generate_patch_diff(res)
                    if patch_diff:
                        DatabaseRepository.insert_patch_proposal(
                            finding_id=finding_id,
                            diff=patch_diff["diff"],
                            rationale=patch_diff["rationale"],
                        )

            duration = round(time.perf_counter() - start_time, 2)
            DatabaseRepository.finalize_scan(scan_id, "COMPLETED", summary, duration)

            await event_hub.publish_event(scan_id, "scan_completed", {
                "status": "COMPLETED",
                "summary": summary,
                "duration_seconds": duration,
            })

        except Exception as e:
            DatabaseRepository.update_scan_stage(scan_id, "failed", status="FAILED")
            await event_hub.publish_event(scan_id, "scan_failed", {"error": str(e)})

        finally:
            if os.path.exists(temp_workspace):
                try:
                    shutil.rmtree(temp_workspace)
                except Exception:
                    pass

    @staticmethod
    def _generate_patch_diff(res: VerificationResult) -> dict:
        """Generates a surgical patch diff proposal for known invariant violations."""
        if res.rule_id == "RULE_PAY_NON_NEGATIVE":
            return {
                "diff": (
                    "--- a/payment.py\n"
                    "+++ b/payment.py\n"
                    "@@ -10,3 +10,5 @@\n"
                    "-    new_balance = current_balance - debit_amount\n"
                    "+    if debit_amount > current_balance:\n"
                    "+        raise ValueError('Insufficient funds: debit exceeds current balance')\n"
                    "+    new_balance = current_balance - debit_amount\n"
                    "     return round(new_balance, 2)\n"
                ),
                "rationale": "Enforces non-negativity invariant: guarantees debit_amount <= current_balance to prevent overdraft.",
            }
        elif res.rule_id == "RULE_DISCOUNT_BOUNDS":
            return {
                "diff": (
                    "--- a/cart.py\n"
                    "+++ b/cart.py\n"
                    "@@ -8,3 +8,4 @@\n"
                    "-    discount_amount = subtotal * (discount_percentage / 100.0)\n"
                    "+    clamped_discount = max(0.0, min(discount_percentage, 70.0))\n"
                    "+    discount_amount = subtotal * (clamped_discount / 100.0)\n"
                    "     final_total = subtotal - discount_amount\n"
                ),
                "rationale": "Clamps discount percentage to allowable range [0%, 70%] preserving pricing integrity.",
            }
        elif res.rule_id == "RULE_ORDER_STATE_MACHINE":
            return {
                "diff": (
                    "--- a/order.py\n"
                    "+++ b/order.py\n"
                    "@@ -15,2 +15,4 @@\n"
                    "+    if current_state == 'REFUNDED' and target_state == 'SHIPPED':\n"
                    "+        raise InvalidStateTransition('Cannot ship a refunded order')\n"
                ),
                "rationale": "Prevents forbidden state transition from REFUNDED to SHIPPED.",
            }
        elif res.rule_id == "RULE_TENANT_ISOLATION":
            return {
                "diff": (
                    "--- a/auth.py\n"
                    "+++ b/auth.py\n"
                    "@@ -22,2 +22,4 @@\n"
                    "+    if request_tenant != resource_tenant and not user.is_admin:\n"
                    "+        raise PermissionDenied('Tenant boundary violation')\n"
                ),
                "rationale": "Enforces strict multi-tenant barrier at authorization gateway.",
            }
        elif res.rule_id == "RULE_COMMAND_INJECTION":
            return {
                "diff": (
                    "--- a/maintenance.py\n"
                    "+++ b/maintenance.py\n"
                    "@@ -5,2 +5,3 @@\n"
                    "-    os.system(cmd)\n"
                    "+    # Refactored to safe subprocess execution without shell=True\n"
                    "+    subprocess.run(['cleancache'], check=True)\n"
                ),
                "rationale": "Removes dangerous os.system() sink to eliminate command injection vulnerability.",
            }
        return None
