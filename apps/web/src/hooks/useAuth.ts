import { useState } from 'react';
import { authService } from '../services/api';
import axios from 'axios';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem('token')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await authService.login(password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
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

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isLoading, error, login, logout };
};
