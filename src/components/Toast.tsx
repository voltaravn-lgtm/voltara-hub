import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; removeToast: (id: string) => void }> = ({
  toast,
  removeToast,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  };

  const borderColors = {
    success: 'border-emerald-500/30 bg-emerald-50 text-emerald-950',
    error: 'border-rose-500/30 bg-rose-50 text-rose-950',
    warning: 'border-amber-500/30 bg-amber-50 text-amber-950',
    info: 'border-blue-500/30 bg-blue-50 text-blue-950',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${borderColors[toast.type]} backdrop-blur-md`}
    >
      {icons[toast.type]}
      <div className="flex-1 text-sm font-medium leading-5">{toast.message}</div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-gray-400 hover:text-gray-600 rounded-lg p-0.5 hover:bg-black/5 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
