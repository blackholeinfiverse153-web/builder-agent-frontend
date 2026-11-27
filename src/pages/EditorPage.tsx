import React, { useState, useEffect } from 'react';
import {
  Code2,
  Save,
  Check,
  FolderTree,
  FileCode,
  Circle,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { ProjectFile } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { CodeMirrorEditor } from '../components/editor/CodeMirrorEditor';

export const EditorPage: React.FC = () => {
  const {
    activeProject,
    currentFiles,
    updateFile,
    addFile,
    deleteFile,
    loading: projectsLoading,
    filesLoading,
    filesError,
  } = useProjects();

  // Active open file state
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize with the first file or maintain active file
  useEffect(() => {
    if (currentFiles.length > 0) {
      if (!activeFile || !currentFiles.some((f) => f.id === activeFile.id)) {
        setActiveFile(currentFiles[0]);
        setFileContent(currentFiles[0].content);
        setIsDirty(false);
      } else {
        // Sync any external file changes if not locally dirty
        const updated = currentFiles.find((f) => f.id === activeFile.id);
        if (updated && !isDirty && updated.content !== fileContent) {
          setFileContent(updated.content);
        }
      }
    } else {
      setActiveFile(null);
      setFileContent('');
      setIsDirty(false);
    }
  }, [currentFiles, activeFile, isDirty]);

  const handleSelectFile = (file: ProjectFile) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Discard and switch file?')) {
        return;
      }
    }
    setActiveFile(file);
    setFileContent(file.content);
    setIsDirty(false);
  };

  const handleContentChange = (newVal: string) => {
    setFileContent(newVal);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!activeFile || !activeProject || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updated = await updateFile(activeProject.id, activeFile.id, {
        content: fileContent,
      });
      setActiveFile(updated);
      setIsDirty(false);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save file to backend');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, activeFile, activeProject, fileContent]);

  const handleCreateFile = async () => {
    if (!activeProject) return;
    const fileName = window.prompt('Enter file name (e.g. index.ts, utils.py):');
    if (!fileName || !fileName.trim()) return;

    const trimmed = fileName.trim().replace(/\\/g, '/');
    const filePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const fileNameOnly = filePath.split('/').pop() || trimmed;
    const ext = fileNameOnly.split('.').pop() || '';
    const langMap: Record<string, string> = {
      py: 'python',
      ts: 'typescript',
      js: 'javascript',
      json: 'json',
      md: 'markdown',
      html: 'html',
      css: 'css',
    };

    try {
      setErrorMessage(null);
      const newFile = await addFile(activeProject.id, {
        name: fileNameOnly,
        path: filePath,
        content: `# ${fileNameOnly}\n\n`,
        language: langMap[ext] || 'plaintext',
        is_folder: false,
      });
      setActiveFile(newFile);
      setFileContent(newFile.content);
      setIsDirty(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create file');
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    if (!activeProject) return;
    if (!window.confirm(`Delete file '${filePath}' permanently?`)) return;

    try {
      setErrorMessage(null);
      await deleteFile(activeProject.id, fileId);
      if (activeFile?.id === fileId) {
        setActiveFile(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete file');
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col gap-3">
      {(errorMessage || filesError) && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{errorMessage || filesError}</span>
          {errorMessage && (
            <button
              onClick={() => setErrorMessage(null)}
              className="text-surface-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {/* Editor Top Control Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-900/60 border border-surface-800 rounded-lg text-xs">
        <div className="flex items-center gap-3">
          <Code2 className="w-4 h-4 text-brand-400" />
          <span className="font-semibold text-white font-mono">
            {activeFile ? activeFile.path : 'No file selected'}
          </span>
          {activeFile && (
            <Badge variant="neutral" size="sm">
              {activeFile.language}
            </Badge>
          )}
          {isDirty ? (
            <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
              <Circle className="w-2 h-2 fill-amber-400" /> Unsaved changes
            </span>
          ) : savedMessage ? (
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <Check className="w-3 h-3" /> All changes saved in SQLite
            </span>
          ) : (
            <span className="text-[11px] font-mono text-surface-500">Saved</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-surface-500 mr-2 hidden sm:inline">
            Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-surface-800 text-surface-300">Ctrl+S</kbd>
          </span>
          <Button
            size="sm"
            variant={isDirty ? 'primary' : 'secondary'}
            onClick={handleSave}
            disabled={!isDirty || isSaving || !activeFile}
            loading={isSaving}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            {isSaving ? 'Saving...' : 'Save File'}
          </Button>
        </div>
      </div>

      {/* Editor Main Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0">
        {/* Left Column: File Selector (3 cols) */}
        <div className="md:col-span-3 rounded-lg border border-surface-800 bg-surface-900/40 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-800 bg-surface-950/60 flex items-center justify-between text-xs">
            <span className="font-semibold text-surface-300 font-mono flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-brand-400" /> Project Files
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreateFile}
                disabled={!activeProject}
                className="p-1 rounded text-surface-400 hover:text-brand-300 hover:bg-surface-800 transition-colors disabled:opacity-50"
                title="Create file"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-surface-500">
                {currentFiles.length} files
              </span>
            </div>
          </div>
          <div className="flex-1 p-2 overflow-y-auto space-y-1">
            {projectsLoading || filesLoading ? (
              <div className="p-4 text-center text-surface-500 font-mono text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading files...
              </div>
            ) : currentFiles.length === 0 ? (
              <p className="text-surface-500 text-xs font-mono p-3 text-center">
                {activeProject ? 'No files in this project yet.' : 'Select a project to view files.'}
              </p>
            ) : (
              currentFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 text-xs font-mono rounded cursor-pointer transition-colors ${
                    activeFile?.id === file.id
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                      : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.id, file.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-surface-500 hover:text-rose-400 transition-opacity"
                    title="Delete file"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: CodeMirror Editor (9 cols) */}
        <div className="md:col-span-9 rounded-lg border border-surface-800 bg-surface-950 flex flex-col overflow-hidden">
          {activeFile ? (
            <div className="flex-1 p-1 overflow-hidden">
              <CodeMirrorEditor
                value={fileContent}
                language={activeFile.language}
                onChange={handleContentChange}
                readOnly={false}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-surface-500 font-mono text-xs p-6 text-center">
              <FileCode className="w-8 h-8 text-surface-600 mb-2" />
              <p>No file selected</p>
              <p className="text-[11px] text-surface-600 mt-1">
                Select a file from the explorer or create a new file to start editing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
