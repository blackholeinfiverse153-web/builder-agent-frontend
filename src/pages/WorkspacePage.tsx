import React, { useState, useEffect } from 'react';
import {
  Terminal,
  FolderTree,
  FileCode,
  Send,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Check,
  X,
  FileDiff,
  ShieldCheck,
  Cpu,
  Loader2,
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useHealth } from '../hooks/useHealth';
import { promptsApi, testingApi, historyApi, jobsApi } from '../services/api';
import {
  ProjectFile,
  ChatMessage,
  LogEntry,
  ActivityHistoryRecord,
  TestResultRecord,
  GenerationJobItem,
  ProposedChange,
} from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { CodeMirrorEditor } from '../components/editor/CodeMirrorEditor';
import {
  executeApprovalAction,
  executeRejectionAction,
  findActivePendingJob,
  getAiProviderStatus,
  getApprovalPolicyStatus,
  parseProposedChanges,
  reconcileSelectedFile,
} from '../utils/aiWorkflow';

export const WorkspacePage: React.FC = () => {
  const {
    activeProject,
    projects,
    setActiveProjectId,
    currentFiles,
    filesLoading,
    filesError,
    error: projectsError,
    addFile,
    deleteFile,
    fetchProjectFiles,
  } = useProjects();
  const { health, loading: healthLoading, error: healthError } = useHealth();
  const aiStatus = getAiProviderStatus(health, healthLoading, healthError);
  const approvalStatus = getApprovalPolicyStatus(health, healthLoading, healthError);

  // File explorer selection state
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

  // Synchronize selectedFile whenever currentFiles changes (updates content, handles deletions/creations)
  useEffect(() => {
    setSelectedFile((prev) => {
      const next = reconcileSelectedFile(currentFiles, prev);
      if (
        prev &&
        next &&
        prev.id === next.id &&
        prev.content === next.content &&
        prev.updated_at === next.updated_at &&
        prev.language === next.language
      ) {
        return prev;
      }
      return next;
    });
  }, [currentFiles]);

  // Prompt chat state
  const [promptInput, setPromptInput] = useState('');
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Pending AI Generation Job & Proposed Changes
  const [pendingJob, setPendingJob] = useState<GenerationJobItem | null>(null);
  const [proposedChanges, setProposedChanges] = useState<ProposedChange[]>([]);
  const [selectedProposedFile, setSelectedProposedFile] = useState<ProposedChange | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'system',
      content: 'Workspace initialized. Enter natural language instructions to guide the builder agent.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Reset and load existing prompts for active project from backend
  useEffect(() => {
    let cancelled = false;

    setSelectedFile(null);
    setPendingJob(null);
    setProposedChanges([]);
    setSelectedProposedFile(null);
    setErrorMessage(null);

    if (!activeProject) {
      setIsLoadingPrompts(false);
      setChatMessages([
        {
          id: 'msg-empty',
          sender: 'system',
          content: 'No active project selected. Select or create a project to begin.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const defaultMsgs: ChatMessage[] = [
      {
        id: `msg-init-${activeProject.id}`,
        sender: 'system',
        content: `Project '${activeProject.name}' loaded from SQLite backend database.`,
        timestamp: new Date(activeProject.created_at || Date.now()).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ];
    setChatMessages(defaultMsgs);
    setIsLoadingPrompts(true);

    promptsApi
      .list(activeProject.id)
      .then(async (existingPrompts) => {
        if (cancelled) return;
        if (existingPrompts && existingPrompts.length > 0) {
          const msgs: ChatMessage[] = [...defaultMsgs];

          // Scan across prompts (newest first) for any active pending_review generation job
          try {
            const pendingResolution = await findActivePendingJob(
              existingPrompts,
              jobsApi.getGenerationJob
            );
            if (cancelled) return;
            if (pendingResolution) {
              setPendingJob(pendingResolution.job);
              setProposedChanges(pendingResolution.changes);
              setSelectedProposedFile(pendingResolution.changes[0] || null);
            }
          } catch (jobErr: any) {
            if (!cancelled) {
              setErrorMessage(jobErr.message || 'Failed to load pending generation job');
            }
          }

          existingPrompts.slice().reverse().forEach((p) => {
            msgs.push({
              id: `prompt-${p.id}`,
              sender: 'user',
              content: p.text,
              timestamp: new Date(p.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            });

            if (p.response) {
              msgs.push({
                id: `resp-${p.id}`,
                sender: 'agent',
                content: p.response,
                timestamp: new Date(p.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                status:
                  p.status === 'blocked_no_provider' || p.status === 'failed'
                    ? 'error'
                    : 'delivered',
              });
            }
          });

          setChatMessages(msgs);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        const msg = err.message || 'Failed to load prompts for project';
        setErrorMessage(msg);
        setLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'error',
            source: 'system',
            message: msg,
          },
        ]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPrompts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  // Bottom panel tab state
  const [bottomTab, setBottomTab] = useState<'logs' | 'tests' | 'audit'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      source: 'system',
      message: 'Builder workspace mounted with SQLite backend connection active.',
    },
  ]);

  // Backend test results and audit history
  const [testResults, setTestResults] = useState<TestResultRecord[]>([]);
  const [auditHistory, setAuditHistory] = useState<ActivityHistoryRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    setTestResults([]);
    setAuditHistory([]);

    if (!activeProject) {
      setIsLoadingMetadata(false);
      return;
    }

    setIsLoadingMetadata(true);
    Promise.allSettled([
      testingApi.getResults(activeProject.id),
      historyApi.list(activeProject.id),
    ])
      .then(([testsRes, historyRes]) => {
        if (cancelled) return;
        if (testsRes.status === 'fulfilled') {
          setTestResults(testsRes.value);
        } else {
          const msg = testsRes.reason?.message || 'Failed to load test results';
          setErrorMessage((prev) => prev || msg);
        }
        if (historyRes.status === 'fulfilled') {
          setAuditHistory(historyRes.value);
        } else {
          const msg = historyRes.reason?.message || 'Failed to load audit history';
          setErrorMessage((prev) => prev || msg);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMetadata(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  // Handle prompt submission
  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || !activeProject) return;

    const userText = promptInput.trim();
    setPromptInput('');
    setIsSubmittingPrompt(true);
    setErrorMessage(null);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        source: 'agent',
        message: `Dispatching prompt to AI backend for project: ${activeProject.name}...`,
      },
    ]);

    try {
      const promptRes = await promptsApi.submit(activeProject.id, userText);

      // Check if a generation job was created with pending proposals
      if (promptRes.generation_job_id) {
        try {
          const job = await jobsApi.getGenerationJob(promptRes.generation_job_id);
          const changes = parseProposedChanges(job.proposed_changes_json);
          if (job.status === 'pending_review' && changes.length > 0) {
            setPendingJob(job);
            setProposedChanges(changes);
            setSelectedProposedFile(changes[0]);
          } else if (pendingJob?.id === job.id) {
            setPendingJob(null);
            setProposedChanges([]);
            setSelectedProposedFile(null);
          }
        } catch (jobErr: any) {
          setErrorMessage(jobErr.message || 'Failed to load generation job details');
        }
      }

      const agentResponseMsg: ChatMessage = {
        id: `ai-${promptRes.id}`,
        sender: 'agent',
        content:
          promptRes.response ||
          `Prompt status: ${promptRes.status}. (AI Provider: ${health?.ai_provider || 'none'})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status:
          promptRes.status === 'blocked_no_provider' || promptRes.status === 'failed'
            ? 'error'
            : 'delivered',
      };
      setChatMessages((prev) => [...prev, agentResponseMsg]);

      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: promptRes.status === 'blocked_no_provider' ? 'warn' : 'info',
          source: 'agent',
          message: `Backend response: [${promptRes.status}] ${promptRes.response || ''}`,
        },
      ]);

      // Refresh audit history
      historyApi
        .list(activeProject.id)
        .then((data) => setAuditHistory(data))
        .catch(() => {});
    } catch (err: any) {
      const errMsg = err.message || 'Prompt submission failed';
      setErrorMessage(errMsg);
      setPromptInput((prev) => prev || userText);

      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          source: 'system',
          message: `Prompt submission failed: ${errMsg}`,
        },
      ]);
    } finally {
      setIsSubmittingPrompt(false);
    }
  };

  // Handle Human Approval of AI Changes
  const handleApproveChanges = async () => {
    if (!pendingJob || !activeProject || isApproving || isRejecting) return;

    const jobToApprove = pendingJob;
    const changesToApprove = [...proposedChanges];

    setIsApproving(true);
    setErrorMessage(null);
    try {
      const outcome = await executeApprovalAction({
        job: jobToApprove,
        proposedChanges: changesToApprove,
        projectId: activeProject.id,
        previousSelectedFile: selectedFile,
        approveJob: jobsApi.approveGenerationJob,
        fetchFiles: fetchProjectFiles,
      });

      setPendingJob(null);
      setProposedChanges([]);
      setSelectedProposedFile(null);
      setSelectedFile(outcome.nextSelectedFile);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `approved-${outcome.updatedJob.id}`,
          sender: 'system',
          content: outcome.confirmationText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered',
          metadata: { filesModified: outcome.approvedPaths },
        },
      ]);

      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          source: 'agent',
          message: `Human approval confirmed. AI changes from job #${outcome.updatedJob.id.slice(0, 8)} applied to project files.`,
        },
      ]);

      // Refresh audit history
      historyApi
        .list(activeProject.id)
        .then((data) => setAuditHistory(data))
        .catch(() => {});
    } catch (err: any) {
      const msg = err.message || 'Failed to approve changes';
      setErrorMessage(msg);
      if (err?.status === 400 && /already been (approved|rejected)/i.test(msg)) {
        setPendingJob(null);
        setProposedChanges([]);
        setSelectedProposedFile(null);
      }
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          source: 'system',
          message: msg,
        },
      ]);
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Human Rejection of AI Changes
  const handleRejectChanges = async () => {
    if (!pendingJob || !activeProject || isApproving || isRejecting) return;

    const jobToReject = pendingJob;
    setIsRejecting(true);
    setErrorMessage(null);
    try {
      const { updatedJob, confirmationText } = await executeRejectionAction({
        job: jobToReject,
        rejectJob: jobsApi.rejectGenerationJob,
      });
      setPendingJob(null);
      setProposedChanges([]);
      setSelectedProposedFile(null);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `rejected-${updatedJob.id}`,
          sender: 'system',
          content: confirmationText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered',
        },
      ]);

      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'warn',
          source: 'agent',
          message: `Human rejection confirmed. Proposal #${updatedJob.id.slice(0, 8)} discarded (original files preserved).`,
        },
      ]);

      // Refresh audit history
      historyApi
        .list(activeProject.id)
        .then((data) => setAuditHistory(data))
        .catch(() => {});
    } catch (err: any) {
      const msg = err.message || 'Failed to reject changes';
      setErrorMessage(msg);
      if (err?.status === 400 && /already been (approved|rejected)/i.test(msg)) {
        setPendingJob(null);
        setProposedChanges([]);
        setSelectedProposedFile(null);
      }
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          source: 'system',
          message: msg,
        },
      ]);
    } finally {
      setIsRejecting(false);
    }
  };

  // Quick file creation
  const handleCreateFile = async () => {
    if (!activeProject) return;
    const fileName = window.prompt('Enter file name (e.g., main.py, app.ts):');
    if (!fileName || !fileName.trim()) return;

    const trimmed = fileName.trim();
    const filePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const ext = trimmed.split('.').pop() || '';
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
      const created = await addFile(activeProject.id, {
        name: trimmed,
        path: filePath,
        content: `# ${trimmed}\n`,
        language: langMap[ext] || 'plaintext',
        is_folder: false,
      });
      setSelectedFile(created);
      setErrorMessage(null);
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          source: 'agent',
          message: `Created file '${created.path}' in project.`,
        },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create file');
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    if (!activeProject) return;
    if (!window.confirm(`Delete file '${filePath}'?`)) return;

    try {
      await deleteFile(activeProject.id, fileId);
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      setErrorMessage(null);
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          source: 'agent',
          message: `Deleted file '${filePath}'.`,
        },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete file');
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col gap-3">
      {/* Workspace Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-900/60 border border-surface-800 rounded-lg text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-surface-400">Project:</span>
          {projects.length > 0 ? (
            <select
              value={activeProject?.id || ''}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="bg-surface-950 border border-surface-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.language})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-amber-400 font-mono">No active project</span>
          )}
          {activeProject && (
            <Badge variant="cyan" size="sm">
              {activeProject.framework}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
              aiStatus.state === 'gemini'
                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                : aiStatus.state === 'unavailable'
                ? 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                : aiStatus.state === 'none'
                ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                : 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
            }`}
          >
            {aiStatus.state === 'none' || aiStatus.state === 'unavailable' ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <Cpu className="w-3 h-3" />
            )}
            AI Provider: {aiStatus.badgeLabel}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
              approvalStatus.state === 'required'
                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                : approvalStatus.state === 'unavailable'
                ? 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
            }`}
          >
            <ShieldCheck className="w-3 h-3" /> Human Gate: {approvalStatus.badgeLabel}
          </span>
        </div>
      </div>

      {/* Main 3-Column Work Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left Column: File Explorer (3 cols) */}
        <div className="lg:col-span-3 rounded-lg border border-surface-800 bg-surface-900/40 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-800 bg-surface-950/60 flex items-center justify-between text-xs">
            <span className="font-semibold text-surface-300 font-mono flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-brand-400" /> Files
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
                {currentFiles.length} items
              </span>
            </div>
          </div>
          <div className="flex-1 p-2 overflow-y-auto space-y-0.5">
            {filesLoading ? (
              <div className="p-4 flex items-center justify-center gap-2 text-xs font-mono text-surface-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                <span>Loading files...</span>
              </div>
            ) : filesError ? (
              <p className="text-xs text-rose-400 p-2 font-mono text-center">{filesError}</p>
            ) : currentFiles.length > 0 ? (
              currentFiles.map((f) => {
                const isSelected = selectedFile?.id === f.id && !selectedProposedFile;
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFile(f);
                      setSelectedProposedFile(null);
                    }}
                    className={`group flex items-center justify-between px-2 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-brand-400' : 'text-surface-500'}`} />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(f.id, f.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-surface-500 hover:text-rose-400 transition-opacity"
                      title="Delete file"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-surface-500 p-2 font-mono text-center">No files in project</p>
            )}
          </div>
        </div>

        {/* Center Column: AI Prompt & Chat Area (5 cols) */}
        <div className="lg:col-span-5 rounded-lg border border-surface-800 bg-surface-900/40 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-800 bg-surface-950/60 flex items-center justify-between text-xs">
            <span className="font-semibold text-surface-300 font-mono flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-brand-400" /> Agent Conversation
            </span>
            <span className="text-[10px] font-mono text-surface-500">
              {isSubmittingPrompt ? 'Generating...' : isLoadingPrompts ? 'Loading...' : 'FastAPI Backend'}
            </span>
          </div>

          {/* Error Banner */}
          {(errorMessage || projectsError) && (
            <div className="p-2.5 mx-3 mt-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1">{errorMessage || projectsError}</span>
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

          {/* Pending Changes Review Card (Phase 6 Human Approval Gate) */}
          {pendingJob && proposedChanges.length > 0 && (
            <div className="m-3 p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/20 backdrop-blur-md shadow-lg space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileDiff className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">AI Proposed Code Changes</span>
                  <Badge variant="warning" size="sm">Pending Approval</Badge>
                </div>
                <span className="text-[10px] text-surface-400">
                  Model: {pendingJob.model || 'gemini'}
                </span>
              </div>

              {pendingJob.explanation && (
                <p className="text-[11px] text-surface-300 bg-surface-950/60 p-2.5 rounded border border-surface-800 leading-relaxed font-sans">
                  {pendingJob.explanation}
                </p>
              )}

              {/* Proposed Files List */}
              <div className="space-y-1">
                <span className="text-[10px] text-surface-500 uppercase tracking-wider">
                  Proposed Files ({proposedChanges.length}):
                </span>
                <div className="space-y-1">
                  {proposedChanges.map((change, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedProposedFile(change)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                        selectedProposedFile?.path === change.path
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                          : 'bg-surface-950/40 text-surface-300 hover:bg-surface-900 border border-transparent'
                      }`}
                    >
                      <span className="truncate">{change.path}</span>
                      <Badge
                        size="sm"
                        variant={
                          change.action === 'create'
                            ? 'success'
                            : change.action === 'delete'
                            ? 'error'
                            : 'warning'
                        }
                      >
                        {change.action.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800">
                <Button
                  size="sm"
                  variant="outline"
                  loading={isRejecting}
                  disabled={isApproving}
                  onClick={handleRejectChanges}
                  icon={<X className="w-3.5 h-3.5" />}
                >
                  Reject Proposal
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  loading={isApproving}
                  disabled={isRejecting}
                  onClick={handleApproveChanges}
                  icon={<Check className="w-3.5 h-3.5" />}
                >
                  Approve & Apply Changes
                </Button>
              </div>
            </div>
          )}

          {/* Messages list */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 font-mono text-xs">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border ${
                  msg.sender === 'user'
                    ? 'bg-brand-950/40 border-brand-500/30 text-surface-100 ml-4'
                    : msg.sender === 'system'
                    ? 'bg-surface-950/60 border-surface-800 text-surface-400'
                    : 'bg-surface-900 border-surface-800 text-surface-200 mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-surface-500 mb-1">
                  <span className="font-bold uppercase tracking-wider text-brand-400">
                    {msg.sender}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.status === 'error' && (
                  <div className="mt-2 text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Action Notice / Blocked
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Prompt input form */}
          <form onSubmit={handleSendPrompt} className="p-2 border-t border-surface-800 bg-surface-950/40">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={
                  isSubmittingPrompt
                    ? 'AI generation in progress...'
                    : activeProject
                    ? 'Instruct agent: "Add an endpoint /users with Pydantic model"...'
                    : 'Select or create a project first...'
                }
                disabled={!activeProject || isSubmittingPrompt}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="flex-1 bg-surface-900 border border-surface-800 rounded-lg px-3 py-2 text-xs text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 font-mono disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmittingPrompt}
                disabled={!activeProject || !promptInput.trim()}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Submit
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Code & Diff Preview Panel (4 cols) */}
        <div className="lg:col-span-4 rounded-lg border border-surface-800 bg-surface-900/40 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-800 bg-surface-950/60 flex items-center justify-between text-xs">
            <span className="font-semibold text-surface-300 font-mono flex items-center gap-1.5 truncate">
              {selectedProposedFile ? (
                <>
                  <FileDiff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-300">Proposed: {selectedProposedFile.path}</span>
                </>
              ) : selectedFile ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{selectedFile.name}</span>
                </>
              ) : (
                'Code Preview'
              )}
            </span>
            <span className="text-[10px] font-mono text-surface-500">
              {selectedProposedFile
                ? `${selectedProposedFile.action.toUpperCase()} (${selectedProposedFile.language})`
                : selectedFile?.language || 'raw'}
            </span>
          </div>
          <div className="flex-1 p-2 overflow-hidden bg-surface-950">
            {selectedProposedFile ? (
              <CodeMirrorEditor
                value={selectedProposedFile.content}
                language={selectedProposedFile.language}
                readOnly={true}
              />
            ) : selectedFile ? (
              <CodeMirrorEditor
                value={selectedFile.content}
                language={selectedFile.language}
                readOnly={true}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-surface-500">
                Select a file from the explorer or review proposed AI changes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Logs & Output Panel */}
      <div className="h-44 rounded-lg border border-surface-800 bg-surface-900/40 flex flex-col overflow-hidden shrink-0">
        {/* Tab Header */}
        <div className="px-3 py-1.5 border-b border-surface-800 bg-surface-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBottomTab('logs')}
              className={`px-2.5 py-1 rounded font-mono text-xs transition-colors ${
                bottomTab === 'logs'
                  ? 'bg-surface-800 text-white font-medium'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              Execution Logs ({logs.length})
            </button>
            <button
              onClick={() => setBottomTab('tests')}
              className={`px-2.5 py-1 rounded font-mono text-xs transition-colors ${
                bottomTab === 'tests'
                  ? 'bg-surface-800 text-white font-medium'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              Test Results ({testResults.length})
            </button>
            <button
              onClick={() => setBottomTab('audit')}
              className={`px-2.5 py-1 rounded font-mono text-xs transition-colors ${
                bottomTab === 'audit'
                  ? 'bg-surface-800 text-white font-medium'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              Audit History ({auditHistory.length})
            </button>
          </div>
          <button
            onClick={() => setLogs([])}
            className="p-1 rounded text-surface-500 hover:text-rose-400 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-2.5 font-mono text-xs overflow-y-auto space-y-1 bg-surface-950">
          {bottomTab === 'logs' && (
            logs.length === 0 ? (
              <p className="text-surface-500 text-[11px]">No active logs.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="text-surface-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`font-semibold shrink-0 uppercase text-[10px] px-1 rounded ${
                      log.level === 'warn'
                        ? 'bg-amber-500/20 text-amber-400'
                        : log.level === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : log.level === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-brand-500/20 text-brand-400'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-surface-300">{log.message}</span>
                </div>
              ))
            )
          )}

          {bottomTab === 'tests' && (
            <div className="space-y-1 text-[11px]">
              {isLoadingMetadata ? (
                <p className="text-surface-400 text-[11px] flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading test results...
                </p>
              ) : testResults.length === 0 ? (
                <p className="text-surface-500 text-[11px]">No test runs recorded for this project in the backend database.</p>
              ) : (
                testResults.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{r.test_suite} [Passed: {r.passed_count}, Failed: {r.failed_count}] ({r.duration_seconds.toFixed(2)}s)</span>
                  </div>
                ))
              )}
            </div>
          )}

          {bottomTab === 'audit' && (
            <div className="text-[11px] text-surface-400 space-y-1">
              {isLoadingMetadata ? (
                <p className="text-surface-400 text-[11px] flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading audit history...
                </p>
              ) : auditHistory.length === 0 ? (
                <p className="text-surface-500 text-[11px]">No activity history logged yet.</p>
              ) : (
                auditHistory.map((h) => (
                  <div key={h.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-surface-500 shrink-0">
                      [{new Date(h.created_at).toLocaleTimeString()}]
                    </span>
                    <span className="text-cyan-400 font-semibold uppercase text-[10px]">
                      {h.action_type}:
                    </span>
                    <span className="text-surface-300">{h.description}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
