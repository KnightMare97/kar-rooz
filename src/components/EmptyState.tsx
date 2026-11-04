import React from 'react';
import { Search, Inbox, Sparkles, Filter } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-items' | 'no-search-results' | 'no-filter-results';
  searchQuery?: string;
  onClearSearch?: () => void;
  onResetFilter?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  searchQuery,
  onClearSearch,
  onResetFilter,
}) => {
  if (type === 'no-search-results') {
    return (
      <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-[#292B38] bg-[#14151B]/50 my-6">
        <div className="w-10 h-10 rounded-xl bg-[#1F212B] border border-[#2B2D3B] flex items-center justify-center text-gray-400 mx-auto mb-3">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-200">
          موردی برای &laquo;{searchQuery}&raquo; یافت نشد
        </h3>
        <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
          می‌توانید عنوان، توضیحات یا برچسب دیگری را جستجو کنید یا جستجو را پاک کنید.
        </p>
        {onClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="mt-4 px-3.5 py-1.5 text-xs font-medium text-violet-300 bg-violet-950/40 hover:bg-violet-950/70 border border-violet-800/40 rounded-lg transition-colors cursor-pointer"
          >
            پاک کردن جستجو
          </button>
        )}
      </div>
    );
  }

  if (type === 'no-filter-results') {
    return (
      <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-[#292B38] bg-[#14151B]/50 my-6">
        <div className="w-10 h-10 rounded-xl bg-[#1F212B] border border-[#2B2D3B] flex items-center justify-center text-gray-400 mx-auto mb-3">
          <Filter className="w-5 h-5 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-200">موردی در این فیلتر موجود نیست</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
          در این بخش تسک یا یادداشتی ثبت نشده است.
        </p>
        {onResetFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            className="mt-4 px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-[#222430] hover:bg-[#2C2E3D] rounded-lg transition-colors cursor-pointer"
          >
            مشاهده همه موارد
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-14 px-4 text-center rounded-2xl border border-dashed border-[#272935] bg-[#14151B]/40 my-6">
      <div className="w-11 h-11 rounded-xl bg-[#1E202B] border border-[#2D2F3F] flex items-center justify-center text-violet-400 mx-auto mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-gray-200">کارهای امروز شما خالی و آرام است</h3>
      <p className="text-xs text-gray-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
        اولین تسک یا ایده امروزتان را در کادر بالا بنویسید. کار روز برای تمرکز و آرامش طراحی شده است.
      </p>
    </div>
  );
};
