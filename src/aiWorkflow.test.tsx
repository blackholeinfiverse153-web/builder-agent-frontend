import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import {
  executeApprovalAction,
  executeRejectionAction,
  filterActivityHistory,
  findActivePendingJob,
  getAiProviderStatus,
  getApprovalPolicyStatus,
  reconcileSelectedFile,
} from './utils/aiWorkflow';
import { ApiError, formatHttpErrorMessage } from './services/api';
import {
  ActivityHistoryRecord,
  GenerationJobItem,
  HealthData,
  ProjectFile,
  PromptItem,
} from './types';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { HistoryPage } from './pages/HistoryPage';
import { TopNav } from './components/layout/TopNav';

const mockUseHealth = vi.fn();
const mockUseProjects = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('./hooks/useHealth', () => ({
  useHealth: () => mockUseHealth(),
}));

vi.mock('./hooks/useProjects', () => ({
  useProjects: () => mockUseProjects(),
}));

vi.mock('./context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const baseHealth: HealthData = {
  status: 'healthy',
  version: '0.1.0',
  environment: 'development',
  python_version: '3.12.10',
  database_url_configured: true,
  ai_provider: 'none',
  require_human_approval: true,
};

describe('Phase 2 Step 2.3 — AI Workflow, Telemetry & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'dev@bhiv.io',
        full_name: 'Dev User',
        is_active: true,
        created_at: '2026-11-27T00:00:00Z',
      },
      logout: vi.fn(),
    });
    mockUseProjects.mockReturnValue({
      projects: [],
      activeProject: null,
      activeProjectId: null,
      currentFiles: [],
      loading: false,
      error: null,
      filesLoading: false,
      filesError: null,
      setActiveProjectId: vi.fn(),
    });
  });

  describe('Workspace File Synchronization', () => {
    it('updates selectedFile content when approved changes modify the open file', () => {
      const oldFile: ProjectFile = {
        id: 'f1',
        project_id: 'p1',
        name: 'app.py',
        path: '/app.py',
        content: 'print("old")\n',
        language: 'python',
        is_folder: false,
        size_bytes: 13,
        created_at: '2026-11-27T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
      };
      const updatedFile: ProjectFile = {
        ...oldFile,
        content: 'print("updated by AI")\n',
        size_bytes: 23,
        updated_at: '2026-11-27T00:05:00Z',
      };

      const reconciled = reconcileSelectedFile([updatedFile], oldFile, ['/app.py']);
      expect(reconciled).not.toBeNull();
      expect(reconciled?.content).toBe('print("updated by AI")\n');
      expect(reconciled?.updated_at).toBe('2026-11-27T00:05:00Z');
    });

    it('falls back cleanly when selectedFile is deleted or new file is created', () => {
      const deletedFile: ProjectFile = {
        id: 'f-del',
        project_id: 'p1',
        name: 'old.py',
        path: '/old.py',
        content: '',
        language: 'python',
        is_folder: false,
        size_bytes: 0,
        created_at: '2026-11-27T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
      };
      const newFile: ProjectFile = {
        id: 'f-new',
        project_id: 'p1',
        name: 'new.py',
        path: '/new.py',
        content: 'x = 1\n',
        language: 'python',
        is_folder: false,
        size_bytes: 6,
        created_at: '2026-11-27T00:01:00Z',
        updated_at: '2026-11-27T00:01:00Z',
      };

      const afterDelete = reconcileSelectedFile([newFile], deletedFile, ['/new.py']);
      expect(afterDelete?.id).toBe('f-new');
      expect(reconcileSelectedFile([], deletedFile)).toBeNull();
    });
  });

  describe('Pending Job Discovery Across Prompts', () => {
    it('finds active pending_review job even when existingPrompts[0] failed or was blocked', async () => {
      const prompts: PromptItem[] = [
        {
          id: 'pr-latest-failed',
          project_id: 'p1',
          user_id: 'u1',
          text: 'Latest prompt that failed',
          status: 'failed',
          response: 'Rate limit exceeded',
          generation_job_id: 'job-failed',
          created_at: '2026-11-27T00:02:00Z',
        },
        {
          id: 'pr-older-pending',
          project_id: 'p1',
          user_id: 'u1',
          text: 'Earlier prompt awaiting approval',
          status: 'pending_review',
          response: 'Added /src/health.py',
          generation_job_id: 'job-pending-2',
          created_at: '2026-11-27T00:01:00Z',
        },
      ];

      const pendingJob: GenerationJobItem = {
        id: 'job-pending-2',
        project_id: 'p1',
        prompt_id: 'pr-older-pending',
        status: 'pending_review',
        ai_provider: 'gemini',
        model: 'gemini-2.5-flash',
        explanation: 'Added /src/health.py',
        proposed_changes_json: JSON.stringify([
          { path: '/src/health.py', content: 'def ok(): return True\n', language: 'python', action: 'create' },
        ]),
        created_at: '2026-11-27T00:01:00Z',
      };

      const fetchJob = vi.fn(async (jobId: string) => {
        if (jobId === 'job-pending-2') return pendingJob;
        throw new Error(`Unexpected fetch for ${jobId}`);
      });

      const resolved = await findActivePendingJob(prompts, fetchJob);
      expect(resolved).not.toBeNull();
      expect(resolved?.job.id).toBe('job-pending-2');
      expect(resolved?.changes).toHaveLength(1);
      expect(resolved?.changes[0].path).toBe('/src/health.py');
      expect(fetchJob).toHaveBeenCalledTimes(1);
    });

    it('skips pending_review jobs with empty proposed_changes_json', async () => {
      const prompts: PromptItem[] = [
        {
          id: 'pr-empty',
          project_id: 'p1',
          user_id: 'u1',
          text: 'Empty proposal',
          status: 'pending_review',
          generation_job_id: 'job-empty',
          created_at: '2026-11-27T00:01:00Z',
        },
      ];
      const fetchJob = vi.fn(async (): Promise<GenerationJobItem> => ({
        id: 'job-empty',
        project_id: 'p1',
        status: 'pending_review',
        ai_provider: 'gemini',
        proposed_changes_json: '[]',
        created_at: '2026-11-27T00:01:00Z',
      }));

      const resolved = await findActivePendingJob(prompts, fetchJob);
      expect(resolved).toBeNull();
    });
  });

  describe('Live AI Provider & Human Approval Telemetry Rendering', () => {
    it('distinguishes none, gemini, unavailable, and loading states cleanly', () => {
      expect(getAiProviderStatus(null, true, null).state).toBe('loading');
      expect(getAiProviderStatus(null, false, 'Network down').state).toBe('unavailable');
      expect(getAiProviderStatus({ ...baseHealth, ai_provider: 'none' }, false, null).state).toBe('none');

      const gemini = getAiProviderStatus({ ...baseHealth, ai_provider: 'gemini' }, false, null);
      expect(gemini.state).toBe('gemini');
      expect(gemini.badgeLabel).toBe('Gemini');
      expect(gemini.gateLabel).not.toContain('No Provider Configured');

      const approvalOff = getApprovalPolicyStatus(
        { ...baseHealth, require_human_approval: false },
        false,
        null
      );
      expect(approvalOff.state).toBe('optional');
      expect(approvalOff.settingsValue).toBe('Disabled (False)');
    });

    it('renders Gemini active status on DashboardPage, SettingsPage, and TopNav without hardcoded none text', () => {
      mockUseHealth.mockReturnValue({
        health: { ...baseHealth, ai_provider: 'gemini', require_human_approval: true },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const dashboardHtml = renderToStaticMarkup(
        <StaticRouter location="/">
          <DashboardPage />
        </StaticRouter>
      );
      expect(dashboardHtml).toContain('Gemini');
      expect(dashboardHtml).toContain('Gemini Active (Approval Gated)');
      expect(dashboardHtml).not.toContain('No Provider Configured');

      const settingsHtml = renderToStaticMarkup(<SettingsPage />);
      expect(settingsHtml).toContain('Gemini');
      expect(settingsHtml).toContain('Enforced (True)');

      const topNavHtml = renderToStaticMarkup(
        <TopNav
          pageTitle="Dashboard"
          health={{ ...baseHealth, ai_provider: 'gemini', require_human_approval: false }}
          healthLoading={false}
          healthError={null}
          onOpenMobileSidebar={vi.fn()}
        />
      );
      expect(topNavHtml).toContain('Gemini');
      expect(topNavHtml).toContain('Approval: Config Off');
    });

    it('renders Unavailable status instead of false online/none state when backend is unreachable', () => {
      mockUseHealth.mockReturnValue({
        health: null,
        loading: false,
        error: 'Network failure',
        refetch: vi.fn(),
      });

      const dashboardHtml = renderToStaticMarkup(
        <StaticRouter location="/">
          <DashboardPage />
        </StaticRouter>
      );
      expect(dashboardHtml).toContain('Unavailable');
      expect(dashboardHtml).toContain('Backend Unavailable');
      expect(dashboardHtml).not.toContain('No Provider Configured');
    });
  });

  describe('History Filters & Error Formatting', () => {
    it('supports ai_proposal_generated, ai_proposal_approved, and ai_proposal_rejected filters', () => {
      const items: ActivityHistoryRecord[] = [
        {
          id: 'h1',
          project_id: 'p1',
          user_id: 'u1',
          action_type: 'project_created',
          description: 'Created',
          created_at: '2026-11-27T00:00:00Z',
        },
        {
          id: 'h2',
          project_id: 'p1',
          user_id: 'u1',
          action_type: 'ai_proposal_generated',
          description: 'Generated',
          created_at: '2026-11-27T00:01:00Z',
        },
        {
          id: 'h3',
          project_id: 'p1',
          user_id: 'u1',
          action_type: 'ai_proposal_approved',
          description: 'Approved',
          created_at: '2026-11-27T00:02:00Z',
        },
        {
          id: 'h4',
          project_id: 'p1',
          user_id: 'u1',
          action_type: 'ai_proposal_rejected',
          description: 'Rejected',
          created_at: '2026-11-27T00:03:00Z',
        },
      ];

      expect(filterActivityHistory(items, 'all')).toHaveLength(4);
      expect(filterActivityHistory(items, 'ai_proposal_generated').map((i) => i.id)).toEqual(['h2']);
      expect(filterActivityHistory(items, 'ai_proposal_approved').map((i) => i.id)).toEqual(['h3']);
      expect(filterActivityHistory(items, 'ai_proposal_rejected').map((i) => i.id)).toEqual(['h4']);

      mockUseHealth.mockReturnValue({ health: baseHealth, loading: false, error: null });
      const historyHtml = renderToStaticMarkup(<HistoryPage />);
      expect(historyHtml).toContain('value="ai_proposal_generated"');
      expect(historyHtml).toContain('value="ai_proposal_approved"');
      expect(historyHtml).toContain('value="ai_proposal_rejected"');
    });

    it('formats 400, 403, 409, 422, and 429 HTTP errors clearly without masking detail', () => {
      expect(formatHttpErrorMessage(400, 'Bad Request', { detail: 'Job already approved' })).toBe(
        'Job already approved'
      );
      expect(formatHttpErrorMessage(403, 'Forbidden', null)).toContain('Access forbidden');
      expect(formatHttpErrorMessage(409, 'Conflict', { detail: 'Job already running' })).toBe(
        'Job already running'
      );
      expect(
        formatHttpErrorMessage(422, 'Unprocessable Content', {
          detail: [{ loc: ['body', 'text'], msg: 'Prompt text cannot be empty' }],
        })
      ).toBe('text: Prompt text cannot be empty');
      expect(formatHttpErrorMessage(429, 'Too Many Requests', null)).toContain('Rate limit exceeded');
    });
  });

  describe('Approval & Rejection Confirmation Flow (No False Success)', () => {
    it('returns confirmation and refreshed selectedFile only when approval succeeds', async () => {
      const job: GenerationJobItem = {
        id: 'job-approve-1234',
        project_id: 'p1',
        status: 'pending_review',
        ai_provider: 'gemini',
        created_at: '2026-11-27T00:00:00Z',
      };
      const oldFile: ProjectFile = {
        id: 'f1',
        project_id: 'p1',
        name: 'main.py',
        path: '/main.py',
        content: 'v1\n',
        language: 'python',
        is_folder: false,
        size_bytes: 3,
        created_at: '2026-11-27T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
      };
      const updatedFile: ProjectFile = { ...oldFile, content: 'v2\n', updated_at: '2026-11-27T00:05:00Z' };

      const outcome = await executeApprovalAction({
        job,
        proposedChanges: [{ path: '/main.py', content: 'v2\n', language: 'python', action: 'update' }],
        projectId: 'p1',
        previousSelectedFile: oldFile,
        approveJob: async () => ({ ...job, status: 'approved', applied_at: '2026-11-27T00:05:00Z' }),
        fetchFiles: async () => [updatedFile],
      });

      expect(outcome.updatedJob.status).toBe('approved');
      expect(outcome.nextSelectedFile?.content).toBe('v2\n');
      expect(outcome.confirmationText).toContain('Approved and applied 1 proposed change(s)');
      expect(outcome.confirmationText).toContain('#job-appr');
    });

    it('rejects cleanly with confirmation and never emits false success when backend fails', async () => {
      const job: GenerationJobItem = {
        id: 'job-reject-9999',
        project_id: 'p1',
        status: 'pending_review',
        ai_provider: 'gemini',
        created_at: '2026-11-27T00:00:00Z',
      };

      const rejected = await executeRejectionAction({
        job,
        rejectJob: async () => ({ ...job, status: 'rejected' }),
      });
      expect(rejected.updatedJob.status).toBe('rejected');
      expect(rejected.confirmationText).toContain('Rejected AI proposal #job-reje');

      const fetchFilesSpy = vi.fn();
      await expect(
        executeApprovalAction({
          job,
          proposedChanges: [{ path: '/src', content: 'bad', language: 'python', action: 'update' }],
          projectId: 'p1',
          previousSelectedFile: null,
          approveJob: async () => {
            throw new ApiError(409, "Cannot modify or delete '/src': target path is a folder.");
          },
          fetchFiles: fetchFilesSpy,
        })
      ).rejects.toThrow("Cannot modify or delete '/src': target path is a folder.");
      expect(fetchFilesSpy).not.toHaveBeenCalled();
    });
  });
});
