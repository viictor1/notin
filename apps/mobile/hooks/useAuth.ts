import { useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import {
  authService,
  setAccessToken,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from '../services/api';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await authService.login({ password });
      setAccessToken(data.accessToken);
      await saveRefreshToken(data.refreshToken);
      router.replace('/notes');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 401) {
        setError('Senha incorreta');
      } else {
        setError('Erro ao conectar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const tryBiometric = useCallback(async () => {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      router.replace('/login');
      return;
    }

    const biometric = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Acesse o notin',
      fallbackLabel: 'Usar senha',
    });

    if (!biometric.success) {
      router.replace('/login');
      return;
    }

    try {
      const { data } = await authService.refresh(refreshToken);
      setAccessToken(data.accessToken);
      await saveRefreshToken(data.refreshToken);
      router.replace('/notes');
    } catch {
      await deleteRefreshToken();
      router.replace('/login');
    }
  }, []);

  const logout = useCallback(async () => {
    setAccessToken(null);
    await deleteRefreshToken();
    router.replace('/login');
  }, []);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    const biometric = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Acesse o notin',
      fallbackLabel: 'Usar senha',
    });
    return biometric.success;
  }, []);

  return {
    login,
    tryBiometric,
    logout,
    loading,
    error,
    authenticateWithBiometric,
  };
}
