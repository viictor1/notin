import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { useEffect } from 'react';
import { Extension } from '@tiptap/core';
import { SlashCommands } from './slashCommands';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const TabIndent = Extension.create({
  name: 'tabIndent',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive('codeBlock')) {
          this.editor.commands.insertContent('\t');
          return true;
        }
        return false;
      },
    };
  },
});

export const Editor = ({ content, onChange, placeholder }: EditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      TabIndent,
      SlashCommands,
      Placeholder.configure({
        placeholder: placeholder ?? 'comece a escrever...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none flex-1 p-6 outline-none text-app leading-relaxed',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <EditorContent
      editor={editor}
      className="flex-1 overflow-y-auto bg-transparent"
    />
  );
};
