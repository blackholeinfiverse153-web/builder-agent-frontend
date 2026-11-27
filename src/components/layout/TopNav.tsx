import React from 'react';
import { Menu, Activity, ShieldAlert, Cpu, LogOut, User as UserIcon } from 'lucide-react';
import { HealthData } from '../../types';
import { StatusIndicator } from '../common/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import { getAiProviderStatus, getApprovalPolicyStatus } from '../../utils/aiWorkflow';

interface TopNavProps {
  pageTitle: string;
  health: HealthData | null;
  healthLoading: boolean;
  healthError: string | null;
  onOpenMobileSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  pageTitle,
  health,
  healthLoading,
  healthError,
  onOpenMobileSidebar,
}) => {
  const { user, logout } = useAuth();
  const isConnected = !healthLoading && !healthError && health !== null;
  const aiStatus = getAiProviderStatus(health, healthLoading, healthError);
  const approvalStatus = getApprovalPolicyStatus(health, healthLoading, healthError);

  return (
    <header className="h-14 border-b border-surface-800 bg-surface-950/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left section: mobile hamburger & page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-semibold text-white tracking-tight">{pageTitle}</h1>
      </div>

      {/* Right section: System telemetry & user auth pills */}
      <div className="flex items-center gap-3">
        {/* Backend health status indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface-900 border border-surface-800 text-xs">
          <Activity className="w-3.5 h-3.5 text-surface-400" />
          <StatusIndicator
            status={isConnected ? 'online' : healthLoading ? 'warning' : 'offline'}
            label={isConnected ? `FastAPI v${health?.version}` : healthLoading ? 'Connecting...' : 'API Disconnected'}
            size="sm"
          />
        </div>

        {/* AI Provider Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900 border border-surface-800 text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-surface-400">AI:</span>
          <span className={aiStatus.navTextClass}>{aiStatus.badgeLabel}</span>
        </div>

        {/* Sandbox Approval Policy Pill */}
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900 border border-surface-800 text-xs font-mono ${approvalStatus.textClass}`}>
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{approvalStatus.navLabel}</span>
        </div>

        {/* Authenticated User Menu & Logout */}
        {user ? (
          <div className="flex items-center gap-2.5 pl-2 border-l border-surface-800">
            <div className="flex items-center gap-2 text-xs font-mono text-surface-300">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-700 to-indigo-500 border border-brand-400/40 flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0">
                {user.email.slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden xl:inline truncate max-w-[140px] text-[11px] text-surface-400">
                {user.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-surface-400 hover:text-rose-400 hover:bg-surface-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-surface-800">
            <div className="w-7 h-7 rounded-full bg-surface-800 flex items-center justify-center text-surface-500">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
