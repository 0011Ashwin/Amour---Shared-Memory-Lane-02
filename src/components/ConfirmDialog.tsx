import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  cancelText = "Cancel"
}: ConfirmDialogProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-white w-full max-w-[340px] rounded-3xl p-6 shadow-2xl border border-rose-100 overflow-hidden z-10"
          >
            {/* Design Accents */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-6 -mt-6 opacity-60 pointer-events-none" />
            
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-50 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                <AlertCircle size={24} />
              </div>

              {/* Text */}
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-800 font-sans tracking-tight">{title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                  {message}
                </p>
              </div>

              {/* Actions */}
              <div className="flex w-full gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onConfirm();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-md shadow-rose-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} className="stroke-white" />
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
