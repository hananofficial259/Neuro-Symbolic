import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface StageStepperProps {
  currentStage: string;
  status: string;
  durationSeconds?: number;
}

const STAGES = [
  { id: 'queued', label: 'Queued' },
  { id: 'unpacking', label: 'Unpacking' },
  { id: 'detecting', label: 'Detection' },
  { id: 'running_tests', label: 'Pytest Suite' },
  { id: 'static_security', label: 'Static Security' },
  { id: 'formal_verification', label: 'Z3 Invariants' },
  { id: 'summarizing', label: 'Summarizing' },
  { id: 'completed', label: 'Completed' },
];

export const StageStepper: React.FC<StageStepperProps> = ({ currentStage, status, durationSeconds }) => {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="bg-surface border border-subtle rounded-lg p-5 mb-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-main uppercase tracking-wider">
            Verification Pipeline Execution
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Deterministic stage progression driven by isolated worker processes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {status === 'RUNNING' && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning in progress...</span>
            </span>
          )}
          {status === 'COMPLETED' && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-pass-bg text-pass">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finished in {durationSeconds?.toFixed(1) || '0.0'}s</span>
            </span>
          )}
          {status === 'FAILED' && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-fail-bg text-fail">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Execution Failed</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {STAGES.map((stage, idx) => {
          const isDone = currentIndex > idx || status === 'COMPLETED';
          const isCurrent = currentIndex === idx && status === 'RUNNING';
          const isPending = currentIndex < idx && status !== 'COMPLETED';

          return (
            <div
              key={stage.id}
              className={`flex flex-col items-center text-center p-2.5 rounded-md border text-xs transition-colors ${
                isDone
                  ? 'bg-pass-bg/50 border-pass/30 text-pass'
                  : isCurrent
                  ? 'bg-brand/5 border-brand text-brand font-semibold ring-1 ring-brand'
                  : 'bg-canvas border-subtle text-muted'
              }`}
            >
              <div className="mb-1.5">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-pass" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-brand animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 text-muted/60" />
                )}
              </div>
              <span className="leading-tight">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
