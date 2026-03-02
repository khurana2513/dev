import { useState, useCallback } from 'react';

export type ToastType = 'info' | 'success' | 'error' | 'hint';

export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((msg: string, type: ToastType = 'info', dur = 2800) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), dur);
  }, []);

  return { toasts, add };
}
