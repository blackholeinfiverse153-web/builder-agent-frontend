import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { EditorPage } from './pages/EditorPage';
import { PreviewPage } from './pages/PreviewPage';
import { SandboxPage } from './pages/SandboxPage';
import { TestingPage } from './pages/TestingPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<NewProjectPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/sandbox" element={<SandboxPage />} />
            <Route path="/testing" element={<TestingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
