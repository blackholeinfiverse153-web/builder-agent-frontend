import React, { useState } from 'react';
import { Settings, Server, Cpu, Shield, Save } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useHealth } from '../hooks/useHealth';
import { getApiBaseUrl, setApiBaseUrl } from '../services/api';
import { getAiProviderStatus, getApprovalPolicyStatus } from '../utils/aiWorkflow';

export const SettingsPage: React.FC = () => {
  const { health, loading: healthLoading, error: healthError, refetch } = useHealth();
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const aiStatus = getAiProviderStatus(health, healthLoading, healthError);
  const approvalStatus = getApprovalPolicyStatus(health, healthLoading, healthError);

  const handleSaveApiUrl = async () => {
    const trimmed = apiUrl.trim();
    if (!trimmed) {
      setTestResult({ ok: false, message: 'Please enter a valid API Base URL.' });
      return;
    }

    setApiBaseUrl(trimmed);
    setTestingConnection(true);
    setTestResult(null);

    const result = await refetch();
    setTestingConnection(false);

    if (result.ok && result.data) {
      setTestResult({
        ok: true,
        message: `Connected successfully to ${result.data.environment} v${result.data.version}.`,
      });
    } else {
      setTestResult({
        ok: false,
        message: result.error || 'Failed to connect to API endpoint.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-400" />
          Platform Settings
        </h1>
        <p className="text-xs text-surface-400 mt-1">
          Configure backend API endpoints, AI provider credentials, and sandbox policies.
        </p>
      </div>

      {/* Backend API Configuration */}
      <Card
        title="Backend API Configuration"
        subtitle="Manage the connection to the FastAPI server."
        icon={<Server className="w-4 h-4 text-brand-400" />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">
              API Base URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000/api/v1"
                className="flex-1 bg-surface-900 border border-surface-800 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
              />
              <Button
                variant="primary"
                size="md"
                loading={testingConnection}
                onClick={handleSaveApiUrl}
                icon={<Save className="w-4 h-4" />}
              >
                {testingConnection ? 'Testing...' : 'Save & Test'}
              </Button>
            </div>
            {testResult && (
              <p
                className={`text-xs font-mono mt-2 ${
                  testResult.ok ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResult.message}
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-surface-950/60 border border-surface-800 text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-surface-500">Service Status:</span>
              <span
                className={
                  health
                    ? 'text-emerald-400'
                    : healthLoading
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
              >
                {health?.status || (healthLoading ? 'Checking...' : 'Offline')}
              </span>
            </div>
            {healthError && (
              <div className="text-[11px] text-rose-400 pt-1 break-all">
                Error: {healthError}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-surface-500">Python Version:</span>
              <span className="text-surface-300">{health?.python_version || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Environment:</span>
              <span className="text-surface-300">{health?.environment || 'development'}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Provider Configuration */}
      <Card
        title="AI Provider Adapter"
        subtitle="Pluggable inference service integration."
        icon={<Cpu className="w-4 h-4 text-cyan-400" />}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-300">Active AI Adapter:</span>
            <Badge variant={aiStatus.badgeVariant}>{aiStatus.badgeLabel}</Badge>
          </div>
          <p className="text-xs text-surface-400 leading-relaxed">
            {aiStatus.description}
          </p>
        </div>
      </Card>

      {/* Sandbox Security Configuration */}
      <Card
        title="Sandbox Isolation Policy"
        subtitle="Host execution safety settings."
        icon={<Shield className="w-4 h-4 text-emerald-400" />}
      >
        <div className="space-y-3 text-xs font-mono">
          <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
            <span className="text-surface-400">Require Human Approval:</span>
            <span className={`font-semibold ${approvalStatus.textClass}`}>
              {approvalStatus.settingsValue}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-surface-800/60">
            <span className="text-surface-400">Container Execution Timeout:</span>
            <span className="text-surface-200">30 Seconds</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-surface-400">Memory Capping:</span>
            <span className="text-surface-200">512 MB</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
