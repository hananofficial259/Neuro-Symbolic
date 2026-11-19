import React from 'react';
import { LayoutDashboard, FolderGit2, CheckCircle2, BookOpen, Settings, FileText } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  projectCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, projectCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects & Scans', icon: FolderGit2, badge: projectCount },
    { id: 'rules', label: 'Formal Invariant Rules', icon: CheckCircle2 },
    { id: 'reports', label: 'Verification Reports', icon: FileText },
    { id: 'docs', label: 'Architecture Docs', icon: BookOpen },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-subtle flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-muted tracking-wider uppercase">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-canvas text-brand font-semibold border-l-3 border-brand'
                  : 'text-main hover:bg-canvas hover:text-brand'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-muted'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="bg-canvas border border-subtle text-muted text-xs px-2 py-0.5 rounded-full font-mono">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-subtle">
        <div className="bg-canvas rounded-md p-3 border border-subtle text-xs space-y-1">
          <div className="font-semibold text-main">Deterministic Security Gate</div>
          <div className="text-muted leading-relaxed">
            AI proposes patches; mathematical SMT proofs and test runners drive pass/fail status.
          </div>
        </div>
      </div>
    </aside>
  );
};
