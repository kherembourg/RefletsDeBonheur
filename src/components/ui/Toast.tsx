import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ type, message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    info: <AlertCircle size={20} />
  };

  const styles = {
    success: 'bg-sage-green text-ivory border-sage-green',
    error: 'bg-red-500 text-ivory border-red-500',
    info: 'bg-burgundy-old text-deep-charcoal border-burgundy-old'
  };

  return (
    <div
      className={`fixed top-4 right-4 z-100 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border-2 ${styles[type]} animate-in slide-in-from-top-5 fade-in duration-300`}
      role="alert"
    >
      {icons[type]}
      <p className="font-medium text-sm">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-70 transition-opacity"
        aria-label="Fermer"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Toast Container Hook
import { useState, useCallback } from 'react';

interface ToastData {
  id: number;
  type: ToastType;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );

  return {
    showToast,
    ToastContainer
  };
}
