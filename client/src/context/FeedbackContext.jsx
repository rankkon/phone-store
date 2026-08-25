import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const confirmResolver = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, { type = 'success', duration = type === 'error' ? 6500 : 4500 } = {}) => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current, { id, message, type }].slice(-4));
    if (duration > 0) window.setTimeout(() => dismissToast(id), duration);
  }, [dismissToast]);

  const confirm = useCallback((options) => new Promise((resolve) => {
    confirmResolver.current = resolve;
    setConfirmation({ title: 'Xác nhận thao tác', message: '', confirmLabel: 'Xác nhận', cancelLabel: 'Hủy', tone: 'danger', input: null, ...options });
  }), []);

  const resolveConfirmation = useCallback((result) => {
    confirmResolver.current?.(result);
    confirmResolver.current = null;
    setConfirmation(null);
  }, []);

  const value = useMemo(() => ({ notify, confirm }), [confirm, notify]);
  return <FeedbackContext.Provider value={value}>{children}<ToastViewport toasts={toasts} onDismiss={dismissToast} />{confirmation && <ConfirmDialog options={confirmation} onResolve={resolveConfirmation} />}</FeedbackContext.Provider>;
}

function ToastViewport({ toasts, onDismiss }) {
  return <div className="toast-viewport" aria-live="polite" aria-atomic="true">{toasts.map((toast) => <div className={`toast toast--${toast.type}`} key={toast.id} role="status"><span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}</span><p>{toast.message}</p><button type="button" onClick={() => onDismiss(toast.id)} aria-label="Đóng thông báo">×</button></div>)}</div>;
}

function ConfirmDialog({ options, onResolve }) {
  const [value, setValue] = useState(options.input?.defaultValue || '');
  const input = options.input;
  const valid = !input || !input.required || value.trim().length >= (input.minLength || 1);

  function submit(event) {
    event.preventDefault();
    if (!valid) return;
    onResolve(input ? value.trim() : true);
  }

  return <div className="modal confirm-modal" role="presentation"><form className="modal-content confirm-dialog form-stack" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onSubmit={submit}><div className="confirm-dialog__icon" aria-hidden="true">{options.tone === 'danger' ? '!' : '?'}</div><div><p className="eyebrow">XÁC NHẬN</p><h2 id="confirm-dialog-title">{options.title}</h2></div><p>{options.message}</p>{input && <label>{input.label}<textarea rows="3" minLength={input.minLength} maxLength={input.maxLength || 1000} value={value} onChange={(event) => setValue(event.target.value)} placeholder={input.placeholder} required={input.required} autoFocus /></label>}<div className="button-row"><button className={options.tone === 'danger' ? 'button button--danger' : 'button'} disabled={!valid}>{options.confirmLabel}</button><button type="button" className="button button--ghost" onClick={() => onResolve(null)}>{options.cancelLabel}</button></div></form></div>;
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used inside FeedbackProvider.');
  return context;
}
