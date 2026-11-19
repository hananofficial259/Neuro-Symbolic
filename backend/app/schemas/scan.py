from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ScanCreate(BaseModel):
    upload_id: str
    selected_checks: List[str] = Field(default=["pytest", "semgrep", "z3_invariants"])
    rule_categories: List[str] = Field(default=["payment_limits", "discount_bounds", "state_transitions", "tenant_isolation"])


class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    scan_id: str
    tool: str
    severity: str
    status: str
    title: str
    description: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    evidence: Optional[str] = None
    counterexample: Optional[Dict[str, Any]] = None
    suggested_remediation: Optional[str] = None
    created_at: str


class ScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    upload_id: str
    status: str
    current_stage: str
    selected_checks: List[str]
    summary_counts: Dict[str, int]
    duration_seconds: float
    created_at: str
    completed_at: Optional[str] = None


class PatchProposalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    finding_id: str
    diff: str
    rationale: str
    status: str
    created_at: str


class PatchDecisionRequest(BaseModel):
    confirmed: bool
    rejection_reason: Optional[str] = None
