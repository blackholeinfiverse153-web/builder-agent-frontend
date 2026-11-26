import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Trash2,
  FileCode,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

export const ProjectsPage: React.FC = () => {
  const { projects, deleteProject, setActiveProjectId, loading, error } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project and all its files?')) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteProject(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage =
      selectedLanguage === 'all' || project.language === selectedLanguage;
    return matchesSearch && matchesLanguage;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-brand-400" />
            Software Projects
          </h1>
          <p className="text-xs text-surface-400 mt-1">
            Manage your agent-generated software projects and workspaces.
          </p>
        </div>
        <Link to="/projects/new">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
            Create New Project
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-900 border border-surface-800 rounded-lg pl-9 pr-4 py-2 text-xs text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-surface-400 shrink-0" />
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-surface-900 border border-surface-800 rounded-lg px-3 py-2 text-xs text-surface-200 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Languages</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center font-mono text-xs text-surface-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          <p>Loading projects from backend database...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 className="w-6 h-6" />}
          title={projects.length === 0 ? 'No projects initialized yet' : 'No matching projects found'}
          description={
            projects.length === 0
              ? 'Get started by creating your first software project.'
              : 'Try clearing your search query or language filter.'
          }
          actionLabel={projects.length === 0 ? 'Create New Project' : undefined}
          onAction={projects.length === 0 ? () => { window.location.href = '#/projects/new'; } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              title={project.name}
              subtitle={`${project.language} • ${project.framework}`}
              icon={<FileCode className="w-4 h-4 text-brand-400" />}
              headerAction={
                <button
                  onClick={() => handleDelete(project.id)}
                  disabled={deletingId === project.id}
                  className="p-1 rounded text-surface-500 hover:text-rose-400 hover:bg-surface-800 transition-colors disabled:opacity-50"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              }
              footer={
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-surface-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.created_at || (project as any).createdAt || Date.now()).toLocaleDateString()}
                  </span>
                  <Link
                    to="/workspace"
                    onClick={() => setActiveProjectId(project.id)}
                    className="text-brand-400 hover:text-brand-300 font-medium text-xs flex items-center gap-1"
                  >
                    Open Workspace <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              }
            >
              <p className="text-xs text-surface-400 line-clamp-2 leading-relaxed min-h-[32px]">
                {project.description || 'No project description.'}
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
  );
};
