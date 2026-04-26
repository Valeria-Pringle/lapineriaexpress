"use client";

interface ConfirmModalProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Confirmar accion</p>
          <p className="text-sm text-muted">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-xl transition"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-foreground font-semibold py-2 px-4 rounded-xl transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
