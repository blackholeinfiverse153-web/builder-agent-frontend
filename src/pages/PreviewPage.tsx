import React, { useState } from 'react';
import { Eye, RefreshCw, Smartphone, Tablet, Monitor } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

export const PreviewPage: React.FC = () => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      case 'desktop':
      default:
        return 'w-full';
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      {/* Top Preview Controls */}
      <div className="px-4 py-2.5 rounded-xl border border-surface-800 bg-surface-900/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-cyan-400" />
          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-950 border border-surface-800 rounded-md text-xs font-mono text-surface-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>http://localhost:3000/preview</span>
          </div>
          <Badge variant="warning" size="sm">Development Sandbox</Badge>
        </div>

        {/* Viewport Toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-950 border border-surface-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewport === 'desktop' ? 'bg-surface-800 text-white' : 'text-surface-400 hover:text-white'
              }`}
              title="Desktop view (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewport === 'tablet' ? 'bg-surface-800 text-white' : 'text-surface-400 hover:text-white'
              }`}
              title="Tablet view (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewport === 'mobile' ? 'bg-surface-800 text-white' : 'text-surface-400 hover:text-white'
              }`}
              title="Mobile view (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Preview Surface Frame */}
      <div className="flex-1 rounded-xl border border-surface-800 bg-surface-950 p-4 flex items-center justify-center overflow-auto">
        <div className={`h-full border border-surface-800 rounded-lg bg-surface-900/30 flex flex-col items-center justify-center p-8 transition-all duration-300 ${getViewportWidth()}`}>
          <EmptyState
            icon={<Eye className="w-8 h-8 text-surface-500" />}
            title="Application Server Inactive"
            description="The sandbox execution service has not yet started an application web server for this project. Execution requires human approval in Phase 8."
          />
          <div className="mt-6 p-4 rounded-lg bg-surface-950/80 border border-surface-800/80 max-w-md w-full text-left font-mono text-[11px] text-surface-400 space-y-1.5">
            <p className="text-surface-300 font-semibold">• Isolation: Container sandbox execution</p>
            <p>• Approval Status: Required before launch</p>
            <p>• Port Forwarding: Disabled until container approved</p>
          </div>
        </div>
      </div>
    </div>
  );
};
