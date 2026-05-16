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
      expect(mockLogin).toHaveBeenCalledWith('mypassword');
    });
  });

  it('should navigate to / when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
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
});
