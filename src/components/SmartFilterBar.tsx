import React, { useState } from 'react';
import { Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  PRICE_TIERS,
  PriceTierId,
  SIM_CATEGORIES,
  VIETTEL_PREFIXES
} from '../types';

export interface FilterState {
  searchPattern: string;
  priceTier: PriceTierId | 'all';
  prefix: string;
  category: string;
  excludeDigits: string[];
  sortBy: 'featured' | 'price_asc' | 'price_desc';
}

interface SmartFilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  tierCounts: Record<string, number>;
  totalMatched: number;
}

export const SmartFilterBar: React.FC<SmartFilterBarProps> = ({
  filters,
  onChange,
  tierCounts,
  totalMatched
}) => {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const toggleExcludeDigit = (digit: string) => {
    const exists = filters.excludeDigits.includes(digit);
    const next = exists
      ? filters.excludeDigits.filter((d) => d !== digit)
      : [...filters.excludeDigits, digit];
    onChange({ ...filters, excludeDigits: next });
  };

  const resetFilters = () => {
    onChange({
      searchPattern: '',
      priceTier: 'all',
      prefix: 'all',
      category: 'all',
      excludeDigits: [],
      sortBy: 'featured'
    });
  };

  const hasActiveFilters =
    filters.searchPattern !== '' ||
    filters.priceTier !== 'all' ||
    filters.prefix !== 'all' ||
    filters.category !== 'all' ||
    filters.excludeDigits.length > 0;

  return (
    <section id="price-tiers" className="bg-slate-50 pt-8 pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Kho SIM Viettel Theo Phân Khúc Tài Chính
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Lựa chọn phân khúc phù hợp ngân sách cá nhân hoặc lọc theo đầu số và ý nghĩa phong thủy.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-600 tabular-nums">
            Hiển thị <span className="font-bold text-slate-900">{totalMatched}</span> số đẹp sẵn sàng
          </p>
        </div>

        {/* 5 Price Tier Segmented Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => onChange({ ...filters, priceTier: 'all' })}
            className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              filters.priceTier === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            Tất cả phân khúc ({Object.values(tierCounts).reduce((a, b) => a + b, 0)})
          </button>

          {PRICE_TIERS.map((tier) => {
            const active = filters.priceTier === tier.id;
            const count = tierCounts[tier.id] || 0;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => onChange({ ...filters, priceTier: tier.id })}
                className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? `${tier.accentBg} text-white shadow-sm`
                    : tier.isVip
                      ? 'bg-slate-900/5 border border-amber-300 text-slate-900 hover:bg-slate-900 hover:text-amber-300'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{tier.label}</span>
                <span className={`ml-1.5 tabular-nums font-mono text-xs ${active ? 'opacity-90' : 'text-slate-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Desktop Smart Filter Toolbar */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-3 bg-white border border-slate-200 rounded-2xl p-4 items-center">
          {/* Pattern Input */}
          <div className="col-span-3 relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={filters.searchPattern}
              onChange={(e) => onChange({ ...filters, searchPattern: e.target.value })}
              placeholder="Mẫu số: *888, 098*68..."
              className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E6002E]"
            />
          </div>

          {/* Prefix Select */}
          <div className="col-span-2">
            <select
              aria-label="Lọc theo đầu số Viettel"
              value={filters.prefix}
              onChange={(e) => onChange({ ...filters, prefix: e.target.value })}
              className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E6002E]"
            >
              <option value="all">Mọi đầu số</option>
              {VIETTEL_PREFIXES.map((p) => (
                <option key={p} value={p}>
                  Đầu {p}
                </option>
              ))}
            </select>
          </div>

          {/* Category Select */}
          <div className="col-span-2">
            <select
              aria-label="Lọc theo loại SIM"
              value={filters.category}
              onChange={(e) => onChange({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E6002E]"
            >
              <option value="all">Mọi loại SIM</option>
              {SIM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Exclude Digits */}
          <div className="col-span-3 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Tránh số:</span>
            {['4', '7'].map((digit) => {
              const active = filters.excludeDigits.includes(digit);
              return (
                <button
                  key={digit}
                  type="button"
                  onClick={() => toggleExcludeDigit(digit)}
                  className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-rose-50 text-[#E6002E] border border-rose-300'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Không dính {digit}
                </button>
              );
            })}
          </div>

          {/* Sort + Reset */}
          <div className="col-span-2 flex items-center gap-2">
            <select
              aria-label="Sắp xếp theo giá"
              value={filters.sortBy}
              onChange={(e) =>
                onChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })
              }
              className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E6002E]"
            >
              <option value="featured">Nổi bật trước</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                title="Đặt lại bộ lọc"
                className="p-2.5 min-h-[40px] rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Smart Filter Bar */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={filters.searchPattern}
              onChange={(e) => onChange({ ...filters, searchPattern: e.target.value })}
              placeholder="Tìm số (*888, 1998)..."
              className="w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder:font-sans"
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            <span>Bộ lọc</span>
          </button>
        </div>

        {/* Mobile Filter Modal Sheet */}
        {mobileSheetOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#E6002E]" />
                  <h3 className="font-display text-lg font-bold text-slate-900">Bộ lọc thông minh</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Đầu số Viettel
                  </label>
                  <select
                    value={filters.prefix}
                    onChange={(e) => onChange({ ...filters, prefix: e.target.value })}
                    className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="all">Tất cả đầu số</option>
                    {VIETTEL_PREFIXES.map((p) => (
                      <option key={p} value={p}>
                        Đầu {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Loại SIM đẹp
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => onChange({ ...filters, category: e.target.value })}
                    className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="all">Tất cả loại</option>
                    {SIM_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Tránh chữ số không hợp mệnh
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['4', '7', '1', '0'].map((digit) => {
                      const active = filters.excludeDigits.includes(digit);
                      return (
                        <button
                          key={digit}
                          type="button"
                          onClick={() => toggleExcludeDigit(digit)}
                          className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold border ${
                            active
                              ? 'bg-rose-50 text-[#E6002E] border-rose-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          Tránh số {digit}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Sắp xếp giá
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) =>
                      onChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })
                    }
                    className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="featured">Nổi bật trước</option>
                    <option value="price_asc">Giá: Thấp đến Cao</option>
                    <option value="price_desc">Giá: Cao đến Thấp</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetFilters();
                    setMobileSheetOpen(false);
                  }}
                  className="flex-1 py-3 min-h-[44px] rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                >
                  Đặt lại
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(false)}
                  className="flex-1 py-3 min-h-[44px] rounded-xl bg-[#E6002E] text-white text-sm font-semibold"
                >
                  Xem {totalMatched} SIM
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
