import { useState, useEffect, useCallback } from 'react';
import { Project, ProjectFile, ProjectCreatePayload, FileCreatePayload, FileUpdatePayload } from '../types';
import { projectsApi, filesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return sessionStorage.getItem('bhiv_active_project_id');
  });
  const [projectFiles, setProjectFiles] = useState<Record<string, ProjectFile[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync active project id to sessionStorage
  useEffect(() => {
    if (activeProjectId) {
      sessionStorage.setItem('bhiv_active_project_id', activeProjectId);
    } else {
      sessionStorage.removeItem('bhiv_active_project_id');
    }
  }, [activeProjectId]);

  // Fetch all projects for authenticated user
  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await projectsApi.list();
      setProjects(data);
      setError(null);

      // Auto-select first project if none or active is invalid
      if (data.length > 0) {
        if (!activeProjectId || !data.some((p) => p.id === activeProjectId)) {
          setActiveProjectId(data[0].id);
        }
      } else {
        setActiveProjectId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [user, activeProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [user]);

  // Fetch files for a specific project
  const fetchProjectFiles = useCallback(async (projectId: string): Promise<ProjectFile[]> => {
    try {
      const files = await filesApi.list(projectId);
      setProjectFiles((prev) => ({ ...prev, [projectId]: files }));
      return files;
    } catch (err: any) {
      console.error('Failed to load project files:', err);
      return [];
    }
  }, []);

  // Fetch active project files whenever activeProjectId changes and project exists in loaded list
  useEffect(() => {
    if (activeProjectId && user && projects.some((p) => p.id === activeProjectId)) {
      fetchProjectFiles(activeProjectId);
    }
  }, [activeProjectId, user, projects, fetchProjectFiles]);

  const addProject = async (payload: ProjectCreatePayload): Promise<Project> => {
    try {
      const newProj = await projectsApi.create(payload);
      setProjects((prev) => [newProj, ...prev]);
      setActiveProjectId(newProj.id);
      await fetchProjectFiles(newProj.id);
      return newProj;
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
      throw err;
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProjectId === id) {
        const remaining = projects.filter((p) => p.id !== id);
        setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      throw err;
    }
  };

  const addFile = async (projectId: string, payload: FileCreatePayload): Promise<ProjectFile> => {
    const file = await filesApi.create(projectId, payload);
    setProjectFiles((prev) => {
      const current = prev[projectId] || [];
      return { ...prev, [projectId]: [...current, file] };
    });
    return file;
  };

  const updateFile = async (
    projectId: string,
    fileId: string,
    payload: FileUpdatePayload
  ): Promise<ProjectFile> => {
    const updated = await filesApi.update(projectId, fileId, payload);
    setProjectFiles((prev) => {
      const current = prev[projectId] || [];
      return {
        ...prev,
        [projectId]: current.map((f) => (f.id === fileId ? updated : f)),
      };
    });
    return updated;
  };

  const deleteFile = async (projectId: string, fileId: string): Promise<void> => {
    await filesApi.delete(projectId, fileId);
    setProjectFiles((prev) => {
      const current = prev[projectId] || [];
      return {
        ...prev,
        [projectId]: current.filter((f) => f.id !== fileId),
      };
    });
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const currentFiles = activeProjectId ? projectFiles[activeProjectId] || [] : [];

  return {
    projects,
    activeProject,
    activeProjectId,
    currentFiles,
    loading,
    error,
    setActiveProjectId,
    refetchProjects: fetchProjects,
    fetchProjectFiles,
    addProject,
    deleteProject,
    addFile,
    updateFile,
    deleteFile,
  };
}
