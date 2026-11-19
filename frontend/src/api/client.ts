import { Finding, PatchProposal, Project, Scan, Upload } from '../types';

const API_BASE = '/api/v1';

export async function launchBenchmarkScan(): Promise<{ project_id: string; scan_id: string }> {
  const res = await fetch(`${API_BASE}/demo/benchmark-scan`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to launch benchmark scan');
  return res.json();
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export async function createProject(name: string, description?: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function uploadArchive(projectId: string, file: File): Promise<Upload> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/projects/${projectId}/uploads`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Archive upload failed');
  }
  return res.json();
}

export async function triggerScan(
  projectId: string,
  uploadId: string,
  selectedChecks: string[] = ['pytest', 'semgrep', 'z3_invariants']
): Promise<Scan> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_id: uploadId, selected_checks: selectedChecks }),
  });
  if (!res.ok) throw new Error('Failed to schedule scan');
  return res.json();
}

export async function fetchScan(scanId: string): Promise<Scan> {
  const res = await fetch(`${API_BASE}/scans/${scanId}`);
  if (!res.ok) throw new Error('Failed to fetch scan');
  return res.json();
}

export async function fetchFindings(scanId: string, filters?: { status?: string; tool?: string; severity?: string }): Promise<Finding[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.tool) params.append('tool', filters.tool);
  if (filters?.severity) params.append('severity', filters.severity);

  const url = `${API_BASE}/scans/${scanId}/findings?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch findings');
  return res.json();
}

export async function fetchFinding(findingId: string): Promise<Finding> {
  const res = await fetch(`${API_BASE}/findings/${findingId}`);
  if (!res.ok) throw new Error('Failed to fetch finding');
  return res.json();
}

export async function fetchPatches(findingId: string): Promise<PatchProposal[]> {
  const res = await fetch(`${API_BASE}/findings/${findingId}/patches`);
  if (!res.ok) throw new Error('Failed to fetch patch proposals');
  return res.json();
}

export async function decidePatch(patchId: string, confirmed: boolean): Promise<PatchProposal> {
  const res = await fetch(`${API_BASE}/patches/${patchId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmed }),
  });
  if (!res.ok) throw new Error('Failed to update patch decision');
  return res.json();
}

export async function fetchFindingExplanation(findingId: string): Promise<{ explanation: string }> {
  const res = await fetch(`${API_BASE}/findings/${findingId}/explanations`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to fetch AI explanation');
  return res.json();
}

export async function fetchReport(scanId: string, format: 'json' | 'markdown' = 'markdown'): Promise<string> {
  const res = await fetch(`${API_BASE}/reports/${scanId}?format=${format}`);
  if (!res.ok) throw new Error('Failed to fetch report');
  return res.text();
}
