import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Notes } from '../pages/Notes';

const DEBOUNCE_MS = 4000;

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false, toggle: vi.fn() }),
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

// Dispara o auto-save avançando os timers além do debounce.
// O act() garante que todas as atualizações de estado causadas pelo save
// (setStatus, setNotes, etc.) sejam processadas antes das assertions.
const triggerAutoSave = () =>
  act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 100));

describe('Notes', () => {
  beforeEach(async () => {
    // shouldAdvanceTime: true faz o relógio falso avançar em tempo real
    // automaticamente — o waitFor consegue fazer polling via setTimeout,
    // mas ainda podemos saltar o debounce manualmente com advanceTimersByTimeAsync
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    const { notesService } = await import('../services/api');
    vi.mocked(notesService.list).mockResolvedValue({ data: mockNotes } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
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

    it('cria nota com título e conteúdo após debounce', async () => {
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

      await triggerAutoSave();

      await waitFor(() => {
        expect(notesService.create).toHaveBeenCalledWith(
          'nova nota',
          'novo conteudo'
        );
      });
    });

    it('exibe indicador de salvando durante o request', async () => {
      const { notesService } = await import('../services/api');
      // Promessa que nunca resolve para manter o estado "saving"
      vi.mocked(notesService.create).mockReturnValueOnce(new Promise(() => {}));

      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('+ nova nota'));
      fireEvent.change(screen.getByTestId('editor'), {
        target: { value: 'conteudo' },
      });

      await triggerAutoSave();

      await waitFor(() =>
        expect(screen.getByText('salvando...')).toBeInTheDocument()
      );
    });

    it('exibe "salvo" após criação bem-sucedida', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.create).mockResolvedValueOnce({
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

      await triggerAutoSave();

      await waitFor(() =>
        expect(screen.getByText('salvo')).toBeInTheDocument()
      );
    });

    it('exibe "erro ao salvar" quando a criação falha', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.create).mockRejectedValueOnce(new Error('500'));

      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('+ nova nota'));
      fireEvent.change(screen.getByTestId('editor'), {
        target: { value: 'conteudo' },
      });

      await triggerAutoSave();

      await waitFor(() => {
        expect(screen.getByText('erro ao salvar')).toBeInTheDocument();
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
            content: 'conteudo editado',
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

      // Primeira tentativa — falha
      await triggerAutoSave();
      await waitFor(() => screen.getByText('erro ao salvar'));

      // Após um erro o usuário continua editando — a mudança de conteúdo é o
      // que aciona um novo useEffect de debounce. Sem ela, nenhum setTimeout
      // novo é criado e triggerAutoSave não teria nada para disparar.
      fireEvent.change(screen.getByTestId('editor'), {
        target: { value: 'conteudo editado' },
      });

      // Segunda tentativa — sucesso
      await triggerAutoSave();
      await waitFor(() => {
        expect(screen.queryByText('erro ao salvar')).not.toBeInTheDocument();
        expect(screen.getByText('salvo')).toBeInTheDocument();
      });
    });
  });

  describe('edição', () => {
    it('atualiza nota após editar título e aguardar debounce', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.update).mockResolvedValueOnce({
        data: { ...mockNotes[0], title: 'nota editada' },
      } as any);

      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('nota um'));
      fireEvent.change(screen.getByDisplayValue('nota um'), {
        target: { value: 'nota editada' },
      });

      await triggerAutoSave();

      await waitFor(() => {
        expect(notesService.update).toHaveBeenCalledWith(
          '1',
          'nota editada',
          'conteudo um'
        );
      });
    });

    it('atualiza nota após editar conteúdo via Editor e aguardar debounce', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.update).mockResolvedValueOnce({
        data: { ...mockNotes[0], content: '<p>conteudo editado</p>' },
      } as any);

      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('nota um'));
      fireEvent.change(screen.getByTestId('editor'), {
        target: { value: '<p>conteudo editado</p>' },
      });

      await triggerAutoSave();

      await waitFor(() => {
        expect(notesService.update).toHaveBeenCalledWith(
          '1',
          'nota um',
          '<p>conteudo editado</p>'
        );
      });
    });

    it('faz flush do save ao trocar de nota sem aguardar debounce', async () => {
      const { notesService } = await import('../services/api');
      vi.mocked(notesService.update).mockResolvedValueOnce({
        data: { ...mockNotes[0], content: 'editado antes de trocar' },
      } as any);

      renderNotes();
      await waitForList();
      fireEvent.click(screen.getByText('nota um'));
      fireEvent.change(screen.getByTestId('editor'), {
        target: { value: 'editado antes de trocar' },
      });

      // Troca de nota sem esperar o debounce — deve fazer flush imediato
      fireEvent.click(screen.getByText('nota dois'));

      await waitFor(() => {
        expect(notesService.update).toHaveBeenCalledWith(
          '1',
          'nota um',
          'editado antes de trocar'
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
