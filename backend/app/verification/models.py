from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VerificationStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    WARNING = "WARNING"
    NOT_CHECKED = "NOT_CHECKED"
    INCONCLUSIVE = "INCONCLUSIVE"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class ToolSource(str, Enum):
    Z3 = "Z3"
    PYTEST = "PYTEST"
    SEMGREP = "SEMGREP"
    PIP_AUDIT = "PIP_AUDIT"


class CounterExample(BaseModel):
    variables: Dict[str, Any] = Field(default_factory=dict)
    description: str = ""
    violating_condition: str = ""


class InvariantRule(BaseModel):
    rule_id: str
    name: str
    category: str
    description: str
    assumptions: List[str] = Field(default_factory=list)
    parameters: Dict[str, Any] = Field(default_factory=dict)


class VerificationResult(BaseModel):
    check_id: str
    rule_id: Optional[str] = None
    rule_name: str
    category: str
    tool: ToolSource
    status: VerificationStatus
    severity: Severity = Severity.MEDIUM
    message: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    counterexample: Optional[CounterExample] = None
    duration_ms: float = 0.0
    raw_evidence: Optional[str] = None


class Finding(BaseModel):
    id: str
    scan_id: str
    tool: ToolSource
    severity: Severity
    status: VerificationStatus
    title: str
    description: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    evidence: Optional[str] = None
    counterexample: Optional[Dict[str, Any]] = None
    suggested_remediation: Optional[str] = None
    created_at: Optional[str] = None
