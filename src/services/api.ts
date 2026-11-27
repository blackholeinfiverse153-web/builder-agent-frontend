// Centralized Typed API Client for BHIV Builder Agent Sandbox
import {
  HealthData,
  User,
  AuthTokenResponse,
  Project,
  ProjectCreatePayload,
  ProjectUpdatePayload,
  ProjectFile,
  FileCreatePayload,
  FileUpdatePayload,
  PromptItem,
  GenerationJobItem,
  ExecutionJobItem,
  TestResultRecord,
  ActivityHistoryRecord,
} from '../types';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'bhiv_auth_token';

// In-memory fallback for test and non-browser runtimes
let memoryToken: string | null = null;
let memoryApiUrl: string | null = null;

// Callbacks for auth state sync
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function getApiBaseUrl(): string {
  if (memoryApiUrl) return memoryApiUrl;
  if (typeof window !== 'undefined') {
    const saved = window.localStorage?.getItem('BHIV_API_URL')?.trim();
    if (saved) return saved.replace(/\/+$/, '');
  }
  const envUrl = import.meta.env?.VITE_API_BASE_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname || 'localhost';
    return `${protocol}//${host}:8000/api/v1`;
  }
  return DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  const normalized = url.trim().replace(/\/+$/, '');
  if (!normalized) {
    memoryApiUrl = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('BHIV_API_URL');
    }
    return;
  }
  memoryApiUrl = normalized;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('BHIV_API_URL', normalized);
  }
}

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage?.getItem(TOKEN_KEY) || null;
  }
  return null;
}

export function setAuthToken(token: string): void {
  memoryToken = token;
  if (typeof window !== 'undefined') {
    window.sessionStorage?.setItem(TOKEN_KEY, token);
    window.localStorage?.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken(): void {
  memoryToken = null;
  if (typeof window !== 'undefined') {
    window.sessionStorage?.removeItem(TOKEN_KEY);
    window.localStorage?.removeItem(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new ApiError(0, `Network failure connecting to ${url}: ${err.message}`);
  }

  if (response.status === 401 && !options.skipAuth) {
    clearAuthToken();
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let responseData: any;
  try {
    responseData = await response.json();
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    if (responseData && responseData.detail) {
      if (typeof responseData.detail === 'string') {
        errorMsg = responseData.detail;
      } else if (Array.isArray(responseData.detail)) {
        errorMsg = responseData.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      }
    }
    throw new ApiError(response.status, errorMsg, responseData);
  }

  return responseData as T;
}

// -------------------------------------------------------------
// API Service Namespaces
// -------------------------------------------------------------

export const authApi = {
  register: (payload: { email: string; password: string; full_name?: string }) =>
    apiRequest<AuthTokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    }),

  getMe: () => apiRequest<User>('/auth/me'),
};

export const projectsApi = {
  list: () => apiRequest<Project[]>('/projects'),

  create: (payload: ProjectCreatePayload) =>
    apiRequest<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  get: (projectId: string) => apiRequest<Project>(`/projects/${projectId}`),

  update: (projectId: string, payload: ProjectUpdatePayload) =>
    apiRequest<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (projectId: string) =>
    apiRequest<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    }),
};

export const filesApi = {
  list: (projectId: string) => apiRequest<ProjectFile[]>(`/projects/${projectId}/files`),

  create: (projectId: string, payload: FileCreatePayload) =>
    apiRequest<ProjectFile>(`/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  get: (projectId: string, fileId: string) =>
    apiRequest<ProjectFile>(`/projects/${projectId}/files/${fileId}`),

  update: (projectId: string, fileId: string, payload: FileUpdatePayload) =>
    apiRequest<ProjectFile>(`/projects/${projectId}/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (projectId: string, fileId: string) =>
    apiRequest<void>(`/projects/${projectId}/files/${fileId}`, {
      method: 'DELETE',
    }),
};

export const promptsApi = {
  submit: (projectId: string, text: string) =>
    apiRequest<PromptItem>(`/projects/${projectId}/prompts`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  list: (projectId: string) => apiRequest<PromptItem[]>(`/projects/${projectId}/prompts`),
};

export const jobsApi = {
  getGenerationJob: (jobId: string) => apiRequest<GenerationJobItem>(`/generation-jobs/${jobId}`),
  approveGenerationJob: (jobId: string) =>
    apiRequest<GenerationJobItem>(`/generation-jobs/${jobId}/approve`, {
      method: 'POST',
    }),
  rejectGenerationJob: (jobId: string) =>
    apiRequest<GenerationJobItem>(`/generation-jobs/${jobId}/reject`, {
      method: 'POST',
    }),
  getExecutionJob: (jobId: string) => apiRequest<ExecutionJobItem>(`/execution-jobs/${jobId}`),
};

export const testingApi = {
  getResults: (projectId: string) =>
    apiRequest<TestResultRecord[]>(`/projects/${projectId}/test-results`),
};

export const historyApi = {
  list: (projectId: string) =>
    apiRequest<ActivityHistoryRecord[]>(`/projects/${projectId}/history`),
};

export async function fetchHealth(): Promise<HealthData> {
  return apiRequest<HealthData>('/health', { skipAuth: true });
}
