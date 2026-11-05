import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project, Item, UNASSIGNED_PROJECT_ID } from '../types';
import { Folder, ChevronDown, Check, X, RotateCcw, Archive } from 'lucide-react';
import { toPersianDigits } from '../utils/date';

interface ProjectMultiSelectProps {
  projects: Project[];
  items: Item[];
  selectedProjectIds: string[] | null; // null means default: all active projects + unassigned
  onSelectionChange: (selected: string[] | null) => void;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
  isSimpleMode?: boolean;
}

export const ProjectMultiSelect: React.FC<ProjectMultiSelectProps> = ({
  projects,
  items,
  selectedProjectIds,
  onSelectionChange,
  showArchived,
  onShowArchivedChange,
  isSimpleMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Project item counts
  const itemCountsByProject = useMemo(() => {
    const counts = new Map<string, number>();
    let unassigned = 0;

    for (const item of items) {
      if (!item.projectId && !item.project) {
        unassigned++;
      } else if (item.projectId) {
        counts.set(item.projectId, (counts.get(item.projectId) || 0) + 1);
      } else if (item.project) {
        // match by name
        const p = projects.find((proj) => proj.name === item.project);
        if (p) {
          counts.set(p.id, (counts.get(p.id) || 0) + 1);
        } else {
          unassigned++;
        }
      }
    }

    return { counts, unassigned };
  }, [items, projects]);

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);
  const archivedProjects = useMemo(() => projects.filter((p) => p.archived), [projects]);

  // Check if a specific ID is selected
  // When selectedProjectIds is null (default), all active projects + unassigned are treated as selected
  const isIdSelected = (id: string) => {
    if (selectedProjectIds === null) {
      if (id === UNASSIGNED_PROJECT_ID) return true;
      const proj = projects.find((p) => p.id === id);
      return proj ? !proj.archived : false;
    }
    return selectedProjectIds.includes(id);
  };

  const isDefaultState = selectedProjectIds === null;

  // Toggle single option
  const handleToggleId = (id: string) => {
    let currentSelection: string[];
    if (selectedProjectIds === null) {
      // Transition from default "all active + unassigned"
      currentSelection = [UNASSIGNED_PROJECT_ID, ...activeProjects.map((p) => p.id)];
    } else {
      currentSelection = [...selectedProjectIds];
    }

    if (currentSelection.includes(id)) {
      currentSelection = currentSelection.filter((item) => item !== id);
    } else {
      currentSelection.push(id);
    }

    onSelectionChange(currentSelection);
  };

  // Select all active + unassigned (resets to default null)
  const handleSelectAll = () => {
    onSelectionChange(null);
  };

  // Clear all selections
  const handleClearAll = () => {
    onSelectionChange([]);
  };

  // Remove a single chip
  const handleRemoveChip = (id: string) => {
    if (selectedProjectIds === null) {
      const activeIds = [UNASSIGNED_PROJECT_ID, ...activeProjects.map((p) => p.id)];
      onSelectionChange(activeIds.filter((item) => item !== id));
    } else {
      const updated = selectedProjectIds.filter((item) => item !== id);
      onSelectionChange(updated);
    }
  };

  // Label for trigger button
  const triggerLabel = useMemo(() => {
    if (selectedProjectIds === null) {
      return 'پروژه‌ها: همه';
    }
    if (selectedProjectIds.length === 0) {
      return 'پروژه‌ها: هیچ‌کدام';
    }
    if (selectedProjectIds.length === 1) {
      if (selectedProjectIds[0] === UNASSIGNED_PROJECT_ID) {
        return 'بدون پروژه';
      }
      const proj = projects.find((p) => p.id === selectedProjectIds[0]);
      return proj ? proj.name : '۱ پروژه';
    }
    return `پروژه‌ها: ${toPersianDigits(selectedProjectIds.length)} مورد`;
  }, [selectedProjectIds, projects]);

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Trigger Button & Popover Container */}
      <div className="relative inline-block text-right">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer select-none ${
            !isDefaultState
              ? 'bg-[#27243B] text-violet-200 border-violet-500/50 shadow-xs'
              : 'bg-[#15161D] text-gray-300 border-[#232532] hover:bg-[#1A1C24] hover:text-white'
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="truncate max-w-[150px]">{triggerLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-72 max-w-[90vw] bg-[#16171E] border border-[#272937] rounded-xl shadow-xl z-30 p-2.5 space-y-2 animate-in fade-in duration-100 text-xs">
            {/* Popover Header & Fast Actions */}
            <div className="flex items-center justify-between pb-2 border-b border-[#232532] px-1">
              <span className="font-semibold text-gray-200">فیلتر بر اساس پروژه</span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-violet-400 hover:text-violet-300 cursor-pointer"
                >
                  همه
                </button>
                <span className="text-gray-600">·</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-gray-400 hover:text-gray-200 cursor-pointer"
                >
                  پاک کردن
                </button>
              </div>
            </div>

            {/* Project Choices List */}
            <div className="max-h-60 overflow-y-auto space-y-1 py-1 pr-0.5">
              {/* Unassigned Item Option */}
              <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1E202B] cursor-pointer transition-colors text-gray-200">
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={isIdSelected(UNASSIGNED_PROJECT_ID)}
                    onChange={() => handleToggleId(UNASSIGNED_PROJECT_ID)}
                    className="w-3.5 h-3.5 rounded text-violet-600 border-gray-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                  <span className="truncate">بدون پروژه (اختصاص‌نیافته)</span>
                </div>
                <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.2 rounded bg-[#111217]">
                  {toPersianDigits(itemCountsByProject.unassigned)}
                </span>
              </label>

              {/* Active Projects */}
              {activeProjects.map((p) => {
                const count = itemCountsByProject.counts.get(p.id) || 0;
                return (
                  <label
                    key={p.id}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1E202B] cursor-pointer transition-colors text-gray-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isIdSelected(p.id)}
                        onChange={() => handleToggleId(p.id)}
                        className="w-3.5 h-3.5 rounded text-violet-600 border-gray-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.2 rounded bg-[#111217]">
                      {toPersianDigits(count)}
                    </span>
                  </label>
                );
              })}

              {/* Archived Projects (when toggled on) */}
              {showArchived && archivedProjects.length > 0 && (
                <div className="pt-1 mt-1 border-t border-[#232532]/70 space-y-1">
                  <div className="text-[10px] font-medium text-amber-400/80 px-1">پروژه‌های آرشیوشده:</div>
                  {archivedProjects.map((p) => {
                    const count = itemCountsByProject.counts.get(p.id) || 0;
                    return (
                      <label
                        key={p.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#1E202B] cursor-pointer transition-colors text-gray-400 hover:text-gray-200"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isIdSelected(p.id)}
                            onChange={() => handleToggleId(p.id)}
                            className="w-3.5 h-3.5 rounded text-violet-600 border-gray-600 focus:ring-violet-500 cursor-pointer"
                          />
                          <span className="w-2 h-2 rounded-full opacity-60 shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="truncate">{p.name}</span>
                          <span className="text-[9px] text-amber-300 font-mono">(آرشیو)</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 px-1.5 py-0.2 rounded bg-[#111217]">
                          {toPersianDigits(count)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optional "نمایش پروژه‌های آرشیوشده" toggle */}
            <div className="pt-2 border-t border-[#232532] px-1">
              <label className="flex items-center justify-between cursor-pointer select-none text-[11px] text-gray-400 hover:text-gray-200">
                <span className="flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-amber-400/80" />
                  <span>نمایش پروژه‌های آرشیوشده</span>
                </span>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => onShowArchivedChange(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-violet-600 border-gray-600 focus:ring-violet-500 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Active Filter Chips (Shown when filter is customized / not default) */}
      {!isDefaultState && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
          <span className="text-[11px] text-gray-500 font-medium">فیلترهای فعال:</span>

          {selectedProjectIds && selectedProjectIds.map((id) => {
            if (id === UNASSIGNED_PROJECT_ID) {
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#252238] border border-violet-500/30 text-violet-200 text-xs"
                >
                  <span>بدون پروژه</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChip(id)}
                    className="hover:text-white p-0.5 cursor-pointer"
                    title="حذف از فیلتر"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            }

            const proj = projects.find((p) => p.id === id);
            if (!proj) return null;

            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#252238] border border-violet-500/30 text-violet-200 text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
                <span className="max-w-[120px] truncate">{proj.name}</span>
                {proj.archived && <span className="text-[9px] text-amber-300 font-mono">(آرشیو)</span>}
                <button
                  type="button"
                  onClick={() => handleRemoveChip(id)}
                  className="hover:text-white p-0.5 cursor-pointer"
                  title="حذف از فیلتر"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {/* Reset Action */}
          <button
            type="button"
            onClick={handleSelectAll}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-gray-400 hover:text-violet-300 hover:bg-[#181922] transition-colors cursor-pointer"
            title="نمایش مجدد همه پروژه‌های فعال و بدون پروژه"
          >
            <RotateCcw className="w-3 h-3" />
            <span>بازنشانی فیلتر</span>
          </button>
        </div>
      )}
    </div>
  );
};
