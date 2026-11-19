import React, { useEffect, useState } from 'react';
import { Finding, Project, Scan } from '../types';
import { fetchFindings, fetchScan } from '../api/client';
import { StageStepper } from '../components/StageStepper';
import { FindingsTable } from '../components/FindingsTable';
import { EvidenceDrawer } from '../components/EvidenceDrawer';
import { DiffViewer } from '../components/DiffViewer';
import { ExportModal } from '../components/ExportModal';
import { ArrowLeft, Download, RefreshCw, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  activeScanId?: string | null;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onBack, activeScanId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [patchFinding, setPatchFinding] = useState<Finding | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadProjectAndScan();
  }, [projectId, activeScanId]);

  // Live polling while scan is running
  useEffect(() => {
    if (scan && (scan.status === 'RUNNING' || scan.status === 'QUEUED')) {
      const interval = setInterval(async () => {
        try {
          const updatedScan = await fetchScan(scan.id);
          setScan(updatedScan);
          if (updatedScan.status === 'COMPLETED' || updatedScan.status === 'FAILED') {
            const updatedFindings = await fetchFindings(scan.id);
            setFindings(updatedFindings);
            clearInterval(interval);
          }
        } catch (err) {
          console.error(err);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [scan]);

  const loadProjectAndScan = async () => {
    try {
      setLoading(true);
      // Fetch project
      const projRes = await fetch(`/api/v1/projects/${projectId}`);
      if (projRes.ok) {
        setProject(await projRes.json());
      }

      // If activeScanId given, use that; otherwise fetch project's scans
      let targetScanId = activeScanId;
      if (!targetScanId) {
        // Query latest scan
        // For MVP, if not provided, try local storage or default
      }

      if (targetScanId) {
        const scanData = await fetchScan(targetScanId);
        setScan(scanData);
        const findingsData = await fetchFindings(targetScanId);
        setFindings(findingsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (scan) {
      const scanData = await fetchScan(scan.id);
      setScan(scanData);
      const findingsData = await fetchFindings(scan.id);
      setFindings(findingsData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-xl border border-subtle shadow-xs">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-muted hover:text-main font-medium inline-flex items-center space-x-1 mb-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Projects</span>
          </button>
          <h2 className="text-xl font-bold text-main">{project?.name || 'Project Details'}</h2>
          <p className="text-xs text-muted mt-0.5">{project?.description || 'Repository Invariant Analysis'}</p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleRefresh}
            className="p-2 border border-subtle rounded-md hover:bg-canvas text-muted hover:text-main transition-colors"
            title="Refresh Scan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {scan && (
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center space-x-1.5 bg-canvas border border-subtle hover:border-brand text-main hover:text-brand text-xs font-semibold px-3 py-2 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Stage Stepper */}
      {scan && (
        <StageStepper
          currentStage={scan.current_stage}
          status={scan.status}
          durationSeconds={scan.duration_seconds}
        />
      )}

      {/* Summary Scorecard */}
      {scan && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-surface border border-subtle rounded-lg p-3.5">
            <div className="flex items-center space-x-1.5 text-pass text-xs font-semibold uppercase">
              <CheckCircle2 className="w-4 h-4" />
              <span>Passed</span>
            </div>
            <div className="text-2xl font-bold text-pass mt-1 font-mono">
              {scan.summary_counts.passed || 0}
            </div>
          </div>

          <div className="bg-surface border border-subtle rounded-lg p-3.5">
            <div className="flex items-center space-x-1.5 text-fail text-xs font-semibold uppercase">
              <XCircle className="w-4 h-4" />
              <span>Violations</span>
            </div>
            <div className="text-2xl font-bold text-fail mt-1 font-mono">
              {scan.summary_counts.failed || 0}
            </div>
          </div>

          <div className="bg-surface border border-subtle rounded-lg p-3.5">
            <div className="flex items-center space-x-1.5 text-warn text-xs font-semibold uppercase">
              <AlertTriangle className="w-4 h-4" />
              <span>Warnings</span>
            </div>
            <div className="text-2xl font-bold text-warn mt-1 font-mono">
              {scan.summary_counts.warning || 0}
            </div>
          </div>

          <div className="bg-surface border border-subtle rounded-lg p-3.5">
            <div className="flex items-center space-x-1.5 text-inconclusive text-xs font-semibold uppercase">
              <HelpCircle className="w-4 h-4" />
              <span>Inconclusive</span>
            </div>
            <div className="text-2xl font-bold text-inconclusive mt-1 font-mono">
              {scan.summary_counts.inconclusive || 0}
            </div>
          </div>

          <div className="bg-surface border border-subtle rounded-lg p-3.5">
            <div className="flex items-center space-x-1.5 text-muted text-xs font-semibold uppercase">
              <span>Not Checked</span>
            </div>
            <div className="text-2xl font-bold text-muted mt-1 font-mono">
              {scan.summary_counts.not_checked || 0}
            </div>
          </div>
        </div>
      )}

      {/* Findings Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-main">Verification Findings & Proofs</h3>
            <p className="text-xs text-muted">
              Every finding is backed by deterministic exit codes, AST rules, or SMT counterexamples.
            </p>
          </div>
        </div>

        <FindingsTable
          findings={findings}
          onSelectFinding={(f) => setSelectedFinding(f)}
          onReviewPatch={(f) => setPatchFinding(f)}
        />
      </div>

      {/* Modals & Drawers */}
      <EvidenceDrawer
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onReviewPatch={(f) => {
          setSelectedFinding(null);
          setPatchFinding(f);
        }}
      />

      <DiffViewer
        finding={patchFinding}
        onClose={() => setPatchFinding(null)}
        onPatchApproved={() => {
          handleRefresh();
        }}
      />

      <ExportModal
        scanId={scan?.id || null}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};
