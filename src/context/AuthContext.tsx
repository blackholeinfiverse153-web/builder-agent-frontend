import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi, getAuthToken, setAuthToken, clearAuthToken, setUnauthorizedHandler } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearAuthToken();
    setTokenState(null);
    setUser(null);
    setError(null);
  }, []);

  // Validate session against /auth/me
  const verifySession = useCallback(async () => {
    const existingToken = getAuthToken();
    if (!existingToken) {
      setLoading(false);
      setUser(null);
      return;
    }

    try {
      const userData = await authApi.getMe();
      setUser(userData);
      setError(null);
    } catch (err: any) {
      console.warn('Session verification failed, logging out:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    verifySession();
  }, [logout, verifySession]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ email, password: pass });
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.register({ email, password: pass, full_name: name });
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
