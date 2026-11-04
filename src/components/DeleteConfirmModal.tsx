import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  itemTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  itemTitle,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-[#1A1B22] border border-[#2F3240] p-5 shadow-2xl text-right animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="delete-dialog-title" className="text-base font-semibold text-gray-100">
              حذف مورد
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">این اقدام قابل بازگشت نیست.</p>
          </div>
        </div>

        <p className="text-sm text-gray-300 my-4 line-clamp-2 bg-[#14151B] p-2.5 rounded-lg border border-[#252733]">
          &ldquo;{itemTitle}&rdquo;
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#252733]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium text-gray-300 hover:text-white bg-[#22242E] hover:bg-[#2A2C38] rounded-lg transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer shadow-sm shadow-red-900/30"
          >
            بله، حذف شود
          </button>
        </div>
      </div>
    </div>
  );
};
