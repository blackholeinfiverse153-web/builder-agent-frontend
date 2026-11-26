import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FolderPlus, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SupportedLanguage, SupportedFramework } from '../types';

export const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { addProject } = useProjects();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [framework, setFramework] = useState<SupportedFramework>('fastapi');
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = () => {
    const errs: { name?: string } = {};
    if (!name.trim()) {
      errs.name = 'Project name is required';
    } else if (name.length < 3) {
      errs.name = 'Project name must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
      errs.name = 'Project name can only contain letters, numbers, hyphens, and underscores';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      await addProject({
        name: name.trim(),
        description: description.trim(),
        language,
        framework,
      });
      navigate('/workspace');
    } catch (err: any) {
      setApiError(err.message || 'Failed to initialize project on backend server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-surface-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects Directory
        </Link>
      </div>

      <Card
        title="Create New Project"
        subtitle="Initialize a structured sandbox project with starter files."
        icon={<FolderPlus className="w-5 h-5 text-brand-400" />}
      >
        {apiError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{apiError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project Name Field */}
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. ai-data-pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full bg-surface-900 border rounded-lg px-3.5 py-2 text-xs text-surface-100 placeholder-surface-500 focus:outline-none transition-colors ${
                errors.name
                  ? 'border-rose-500/80 focus:border-rose-500'
                  : 'border-surface-800 focus:border-brand-500'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {errors.name}
              </p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Describe the application goals, expected endpoints, or user requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-900 border border-surface-800 rounded-lg p-3 text-xs text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          {/* Language Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                Programming Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2 text-xs text-surface-200 focus:outline-none focus:border-brand-500"
              >
                <option value="python">Python</option>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>

            {/* Framework Selection */}
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                Framework Template
              </label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value as SupportedFramework)}
                className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2 text-xs text-surface-200 focus:outline-none focus:border-brand-500"
              >
                <option value="fastapi">FastAPI</option>
                <option value="react">React</option>
                <option value="express">Express</option>
                <option value="node">Node.js Clean</option>
                <option value="vanilla">Vanilla</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate('/projects')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              icon={<Check className="w-4 h-4" />}
            >
              {submitting ? 'Creating Project...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
