// TypeScript Interfaces & Types for BHIV Builder Agent Platform

export interface HealthData {
  status: string;
  version: string;
  environment: string;
  python_version: string;
  database_url_configured: boolean;
  ai_provider: string;
  require_human_approval: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type SupportedLanguage = 'python' | 'typescript' | 'javascript' | 'go' | 'rust';
export type SupportedFramework = 'fastapi' | 'react' | 'express' | 'node' | 'vanilla';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  language: SupportedLanguage;
  framework: SupportedFramework;
  status: 'active' | 'archived' | 'generating' | 'idle';
  created_at: string;
  updated_at: string;
  files?: ProjectFile[];
}

export interface ProjectCreatePayload {
  name: string;
  description?: string;
  language?: string;
  framework?: string;
}

export interface ProjectUpdatePayload {
  name?: string;
  description?: string;
  language?: string;
  framework?: string;
  status?: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  is_folder: boolean;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  children?: ProjectFile[];
}

export interface FileCreatePayload {
  name: string;
  path: string;
  content?: string;
  language?: string;
  is_folder?: boolean;
}

export interface FileUpdatePayload {
  name?: string;
  content?: string;
  language?: string;
}

export interface PromptItem {
  id: string;
  project_id: string;
  user_id: string;
  text: string;
  status: string;
  response?: string | null;
  generation_job_id?: string | null;
  created_at: string;
}

export interface ProposedChange {
  path: string;
  content: string;
  language: string;
  action: 'create' | 'update' | 'delete';
  description?: string;
}

export interface GenerationJobItem {
  id: string;
  project_id: string;
  prompt_id?: string | null;
  status: string;
  ai_provider: string;
  model?: string | null;
  explanation?: string | null;
  proposed_changes_json?: string | null;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
  applied_at?: string | null;
}

export interface ExecutionJobItem {
  id: string;
  project_id: string;
  command: string;
  status: string;
  require_approval: boolean;
  approved_by?: string | null;
  logs?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface TestResultRecord {
  id: string;
  project_id: string;
  test_suite: string;
  passed_count: number;
  failed_count: number;
  duration_seconds: number;
  results_json?: string | null;
  created_at: string;
}

export interface ActivityHistoryRecord {
  id: string;
  project_id: string;
  user_id: string;
  action_type: string;
  description: string;
  metadata_json?: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  status?: 'pending' | 'delivered' | 'error';
  metadata?: {
    filesModified?: string[];
    actionRequired?: boolean;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  source: 'system' | 'agent' | 'sandbox' | 'test';
  message: string;
}

export interface TestResultItem {
  id: string;
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  durationMs: number;
  errorMessage?: string;
}

export interface ExecutionApprovalRequest {
  id: string;
  command: string;
  targetFiles: string[];
  requestedAt: string;
  riskLevel: 'low' | 'medium' | 'high';
  approved: boolean | null;
}
