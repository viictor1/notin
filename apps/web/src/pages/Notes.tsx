import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import type { Note } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { Editor } from '../components/Editor';

export const DEBOUNCE_MS = 3000;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

const isContentEmpty = (html: string) => !html.replace(/<[^>]*>/g, '').trim();

interface NoteItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: (note: Note) => void;
  onRequestDelete: (id: string) => void;
}

const NoteItem = memo(
  ({ note, isSelected, onSelect, onRequestDelete }: NoteItemProps) => (
    <div
      onClick={() => onSelect(note)}
      className={`px-4 py-3 border-b border-app cursor-pointer group transition-colors border-l-2 ${
        isSelected
          ? 'bg-app border-l-[var(--primary-hover)]'
          : 'border-l-transparent hover:bg-app'
      }`}
    >
      <p className="text-sm font-medium truncate text-app">
        {note.title ?? 'sem título'}
      </p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted">
          {formatDate(note.updated_at)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(note.id);
          }}
          className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          excluir
        </button>
      </div>
    </div>
  )
);

NoteItem.displayName = 'NoteItem';

export const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const selectedRef = useRef<Note | null>(null);
  const isNewRef = useRef(false);

  const savingKeys = useRef(new Set<string>());

  const pendingFlush = useRef(
    new Map<string, { title: string; content: string }>()
  );

  const isCreating = useRef(false);

  const lastSaved = useRef(
    new Map<string, { title: string; content: string }>()
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSelectedSync = useCallback((note: Note | null) => {
    selectedRef.current = note;
    setSelected(note);
  }, []);

  const setIsNewSync = useCallback((val: boolean) => {
    isNewRef.current = val;
    setIsNew(val);
  }, []);

  const cancelDebounce = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  useEffect(() => {
    notesService
      .list()
      .then(({ data }) => setNotes(data))
      .catch(() => setError('erro ao carregar notas'))
      .finally(() => setIsLoading(false));
  }, []);

  const save = useCallback(
    async (t: string, c: string, flush = false) => {
      const snapshot = {
        selected: selectedRef.current,
        isNew: isNewRef.current,
      };

      const lockKey = snapshot.isNew ? 'new' : snapshot.selected?.id;
      if (!lockKey) return;
      if (isContentEmpty(c)) return;

      const prev = lastSaved.current.get(lockKey);
      if (prev?.title === t && prev?.content === c) return;

      if (savingKeys.current.has(lockKey)) {
        if (flush) pendingFlush.current.set(lockKey, { title: t, content: c });
        return;
      }

      savingKeys.current.add(lockKey);
      setStatus('saving');

      try {
        if (snapshot.isNew) {
          if (isCreating.current) return;
          isCreating.current = true;
          try {
            const { data } = await notesService.create(t || null, c);
            setNotes((prev) => [data, ...prev]);
            if (isNewRef.current) {
              setSelectedSync(data);
              setIsNewSync(false);
            }
            lastSaved.current.set('new', { title: t, content: c });
            lastSaved.current.set(data.id, { title: t, content: c });
          } finally {
            isCreating.current = false;
          }
        } else if (snapshot.selected) {
          const { data } = await notesService.update(
            snapshot.selected.id,
            t || null,
            c
          );
          setNotes((prev) => prev.map((n) => (n.id === data.id ? data : n)));
          if (selectedRef.current?.id === data.id) setSelectedSync(data);
          lastSaved.current.set(snapshot.selected.id, { title: t, content: c });
        }

        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
      } finally {
        savingKeys.current.delete(lockKey);

        const pending = pendingFlush.current.get(lockKey);
        if (pending) {
          pendingFlush.current.delete(lockKey);
          save(pending.title, pending.content);
        }
      }
    },
    [setSelectedSync, setIsNewSync]
  );

  useEffect(() => {
    if (!selectedRef.current && !isNewRef.current) return;
    debounceTimer.current = setTimeout(() => save(title, content), DEBOUNCE_MS);
    return cancelDebounce;
  }, [title, content, save, cancelDebounce]);

  const clearEditor = useCallback(
    (flushSave = true) => {
      cancelDebounce();
      if (flushSave) save(title, content, true);
      setSelectedSync(null);
      setIsNewSync(false);
      setTitle('');
      setContent('');
    },
    [title, content, save, cancelDebounce, setSelectedSync, setIsNewSync]
  );

  const selectNote = useCallback(
    (note: Note) => {
      cancelDebounce();
      save(title, content, true);
      setSelectedSync(note);
      setIsNewSync(false);
      setTitle(note.title ?? '');
      setContent(note.content);
      lastSaved.current.set(note.id, {
        title: note.title ?? '',
        content: note.content,
      });
    },
    [title, content, save, cancelDebounce, setSelectedSync, setIsNewSync]
  );

  const newNote = useCallback(() => {
    cancelDebounce();
    save(title, content, true);
    setSelectedSync(null);
    setIsNewSync(true);
    setTitle('');
    setContent('');
    lastSaved.current.delete('new');
  }, [title, content, save, cancelDebounce, setSelectedSync, setIsNewSync]);

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await notesService.delete(id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
        lastSaved.current.delete(id);
        pendingFlush.current.delete(id);
        if (selectedRef.current?.id === id) clearEditor(false);
      } catch {
        setError('Erro ao excluir nota. Tente novamente.');
      }
    },
    [clearEditor]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmId) clearEditor();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmId, clearEditor]);

  const isEditing = selected !== null || isNew;

  return (
    <div className="min-h-screen bg-app flex flex-col">
      <header className="bg-surface border-b border-app px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => clearEditor()}
          className="font-bold text-lg tracking-tight text-primary cursor-pointer"
        >
          notin
        </button>
        <div className="flex items-center gap-4">
          <button onClick={newNote} className="btn-primary">
            + nova nota
          </button>
          <button
            onClick={toggle}
            className="btn-ghost text-base"
            aria-label="Alternar tema"
          >
            {isDark ? '☀' : '☾'}
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="btn-ghost"
          >
            sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 bg-surface border-r border-app overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-xs text-muted">carregando...</p>
          ) : error ? (
            <p className="p-4 text-xs text-red-500">{error}</p>
          ) : notes.length === 0 ? (
            <p className="p-4 text-xs text-muted">nenhuma nota ainda</p>
          ) : (
            notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isSelected={selected?.id === note.id}
                onSelect={selectNote}
                onRequestDelete={setConfirmId}
              />
            ))
          )}
        </aside>

        <main className="flex-1 flex flex-col">
          {isEditing ? (
            <>
              <div className="bg-surface border-b border-app px-6 py-3 flex items-center justify-between">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="sem título"
                  className="bg-transparent text-base font-medium text-app outline-none flex-1 placeholder:text-muted"
                />
                {status === 'saving' && (
                  <span className="text-xs text-muted">salvando...</span>
                )}
                {status === 'saved' && (
                  <span className="text-xs text-green-500">salvo</span>
                )}
                {status === 'error' && (
                  <span className="text-xs text-red-500">erro ao salvar</span>
                )}
              </div>
              <Editor
                content={content}
                onChange={setContent}
                placeholder="comece a escrever..."
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs text-muted mb-2">selecione uma nota ou</p>
                <button
                  onClick={newNote}
                  className="text-sm text-primary hover:underline"
                >
                  crie uma nova
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {confirmId && (
        <ConfirmModal
          message="Tem certeza que deseja excluir esta nota?"
          onConfirm={async () => {
            await deleteNote(confirmId);
            setConfirmId(null);
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
};
