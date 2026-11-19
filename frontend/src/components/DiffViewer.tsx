import React, { useEffect, useState } from 'react';
import { Finding, PatchProposal } from '../types';
import { fetchPatches, decidePatch } from '../api/client';
import { X, Check, XCircle, FileCode, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface DiffViewerProps {
  finding: Finding | null;
  onClose: () => void;
  onPatchApproved: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ finding, onClose, onPatchApproved }) => {
  const [patches, setPatches] = useState<PatchProposal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [decisionState, setDecisionState] = useState<string | null>(null);

  useEffect(() => {
    if (finding) {
      loadPatches();
    }
  }, [finding]);

  const loadPatches = async () => {
    if (!finding) return;
    try {
      setLoading(true);
      const data = await fetchPatches(finding.id);
      setPatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (patchId: string, confirmed: boolean) => {
    try {
      setDecisionState(confirmed ? 'approving' : 'rejecting');
      await decidePatch(patchId, confirmed);
      setDecisionState(confirmed ? 'approved' : 'rejected');
      setTimeout(() => {
        onPatchApproved();
        onClose();
      }, 1000);
    } catch (err) {
      alert('Failed to update patch decision');
      setDecisionState(null);
    }
  };

  if (!finding) return null;

  const currentPatch = patches[0];

  const renderDiffLines = (diffText: string) => {
    return diffText.split('\n').map((line, idx) => {
      let bgClass = 'bg-terminal-bg text-terminal-text';
      if (line.startsWith('+') && !line.startsWith('+++')) {
        bgClass = 'bg-green-950/40 text-green-300 font-semibold';
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        bgClass = 'bg-red-950/40 text-red-300 font-semibold';
      } else if (line.startsWith('@@')) {
        bgClass = 'bg-blue-950/40 text-blue-300';
      }

      return (
        <div key={idx} className={`px-4 py-0.5 font-mono text-xs whitespace-pre ${bgClass}`}>
          {line}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-main/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-surface rounded-xl shadow-2xl border border-subtle flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-subtle flex items-center justify-between bg-canvas/30">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-fail-bg text-fail border border-fail/30">
                Patch Proposal
              </span>
              <span className="text-xs text-muted font-mono">{finding.tool} Invariant</span>
            </div>
            <h3 className="text-base font-bold text-main">
              Surgical Remediation Diff: {finding.title}
            </h3>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-canvas text-muted hover:text-main">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-12 text-center text-muted">Loading patch proposal...</div>
          ) : !currentPatch ? (
            <div className="py-12 text-center text-muted">
              <ShieldAlert className="w-8 h-8 mx-auto text-muted/50 mb-2" />
              <p className="text-sm">No surgical patch proposals found for this finding.</p>
            </div>
          ) : (
            <>
              {/* Rationale box */}
              <div className="bg-brand/5 border border-brand/20 rounded-lg p-4">
                <div className="flex items-center space-x-1.5 text-brand text-xs font-semibold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Invariant Alignment Rationale</span>
                </div>
                <p className="text-xs text-main leading-relaxed">
                  {currentPatch.rationale}
                </p>
              </div>

              {/* Diff Viewer */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs text-muted">
                  <span className="font-mono">Unified Diff Preview (Working Copy Only)</span>
                  <span>Non-destructive preview</span>
                </div>
                <div className="rounded-lg border border-subtle overflow-hidden shadow-inner bg-terminal-bg max-h-72 overflow-y-auto">
                  {renderDiffLines(currentPatch.diff)}
                </div>
              </div>

              {/* Safety notice */}
              <div className="bg-canvas border border-subtle rounded-md p-3 text-xs text-muted">
                <strong>Human-in-the-Loop Gate:</strong> Approving this patch applies the diff strictly to a temporary sandbox branch. The verification engine will immediately re-execute tests to mathematically verify the resolution and prevent regressions.
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-subtle bg-canvas/30 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-subtle rounded-md text-sm font-medium text-muted hover:text-main bg-surface transition-colors"
          >
            Cancel
          </button>

          {currentPatch && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleDecision(currentPatch.id, false)}
                disabled={decisionState !== null}
                className="px-4 py-2 border border-fail/30 text-fail hover:bg-fail-bg rounded-md text-sm font-medium transition-colors inline-flex items-center space-x-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>

              <button
                onClick={() => handleDecision(currentPatch.id, true)}
                disabled={decisionState !== null}
                className="px-5 py-2 bg-pass text-white hover:bg-pass/90 rounded-md text-sm font-medium transition-colors shadow-xs inline-flex items-center space-x-1.5"
              >
                {decisionState === 'approving' ? (
                  <span>Applying & Re-verifying...</span>
                ) : decisionState === 'approved' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approved & Re-tested!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Approve & Re-Verify</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
