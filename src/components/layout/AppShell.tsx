import React, { useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useHealth } from '../../hooks/useHealth';

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const { health, loading, error } = useHealth();
  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return 'Developer Dashboard';
      case '/projects':
        return 'Projects Directory';
      case '/projects/new':
        return 'Create New Project';
      case '/workspace':
        return 'Builder Workspace';
      case '/editor':
        return 'Code Editor';
      case '/preview':
        return 'Application Preview';
      case '/sandbox':
        return 'Execution Sandbox & Security';
      case '/testing':
        return 'Test Suite & Runner';
      case '/history':
        return 'Activity & Generation History';
      case '/settings':
        return 'Platform Settings';
      default:
        return 'BHIV Builder Agent';
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-brand-500 selection:text-white">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main wrapper offset by sidebar width */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}
      >
        <TopNav
          pageTitle={getPageTitle(location.pathname)}
          health={health}
          healthLoading={loading}
          healthError={error}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
