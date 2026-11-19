import React, { useState } from 'react';
import { Finding } from '../types';
import { AlertTriangle, CheckCircle2, XCircle, HelpCircle, FileCode, ArrowRight, ShieldAlert } from 'lucide-react';

interface FindingsTableProps {
  findings: Finding[];
  onSelectFinding: (finding: Finding) => void;
  onReviewPatch: (finding: Finding) => void;
}

export const FindingsTable: React.FC<FindingsTableProps> = ({
  findings,
  onSelectFinding,
  onReviewPatch,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toolFilter, setToolFilter] = useState<string>('ALL');

  const filtered = findings.filter((f) => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    if (toolFilter !== 'ALL' && f.tool !== toolFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pass-bg text-pass border border-pass/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>PASSED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-fail-bg text-fail border border-fail/30">
            <XCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warn-bg text-warn border border-warn/30">
            <AlertTriangle className="w-3 h-3" />
            <span>WARNING</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-inconclusive-bg text-inconclusive border border-inconclusive/30">
            <HelpCircle className="w-3 h-3" />
            <span>INCONCLUSIVE</span>
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: string) => {
    const map: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-blue-100 text-blue-800 border-blue-200',
      INFO: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
      <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${map[sev] || 'bg-gray-100 text-gray-800'}`}>
        {sev}
      </span>
    );
  };

  return (
    <div className="bg-surface border border-subtle rounded-lg shadow-xs overflow-hidden">
      {/* Filters bar */}
      <div className="p-4 border-b border-subtle flex flex-wrap items-center justify-between gap-3 bg-canvas/40">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Filters:</span>
          {['ALL', 'FAILED', 'PASSED', 'WARNING', 'INCONCLUSIVE'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === s
                  ? 'bg-brand text-white font-medium'
                  : 'bg-surface border border-subtle text-muted hover:text-main'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted">Tool:</span>
          {['ALL', 'Z3', 'PYTEST', 'SEMGREP'].map((t) => (
            <button
              key={t}
              onClick={() => setToolFilter(t)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                toolFilter === t
                  ? 'bg-main text-white font-medium'
                  : 'bg-surface border border-subtle text-muted hover:text-main'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle bg-canvas/20 text-xs font-semibold text-muted uppercase tracking-wider">
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Rule / Finding Title</th>
              <th className="py-3 px-4">Tool</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted">
                  <ShieldAlert className="w-8 h-8 text-muted/40 mx-auto mb-2" />
                  <p className="text-sm font-medium">No findings match the selected criteria.</p>
                </td>
              </tr>
            ) : (
              filtered.map((finding) => (
                <tr key={finding.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(finding.status)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-main">{finding.title}</div>
                    <div className="text-xs text-muted mt-0.5 line-clamp-1">{finding.description}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center text-xs font-mono font-medium text-muted bg-canvas px-2 py-0.5 rounded border border-subtle">
                      {finding.tool}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-muted">
                    {finding.file_path ? (
                      <span className="flex items-center space-x-1">
                        <FileCode className="w-3.5 h-3.5 text-muted/70" />
                        <span>{finding.file_path}:{finding.line_number || ''}</span>
                      </span>
                    ) : (
                      <span className="text-muted/50">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getSeverityBadge(finding.severity)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                    <button
                      onClick={() => onSelectFinding(finding)}
                      className="text-xs text-brand hover:text-brand-hover font-medium underline inline-flex items-center gap-1"
                    >
                      <span>Evidence</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    {finding.status === 'FAILED' && (
                      <button
                        onClick={() => onReviewPatch(finding)}
                        className="text-xs bg-brand text-white px-2 py-1 rounded hover:bg-brand-hover font-medium transition-colors"
                      >
                        Patch
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
