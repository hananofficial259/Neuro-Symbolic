import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { UploadModal } from './components/UploadModal';
import { Dashboard } from './pages/Dashboard';
import { ProjectDetail } from './pages/ProjectDetail';
import { RulesLibrary } from './pages/RulesLibrary';
import { PublicLanding } from './pages/PublicLanding';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isStartingDemo, setIsStartingDemo] = useState<boolean>(false);

  const handleScanStarted = (projectId: string, scanId: string) => {
    setSelectedProjectId(projectId);
    setActiveScanId(scanId);
    setCurrentTab('scan_detail');
  };

  const handleRunDemoScan = async () => {
    try {
      setIsStartingDemo(true);
      const demo = await import('./api/client').then(m => m.launchBenchmarkScan());
      handleScanStarted(demo.project_id, demo.scan_id);
    } catch (err: any) {
      alert('Failed to launch demo scan: ' + err.message);
    } finally {
      setIsStartingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans">
      <Header onNewProject={() => setIsUploadOpen(true)} />

      <div className="flex-1 flex">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'projects') {
              setCurrentTab('dashboard');
            } else {
              setCurrentTab(tab);
            }
          }}
          projectCount={1}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <Dashboard
              onNewProject={() => setIsUploadOpen(true)}
              onSelectProject={(id) => {
                setSelectedProjectId(id);
                setCurrentTab('scan_detail');
              }}
              onRunDemoScan={handleRunDemoScan}
              isStartingDemo={isStartingDemo}
            />
          )}

          {currentTab === 'scan_detail' && selectedProjectId && (
            <ProjectDetail
              projectId={selectedProjectId}
              activeScanId={activeScanId}
              onBack={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'rules' && <RulesLibrary />}

          {currentTab === 'reports' && (
            <div className="bg-surface border border-subtle rounded-xl p-8 text-center space-y-3">
              <h3 className="text-lg font-bold text-main">Verification Reports Archive</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Open any project from the dashboard and click 'Export Report' to view signed Markdown and JSON artifacts.
              </p>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="bg-brand text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-brand-hover"
              >
                Go to Projects Dashboard
              </button>
            </div>
          )}

          {currentTab === 'docs' && (
            <PublicLanding onEnterApp={() => setCurrentTab('dashboard')} />
          )}

          {currentTab === 'settings' && (
            <div className="bg-surface border border-subtle rounded-xl p-6 space-y-4 max-w-2xl">
              <h3 className="text-base font-bold text-main">Verification Engine Configuration</h3>
              <div className="space-y-3 text-xs text-muted">
                <div className="p-3 bg-canvas rounded-md border border-subtle flex items-center justify-between">
                  <span>SMT Solver Engine:</span>
                  <strong className="text-main font-mono">Z3 Theorem Prover 4.13+</strong>
                </div>
                <div className="p-3 bg-canvas rounded-md border border-subtle flex items-center justify-between">
                  <span>Execution Sandbox:</span>
                  <strong className="text-main font-mono">Subprocess Jail / Ephemeral Runner</strong>
                </div>
                <div className="p-3 bg-canvas rounded-md border border-subtle flex items-center justify-between">
                  <span>Max Archive Decompression Limit:</span>
                  <strong className="text-main font-mono">50 MB / 250 MB ratio 10:1</strong>
                </div>
                <div className="p-3 bg-canvas rounded-md border border-subtle flex items-center justify-between">
                  <span>AI Invariant Alignment Provider:</span>
                  <strong className="text-main font-mono">Google Gemini API (Official SDK)</strong>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onScanStarted={handleScanStarted}
      />
    </div>
  );
};
