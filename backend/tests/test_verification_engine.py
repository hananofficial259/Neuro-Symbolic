import os
import pytest
from backend.app.verification.models import VerificationStatus
from backend.app.verification.pytest_runner import PytestRunner
from backend.app.verification.semgrep_runner import SemgrepRunner
from backend.app.verification.z3_verifier import Z3Verifier


def test_z3_verifier_payment():
    verifier = Z3Verifier()

    # Valid debit
    res_pass = verifier.verify_payment_bounds(500.0, 100.0)
    assert res_pass.status == VerificationStatus.PASSED

    # Overdraft attempt
    res_fail = verifier.verify_payment_bounds(50.0, 100.0)
    assert res_fail.status == VerificationStatus.FAILED
    assert res_fail.counterexample is not None
    assert "balance_after" in res_fail.counterexample.variables


def test_z3_verifier_discount():
    verifier = Z3Verifier()

    # Valid 20% discount
    res_pass = verifier.verify_discount_bounds(100.0, 20.0)
    assert res_pass.status == VerificationStatus.PASSED

    # Excessive 80% discount (max 70%)
    res_fail = verifier.verify_discount_bounds(100.0, 80.0)
    assert res_fail.status == VerificationStatus.FAILED
    assert res_fail.counterexample is not None


def test_z3_verifier_order_state():
    verifier = Z3Verifier()

    # Valid transition: CREATED -> PAID
    res_pass = verifier.verify_order_state_transition("CREATED", "PAID")
    assert res_pass.status == VerificationStatus.PASSED

    # Illegal transition: REFUNDED -> SHIPPED
    res_fail = verifier.verify_order_state_transition("REFUNDED", "SHIPPED")
    assert res_fail.status == VerificationStatus.FAILED


def test_z3_verifier_tenant_isolation():
    verifier = Z3Verifier()

    # Valid same-tenant access
    res_pass = verifier.verify_tenant_isolation("tenant_alpha", "tenant_alpha")
    assert res_pass.status == VerificationStatus.PASSED

    # Cross-tenant breach attempt
    res_fail = verifier.verify_tenant_isolation("tenant_alpha", "tenant_beta", is_platform_admin=False)
    assert res_fail.status == VerificationStatus.FAILED


def test_semgrep_runner_catches_os_system():
    scanner = SemgrepRunner()
    current_dir = os.path.dirname(__file__)
    benchmark_dir = os.path.abspath(os.path.join(current_dir, "../../samples/benchmark_store"))

    findings = scanner.scan_directory(benchmark_dir)
    assert len(findings) > 0

    cmd_inj_findings = [f for f in findings if f.rule_id == "RULE_COMMAND_INJECTION"]
    assert len(cmd_inj_findings) == 1
    assert cmd_inj_findings[0].status == VerificationStatus.FAILED
    assert "os.system" in cmd_inj_findings[0].message


def test_pytest_runner_on_benchmark():
    runner = PytestRunner(default_timeout_seconds=30)
    current_dir = os.path.dirname(__file__)
    benchmark_dir = os.path.abspath(os.path.join(current_dir, "../../samples/benchmark_store"))

    results = runner.run_tests(benchmark_dir)
    assert len(results) == 1
    # Because test_overdraft_assertion_fails_on_bug intentionally fails on the unpatched bug:
    assert results[0].status == VerificationStatus.FAILED
    assert "failed" in results[0].raw_evidence.lower()
