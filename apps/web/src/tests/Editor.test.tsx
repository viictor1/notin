import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Editor } from '../components/Editor';

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: vi.fn(({ editor }) => (
    <div data-testid="editor-content" data-editor={editor ? 'ready' : 'null'} />
  )),
}));

vi.mock('../components/slashCommands', () => ({
  SlashCommands: { name: 'slashCommands' },
}));

vi.mock('@tiptap/starter-kit', () => ({ default: { name: 'starterKit' } }));
vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: vi.fn().mockReturnValue({ name: 'placeholder' }) },
}));
vi.mock('@tiptap/extension-typography', () => ({
  default: { name: 'typography' },
}));

const makeEditor = (html = '<p>conteudo</p>') => ({
  getHTML: vi.fn().mockReturnValue(html),
  commands: { setContent: vi.fn(), insertContent: vi.fn() },
  isActive: vi.fn().mockReturnValue(false),
});

const setupUseEditor = (editorMock: ReturnType<typeof makeEditor>) => {
  let capturedConfig: any;
  vi.mocked(useEditor).mockImplementation((config: any) => {
    capturedConfig = config;
    return editorMock as any;
  });
  return () => capturedConfig;
};

describe('Editor', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('renderização', () => {
    it('renderiza EditorContent', () => {
      vi.mocked(useEditor).mockReturnValue(makeEditor() as any);
      render(<Editor content="<p>oi</p>" onChange={vi.fn()} />);
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });

    it('passa o editor para EditorContent', () => {
      const editor = makeEditor();
      vi.mocked(useEditor).mockReturnValue(editor as any);
      render(<Editor content="<p>oi</p>" onChange={vi.fn()} />);
      const [props] = vi.mocked(EditorContent).mock.calls[0];
      expect(props).toMatchObject({ editor });
    });

    it('não lança erro quando useEditor retorna null', () => {
      vi.mocked(useEditor).mockReturnValue(null as any);
      expect(() =>
        render(<Editor content="" onChange={vi.fn()} />)
      ).not.toThrow();
    });
  });

  describe('configuração do useEditor', () => {
    it('inicia com o content da prop', () => {
      const editor = makeEditor();
      const getConfig = setupUseEditor(editor);
      render(<Editor content="<p>inicial</p>" onChange={vi.fn()} />);
      expect(getConfig().content).toBe('<p>inicial</p>');
    });

    it('usa placeholder padrão quando não informado', async () => {
      setupUseEditor(makeEditor());
      render(<Editor content="" onChange={vi.fn()} />);
      const { default: Placeholder } =
        await import('@tiptap/extension-placeholder');
      expect(Placeholder.configure).toHaveBeenCalledWith(
        expect.objectContaining({ placeholder: 'comece a escrever...' })
      );
    });

    it('usa placeholder personalizado quando informado', async () => {
      setupUseEditor(makeEditor());
      render(
        <Editor content="" onChange={vi.fn()} placeholder="escreva aqui" />
      );
      const { default: Placeholder } =
        await import('@tiptap/extension-placeholder');
      expect(Placeholder.configure).toHaveBeenCalledWith(
        expect.objectContaining({ placeholder: 'escreva aqui' })
      );
    });

    it('chama onChange com o HTML do editor no onUpdate', () => {
      const editor = makeEditor('<p>novo</p>');
      const getConfig = setupUseEditor(editor);
      const onChange = vi.fn();
      render(<Editor content="" onChange={onChange} />);
      getConfig().onUpdate({ editor });
      expect(onChange).toHaveBeenCalledWith('<p>novo</p>');
    });
  });

  describe('sincronização de conteúdo via prop', () => {
    it('chama setContent quando a prop muda para valor diferente', () => {
      const editor = makeEditor('<p>antigo</p>');
      vi.mocked(useEditor).mockReturnValue(editor as any);
      const { rerender } = render(
        <Editor content="<p>antigo</p>" onChange={vi.fn()} />
      );
      act(() => rerender(<Editor content="<p>novo</p>" onChange={vi.fn()} />));
      expect(editor.commands.setContent).toHaveBeenCalledWith('<p>novo</p>');
    });

    it('não chama setContent quando a prop é igual ao HTML atual', () => {
      const html = '<p>igual</p>';
      const editor = makeEditor(html);
      vi.mocked(useEditor).mockReturnValue(editor as any);
      const { rerender } = render(<Editor content={html} onChange={vi.fn()} />);
      act(() => rerender(<Editor content={html} onChange={vi.fn()} />));
      expect(editor.commands.setContent).not.toHaveBeenCalled();
    });

    it('não lança erro ao receber nova prop com editor null', () => {
      vi.mocked(useEditor).mockReturnValue(null as any);
      const { rerender } = render(
        <Editor content="<p>a</p>" onChange={vi.fn()} />
      );
      expect(() =>
        act(() => rerender(<Editor content="<p>b</p>" onChange={vi.fn()} />))
      ).not.toThrow();
    });
  });

  describe('TabIndent', () => {
    const getTabHandler = () => {
      const editor = makeEditor();
      const getConfig = setupUseEditor(editor);
      render(<Editor content="" onChange={vi.fn()} />);
      const tabExt = getConfig().extensions.find(
        (e: any) => e?.name === 'tabIndent'
      );
      const shortcuts = tabExt.config.addKeyboardShortcuts.call({ editor });
      return { handler: shortcuts.Tab, editor };
    };

    it('insere \\t e retorna true dentro de code block', () => {
      const { handler, editor } = getTabHandler();
      editor.isActive.mockReturnValue(true);
      expect(handler()).toBe(true);
      expect(editor.commands.insertContent).toHaveBeenCalledWith('\t');
    });

    it('retorna false e não insere nada fora de code block', () => {
      const { handler, editor } = getTabHandler();
      editor.isActive.mockReturnValue(false);
      expect(handler()).toBe(false);
      expect(editor.commands.insertContent).not.toHaveBeenCalled();
    });
  });
});
