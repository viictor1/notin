import { useEffect } from 'react';

type Props = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({ message, onConfirm, onCancel }: Props) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-surface border border-app rounded-lg p-6 w-80 shadow-lg">
        <p className="text-app text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn-ghost text-sm px-3 py-1 cursor-pointer"
          >
            cancelar
          </button>
          <button onClick={onConfirm} className="btn-primary cursor-pointer">
            excluir
          </button>
        </div>
      </div>
    </div>
  );
};
