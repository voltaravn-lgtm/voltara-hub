import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  type = 'danger',
}) => {
  if (!isOpen) return null;

  const btnColors = {
    danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              {type === 'danger' || type === 'warning' ? (
                <AlertTriangle className={`w-5 h-5 ${type === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} />
              ) : null}
              {title}
            </h3>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${btnColors[type]}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
