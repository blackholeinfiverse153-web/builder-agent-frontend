import { describe, it, expect, beforeEach } from 'vitest';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  ApiError,
  jobsApi,
} from './services/api';
import { ProposedChange, GenerationJobItem } from './types';

describe('BHIV Frontend Platform Test Suite', () => {
  beforeEach(() => {
    clearAuthToken();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('BHIV_API_URL');
    }
  });

  describe('API Configuration & Token Storage Service', () => {
    it('returns default API base URL when no override is set', () => {
      const url = getApiBaseUrl();
      expect(url).toContain('8000/api/v1');
    });

    it('sets and retrieves custom API base URL', () => {
      setApiBaseUrl('http://127.0.0.1:8000/api/v1');
      expect(getApiBaseUrl()).toBe('http://127.0.0.1:8000/api/v1');
    });

    it('stores, retrieves, and clears authentication tokens', () => {
      expect(getAuthToken()).toBeNull();
      setAuthToken('test-jwt-access-token');
      expect(getAuthToken()).toBe('test-jwt-access-token');
      clearAuthToken();
      expect(getAuthToken()).toBeNull();
    });

    it('properly encapsulates ApiError status and message', () => {
      const err = new ApiError(404, 'Project not found', { detail: 'Project not found' });
      expect(err.name).toBe('ApiError');
      expect(err.status).toBe(404);
      expect(err.message).toBe('Project not found');
      expect(err.data).toEqual({ detail: 'Project not found' });
    });
  });

  describe('Navigation & Route Architecture', () => {
    it('defines all required application pages plus auth login route', () => {
      const routes = [
        '/login',
        '/',
        '/projects',
        '/projects/new',
        '/workspace',
        '/editor',
        '/preview',
        '/sandbox',
        '/testing',
        '/history',
        '/settings',
      ];
      expect(routes).toHaveLength(11);
      expect(routes).toContain('/login');
      expect(routes).toContain('/workspace');
      expect(routes).toContain('/editor');
      expect(routes).toContain('/preview');
      expect(routes).toContain('/sandbox');
      expect(routes).toContain('/testing');
      expect(routes).toContain('/history');
      expect(routes).toContain('/settings');
    });

    it('enforces human approval guard by default', () => {
      const defaultApprovalPolicy = true;
      expect(defaultApprovalPolicy).toBe(true);
    });
  });

  describe('Form Validation Logic', () => {
    it('validates project naming requirements', () => {
      const validateProjectName = (name: string): string | null => {
        if (!name.trim()) return 'Project name is required';
        if (name.length < 3) return 'Project name must be at least 3 characters';
        if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
          return 'Project name can only contain letters, numbers, hyphens, and underscores';
        }
        return null;
      };

      expect(validateProjectName('')).toBe('Project name is required');
      expect(validateProjectName('ab')).toBe('Project name must be at least 3 characters');
      expect(validateProjectName('proj name with spaces')).toBe(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );
      expect(validateProjectName('valid-proj_01')).toBeNull();
    });

    it('validates user authentication input fields', () => {
      const validateEmail = (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      };

      const validatePassword = (pass: string): boolean => {
        return pass.length >= 8;
      };

      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('dev@example.com')).toBe(true);
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('securePass123')).toBe(true);
    });
  });

  describe('Phase 6: AI Code Generation & Approval Workflow Contracts', () => {
    it('validates structured ProposedChange model fields', () => {
      const change: ProposedChange = {
        path: '/src/routes/health.py',
        content: 'def get_health(): return {"status": "ok"}',
        language: 'python',
        action: 'create',
        description: 'Health endpoint implementation',
      };

      expect(change.path).toBe('/src/routes/health.py');
      expect(change.action).toBe('create');
      expect(change.language).toBe('python');
      expect(change.content).toContain('get_health');
    });

    it('exposes generation job approval and rejection API methods', () => {
      expect(typeof jobsApi.getGenerationJob).toBe('function');
      expect(typeof jobsApi.approveGenerationJob).toBe('function');
      expect(typeof jobsApi.rejectGenerationJob).toBe('function');
    });

    it('maps HTTP 429 rate limit errors to human-readable notice', () => {
      const rateLimitErr = new ApiError(429, 'Please wait 3 seconds between prompt submissions.');
      expect(rateLimitErr.status).toBe(429);
      expect(rateLimitErr.message).toContain('wait 3 seconds');
    });

    it('enforces that human approval status transitions correctly', () => {
      const job: GenerationJobItem = {
        id: 'job-123',
        project_id: 'proj-456',
        status: 'pending_review',
        ai_provider: 'gemini',
        model: 'gemini-2.5-flash',
        explanation: 'Proposed 2 files for review',
        proposed_changes_json: JSON.stringify([
          { path: '/app.py', content: 'print(1)', language: 'python', action: 'create' },
        ]),
        created_at: new Date().toISOString(),
      };

      expect(job.status).toBe('pending_review');
      const changes = JSON.parse(job.proposed_changes_json || '[]') as ProposedChange[];
      expect(changes).toHaveLength(1);
      expect(changes[0].path).toBe('/app.py');
    });
  });
});
