import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../pages/Login';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/api', () => ({
  authService: {
    login: vi.fn(),
  },
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
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should render login form', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('you@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('entrar')).toBeInTheDocument();
  });

  it('should show error on invalid credentials', async () => {
    const { authService } = await import('../services/api');
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('401'));

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('you@email.com'), {
      target: { value: 'wrong@email.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByText('entrar'));

    await waitFor(() => {
      expect(screen.getByText('Email ou senha incorretos')).toBeInTheDocument();
    });
  });

  it('should navigate to / on successful login', async () => {
    const { authService } = await import('../services/api');
    vi.mocked(authService.login).mockResolvedValueOnce({
      data: { token: 'fake-token', refreshToken: 'fake-refresh' },
    } as any);

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('you@email.com'), {
      target: { value: 'test@email.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByText('entrar'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(localStorage.getItem('token')).toBe('fake-token');
      expect(localStorage.getItem('refreshToken')).toBe('fake-refresh');
    });
  });

  it('should toggle dark mode', () => {
    renderLogin();
    const toggle = screen.getByText('☾');
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should redirect to / if already logged in', () => {
    localStorage.setItem('token', 'existing-token');
    renderLogin();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
