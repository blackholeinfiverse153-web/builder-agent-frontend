import React from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Terminal,
  Shield,
  Cpu,
  Plus,
  ArrowRight,
  Code2,
  Server,
  FileCode,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useHealth } from '../hooks/useHealth';
import { useProjects } from '../hooks/useProjects';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { getAiProviderStatus, getApprovalPolicyStatus } from '../utils/aiWorkflow';

export const DashboardPage: React.FC = () => {
  const { health, loading: healthLoading, error: healthError } = useHealth();
  const { projects, loading: projectsLoading } = useProjects();

  const isConnected = !healthLoading && !healthError && health !== null;
  const aiStatus = getAiProviderStatus(health, healthLoading, healthError);
  const approvalStatus = getApprovalPolicyStatus(health, healthLoading, healthError);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Platform Overview */}
      <div className="rounded-xl border border-surface-800 bg-gradient-to-r from-surface-900/80 via-surface-900/40 to-surface-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase tracking-wider text-brand-400 bg-brand-500/10 px-2.5 py-0.5 rounded border border-brand-500/20">
                Phase 4 Real API Integration
              </span>
              <span className="text-xs text-surface-400 font-mono">v0.1.0</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">BHIV Builder Agent Sandbox</h1>
            <p className="text-surface-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              AI-assisted development platform with strict human approval gates, isolated sandbox execution, and real backend SQLite persistence.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/projects/new">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                New Project
              </Button>
            </Link>
            <Link to="/workspace">
              <Button variant="secondary" icon={<Terminal className="w-4 h-4" />}>
                Workspace
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Real-time System Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Backend API Status */}
        <Card
          title="Backend Service"
          subtitle="FastAPI Runtime"
          icon={<Server className="w-4 h-4 text-brand-400" />}
          footer={
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-surface-500">Endpoint:</span>
              <span className="text-surface-400 truncate max-w-[180px]">/api/v1/health</span>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400">Connection:</span>
              {isConnected ? (
                <Badge variant="success">Connected</Badge>
              ) : healthLoading ? (
                <Badge variant="warning">Checking...</Badge>
              ) : (
                <Badge variant="error">Disconnected</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400">Python Environment:</span>
              <span className="text-xs font-mono text-surface-200">
                {health?.python_version ? `Python ${health.python_version}` : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400">Database Engine:</span>
              <span className="text-xs font-mono text-surface-200">
                {!health ? (healthLoading ? 'Checking...' : 'Unavailable') : health.database_url_configured ? 'Configured (Live)' : 'Not Configured'}
              </span>
            </div>
          </div>
        </Card>

        {/* AI Adapter Status */}
        <Card
          title="AI Provider Adapter"
          subtitle="Inference Configuration"
          icon={<Cpu className="w-4 h-4 text-cyan-400" />}
          footer={
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-surface-500">Generation Gate:</span>
              <span className={aiStatus.gateTextClass}>{aiStatus.gateLabel}</span>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400">Active Provider:</span>
              <Badge variant={aiStatus.badgeVariant}>{aiStatus.badgeLabel}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400">Pluggable Interface:</span>
              <span className={`text-xs font-mono ${aiStatus.state === 'unavailable' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {aiStatus.state === 'unavailable' ? 'Offline' : 'Ready'}
              </span>
            </div>
            <p className="text-[11px] text-surface-400 leading-relaxed">
              {aiStatus.description}
            </p>
          </div>
        </Card>

        {/* Execution Sandbox Policy */}
        <Card
          title="Execution Sandbox"
          subtitle="Security & Isolation"
          icon={<Shield className="w-4 h-4 text-emerald-400" />}
          footer={
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-surface-500">Approval Policy:</span>
              <span className={`font-medium ${approvalStatus.textClass}`}>{approvalStatus.policyLabel}</span>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400">Human Approval:</span>
              <Badge variant={approvalStatus.badgeVariant}>{approvalStatus.badgeLabel}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400">Host Process Isolation:</span>
              <span className="text-xs font-mono text-surface-200">Enabled</span>
            </div>
            <p className="text-[11px] text-surface-400 leading-relaxed">
              AI proposals never write project files automatically; explicit human approval is required before changes are applied.
            </p>
          </div>
        </Card>
      </div>

      {/* Projects Overview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-brand-400" />
              Software Projects
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              {projectsLoading
                ? 'Loading projects from backend...'
                : `${projects.length} project${projects.length === 1 ? '' : 's'} loaded from SQLite`}
            </p>
          </div>
          <Link to="/projects">
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
              View All
            </Button>
          </Link>
        </div>

        {projectsLoading ? (
          <div className="flex items-center justify-center p-12 border border-surface-800 rounded-xl bg-surface-900/20 text-xs font-mono text-surface-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-400" />
            Loading projects from backend database...
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderGit2 className="w-6 h-6" />}
            title="No projects initialized yet"
            description="Create your first software project to start entering natural-language instructions and generating isolated code."
            actionLabel="Create First Project"
            onAction={() => {
              window.location.hash = '#/projects/new';
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((project) => (
              <Card
                key={project.id}
                title={project.name}
                subtitle={`${project.language} • ${project.framework}`}
                icon={<FileCode className="w-4 h-4 text-brand-400" />}
                footer={
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-surface-500">
                      ID: {project.id.slice(0, 8)}...
                    </span>
                    <Link to="/workspace">
                      <span className="text-brand-400 hover:text-brand-300 font-medium text-xs flex items-center gap-1">
                        Open Workspace <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>
                }
              >
                <p className="text-xs text-surface-400 line-clamp-2 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="brand" size="sm">{project.language}</Badge>
                  <Badge variant="cyan" size="sm">{project.framework}</Badge>
                  <Badge variant="neutral" size="sm">{project.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/workspace" className="group">
          <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/30 hover:bg-surface-800/40 hover:border-brand-500/40 transition-all">
            <Terminal className="w-5 h-5 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-semibold text-white">Builder Workspace</h3>
            <p className="text-[11px] text-surface-400 mt-1">Chat with agent and view project files.</p>
          </div>
        </Link>
        <Link to="/editor" className="group">
          <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/30 hover:bg-surface-800/40 hover:border-brand-500/40 transition-all">
            <Code2 className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-semibold text-white">Code Editor</h3>
            <p className="text-[11px] text-surface-400 mt-1">Inspect and edit files with CodeMirror 6.</p>
          </div>
        </Link>
        <Link to="/sandbox" className="group">
          <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/30 hover:bg-surface-800/40 hover:border-brand-500/40 transition-all">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-semibold text-white">Execution Sandbox</h3>
            <p className="text-[11px] text-surface-400 mt-1">Review approval gates and security policies.</p>
          </div>
        </Link>
        <Link to="/settings" className="group">
          <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/30 hover:bg-surface-800/40 hover:border-brand-500/40 transition-all">
            <Server className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-semibold text-white">API Settings</h3>
            <p className="text-[11px] text-surface-400 mt-1">Configure endpoints and AI credentials.</p>
          </div>
        </Link>
      </div>
    </div>
  );
};
