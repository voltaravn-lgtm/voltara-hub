import React from 'react';
import { FacebookPage } from '../../types/facebookTypes';
import { Check, CheckSquare, Square, ShieldCheck } from 'lucide-react';

interface FacebookPageSelectorProps {
  pages: FacebookPage[];
  selectedPageIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export const FacebookPageSelector: React.FC<FacebookPageSelectorProps> = ({
  pages,
  selectedPageIds,
  onSelectionChange,
}) => {
  const connectedPages = pages.filter(p => p.status === 'connected');

  const togglePageSelection = (id: string) => {
    if (selectedPageIds.includes(id)) {
      onSelectionChange(selectedPageIds.filter(pid => pid !== id));
    } else {
      onSelectionChange([...selectedPageIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedPageIds.length === connectedPages.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(connectedPages.map(p => p.id));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Chọn Fanpage đích ({selectedPageIds.length}/{connectedPages.length})
        </label>
        
        {connectedPages.length > 1 && (
          <button
            type="button"
            onClick={selectAll}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors focus:outline-none"
            id="btn-select-all-pages"
          >
            {selectedPageIds.length === connectedPages.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả Fanpage'}
          </button>
        )}
      </div>

      {connectedPages.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs space-y-2">
          <p className="font-semibold flex items-center gap-1.5 text-amber-700">
            ⚠ Chưa có Fanpage nào được kết nối thành công!
          </p>
          <p className="leading-relaxed font-normal text-slate-600">
            Vui lòng sang mục <strong className="font-semibold">Fanpage đã kết nối</strong> để liên kết tài khoản Facebook hoặc kết nối một số Fanpage mẫu để bắt đầu biên tập tin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {connectedPages.map(page => {
            const isSelected = selectedPageIds.includes(page.id);
            return (
              <div
                key={page.id}
                onClick={() => togglePageSelection(page.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
                id={`page-selector-item-${page.id}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 text-xs overflow-hidden">
                    {page.picture ? (
                      <img src={page.picture} alt={page.name} className="w-full h-full object-cover" />
                    ) : (
                      page.name.charAt(0)
                    )}
                  </div>
                  <div className="text-left overflow-hidden">
                    <h5 className="font-bold text-slate-800 text-xs truncate leading-normal">
                      {page.name}
                    </h5>
                    <span className="text-[10px] text-slate-500 block truncate font-medium">
                      {page.category || 'Thương hiệu'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={`p-1 rounded-md transition-colors ${
                    isSelected ? 'text-blue-600' : 'text-slate-300'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4.5 h-4.5" />
                  ) : (
                    <Square className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
