import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Notes } from '../pages/Notes';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockNotes = [
  {
    id: '1',
    title: 'nota um',
    content: 'conteudo um',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'nota dois',
    content: 'conteudo dois',
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

vi.mock('../services/api', () => ({
  notesService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const renderNotes = () =>
  render(
    <MemoryRouter>
      <Notes />
    </MemoryRouter>
  );

describe('Notes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'fake-token');
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.list).mockResolvedValue({ data: mockNotes } as any);
  });

  it('should render notes list', async () => {
    renderNotes();
    await waitFor(() => {
      expect(screen.getByText('nota um')).toBeInTheDocument();
      expect(screen.getByText('nota dois')).toBeInTheDocument();
    });
  });

  it('should select a note on click', async () => {
    renderNotes();
    await waitFor(() => screen.getByText('nota um'));
    fireEvent.click(screen.getByText('nota um'));
    expect(screen.getByDisplayValue('nota um')).toBeInTheDocument();
    expect(screen.getByDisplayValue('conteudo um')).toBeInTheDocument();
  });

  it('should clear selection on notin click', async () => {
    renderNotes();
    await waitFor(() => screen.getByText('nota um'));
    fireEvent.click(screen.getByText('nota um'));
    fireEvent.click(screen.getByText('notin'));
    expect(screen.queryByDisplayValue('nota um')).not.toBeInTheDocument();
  });

  it('should clear selection on ESC', async () => {
    renderNotes();
    await waitFor(() => screen.getByText('nota um'));
    fireEvent.click(screen.getByText('nota um'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByDisplayValue('nota um')).not.toBeInTheDocument();
  });

  it('should open new note on button click', async () => {
    renderNotes();
    await waitFor(() => screen.getByText('nota um'));
    fireEvent.click(screen.getByText('+ nova nota'));
    expect(screen.getByPlaceholderText('sem título')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('comece a escrever...')
    ).toBeInTheDocument();
  });

  it('should create a note', async () => {
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.create).mockResolvedValueOnce({
      data: {
        id: '3',
        title: 'nova nota',
        content: 'novo conteudo',
        created_at: '2026-01-03T00:00:00Z',
        updated_at: '2026-01-03T00:00:00Z',
      },
    } as any);

    renderNotes();
    await waitFor(() => screen.getByText('nota um'));

    fireEvent.click(screen.getByText('+ nova nota'));
    fireEvent.change(screen.getByPlaceholderText('sem título'), {
      target: { value: 'nova nota' },
    });
    fireEvent.change(screen.getByPlaceholderText('comece a escrever...'), {
      target: { value: 'novo conteudo' },
    });
    fireEvent.click(screen.getByText('salvar'));

    await waitFor(() => {
      expect(notesService.create).toHaveBeenCalledWith(
        'nova nota',
        'novo conteudo'
      );
    });
  });

  it('should show confirm modal on delete', async () => {
    renderNotes();
    await waitFor(() => screen.getByText('nota um'));

    const deleteButtons = screen.getAllByText('excluir');
    fireEvent.click(deleteButtons[0]);

    expect(
      screen.getByText('Tem certeza que deseja excluir esta nota?')
    ).toBeInTheDocument();
  });

  it('should cancel delete on ESC', async () => {
    renderNotes();
    await waitFor(() => screen.getByText('nota um'));

    const deleteButtons = screen.getAllByText('excluir');
    fireEvent.click(deleteButtons[0]);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByText('Tem certeza que deseja excluir esta nota?')
    ).not.toBeInTheDocument();
  });

  it('should delete note on confirm', async () => {
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.delete).mockResolvedValueOnce({
      data: { success: true },
    } as any);

    renderNotes();
    await waitFor(() => screen.getByText('nota um'));

    const deleteButtons = screen.getAllByText('excluir');
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(
      screen.getByText('excluir', { selector: 'button.btn-primary' })
    );

    await waitFor(() => {
      expect(notesService.delete).toHaveBeenCalledWith('1');
    });
  });

  it('should logout and navigate to login', async () => {
    renderNotes();
    await waitFor(() => screen.getByText('nota um'));
    fireEvent.click(screen.getByText('sair'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('should update a note', async () => {
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.update).mockResolvedValueOnce({
      data: { success: true },
    } as any);

    renderNotes();
    await waitFor(() => screen.getByText('nota um'));

    fireEvent.click(screen.getByText('nota um'));
    fireEvent.change(screen.getByDisplayValue('nota um'), {
      target: { value: 'nota editada' },
    });
    fireEvent.click(screen.getByText('salvar'));

    await waitFor(() => {
      expect(notesService.update).toHaveBeenCalledWith(
        '1',
        'nota editada',
        'conteudo um'
      );
    });
  });

  it('should show error when notes fail to load', async () => {
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.list).mockRejectedValueOnce(new Error('500'));

    renderNotes();

    await waitFor(() => {
      expect(screen.getByText(/erro/i)).toBeInTheDocument();
    });
  });

  it('should show error when save fails', async () => {
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.create).mockRejectedValueOnce(new Error('500'));

    renderNotes();
    await waitFor(() => screen.getByText('nota um'));

    fireEvent.click(screen.getByText('+ nova nota'));
    fireEvent.change(screen.getByPlaceholderText('comece a escrever...'), {
      target: { value: 'conteudo' },
    });
    fireEvent.click(screen.getByText('salvar'));

    await waitFor(() => {
      expect(
        screen.getByText('Erro ao salvar. Tente novamente.')
      ).toBeInTheDocument();
    });
  });

  it('should clear save error on new save attempt', async () => {
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.create)
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce({
        data: {
          id: '3',
          title: '',
          content: 'conteudo',
          created_at: '2026-01-03T00:00:00Z',
          updated_at: '2026-01-03T00:00:00Z',
        },
      } as any);

    renderNotes();
    await waitFor(() => screen.getByText('nota um'));

    fireEvent.click(screen.getByText('+ nova nota'));
    fireEvent.change(screen.getByPlaceholderText('comece a escrever...'), {
      target: { value: 'conteudo' },
    });

    fireEvent.click(screen.getByText('salvar'));
    await waitFor(() => {
      expect(
        screen.getByText('Erro ao salvar. Tente novamente.')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('salvar'));
    await waitFor(() => {
      expect(
        screen.queryByText('Erro ao salvar. Tente novamente.')
      ).not.toBeInTheDocument();
    });
  });

  it('should show error when delete fails', async () => {
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.delete).mockRejectedValueOnce(new Error('500'));

    renderNotes();
    await waitFor(() => screen.getByText('nota um'));

    const deleteButtons = screen.getAllByText('excluir');
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(
      screen.getByText('excluir', { selector: 'button.btn-primary' })
    );

    await waitFor(() => {
      expect(
        screen.getByText('Erro ao excluir nota. Tente novamente.')
      ).toBeInTheDocument();
    });
  });

  it('should keep note in list when delete fails', async () => {
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.delete).mockRejectedValueOnce(new Error('500'));

    renderNotes();
    await waitFor(() => screen.getByText('nota um'));

    const deleteButtons = screen.getAllByText('excluir');
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(
      screen.getByText('excluir', { selector: 'button.btn-primary' })
    );

    await waitFor(() => {
      expect(screen.getByText('nota um')).toBeInTheDocument();
    });
  });
});
