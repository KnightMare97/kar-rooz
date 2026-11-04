import React, { useState, useRef, useEffect } from 'react';
import { KanbanStatus, KANBAN_COLUMNS } from '../types';
import { ChevronDown, Check } from 'lucide-react';

interface StatusMenuProps {
  currentStatus: KanbanStatus;
  onStatusChange: (newStatus: KanbanStatus) => void;
  disabled?: boolean;
}

export const StatusMenu: React.FC<StatusMenuProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const activeCol = KANBAN_COLUMNS.find((c) => c.id === currentStatus) || KANBAN_COLUMNS[0];

  // Dismiss on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (newStatus: KanbanStatus) => {
    onStatusChange(newStatus);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="relative inline-block text-right" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`تغییر وضعیت: وضعیت فعلی ${activeCol.label}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-gray-300 hover:text-white bg-[#14151C] hover:bg-[#1E202B] border border-[#272936] hover:border-[#353748] rounded-lg transition-colors cursor-pointer select-none whitespace-nowrap focus:outline-hidden focus-visible:ring-1 focus-visible:ring-violet-500"
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeCol.color }} />
        <span>{activeCol.label}</span>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="گزینه‌های وضعیت تسک"
          className="absolute z-50 mt-1 left-0 min-w-[140px] bg-[#181922] border border-[#2B2D3C] rounded-xl shadow-xl py-1 text-right animate-in fade-in zoom-in-95 duration-100"
        >
          {KANBAN_COLUMNS.map((col) => {
            const isSelected = col.id === currentStatus;
            return (
              <button
                key={col.id}
                role="menuitem"
                type="button"
                onClick={() => handleSelect(col.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors cursor-pointer text-right ${
                  isSelected
                    ? 'bg-[#252238] text-violet-200 font-medium'
                    : 'text-gray-300 hover:bg-[#1F212D] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                  <span>{col.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
