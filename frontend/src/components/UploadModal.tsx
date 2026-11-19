import React, { useState } from 'react';
import { UploadCloud, X, CheckSquare, Square, FileArchive, Loader2, Sparkles } from 'lucide-react';
import { createProject, uploadArchive, triggerScan } from '../api/client';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanStarted: (projectId: string, scanId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onScanStarted }) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [checks, setChecks] = useState({
    pytest: true,
    semgrep: true,
    z3_invariants: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.zip')) {
        setErrorMsg('Only .zip archive formats are supported.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrorMsg('Archive size exceeds the 50 MB safety ceiling.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      if (!projectName) {
        setProjectName(file.name.replace('.zip', ''));
      }
    }
  };

  const handleCreateAndScan = async () => {
    if (!projectName.trim()) {
      setErrorMsg('Please enter a project name.');
      return;
    }
    if (!selectedFile) {
      setErrorMsg('Please select a project .zip archive to upload.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // 1. Create Project
      const project = await createProject(projectName.trim(), description.trim());

      // 2. Upload ZIP
      const upload = await uploadArchive(project.id, selectedFile);

      // 3. Trigger Scan
      const selectedList = Object.entries(checks)
        .filter(([_, val]) => val)
        .map(([key]) => key);

      const scan = await triggerScan(project.id, upload.upload_id, selectedList);

      onScanStarted(project.id, scan.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start scan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-main/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-surface rounded-xl shadow-2xl border border-subtle overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-subtle flex items-center justify-between bg-canvas/30">
          <div>
            <h3 className="text-base font-bold text-main">Initiate Verification Scan</h3>
            <p className="text-xs text-muted mt-0.5">
              Upload a Python repository archive (.zip) for isolated invariant analysis.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-canvas text-muted hover:text-main">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-fail-bg border border-fail/30 text-fail text-xs p-3 rounded-md">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-main uppercase tracking-wider mb-1">
              Project Name *
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Core Checkout & Billing Service"
              className="w-full px-3 py-2 border border-subtle rounded-md text-sm text-main bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-main uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Financial transaction invariants and discount boundaries"
              className="w-full px-3 py-2 border border-subtle rounded-md text-sm text-main bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block text-xs font-semibold text-main uppercase tracking-wider mb-1">
              Project Archive (.zip) *
            </label>
            <div className="border-2 border-dashed border-subtle rounded-lg p-6 text-center hover:border-brand/50 transition-colors bg-canvas/30">
              <input
                type="file"
                id="zip-upload"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="zip-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className="w-8 h-8 text-brand mb-2" />
                {selectedFile ? (
                  <div className="flex items-center space-x-2 text-sm font-medium text-main">
                    <FileArchive className="w-4 h-4 text-brand" />
                    <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium text-brand hover:underline">
                      Click to choose archive or drag & drop
                    </span>
                    <span className="text-xs text-muted mt-1">
                      Max file size 50 MB · Zip-Slip & bomb validation enforced
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Verification Tools selection */}
          <div>
            <label className="block text-xs font-semibold text-main uppercase tracking-wider mb-2">
              Supported Check Matrix
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2.5 text-xs text-main cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.pytest}
                  onChange={(e) => setChecks({ ...checks, pytest: e.target.checked })}
                  className="rounded text-brand focus:ring-brand"
                />
                <span className="font-medium">Pytest Test Runner</span>
                <span className="text-muted">(Executes discovered unit & property tests)</span>
              </label>

              <label className="flex items-center space-x-2.5 text-xs text-main cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.semgrep}
                  onChange={(e) => setChecks({ ...checks, semgrep: e.target.checked })}
                  className="rounded text-brand focus:ring-brand"
                />
                <span className="font-medium">Semgrep Static Security & Secrets</span>
                <span className="text-muted">(AST vulnerability & hardcoded token audit)</span>
              </label>

              <label className="flex items-center space-x-2.5 text-xs text-main cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.z3_invariants}
                  onChange={(e) => setChecks({ ...checks, z3_invariants: e.target.checked })}
                  className="rounded text-brand focus:ring-brand"
                />
                <span className="font-medium">Z3 SMT Formal Invariant Solver</span>
                <span className="text-muted">(Mathematical proofs on financial & state logic)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle bg-canvas/30 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-subtle rounded-md text-sm font-medium text-muted hover:text-main bg-surface transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleCreateAndScan}
            disabled={isSubmitting}
            className="px-5 py-2 bg-brand text-white rounded-md text-sm font-medium hover:bg-brand-hover transition-colors shadow-xs inline-flex items-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validating & Uploading...</span>
              </>
            ) : (
              <span>Start Safe Scan</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
