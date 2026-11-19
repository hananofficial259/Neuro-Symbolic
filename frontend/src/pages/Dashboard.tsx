import React, { useEffect, useState } from 'react';
import { Project, Scan } from '../types';
import { fetchProjects } from '../api/client';
import { ShieldCheck, Plus, FolderGit2, CheckCircle2, AlertTriangle, Play, Sparkles } from 'lucide-react';

interface DashboardProps {
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
  onRunDemoScan: () => void;
  isStartingDemo: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNewProject,
  onSelectProject,
  onRunDemoScan,
  isStartingDemo,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Independent Verification Gate</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-main tracking-tight">
            Deterministic Code Verification & SMT Invariants
          </h2>
          <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed">
            AI proposes patches; mathematical proofs (Z3), unit suites (Pytest), and static analysis (Semgrep) prove correctness with counterexample evidence.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onRunDemoScan}
            disabled={isStartingDemo}
            className="inline-flex items-center space-x-2 bg-canvas border border-subtle hover:border-brand text-main hover:text-brand px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-xs disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-brand" />
            <span>{isStartingDemo ? 'Starting Scan...' : 'Run Benchmark Demo'}</span>
          </button>

          <button
            onClick={onNewProject}
            className="inline-flex items-center space-x-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Archive</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-subtle rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Active Projects</span>
          <div className="text-2xl font-bold text-main mt-1">{projects.length}</div>
          <span className="text-xs text-muted mt-0.5 block">Configured repositories</span>
        </div>

        <div className="bg-surface border border-subtle rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-pass uppercase tracking-wider">SMT Solvers</span>
          <div className="text-2xl font-bold text-pass mt-1">Z3 4.13+</div>
          <span className="text-xs text-muted mt-0.5 block">First-order logic proofs</span>
        </div>

        <div className="bg-surface border border-subtle rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-brand uppercase tracking-wider">Test Discovery</span>
          <div className="text-2xl font-bold text-brand mt-1">Pytest 8</div>
          <span className="text-xs text-muted mt-0.5 block">Automated execution sandbox</span>
        </div>

        <div className="bg-surface border border-subtle rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-fail uppercase tracking-wider">Security Gate</span>
          <div className="text-2xl font-bold text-fail mt-1">Semgrep AST</div>
          <span className="text-xs text-muted mt-0.5 block">OWASP Top 10 Python sinks</span>
        </div>
      </div>

      {/* Project Repositories List */}
      <div className="bg-surface border border-subtle rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-subtle flex items-center justify-between bg-canvas/30">
          <div>
            <h3 className="text-base font-bold text-main">Scanned Projects & Repositories</h3>
            <p className="text-xs text-muted mt-0.5">Click any project to inspect scan evidence and diff proposals.</p>
          </div>
        </div>

        <div className="divide-y divide-subtle">
          {loading ? (
            <div className="p-8 text-center text-muted">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center text-muted">
              <FolderGit2 className="w-10 h-10 text-muted/40 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-main mb-1">No Projects Scanned Yet</h4>
              <p className="text-xs text-muted mb-4 max-w-sm mx-auto">
                Upload a Python ZIP archive or click 'Run Benchmark Demo' above to verify checkout payment invariants.
              </p>
              <button
                onClick={onRunDemoScan}
                disabled={isStartingDemo}
                className="bg-brand text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-brand-hover inline-flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Benchmark Verification</span>
              </button>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="p-5 hover:bg-canvas/50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-main hover:text-brand transition-colors">
                      {proj.name}
                    </h4>
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">
                      {proj.description || 'Python business logic invariants & test discovery'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-xs font-mono text-muted">
                    {new Date(proj.created_at).toLocaleDateString()}
                  </span>
                  <button className="text-xs bg-canvas border border-subtle px-3 py-1.5 rounded text-main hover:border-brand hover:text-brand font-medium transition-colors">
                    View Scans &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
