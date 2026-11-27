import React, { useState, useEffect } from 'react';
import { History, Clock, Filter, Loader2, FolderGit2, AlertCircle } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { useProjects } from '../hooks/useProjects';
import { historyApi } from '../services/api';
import { ActivityHistoryRecord } from '../types';

export const HistoryPage: React.FC = () => {
  const { activeProject, projects, setActiveProjectId } = useProjects();
  const [filterType, setFilterType] = useState('all');
  const [historyItems, setHistoryItems] = useState<ActivityHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!activeProject) {
      setHistoryItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    historyApi
      .list(activeProject.id)
      .then((data) => {
        if (!cancelled) setHistoryItems(data);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Failed to load activity history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  const filtered = historyItems.filter((item) => {
    return filterType === 'all' || item.action_type === filterType;
  });

  const getBadgeVariant = (action: string) => {
    switch (action) {
      case 'project_created':
        return 'brand';
      case 'file_created':
        return 'cyan';
      case 'file_updated':
        return 'warning';
      case 'file_deleted':
        return 'error';
      case 'prompt_submitted':
        return 'brand';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-brand-400" />
            Activity & Generation History
          </h1>
          <p className="text-xs text-surface-400 mt-1">
            Chronological audit log of all project generation jobs, prompts, and file modifications in SQLite.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {projects.length > 0 && (
            <select
              value={activeProject?.id || ''}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="bg-surface-900 border border-surface-800 rounded-lg px-3 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-500 font-mono"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-surface-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-surface-900 border border-surface-800 rounded-lg px-3 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-500 font-mono"
            >
              <option value="all">All Events</option>
              <option value="project_created">Project Initialized</option>
              <option value="file_created">File Created</option>
              <option value="file_updated">File Updated</option>
              <option value="prompt_submitted">Prompt Submitted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Timeline items */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center font-mono text-xs text-surface-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          <p>Loading audit log from backend database...</p>
        </div>
      ) : !activeProject ? (
        <div className="p-8 rounded-xl border border-surface-800 bg-surface-900/30 text-center text-xs font-mono text-surface-400">
          <FolderGit2 className="w-8 h-8 text-surface-600 mx-auto mb-2" />
          <p>No project selected. Select or create a project to view its audit history.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-xl border border-surface-800 bg-surface-900/30 text-center text-xs font-mono text-surface-400">
          <Clock className="w-8 h-8 text-surface-600 mx-auto mb-2" />
          <p>No activity records recorded for project '{activeProject.name}' under this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-surface-800 bg-surface-900/40 flex items-start justify-between gap-4 transition-colors hover:border-surface-700"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white capitalize">
                    {item.action_type.replace('_', ' ')}
                  </span>
                  <Badge variant={getBadgeVariant(item.action_type)} size="sm">
                    {item.action_type}
                  </Badge>
                </div>
                <p className="text-xs text-surface-400 leading-relaxed font-mono">
                  {item.description}
                </p>
              </div>
              <div className="text-[11px] font-mono text-surface-500 shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                • {new Date(item.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
