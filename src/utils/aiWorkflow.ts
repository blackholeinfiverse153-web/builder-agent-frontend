import {
  ActivityHistoryRecord,
  GenerationJobItem,
  HealthData,
  ProjectFile,
  PromptItem,
  ProposedChange,
} from '../types';

export type StatusBadgeVariant = 'brand' | 'success' | 'warning' | 'error' | 'neutral' | 'cyan';

export interface AiProviderStatusDisplay {
  state: 'loading' | 'unavailable' | 'none' | 'gemini' | 'configured';
  badgeLabel: string;
  badgeVariant: StatusBadgeVariant;
  gateLabel: string;
  gateTextClass: string;
  navTextClass: string;
  description: string;
}

export interface ApprovalPolicyDisplay {
  state: 'loading' | 'unavailable' | 'required' | 'optional';
  badgeLabel: string;
  badgeVariant: StatusBadgeVariant;
  policyLabel: string;
  settingsValue: string;
  navLabel: string;
  textClass: string;
}

export function getAiProviderStatus(
  health: HealthData | null,
  healthLoading: boolean,
  healthError: string | null
): AiProviderStatusDisplay {
  if (healthLoading && !health) {
    return {
      state: 'loading',
      badgeLabel: 'Checking...',
      badgeVariant: 'neutral',
      gateLabel: 'Checking backend...',
      gateTextClass: 'text-surface-400 font-medium',
      navTextClass: 'text-surface-400 font-semibold',
      description: 'Checking configured AI provider telemetry from backend /api/v1/health.',
    };
  }

  if (healthError || !health) {
    return {
      state: 'unavailable',
      badgeLabel: 'Unavailable',
      badgeVariant: 'error',
      gateLabel: 'Backend Unavailable',
      gateTextClass: 'text-rose-400 font-medium',
      navTextClass: 'text-rose-400 font-semibold',
      description: 'Unable to reach backend /health endpoint to verify AI provider configuration.',
    };
  }

  const provider = (health.ai_provider || 'none').trim().toLowerCase();
  if (provider === 'none') {
    return {
      state: 'none',
      badgeLabel: 'none (clean)',
      badgeVariant: 'warning',
      gateLabel: 'Disabled (AI_PROVIDER=none)',
      gateTextClass: 'text-amber-400 font-medium',
      navTextClass: 'text-amber-400 font-semibold',
      description: 'AI generation is disabled (AI_PROVIDER=none). Configure a provider key in backend .env to enable proposals.',
    };
  }

  if (provider === 'gemini') {
    return {
      state: 'gemini',
      badgeLabel: 'Gemini',
      badgeVariant: 'success',
      gateLabel: 'Gemini Active (Approval Gated)',
      gateTextClass: 'text-emerald-400 font-medium',
      navTextClass: 'text-emerald-400 font-semibold',
      description: 'Google Gemini code generation is active. Proposed file changes require explicit human approval before applying.',
    };
  }

  return {
    state: 'configured',
    badgeLabel: health.ai_provider,
    badgeVariant: 'cyan',
    gateLabel: `${health.ai_provider} Active`,
    gateTextClass: 'text-cyan-400 font-medium',
    navTextClass: 'text-cyan-400 font-semibold',
    description: `Configured AI provider '${health.ai_provider}' is active with explicit approval gating.`,
  };
}

export function getApprovalPolicyStatus(
  health: HealthData | null,
  healthLoading: boolean,
  healthError: string | null
): ApprovalPolicyDisplay {
  if (healthLoading && !health) {
    return {
      state: 'loading',
      badgeLabel: 'Checking...',
      badgeVariant: 'neutral',
      policyLabel: 'Checking...',
      settingsValue: 'Checking...',
      navLabel: 'Approval: Checking',
      textClass: 'text-surface-400',
    };
  }

  if (healthError || !health) {
    return {
      state: 'unavailable',
      badgeLabel: 'Unavailable',
      badgeVariant: 'error',
      policyLabel: 'Backend Unavailable',
      settingsValue: 'Unavailable',
      navLabel: 'Approval: Offline',
      textClass: 'text-rose-400',
    };
  }

  if (health.require_human_approval) {
    return {
      state: 'required',
      badgeLabel: 'Required',
      badgeVariant: 'success',
      policyLabel: 'Strict Enforced',
      settingsValue: 'Enforced (True)',
      navLabel: 'Approval: Strict',
      textClass: 'text-emerald-400',
    };
  }

  return {
    state: 'optional',
    badgeLabel: 'Not Enforced (Config)',
    badgeVariant: 'warning',
    policyLabel: 'Manual Review Required',
    settingsValue: 'Disabled (False)',
    navLabel: 'Approval: Config Off',
    textClass: 'text-amber-400',
  };
}

/**
 * Reconcile selectedFile with the latest list of project files after an approval or refresh.
 * Ensures updated content replaces stale objects, deleted files fall back cleanly, and
 * newly created files can be surfaced if no prior selection remains.
 */
export function reconcileSelectedFile(
  files: ProjectFile[],
  previousSelected: ProjectFile | null,
  preferredPaths: string[] = []
): ProjectFile | null {
  if (files.length === 0) {
    return null;
  }

  if (previousSelected) {
    const updatedMatch =
      files.find((f) => f.id === previousSelected.id) ||
      files.find((f) => f.path === previousSelected.path);
    if (updatedMatch) {
      return updatedMatch;
    }
  }

  for (const path of preferredPaths) {
    const createdOrUpdated = files.find((f) => f.path === path);
    if (createdOrUpdated) {
      return createdOrUpdated;
    }
  }

  return files[0];
}

export function parseProposedChanges(proposedChangesJson?: string | null): ProposedChange[] {
  if (!proposedChangesJson) return [];
  try {
    const parsed = JSON.parse(proposedChangesJson);
    return Array.isArray(parsed) ? (parsed as ProposedChange[]) : [];
  } catch {
    return [];
  }
}

export interface PendingJobResolution {
  job: GenerationJobItem;
  changes: ProposedChange[];
}

/**
 * Scan prompts in order (newest first) to locate the active pending_review generation job,
 * instead of inspecting only existingPrompts[0].
 */
export async function findActivePendingJob(
  prompts: PromptItem[],
  fetchGenerationJob: (jobId: string) => Promise<GenerationJobItem>
): Promise<PendingJobResolution | null> {
  if (!prompts || prompts.length === 0) return null;

  const terminalStatuses = new Set(['completed', 'rejected', 'failed', 'blocked_no_provider']);
  const candidatePrompts = [
    ...prompts.filter((p) => p.generation_job_id && p.status === 'pending_review'),
    ...prompts.filter(
      (p) =>
        p.generation_job_id &&
        p.status !== 'pending_review' &&
        !terminalStatuses.has(p.status)
    ),
  ];

  const seenJobIds = new Set<string>();
  for (const prompt of candidatePrompts) {
    const jobId = prompt.generation_job_id;
    if (!jobId || seenJobIds.has(jobId)) continue;
    seenJobIds.add(jobId);

    const job = await fetchGenerationJob(jobId);
    if (job.status === 'pending_review') {
      const changes = parseProposedChanges(job.proposed_changes_json);
      if (changes.length > 0) {
        return { job, changes };
      }
    }
  }

  return null;
}

export function filterActivityHistory(
  items: ActivityHistoryRecord[],
  filterType: string
): ActivityHistoryRecord[] {
  if (filterType === 'all') return items;
  return items.filter((item) => item.action_type === filterType);
}

export interface ApprovalExecutionOutcome {
  updatedJob: GenerationJobItem;
  refreshedFiles: ProjectFile[];
  nextSelectedFile: ProjectFile | null;
  confirmationText: string;
  approvedPaths: string[];
}

export async function executeApprovalAction(params: {
  job: GenerationJobItem;
  proposedChanges: ProposedChange[];
  projectId: string;
  previousSelectedFile: ProjectFile | null;
  approveJob: (jobId: string) => Promise<GenerationJobItem>;
  fetchFiles: (projectId: string) => Promise<ProjectFile[]>;
}): Promise<ApprovalExecutionOutcome> {
  const { job, proposedChanges, projectId, previousSelectedFile, approveJob, fetchFiles } = params;
  const approvedPaths = proposedChanges.map((c) => c.path);
  const updatedJob = await approveJob(job.id);
  const refreshedFiles = await fetchFiles(projectId);
  const nextSelectedFile = reconcileSelectedFile(refreshedFiles, previousSelectedFile, approvedPaths);
  const confirmationText = `Approved and applied ${proposedChanges.length} proposed change(s) from job #${updatedJob.id.slice(0, 8)} to project files.`;
  return {
    updatedJob,
    refreshedFiles,
    nextSelectedFile,
    confirmationText,
    approvedPaths,
  };
}

export async function executeRejectionAction(params: {
  job: GenerationJobItem;
  rejectJob: (jobId: string) => Promise<GenerationJobItem>;
}): Promise<{ updatedJob: GenerationJobItem; confirmationText: string }> {
  const updatedJob = await params.rejectJob(params.job.id);
  const confirmationText = `Rejected AI proposal #${updatedJob.id.slice(0, 8)}. Original project files were preserved.`;
  return { updatedJob, confirmationText };
}

export interface GenerationFailureNotice {
  message: string;
  retryHint: string | null;
  canRetry: boolean;
}

export function formatGenerationFailureNotice(
  rawMessage?: string | null,
  options: { httpStatus?: number; status?: string } = {}
): GenerationFailureNotice {
  const cleaned = (rawMessage || '').trim();
  const lower = cleaned.toLowerCase();
  const httpStatus = options.httpStatus;

  if (options.status === 'blocked_no_provider' || lower.includes("provider is 'none'")) {
    return {
      message:
        cleaned ||
        "AI provider is 'none'. Generation blocked until a provider is configured in backend environment.",
      retryHint:
        'Configure AI_PROVIDER=gemini and GEMINI_API_KEY in backend .env, then restart the backend.',
      canRetry: false,
    };
  }

  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    /authentication failed|api key|forbidden|do not own|unauthorized/.test(lower)
  ) {
    return {
      message: cleaned || 'AI provider authentication or permission check failed.',
      retryHint: 'Verify backend API key credentials or project ownership before trying again.',
      canRetry: false,
    };
  }

  if (/configuration is invalid|model .* unavailable|not configured/.test(lower)) {
    return {
      message: cleaned || 'AI provider configuration is invalid or unavailable.',
      retryHint:
        'Check AI_PROVIDER, GEMINI_MODEL, and GEMINI_API_KEY in backend .env, then restart the backend.',
      canRetry: false,
    };
  }

  if (httpStatus === 429 || /rate limit|quota|too many/.test(lower)) {
    return {
      message: cleaned || 'Rate limit exceeded. Please wait before submitting another prompt.',
      retryHint: 'Wait a few seconds for cooldown or quota reset, then click Submit manually to retry.',
      canRetry: true,
    };
  }

  if (httpStatus === 409 || /already running|conflict/.test(lower)) {
    return {
      message: cleaned || 'A code generation job is already running.',
      retryHint: 'Wait for the current generation job to finish, then click Submit manually if needed.',
      canRetry: true,
    };
  }

  if (/timed out|timeout|deadline/.test(lower)) {
    return {
      message: cleaned || 'AI generation request timed out.',
      retryHint:
        'Try breaking your instruction into smaller steps or targeting fewer files, then click Submit manually to retry.',
      canRetry: true,
    };
  }

  if (
    httpStatus === 400 ||
    httpStatus === 422 ||
    /structured json|truncated|incomplete|empty response|did not propose|validation|schema/.test(lower)
  ) {
    return {
      message: cleaned || 'AI response could not be parsed or validated.',
      retryHint:
        'Rephrase your instruction with clear target file paths and expected behavior, then click Submit manually to retry.',
      canRetry: true,
    };
  }

  if (
    httpStatus === 0 ||
    (httpStatus !== undefined && httpStatus >= 500) ||
    /network failure|service unavailable/.test(lower)
  ) {
    return {
      message: cleaned || 'Unable to reach AI generation service.',
      retryHint: 'Check backend connectivity and click Submit manually to retry.',
      canRetry: true,
    };
  }

  return {
    message: cleaned || 'AI code generation failed.',
    retryHint: 'Review your prompt and click Submit manually to try again.',
    canRetry: true,
  };
}

export interface PromptSubmissionOutcome {
  promptRes: PromptItem;
  job: GenerationJobItem | null;
  pendingProposal: PendingJobResolution | null;
  agentMessageContent: string;
  agentMessageStatus: 'delivered' | 'error';
  failureStatus?: 'failed' | 'blocked_no_provider';
  failureNotice: GenerationFailureNotice | null;
  logLevel: 'info' | 'warn' | 'error';
  logMessage: string;
  preservePromptInput: boolean;
}

export async function executePromptSubmission(params: {
  projectId: string;
  promptText: string;
  aiProviderLabel?: string;
  submitPrompt: (projectId: string, text: string) => Promise<PromptItem>;
  fetchGenerationJob: (jobId: string) => Promise<GenerationJobItem>;
}): Promise<PromptSubmissionOutcome> {
  const { projectId, promptText, aiProviderLabel = 'none', submitPrompt, fetchGenerationJob } = params;
  const promptRes = await submitPrompt(projectId, promptText);

  let job: GenerationJobItem | null = null;
  let jobLoadError: string | null = null;
  if (promptRes.generation_job_id) {
    try {
      job = await fetchGenerationJob(promptRes.generation_job_id);
    } catch (err: any) {
      jobLoadError = err?.message || 'Failed to load generation job details';
    }
  }

  const isBlocked =
    promptRes.status === 'blocked_no_provider' || job?.status === 'blocked_no_provider';
  const isFailed = !isBlocked && (promptRes.status === 'failed' || job?.status === 'failed');

  if (isFailed) {
    const rawReason =
      job?.error_message || promptRes.response || 'AI code generation failed.';
    const notice = formatGenerationFailureNotice(rawReason, { status: 'failed' });
    return {
      promptRes,
      job,
      pendingProposal: null,
      agentMessageContent: notice.message,
      agentMessageStatus: 'error',
      failureStatus: 'failed',
      failureNotice: notice,
      logLevel: 'error',
      logMessage: `AI generation failed: ${notice.message}`,
      preservePromptInput: true,
    };
  }

  if (isBlocked) {
    const blockedMsg =
      promptRes.response ||
      job?.error_message ||
      `Prompt status: ${promptRes.status}. (AI Provider: ${aiProviderLabel})`;
    const notice = formatGenerationFailureNotice(blockedMsg, {
      status: 'blocked_no_provider',
    });
    return {
      promptRes,
      job,
      pendingProposal: null,
      agentMessageContent: blockedMsg,
      agentMessageStatus: 'error',
      failureStatus: 'blocked_no_provider',
      failureNotice: notice,
      logLevel: 'warn',
      logMessage: `Backend response: [${promptRes.status}] ${blockedMsg}`,
      preservePromptInput: false,
    };
  }

  const parsedChanges = job ? parseProposedChanges(job.proposed_changes_json) : [];
  if (job && job.status === 'pending_review' && parsedChanges.length > 0) {
    const content =
      promptRes.response ||
      job.explanation ||
      `Generated ${parsedChanges.length} proposed change(s) pending your review.`;
    return {
      promptRes,
      job,
      pendingProposal: { job, changes: parsedChanges },
      agentMessageContent: content,
      agentMessageStatus: 'delivered',
      failureNotice: null,
      logLevel: 'info',
      logMessage: `Backend response: [${promptRes.status}] ${content}`,
      preservePromptInput: false,
    };
  }

  if (jobLoadError) {
    const notice = formatGenerationFailureNotice(jobLoadError);
    return {
      promptRes,
      job: null,
      pendingProposal: null,
      agentMessageContent: promptRes.response || jobLoadError,
      agentMessageStatus: 'error',
      failureStatus: 'failed',
      failureNotice: notice,
      logLevel: 'error',
      logMessage: `Generation job lookup failed: ${notice.message}`,
      preservePromptInput: false,
    };
  }

  const fallbackContent =
    promptRes.response ||
    `Prompt status: ${promptRes.status}. (AI Provider: ${aiProviderLabel})`;
  return {
    promptRes,
    job,
    pendingProposal: null,
    agentMessageContent: fallbackContent,
    agentMessageStatus: 'delivered',
    failureNotice: null,
    logLevel: 'info',
    logMessage: `Backend response: [${promptRes.status}] ${fallbackContent}`,
    preservePromptInput: false,
  };
}
