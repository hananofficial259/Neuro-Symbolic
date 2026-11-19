import React from 'react';
import { ShieldCheck, Plus, Terminal } from 'lucide-react';

interface HeaderProps {
  onNewProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewProject }) => {
  return (
    <header className="bg-surface border-b border-subtle sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-md bg-brand text-white flex items-center justify-center font-bold shadow-xs">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-main tracking-tight leading-none">
            Neuro-Symbolic Software Foundry
          </h1>
          <span className="text-xs text-muted font-mono flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-pass inline-block"></span>
            Z3 SMT Invariant Solver · Pytest 8 · Semgrep AST
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="hidden md:flex items-center px-3 py-1.5 bg-canvas rounded-md border border-subtle text-xs text-muted font-mono gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-brand" />
          <span>Python 3.12 · Deterministic Invariants</span>
        </div>

        <button
          onClick={onNewProject}
          className="inline-flex items-center space-x-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium px-3.5 py-1.5 rounded-md transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-1 focus:outline-none"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>
    </header>
  );
};
