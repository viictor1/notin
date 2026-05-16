import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Notes } from '../pages/Notes';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

vi.mock('../services/api', () => ({
  notesService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../components/Editor', () => ({
  Editor: ({
    content,
    onChange,
    placeholder,
  }: {
    content: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? 'comece a escrever...'}
      data-testid="editor"
    />
  ),
}));

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

const renderNotes = () =>
  render(
    <MemoryRouter>
      <Notes />
    </MemoryRouter>
  );

const waitForList = () => waitFor(() => screen.getByText('nota um'));

describe('Notes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.list).mockResolvedValue({ data: mockNotes } as any);
  });

  describe('listagem', () => {
    it('renderiza as notas carregadas', async () => {
      renderNotes();
      await waitFor(() => {
        expect(screen.getByText('nota um')).toBeInTheDocument();
        expect(screen.getByText('nota dois')).toBeInTheDocument();
      });
    });

    it('exibe erro quando o carregamento falha', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.list).mockRejectedValueOnce(new Error('500'));
      renderNotes();
      await waitFor(() =>
        expect(screen.getByText(/erro/i)).toBeInTheDocument()
      );
    });
  });

  describe('seleção', () => {
    it('exibe título e conteúdo da nota ao clicar nela', async () => {
      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('nota um'));
      expect(screen.getByDisplayValue('nota um')).toBeInTheDocument();
      expect(screen.getByDisplayValue('conteudo um')).toBeInTheDocument();
    });

    it('desmarca seleção ao clicar em "notin"', async () => {
      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('nota um'));
      fireEvent.click(screen.getByText('notin'));
      expect(screen.queryByDisplayValue('nota um')).not.toBeInTheDocument();
    });

    it('desmarca seleção ao pressionar Escape', async () => {
      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('nota um'));
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByDisplayValue('nota um')).not.toBeInTheDocument();
    });
  });

  describe('nova nota', () => {
    it('abre formulário em branco ao clicar em "+ nova nota"', async () => {
      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('+ nova nota'));
      expect(screen.getByPlaceholderText('sem título')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('comece a escrever...')
      ).toBeInTheDocument();
    });

    it('cria nota com título e conteúdo preenchidos', async () => {
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
      await waitForList();
      fireEvent.click(screen.getByText('+ nova nota'));
      fireEvent.change(screen.getByPlaceholderText('sem título'), {
        target: { value: 'nova nota' },
      });
      fireEvent.change(screen.getByTestId('editor'), {
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

    it('exibe erro quando a criação falha', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.create).mockRejectedValueOnce(new Error('500'));

      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('+ nova nota'));
      fireEvent.change(screen.getByTestId('editor'), {
        target: { value: 'conteudo' },
      });
      fireEvent.click(screen.getByText('salvar'));

      await waitFor(() => {
        expect(
          screen.getByText('Erro ao salvar. Tente novamente.')
        ).toBeInTheDocument();
      });
    });

    it('limpa o erro de salvar na próxima tentativa bem-sucedida', async () => {
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
      await waitForList();
      fireEvent.click(screen.getByText('+ nova nota'));
      fireEvent.change(screen.getByTestId('editor'), {
        target: { value: 'conteudo' },
      });

      fireEvent.click(screen.getByText('salvar'));
      await waitFor(() => screen.getByText('Erro ao salvar. Tente novamente.'));

      fireEvent.click(screen.getByText('salvar'));
      await waitFor(() => {
        expect(
          screen.queryByText('Erro ao salvar. Tente novamente.')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('edição', () => {
    it('atualiza nota ao salvar com título editado', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.update).mockResolvedValueOnce({
        data: { success: true },
      } as any);

      renderNotes();
      await waitForList();
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

    it('atualiza nota ao salvar com conteúdo editado via Editor', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.update).mockResolvedValueOnce({
        data: { success: true },
      } as any);

      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('nota um'));
      fireEvent.change(screen.getByTestId('editor'), {
        target: { value: '<p>conteudo editado</p>' },
      });
      fireEvent.click(screen.getByText('salvar'));

      await waitFor(() => {
        expect(notesService.update).toHaveBeenCalledWith(
          '1',
          'nota um',
          '<p>conteudo editado</p>'
        );
      });
    });
  });

  describe('exclusão', () => {
    it('abre modal de confirmação ao clicar em excluir', async () => {
      renderNotes();
      await waitForList();
      fireEvent.click(screen.getAllByText('excluir')[0]);
      expect(
        screen.getByText('Tem certeza que deseja excluir esta nota?')
      ).toBeInTheDocument();
    });

    it('cancela exclusão ao pressionar Escape no modal', async () => {
      renderNotes();
      await waitForList();
      fireEvent.click(screen.getAllByText('excluir')[0]);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(
        screen.queryByText('Tem certeza que deseja excluir esta nota?')
      ).not.toBeInTheDocument();
    });

    it('deleta nota ao confirmar no modal', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.delete).mockResolvedValueOnce({
        data: { success: true },
      } as any);

      renderNotes();
      await waitForList();
      fireEvent.click(screen.getAllByText('excluir')[0]);
      fireEvent.click(
        screen.getByText('excluir', { selector: 'button.btn-primary' })
      );

      await waitFor(() =>
        expect(notesService.delete).toHaveBeenCalledWith('1')
      );
    });

    it('exibe erro quando exclusão falha', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.delete).mockRejectedValueOnce(new Error('500'));

      renderNotes();
      await waitForList();
      fireEvent.click(screen.getAllByText('excluir')[0]);
      fireEvent.click(
        screen.getByText('excluir', { selector: 'button.btn-primary' })
      );

      await waitFor(() => {
        expect(
          screen.getByText('Erro ao excluir nota. Tente novamente.')
        ).toBeInTheDocument();
      });
    });

    describe('autenticação', () => {
      it('faz logout e navega para /login ao clicar em "sair"', async () => {
        renderNotes();
        await waitForList();
        fireEvent.click(screen.getByText('sair'));
        await waitFor(() => {
          expect(mockLogout).toHaveBeenCalled();
          expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
      });
    });
  });
});
