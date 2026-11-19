import React from 'react';
import { ShieldCheck, CheckCircle2, Terminal, Code2, AlertTriangle, ArrowRight, Lock, Cpu, Sparkles } from 'lucide-react';

interface PublicLandingProps {
  onEnterApp: () => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({ onEnterApp }) => {
  return (
    <div className="space-y-16 py-6 max-w-5xl mx-auto">
      {/* Hero */}
      <section className="text-center space-y-5">
        <div className="inline-flex items-center space-x-2 bg-brand/10 border border-brand/20 px-3.5 py-1.5 rounded-full text-xs font-semibold text-brand">
          <Sparkles className="w-4 h-4" />
          <span>Neuro-Symbolic Verification Engine</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-main tracking-tight leading-tight">
          AI Writes Code. <br className="hidden sm:inline" />
          <span className="text-brand">We Mathematically Verify It.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          An automated verification platform combining Large Language Models with the <strong>Z3 SMT Solver</strong>, <strong>Pytest</strong>, and <strong>Semgrep</strong>. Deterministic tool evidence—never AI confidence—determines pass or fail.
        </p>

        <div className="flex items-center justify-center space-x-3 pt-2">
          <button
            onClick={onEnterApp}
            className="bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all shadow-md inline-flex items-center space-x-2"
          >
            <span>Launch Verification Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* How it Works 3-Step Grid */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-main">How It Works</h2>
          <p className="text-xs text-muted mt-1">From ZIP archive to formal mathematical proof in seconds.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border border-subtle rounded-xl p-5 shadow-xs">
            <div className="w-9 h-9 rounded-md bg-brand/10 text-brand flex items-center justify-center font-bold mb-3 font-mono">
              01
            </div>
            <h3 className="text-base font-bold text-main mb-1.5">Safe Archive Ingestion</h3>
            <p className="text-xs text-muted leading-relaxed">
              Upload a Python repository (.zip). The ingest pipeline enforces strict size ceilings, decompression ratios, and Zip-Slip traversal defenses.
            </p>
          </div>

          <div className="bg-surface border border-subtle rounded-xl p-5 shadow-xs">
            <div className="w-9 h-9 rounded-md bg-pass-bg text-pass flex items-center justify-center font-bold mb-3 font-mono">
              02
            </div>
            <h3 className="text-base font-bold text-main mb-1.5">Deterministic Proving</h3>
            <p className="text-xs text-muted leading-relaxed">
              Isolated runners execute your Pytest test suite, scan AST patterns for security sinks, and model business invariants in the Z3 theorem prover.
            </p>
          </div>

          <div className="bg-surface border border-subtle rounded-xl p-5 shadow-xs">
            <div className="w-9 h-9 rounded-md bg-brand/10 text-brand flex items-center justify-center font-bold mb-3 font-mono">
              03
            </div>
            <h3 className="text-base font-bold text-main mb-1.5">Human Diff Review</h3>
            <p className="text-xs text-muted leading-relaxed">
              When invariants fail, AI proposes surgical patches. Inspect side-by-side diffs and approve re-tests with zero automatic production commits.
            </p>
          </div>
        </div>
      </section>

      {/* Security Non-Negotiables */}
      <section className="bg-surface border border-subtle rounded-2xl p-8 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-brand text-xs font-semibold uppercase tracking-wider">
          <Lock className="w-4 h-4" />
          <span>Security Architecture</span>
        </div>
        <h2 className="text-2xl font-bold text-main">Code Execution Security — Non-Negotiable</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted pt-2">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-pass shrink-0 mt-0.5" />
            <span>Untrusted code is strictly executed in ephemeral, disposable sandboxes. Never in the API process.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-pass shrink-0 mt-0.5" />
            <span>Outbound network access disabled by default to prevent SSRF and proprietary code exfiltration.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-pass shrink-0 mt-0.5" />
            <span>Non-root execution with dropped Linux capabilities and strict memory/PID cgroup ceilings.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-pass shrink-0 mt-0.5" />
            <span>Repository text, docstrings, and tests treated as untrusted prompt-injection inputs.</span>
          </div>
        </div>
      </section>
    </div>
  );
};
