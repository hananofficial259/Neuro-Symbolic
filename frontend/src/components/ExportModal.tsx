import React, { useEffect, useState } from 'react';
import { fetchReport } from '../api/client';
import { X, Download, FileText, Code, Check } from 'lucide-react';

interface ExportModalProps {
  scanId: string | null;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ scanId, onClose }) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [reportContent, setReportContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (scanId) {
      loadReport(format);
    }
  }, [scanId, format]);

  const loadReport = async (fmt: 'markdown' | 'json') => {
    if (!scanId) return;
    try {
      setLoading(true);
      const text = await fetchReport(scanId, fmt);
      setReportContent(text);
    } catch (err) {
      setReportContent('Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([reportContent], {
      type: format === 'json' ? 'application/json' : 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification_report_${scanId}.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!scanId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-main/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface rounded-xl shadow-2xl border border-subtle flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-subtle flex items-center justify-between bg-canvas/30">
          <div>
            <h3 className="text-base font-bold text-main">Export Verification Report</h3>
            <p className="text-xs text-muted mt-0.5">
              Deterministic tool evidence, test outputs, and formal mathematical proof records.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-canvas text-muted hover:text-main">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Bar */}
        <div className="p-4 border-b border-subtle bg-canvas/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFormat('markdown')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium inline-flex items-center space-x-1.5 transition-colors ${
                format === 'markdown'
                  ? 'bg-brand text-white'
                  : 'bg-surface border border-subtle text-muted hover:text-main'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Markdown (.md)</span>
            </button>

            <button
              onClick={() => setFormat('json')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium inline-flex items-center space-x-1.5 transition-colors ${
                format === 'json'
                  ? 'bg-brand text-white'
                  : 'bg-surface border border-subtle text-muted hover:text-main'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw JSON (.json)</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="text-xs text-muted hover:text-main font-medium inline-flex items-center space-x-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-pass" /> : null}
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
        </div>

        {/* Content Viewer */}
        <div className="p-5 overflow-y-auto flex-1 bg-terminal-bg text-terminal-text font-mono text-xs">
          {loading ? (
            <div className="text-center py-12 text-muted">Generating signed report...</div>
          ) : (
            <pre className="whitespace-pre-wrap">{reportContent}</pre>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle bg-canvas/30 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-subtle rounded-md text-sm font-medium text-muted hover:text-main bg-surface transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleDownload}
            className="px-5 py-2 bg-brand text-white rounded-md text-sm font-medium hover:bg-brand-hover transition-colors shadow-xs inline-flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
