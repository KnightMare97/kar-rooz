import React, { useState, useEffect } from 'react';
import { Project, PRESET_PROJECT_COLORS } from '../types';
import { X, Folder, AlertCircle } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  project?: Project | null; // if editing
  onClose: () => void;
  onSave: (projectData: { name: string; description?: string; color: string }) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  project,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_PROJECT_COLORS[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setColor(project.color || PRESET_PROJECT_COLORS[0]);
      setError('');
    } else {
      setName('');
      setDescription('');
      setColor(PRESET_PROJECT_COLORS[0]);
      setError('');
    }
  }, [project, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('نام پروژه الزامی است.');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#181920] border-t sm:border border-[#2D2F3C] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col text-right overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-gray-600/40 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#252733]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-950/40 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <Folder className="w-4 h-4" />
            </div>
            <h3 id="project-modal-title" className="text-sm font-semibold text-gray-100">
              {project ? 'ویرایش پروژه' : 'پروژه جدید'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#232532] rounded-lg transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Project Name (Required) */}
          <div>
            <label htmlFor="project-name" className="block text-xs font-medium text-gray-300 mb-1.5">
              نام پروژه <span className="text-red-400">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              dir="auto"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="مثال: طراحی سایت مشتری، گزارش سالانه..."
              className="w-full px-3.5 py-2 bg-[#121318] border border-[#2B2D3A] focus:border-violet-500 rounded-xl text-xs sm:text-sm text-gray-100 placeholder-gray-500 outline-hidden transition-colors"
            />
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Color Selection (Optional) */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              رنگ شناسه (اختیاری)
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {PRESET_PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                    color === c ? 'scale-115 ring-2 ring-white/50 ring-offset-2 ring-offset-[#181920]' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`انتخاب رنگ ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Description (Optional) */}
          <div>
            <label htmlFor="project-desc" className="block text-xs font-medium text-gray-400 mb-1.5">
              توضیحات مختصر (اختیاری)
            </label>
            <textarea
              id="project-desc"
              dir="auto"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="هدف یا جزئیات کلیدی این پروژه..."
              className="w-full px-3.5 py-2 bg-[#121318] border border-[#2B2D3A] focus:border-violet-500 rounded-xl text-xs text-gray-100 placeholder-gray-500 outline-hidden transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#252733]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white bg-[#222430] hover:bg-[#2A2C3A] rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors cursor-pointer shadow-sm shadow-violet-900/30"
            >
              {project ? 'ذخیره تغییرات' : 'ایجاد پروژه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
