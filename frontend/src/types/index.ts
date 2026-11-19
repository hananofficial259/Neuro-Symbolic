export type VerificationStatus = 'PASSED' | 'FAILED' | 'WARNING' | 'NOT_CHECKED' | 'INCONCLUSIVE';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type ToolSource = 'Z3' | 'PYTEST' | 'SEMGREP' | 'PIP_AUDIT';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Upload {
  upload_id: string;
  project_id: string;
  filename: string;
  file_size_bytes: number;
  detected_language: string;
  detected_framework: string;
  detected_tests: string[];
  supported_checks: string[];
}

export interface Scan {
  id: string;
  project_id: string;
  upload_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  current_stage: string;
  selected_checks: string[];
  summary_counts: {
    passed: number;
    failed: number;
    warning: number;
    inconclusive: number;
    not_checked: number;
  };
  duration_seconds: number;
  created_at: string;
  completed_at?: string;
}

export interface Finding {
  id: string;
  scan_id: string;
  tool: string;
  severity: Severity;
  status: VerificationStatus;
  title: string;
  description: string;
  file_path?: string;
  line_number?: number;
  evidence?: string;
  counterexample?: Record<string, any>;
  suggested_remediation?: string;
  created_at: string;
}

export interface PatchProposal {
  id: string;
  finding_id: string;
  diff: string;
  rationale: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  created_at: string;
}

export interface StageEvent {
  stage: string;
  message?: string;
  status?: string;
  summary?: Record<string, number>;
  duration_seconds?: number;
}
