import { createContext, useContext } from 'react';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
