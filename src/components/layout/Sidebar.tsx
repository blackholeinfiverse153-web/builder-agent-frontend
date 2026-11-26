import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  Terminal,
  Code2,
  Eye,
  Shield,
  CheckSquare,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: NavItem[] = [
    { name: 'Dashboard', to: '/', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { name: 'Projects', to: '/projects', icon: <FolderGit2 className="w-4 h-4 shrink-0" /> },
    { name: 'Builder Workspace', to: '/workspace', icon: <Terminal className="w-4 h-4 shrink-0" /> },
    { name: 'Code Editor', to: '/editor', icon: <Code2 className="w-4 h-4 shrink-0" /> },
    { name: 'Preview', to: '/preview', icon: <Eye className="w-4 h-4 shrink-0" /> },
    { name: 'Sandbox', to: '/sandbox', icon: <Shield className="w-4 h-4 shrink-0" /> },
    { name: 'Testing', to: '/testing', icon: <CheckSquare className="w-4 h-4 shrink-0" /> },
    { name: 'History', to: '/history', icon: <History className="w-4 h-4 shrink-0" /> },
    { name: 'Settings', to: '/settings', icon: <Settings className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-surface-950 border-r border-surface-800 transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-surface-800 px-4 flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
                B
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white leading-none">
                  BHIV BUILDER
                </span>
                <span className="text-[10px] font-mono text-brand-400 mt-0.5">AGENT SANDBOX</span>
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 mx-auto rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              B
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group
                ${isActive
                  ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-900 border border-transparent'
                }
                ${collapsed ? 'justify-center px-2' : ''}
              `}
              title={collapsed ? item.name : undefined}
            >
              {item.icon}
              {!collapsed && (
                <span className="truncate">{item.name}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Security / Isolation footer */}
        <div className="p-3 border-t border-surface-800/80 bg-surface-900/30">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="overflow-hidden">
                <p className="font-mono text-[11px] text-surface-300 font-medium truncate">Sandbox Guard</p>
                <p className="text-[10px] text-surface-500 truncate">Approval Enforced</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="Sandbox Guard: Approval Enforced">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
