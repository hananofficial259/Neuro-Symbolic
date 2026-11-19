from typing import List
from fastapi import APIRouter, HTTPException, status

from backend.app.db.database import DatabaseRepository
from backend.app.schemas.scan import PatchDecisionRequest, PatchProposalResponse

router = APIRouter(tags=["Patches & Explanations"])


@router.get("/findings/{finding_id}/patches", response_model=List[PatchProposalResponse])
async def list_patches_for_finding(finding_id: str):
    return DatabaseRepository.list_patches_for_finding(finding_id)


@router.post("/patches/{patch_id}/decision", response_model=PatchProposalResponse)
async def decide_patch_proposal(
    patch_id: str,
    payload: PatchDecisionRequest,
):
    patch = DatabaseRepository.decide_patch(patch_id, payload.confirmed)
    if not patch:
        raise HTTPException(status_code=404, detail="Patch proposal not found")
    return patch


@router.post("/findings/{finding_id}/explanations")
async def get_ai_finding_explanation(finding_id: str):
    finding = DatabaseRepository.get_finding(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    explanation_markdown = (
        f"### Diagnostic Breakdown: {finding['title']}\n\n"
        f"**Severity:** `{finding['severity']}` | **Source:** `{finding['tool']}`\n\n"
        f"#### Problem Statement\n"
        f"{finding['description']}\n\n"
        f"#### Mathematical / Symbolic Grounding\n"
        f"The verification engine detected an invariant violation. "
    )

    if finding.get("counterexample"):
        explanation_markdown += (
            f"Specifically, under the counterexample:\n"
            f"```json\n{finding['counterexample']}\n```\n"
            f"the safety assertions fail to hold, which could lead to runtime exceptions or security boundary degradation.\n\n"
        )
    else:
        explanation_markdown += "Static analysis detected that untrusted input reaches an execution sink.\n\n"

    explanation_markdown += (
        f"#### Recommended Remediation\n"
        f"1. Validate input variables against strict boundary limits before performing operations.\n"
        f"2. Enforce schema preconditions and handle edge-case returns.\n"
        f"3. Review the surgical patch proposal in the Diff Review panel before approving."
    )

    return {
        "finding_id": finding_id,
        "title": finding["title"],
        "explanation": explanation_markdown,
    }
