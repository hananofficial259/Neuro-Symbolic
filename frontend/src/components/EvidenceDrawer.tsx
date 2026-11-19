import React, { useState } from 'react';
import { Finding } from '../types';
import { X, Sparkles, Terminal, FileCode, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { fetchFindingExplanation } from '../api/client';

interface EvidenceDrawerProps {
  finding: Finding | null;
  onClose: () => void;
  onReviewPatch: (finding: Finding) => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ finding, onClose, onReviewPatch }) => {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  if (!finding) return null;

  const handleFetchAi = async () => {
    try {
      setLoadingAi(true);
      const res = await fetchFindingExplanation(finding.id);
      setAiExplanation(res.explanation);
    } catch (err) {
      setAiExplanation('Failed to fetch AI explanation. Please verify server connection.');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-main/30 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-surface h-full shadow-2xl border-l border-subtle flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-subtle flex items-start justify-between bg-canvas/30">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-canvas border border-subtle text-muted">
                {finding.tool}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                finding.status === 'PASSED'
                  ? 'bg-pass-bg text-pass border-pass/30'
                  : 'bg-fail-bg text-fail border-fail/30'
              }`}>
                {finding.status}
              </span>
              <span className="text-xs font-mono text-muted uppercase">
                Severity: {finding.severity}
              </span>
            </div>
            <h2 className="text-lg font-bold text-main">{finding.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-canvas text-muted hover:text-main transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* File location */}
          {finding.file_path && (
            <div className="flex items-center space-x-2 text-xs font-mono bg-canvas p-2.5 rounded-md border border-subtle text-muted">
              <FileCode className="w-4 h-4 text-brand" />
              <span>{finding.file_path}:{finding.line_number || '1'}</span>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Description</h4>
            <p className="text-sm text-main leading-relaxed bg-surface p-3 rounded-md border border-subtle">
              {finding.description}
            </p>
          </div>

          {/* SMT Counterexample */}
          {finding.counterexample && (
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <Terminal className="w-4 h-4 text-brand" />
                <h4 className="text-xs font-semibold text-main uppercase tracking-wider">
                  SMT Solver Counterexample Model
                </h4>
              </div>
              <div className="bg-terminal-bg text-terminal-text rounded-md p-3.5 font-mono text-xs border border-subtle overflow-x-auto shadow-inner">
                <div className="text-muted text-[11px] mb-2">// Mathematical proof violation assignments:</div>
                <pre>{JSON.stringify(finding.counterexample, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Raw Diagnostic Evidence */}
          {finding.evidence && (
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Tool Diagnostic Evidence
              </h4>
              <pre className="bg-terminal-bg text-terminal-text p-3 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
                {finding.evidence}
              </pre>
            </div>
          )}

          {/* AI Explanation Box */}
          <div className="bg-brand/5 border border-brand/20 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-brand text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>AI Invariant Diagnostic</span>
              </div>
              {!aiExplanation && (
                <button
                  onClick={handleFetchAi}
                  disabled={loadingAi}
                  className="text-xs bg-brand text-white px-2.5 py-1 rounded hover:bg-brand-hover font-medium transition-colors"
                >
                  {loadingAi ? 'Analyzing...' : 'Generate Explanation'}
                </button>
              )}
            </div>

            {aiExplanation ? (
              <div className="text-xs text-main leading-relaxed whitespace-pre-wrap bg-surface p-3 rounded border border-subtle">
                {aiExplanation}
              </div>
            ) : (
              <p className="text-xs text-muted">
                Click above to generate an on-demand mathematical root-cause explanation and remediation guide.
              </p>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-subtle bg-canvas/30 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-subtle rounded-md text-sm font-medium text-muted hover:text-main bg-surface transition-colors"
          >
            Close
          </button>

          {finding.status === 'FAILED' && (
            <button
              onClick={() => {
                onClose();
                onReviewPatch(finding);
              }}
              className="px-4 py-2 bg-brand text-white rounded-md text-sm font-medium hover:bg-brand-hover transition-colors inline-flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review Surgical Patch</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
