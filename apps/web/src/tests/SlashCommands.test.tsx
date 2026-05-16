import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SlashCommands, commands } from '../components/slashCommands';
import { CommandList } from '../components/CommandList';
import { type Editor } from '@tiptap/core';

vi.mock('tippy.js', () => ({
  default: vi
    .fn()
    .mockReturnValue([{ setProps: vi.fn(), hide: vi.fn(), destroy: vi.fn() }]),
}));

vi.mock('@tiptap/react', async () => {
  const actual = await vi.importActual('@tiptap/react');
  return {
    ...actual,
    ReactRenderer: vi.fn().mockImplementation(() => ({
      element: document.createElement('div'),
      updateProps: vi.fn(),
      destroy: vi.fn(),
      ref: { onKeyDown: vi.fn().mockReturnValue(false) },
    })),
  };
});

const mockEditor = {
  chain: vi.fn(),
} as unknown as Editor;

const baseProps = {
  editor: mockEditor,
  range: { from: 0, to: 0 },
  query: '',
  text: '',
  decorationNode: null,
  clientRect: () => new DOMRect(),
  command: vi.fn(),
};

const renderCommandList = (items: any[]) => {
  const command = vi.fn();
  const ref = createRef<any>();
  render(
    <CommandList ref={ref} items={items} {...baseProps} command={command} />
  );
  return { ref, command };
};

const items = [
  { title: 'Texto', description: 'Parágrafo simples', command: vi.fn() },
  { title: 'Título 1', description: 'Título grande', command: vi.fn() },
  { title: 'Código', description: 'Bloco de código', command: vi.fn() },
];

describe('CommandList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  describe('renderização', () => {
    it('renderiza todos os itens recebidos', () => {
      renderCommandList(items);
      expect(screen.getByText('Texto')).toBeInTheDocument();
      expect(screen.getByText('Título 1')).toBeInTheDocument();
      expect(screen.getByText('Código')).toBeInTheDocument();
    });

    it('renderiza as descrições de cada item', () => {
      renderCommandList(items);
      expect(screen.getByText('Parágrafo simples')).toBeInTheDocument();
      expect(screen.getByText('Título grande')).toBeInTheDocument();
      expect(screen.getByText('Bloco de código')).toBeInTheDocument();
    });

    it('retorna null quando não há itens', () => {
      renderCommandList([]);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('marca o primeiro item como ativo por padrão', () => {
      renderCommandList(items);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveClass('slash-item--active');
      expect(buttons[1]).not.toHaveClass('slash-item--active');
    });
  });

  describe('navegação por teclado', () => {
    const press = (ref: any, key: string): boolean => {
      let result = false;
      act(() => {
        result = ref.current.onKeyDown({
          event: new KeyboardEvent('keydown', { key }),
        });
      });
      return result;
    };

    it('ArrowDown move seleção para o próximo item', () => {
      const { ref } = renderCommandList(items);
      press(ref, 'ArrowDown');
      expect(screen.getAllByRole('button')[1]).toHaveClass(
        'slash-item--active'
      );
    });

    it('ArrowUp move seleção para o item anterior', () => {
      const { ref } = renderCommandList(items);
      press(ref, 'ArrowDown');
      press(ref, 'ArrowUp');
      expect(screen.getAllByRole('button')[0]).toHaveClass(
        'slash-item--active'
      );
    });

    it('ArrowDown faz wrap do último para o primeiro', () => {
      const { ref } = renderCommandList(items);
      press(ref, 'ArrowDown');
      press(ref, 'ArrowDown');
      press(ref, 'ArrowDown');
      expect(screen.getAllByRole('button')[0]).toHaveClass(
        'slash-item--active'
      );
    });

    it('ArrowUp faz wrap do primeiro para o último', () => {
      const { ref } = renderCommandList(items);
      press(ref, 'ArrowUp');
      expect(screen.getAllByRole('button')[2]).toHaveClass(
        'slash-item--active'
      );
    });

    it('Enter executa o item selecionado', () => {
      const { ref, command } = renderCommandList(items);
      press(ref, 'Enter');
      expect(command).toHaveBeenCalledWith(items[0]);
    });

    it('Enter executa o item correto após navegar', () => {
      const { ref, command } = renderCommandList(items);
      press(ref, 'ArrowDown');
      press(ref, 'Enter');
      expect(command).toHaveBeenCalledWith(items[1]);
    });

    it('retorna true para ArrowDown', () => {
      const { ref } = renderCommandList(items);
      expect(press(ref, 'ArrowDown')).toBe(true);
    });

    it('retorna true para ArrowUp', () => {
      const { ref } = renderCommandList(items);
      expect(press(ref, 'ArrowUp')).toBe(true);
    });

    it('retorna true para Enter', () => {
      const { ref } = renderCommandList(items);
      expect(press(ref, 'Enter')).toBe(true);
    });

    it('retorna false para teclas desconhecidas', () => {
      const { ref } = renderCommandList(items);
      expect(press(ref, 'Tab')).toBe(false);
    });
  });

  describe('clique', () => {
    it('executa o command do item clicado', () => {
      const { command } = renderCommandList(items);
      fireEvent.click(screen.getByText('Título 1'));
      expect(command).toHaveBeenCalledWith(items[1]);
    });
  });

  describe('reset de seleção', () => {
    it('reseta para 0 quando os itens mudam', () => {
      const mockCommand = vi.fn();

      const itensIniciais = [
        { title: 'Item 1', description: 'Desc 1', command: vi.fn() },
        { title: 'Item 2', description: 'Desc 2', command: vi.fn() },
      ];

      const novosItens = [
        { title: 'Item 3', description: 'Desc 3', command: vi.fn() },
      ];

      const { container, rerender } = render(
        <CommandList
          items={itensIniciais}
          {...baseProps}
          command={mockCommand}
        />
      );

      act(() => {
        rerender(
          <CommandList
            items={novosItens}
            {...baseProps}
            command={mockCommand}
          />
        );
      });

      const botoes = container.querySelectorAll('.slash-item');
      expect(botoes[0]).toHaveClass('slash-item--active');
    });
  });
});

describe('SlashCommands (extensão)', () => {
  it('tem name "slashCommands"', () => {
    expect(SlashCommands.name).toBe('slashCommands');
  });

  it('adiciona ProseMirror plugins', () => {
    expect((SlashCommands as any).config.addProseMirrorPlugins).toBeDefined();
  });
});

describe('comandos slash', () => {
  const makeChain = () => ({
    focus: vi.fn().mockReturnThis(),
    deleteRange: vi.fn().mockReturnThis(),
    setParagraph: vi.fn().mockReturnThis(),
    setHeading: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    run: vi.fn(),
  });

  const range = { from: 0, to: 1 };

  const commandCases: Array<{
    title: string;
    check: (c: ReturnType<typeof makeChain>) => void;
  }> = [
    { title: 'Texto', check: (c) => expect(c.setParagraph).toHaveBeenCalled() },
    {
      title: 'Título 1',
      check: (c) => expect(c.setHeading).toHaveBeenCalledWith({ level: 1 }),
    },
    {
      title: 'Título 2',
      check: (c) => expect(c.setHeading).toHaveBeenCalledWith({ level: 2 }),
    },
    {
      title: 'Título 3',
      check: (c) => expect(c.setHeading).toHaveBeenCalledWith({ level: 3 }),
    },
    {
      title: 'Lista',
      check: (c) => expect(c.toggleBulletList).toHaveBeenCalled(),
    },
    {
      title: 'Lista numerada',
      check: (c) => expect(c.toggleOrderedList).toHaveBeenCalled(),
    },
    {
      title: 'Citação',
      check: (c) => expect(c.toggleBlockquote).toHaveBeenCalled(),
    },
    {
      title: 'Código',
      check: (c) => expect(c.toggleCodeBlock).toHaveBeenCalled(),
    },
    {
      title: 'Divisor',
      check: (c) => expect(c.setHorizontalRule).toHaveBeenCalled(),
    },
  ];

  it.each(commandCases)(
    '$title chama o método correto na chain',
    ({ title, check }) => {
      const chain = makeChain();
      const editor = { chain: vi.fn().mockReturnValue(chain) };
      const item = commands.find((c: any) => c.title === title);
      expect(item).toBeDefined();
      item.command({ editor, range } as any);
      expect(chain.focus).toHaveBeenCalled();
      expect(chain.deleteRange).toHaveBeenCalledWith(range);
      check(chain);
      expect(chain.run).toHaveBeenCalled();
    }
  );

  it('filtra por query (case-insensitive)', () => {
    const filtered = commands.filter((c: any) =>
      c.title.toLowerCase().includes('título')
    );
    expect(filtered).toHaveLength(3);
    expect(filtered.map((c: any) => c.title)).toEqual([
      'Título 1',
      'Título 2',
      'Título 3',
    ]);
  });

  it('retorna tudo para query vazia', () => {
    expect(
      commands.filter((c: any) => c.title.toLowerCase().includes(''))
    ).toHaveLength(9);
  });

  it('retorna vazio para query sem correspondência', () => {
    expect(
      commands.filter((c: any) => c.title.toLowerCase().includes('zzz'))
    ).toHaveLength(0);
  });
});
