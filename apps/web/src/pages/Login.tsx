import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

export const Login = () => {
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/');
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(password);
    if (localStorage.getItem('token')) navigate('/');
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center">
      <div className="w-full max-w-sm px-8">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              notin
            </h1>
            <p className="text-sm mt-1 text-muted">seu espaço pessoal</p>
          </div>
          <button
            type="button"
            aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            onClick={toggle}
            className="btn-ghost mt-1 text-lg"
          >
            {isDark ? '☀' : '☾'}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="text-xs font-medium block mb-1 text-app"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-app"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-xs text-primary">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-2 mt-2"
          >
            {isLoading ? 'entrando...' : 'entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
