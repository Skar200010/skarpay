import React, { useEffect } from 'react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 glass-panel-elevated px-4 py-3 rounded-xl border border-primary/40 shadow-2xl flex items-center gap-3">
      <span className="material-symbols-outlined text-tertiary">check_circle</span>
      <div>
        <div className="text-body-sm font-body-sm font-semibold text-on-surface">{toast.title}</div>
        <div className="text-label-sm font-label-sm text-on-surface-variant">{toast.description}</div>
      </div>
      <button
        className="ml-2 text-outline hover:text-on-surface"
        onClick={onClose}
        title="Dismiss"
        type="button"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}
