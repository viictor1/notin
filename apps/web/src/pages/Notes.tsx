import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import type { Note } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

export const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmId) clearSelection();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmId]);

  const fetchNotes = async () => {
    try {
      const { data } = await notesService.list();
      setNotes(data);
    } catch {
      setError('erro ao carregar notas');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelection = () => {
    setSelected(null);
    setTitle('');
    setContent('');
    setIsNew(false);
  };

  const selectNote = (note: Note) => {
    setSelected(note);
    setTitle(note.title ?? '');
    setContent(note.content);
    setIsNew(false);
  };

  const newNote = () => {
    setSelected(null);
    setTitle('');
    setContent('');
    setIsNew(true);
  };

  const save = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (isNew) {
        const { data } = await notesService.create(title || null, content);
        setNotes((prev) => [data, ...prev]);
        setSelected(data);
        setIsNew(false);
      } else if (selected) {
        const { data } = await notesService.update(
          selected.id,
          title || null,
          content
        );
        setNotes((prev) => prev.map((n) => (n.id === data.id ? data : n)));
        setSelected(data);
      }
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await notesService.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selected?.id === id) clearSelection();
    } catch {
      setError('Erro ao excluir nota. Tente novamente.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

  return (
    <div className="min-h-screen bg-app flex flex-col">
      <header className="bg-surface border-b border-app px-6 py-4 flex items-center justify-between">
        <button
          onClick={clearSelection}
          className="font-bold text-lg tracking-tight text-primary cursor-pointer"
        >
          notin
        </button>
        <div className="flex items-center gap-4">
          <button onClick={newNote} className="btn-primary">
            + nova nota
          </button>
          <button onClick={toggle} className="btn-ghost text-base">
            {isDark ? '☀' : '☾'}
          </button>
          <button onClick={handleLogout} className="btn-ghost">
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
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`px-4 py-3 border-b border-app cursor-pointer group transition-colors border-l-2 ${
                  selected?.id === note.id
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
                      setConfirmId(note.id);
                    }}
                    className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </aside>

        <main className="flex-1 flex flex-col">
          {selected || isNew ? (
            <>
              <div className="bg-surface border-b border-app px-6 py-3 flex items-center justify-between">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="sem título"
                  className="bg-transparent text-base font-medium text-app outline-none flex-1 placeholder:text-muted"
                />
                {saveError && (
                  <p className="text-xs text-red-500 mr-3">{saveError}</p>
                )}
                <button
                  onClick={save}
                  disabled={isSaving || !content.trim()}
                  className="btn-primary ml-4"
                >
                  {isSaving ? 'salvando...' : 'salvar'}
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="comece a escrever..."
                className="flex-1 bg-transparent text-app text-sm p-6 outline-none resize-none leading-relaxed placeholder:text-muted"
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
