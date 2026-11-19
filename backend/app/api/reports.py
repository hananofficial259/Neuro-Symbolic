from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse

from backend.app.db.database import DatabaseRepository

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/{scan_id}")
async def get_scan_report(
    scan_id: str,
    format: str = Query("json", pattern="^(json|markdown)$"),
):
    scan = DatabaseRepository.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    project = DatabaseRepository.get_project(scan["project_id"])
    findings = DatabaseRepository.list_findings(scan_id)

    if format == "json":
        return {
            "report_id": f"REP_{scan['id']}",
            "project_name": project["name"] if project else "Unknown",
            "scan_id": scan["id"],
            "status": scan["status"],
            "duration_seconds": scan["duration_seconds"],
            "created_at": str(scan["created_at"]),
            "completed_at": str(scan.get("completed_at")),
            "summary_counts": scan["summary_counts"],
            "findings_count": len(findings),
            "findings": findings,
        }

    # Markdown format
    md_lines = [
        f"# Neuro-Symbolic Verification Report: {project['name'] if project else 'Project'}",
        f"**Scan ID:** `{scan['id']}`  ",
        f"**Status:** `{scan['status']}`  ",
        f"**Execution Duration:** {scan['duration_seconds']:.2f} seconds  ",
        f"**Timestamp:** {scan['created_at']}  \n",
        "## Summary",
        f"- **Passed:** {scan['summary_counts'].get('passed', 0)}",
        f"- **Failed:** {scan['summary_counts'].get('failed', 0)}",
        f"- **Warning:** {scan['summary_counts'].get('warning', 0)}",
        f"- **Inconclusive:** {scan['summary_counts'].get('inconclusive', 0)}",
        f"- **Not Checked:** {scan['summary_counts'].get('not_checked', 0)}\n",
        "## Verification Findings & Evidence",
    ]

    for idx, f in enumerate(findings, 1):
        md_lines.append(f"### {idx}. [{f['status']}] {f['title']}")
        md_lines.append(f"- **Severity:** `{f['severity']}` | **Tool:** `{f['tool']}`")
        if f.get("file_path"):
            md_lines.append(f"- **Location:** `{f['file_path']}:{f.get('line_number') or ''}`")
        md_lines.append(f"- **Details:** {f['description']}")
        if f.get("counterexample"):
            md_lines.append(f"- **Counterexample:** `{f['counterexample']}`")
        if f.get("evidence"):
            md_lines.append(f"```text\n{f['evidence']}\n```")
        md_lines.append("")

    return PlainTextResponse("\n".join(md_lines), media_type="text/markdown")
