import React, { useState } from 'react';
import { Item } from '../types';
import { TaskCard } from './TaskCard';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { toPersianDigits } from '../utils/date';

interface CompletedSectionProps {
  items: Item[];
  isSimpleMode: boolean;
  onToggleComplete: (id: string, e: React.MouseEvent) => void;
  onClickItem: (item: Item) => void;
}

export const CompletedSection: React.FC<CompletedSectionProps> = ({
  items,
  isSimpleMode,
  onToggleComplete,
  onClickItem,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="pt-4 border-t border-[#232532]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors cursor-pointer group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-violet-400/80" />
          <span>کارهای تکمیل‌شده ({toPersianDigits(items.length)})</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-gray-300">
          <span>{isOpen ? 'بستن' : 'نمایش'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
          {items.map((item) => (
            <TaskCard
              key={item.id}
              item={item}
              isSimpleMode={isSimpleMode}
              onToggleComplete={onToggleComplete}
              onClick={onClickItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};
