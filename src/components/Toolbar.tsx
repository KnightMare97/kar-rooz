import React from 'react';
import { FilterType } from '../types';
import { Search, X } from 'lucide-react';

interface ToolbarProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-0">
        <Search className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          dir="auto"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="جستجو در عنوان، توضیحات، برچسب..."
          className="w-full pr-8 pl-7 py-1.5 bg-[#14151C] border border-[#232532] focus:border-violet-500 rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
            title="پاک کردن جستجو"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Segmented Control */}
      <div className="flex items-center p-0.5 bg-[#14151C] rounded-lg border border-[#232532] shrink-0 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            filter === 'all'
              ? 'bg-[#27243B] text-violet-200 shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          همه
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('tasks')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            filter === 'tasks'
              ? 'bg-[#27243B] text-violet-200 shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          تسک‌ها
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('notes')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            filter === 'notes'
              ? 'bg-[#27243B] text-violet-200 shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          یادداشت‌ها
        </button>
      </div>
    </div>
  );
};
