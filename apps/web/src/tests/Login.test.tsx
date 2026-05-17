import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../pages/Login';
import { useAuth } from '../contexts/AuthContext';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      login: mockLogin,
      logout: vi.fn(),
    });
  });

  it('should render login form', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('entrar')).toBeInTheDocument();
  });

  it('should show error on invalid password', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: 'Senha incorreta',
      clearError: vi.fn(),
      login: mockLogin,
      logout: vi.fn(),
    });
    renderLogin();
    expect(screen.getByText('Senha incorreta')).toBeInTheDocument();
  });

  it('should call login with password on submit', async () => {
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'mypassword' },
    });
    fireEvent.click(screen.getByText('entrar'));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ password: 'mypassword' });
    });
  });

  it('should navigate to / when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      login: mockLogin,
      logout: vi.fn(),
    });
    renderLogin();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should toggle dark mode', () => {
    renderLogin();
    fireEvent.click(screen.getByText('☾'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('deve alternar para modo código ao clicar em "usar autenticador"', () => {
    renderLogin();
    fireEvent.click(screen.getByText('usar autenticador'));
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
  });

  it('deve chamar login com code ao submeter no modo autenticador', async () => {
    renderLogin();
    fireEvent.click(screen.getByText('usar autenticador'));
    fireEvent.change(screen.getByPlaceholderText('000000'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByText('entrar'));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ code: '123456' });
    });
  });

  it('só aceita dígitos no campo de código', () => {
    renderLogin();
    fireEvent.click(screen.getByText('usar autenticador'));
    fireEvent.change(screen.getByPlaceholderText('000000'), {
      target: { value: 'abc123' },
    });
    expect(screen.getByPlaceholderText('000000')).toHaveValue('123');
  });

  it('volta para modo senha ao clicar em "usar senha"', () => {
    renderLogin();
    fireEvent.click(screen.getByText('usar autenticador'));
    fireEvent.click(screen.getByText('usar senha'));
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('exibe "Código inválido" no modo autenticador', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: 'Código inválido',
      clearError: vi.fn(),
      login: mockLogin,
      logout: vi.fn(),
    });
    renderLogin();
    fireEvent.click(screen.getByText('usar autenticador'));
    expect(screen.getByText('Código inválido')).toBeInTheDocument();
  });
});
