import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { type Editor, type Range } from '@tiptap/core';
import type { SuggestionProps } from '@tiptap/suggestion';

export interface CommandItem {
  title: string;
  description: string;
  command: (props: { editor: Editor; range: Range }) => void;
}

export interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const CommandList = forwardRef<
  CommandListRef,
  SuggestionProps<CommandItem>
>((props, ref) => {
  const [selected, setSelected] = useState(0);
  const filtered = props.items;
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current[selected]?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s - 1 + filtered.length) % filtered.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % filtered.length);
        return true;
      }
      if (event.key === 'Enter') {
        props.command(filtered[selected]);
        return true;
      }
      return false;
    },
  }));

  useEffect(() => setSelected(0), [filtered]);

  if (!filtered.length) return null;

  return (
    <div className="slash-menu">
      {filtered.map((item, i) => (
        <button
          key={item.title}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className={`slash-item ${i === selected ? 'slash-item--active' : ''}`}
          onClick={() => props.command(item)}
        >
          <span className="slash-item__title">{item.title}</span>
          <span className="slash-item__desc">{item.description}</span>
        </button>
      ))}
    </div>
  );
});

CommandList.displayName = 'CommandList';
