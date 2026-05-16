import { useState, useEffect } from 'react';
import axios from 'axios';
import { authService, setAccessToken } from '../services/api';
import { AuthContext } from './AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const tryRefresh = async () => {
      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        setAccessToken(data.token);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsInitializing(false);
      }
    };
    tryRefresh();
  }, []);

  const login = async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await authService.login(password);
      setAccessToken(data.token);
      setIsAuthenticated(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Senha incorreta');
      } else {
        setError('Erro ao conectar. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setAccessToken(null);
      setIsAuthenticated(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <p className="text-muted text-sm">...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
