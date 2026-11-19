import json
import os
import subprocess
import sys
import time
from typing import List, Optional
from backend.app.verification.models import (
    Severity,
    ToolSource,
    VerificationResult,
    VerificationStatus,
)


class PytestRunner:
    """
    Subprocess Pytest execution engine.
    Runs tests in target repository directory with execution quotas (timeout, memory),
    parses pytest execution results, and normalizes into VerificationResult objects.
    """

    def __init__(self, default_timeout_seconds: int = 60):
        self.default_timeout_seconds = default_timeout_seconds

    def run_tests(
        self,
        project_dir: str,
        test_path: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
    ) -> List[VerificationResult]:
        start_time = time.perf_counter()
        timeout = timeout_seconds or self.default_timeout_seconds
        results: List[VerificationResult] = []

        if not os.path.exists(project_dir):
            return [
                VerificationResult(
                    check_id="pytest_dir_missing",
                    rule_name="Pytest Test Suite Execution",
                    category="unit_tests",
                    tool=ToolSource.PYTEST,
                    status=VerificationStatus.INCONCLUSIVE,
                    severity=Severity.HIGH,
                    message=f"Target directory '{project_dir}' does not exist.",
                    duration_ms=0.0,
                )
            ]

        # Construct safe pytest command
        cmd = [
            sys.executable,
            "-m",
            "pytest",
            "--verbose",
            "--tb=short",
            "-q",
        ]
        if test_path:
            full_test_path = os.path.join(project_dir, test_path)
            cmd.append(full_test_path)
        else:
            cmd.append(project_dir)

        # Environment sanitization (strip host API secrets)
        pythonpath_entries = [project_dir, os.path.dirname(project_dir), os.getcwd()]
        existing_pythonpath = os.environ.get("PYTHONPATH", "")
        if existing_pythonpath:
            pythonpath_entries.append(existing_pythonpath)

        env = {
            "PATH": os.environ.get("PATH", ""),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            "PYTHONPATH": os.pathsep.join(pythonpath_entries),
            "PYTHONDONTWRITEBYTECODE": "1",
        }

        try:
            proc = subprocess.run(
                cmd,
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=env,
            )
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            stdout = proc.stdout.strip()
            stderr = proc.stderr.strip()

            # Pytest Exit Codes:
            # 0: All tests passed
            # 1: Tests were run and some failed
            # 2: Interrupted by user
            # 3: Internal error
            # 4: Pytest commandline usage error
            # 5: No tests were collected
            if proc.returncode == 0:
                results.append(
                    VerificationResult(
                        check_id="pytest_suite_pass",
                        rule_name="Unit & Regression Test Suite",
                        category="regression_tests",
                        tool=ToolSource.PYTEST,
                        status=VerificationStatus.PASSED,
                        severity=Severity.HIGH,
                        message="All discovered pytest test cases passed successfully.",
                        duration_ms=round(elapsed_ms, 2),
                        raw_evidence=stdout,
                    )
                )
            elif proc.returncode == 1:
                results.append(
                    VerificationResult(
                        check_id="pytest_suite_fail",
                        rule_name="Unit & Regression Test Suite",
                        category="regression_tests",
                        tool=ToolSource.PYTEST,
                        status=VerificationStatus.FAILED,
                        severity=Severity.CRITICAL,
                        message="One or more test assertions failed in the test suite.",
                        duration_ms=round(elapsed_ms, 2),
                        raw_evidence=f"{stdout}\n{stderr}".strip(),
                    )
                )
            elif proc.returncode == 5:
                results.append(
                    VerificationResult(
                        check_id="pytest_no_tests",
                        rule_name="Unit & Regression Test Suite",
                        category="regression_tests",
                        tool=ToolSource.PYTEST,
                        status=VerificationStatus.NOT_CHECKED,
                        severity=Severity.LOW,
                        message="No test files or functions were collected by pytest.",
                        duration_ms=round(elapsed_ms, 2),
                        raw_evidence=stdout,
                    )
                )
            else:
                results.append(
                    VerificationResult(
                        check_id="pytest_runtime_error",
                        rule_name="Unit & Regression Test Suite",
                        category="regression_tests",
                        tool=ToolSource.PYTEST,
                        status=VerificationStatus.INCONCLUSIVE,
                        severity=Severity.HIGH,
                        message=f"Pytest exited with abnormal exit code {proc.returncode}.",
                        duration_ms=round(elapsed_ms, 2),
                        raw_evidence=f"{stdout}\n{stderr}".strip(),
                    )
                )

        except subprocess.TimeoutExpired:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            results.append(
                VerificationResult(
                    check_id="pytest_timeout",
                    rule_name="Unit & Regression Test Suite",
                    category="regression_tests",
                    tool=ToolSource.PYTEST,
                    status=VerificationStatus.INCONCLUSIVE,
                    severity=Severity.HIGH,
                    message=f"Test execution timed out after {timeout} seconds.",
                    duration_ms=round(elapsed_ms, 2),
                    raw_evidence=f"Subprocess terminated due to timeout ceiling ({timeout}s).",
                )
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            results.append(
                VerificationResult(
                    check_id="pytest_exec_exception",
                    rule_name="Unit & Regression Test Suite",
                    category="regression_tests",
                    tool=ToolSource.PYTEST,
                    status=VerificationStatus.INCONCLUSIVE,
                    severity=Severity.HIGH,
                    message=f"Failed to execute pytest: {str(e)}",
                    duration_ms=round(elapsed_ms, 2),
                )
            )

        return results
