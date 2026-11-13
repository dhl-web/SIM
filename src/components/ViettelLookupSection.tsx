import React, { useState } from 'react';
import { Check, Database, Loader2, Search, ShoppingBag } from 'lucide-react';
import { formatVnd, PRICE_TIERS, SimCard, VIETTEL_PREFIXES } from '../types';

interface ViettelLookupSectionProps {
  existingSoldDigits: Set<string>;
  cartIds: Set<string>;
  onAddToCart: (sim: SimCard) => void;
}

export const ViettelLookupSection: React.FC<ViettelLookupSectionProps> = ({
  existingSoldDigits,
  cartIds,
  onAddToCart
}) => {
  const [query, setQuery] = useState('*888');
  const [prefix, setPrefix] = useState('all');
  const [exclude47, setExclude47] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SimCard[]>([]);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [apiModeLabel, setApiModeLabel] = useState<'sandbox' | 'production'>('sandbox');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      params.set('q', query.trim());
      params.set('prefix', prefix);
      if (exclude47) {
        params.set('exclude', '4,7');
      }
      const res = await fetch(`/api/viettel/lookup?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Không thể kết nối API tra cứu kho số Viettel.');
      }
      const data = await res.json();
      const items: SimCard[] = (data.items || []).map((item: SimCard) => ({
        ...item,
        status: existingSoldDigits.has(item.rawDigits) ? 'sold' : 'available'
      }));
      setResults(items);
      setApiModeLabel(data.mode === 'production' ? 'production' : 'sandbox');
      setSearchedOnce(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi kết nối kho Viettel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="viettel-lookup" className="py-12 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
              <Database className="w-4 h-4" aria-hidden="true" />
              <span>Kết nối API Kho Số Viettel</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Tra Cứu Kho Số Viettel Theo Yêu Cầu
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Nhập dãy số mong muốn (năm sinh, số cuối hợp mệnh hoặc số điện thoại chính xác 10 chữ số) để kiểm tra tình trạng kho Viettel và đặt giữ số ngay.
            </p>
          </div>
          {searchedOnce && (
            <span className="text-xs font-medium text-slate-500">
              Nguồn dữ liệu: {apiModeLabel === 'production' ? 'Viettel Partner API' : 'Viettel Stock Sandbox'}
            </span>
          )}
        </div>

        <form
          onSubmit={handleLookup}
          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-5">
            <label htmlFor="vt-query" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mẫu số cần tra cứu
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="vt-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="VD: 098*888, *6868, 1995, 0988123456"
                className="w-full pl-10 pr-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-xl font-mono text-sm text-slate-900 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="vt-prefix" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Đầu số ưu tiên
            </label>
            <select
              id="vt-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              <option value="all">Tất cả đầu số Viettel</option>
              {VIETTEL_PREFIXES.map((p) => (
                <option key={p} value={p}>
                  Đầu {p}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-center h-[44px]">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exclude47}
                onChange={(e) => setExclude47(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
              />
              <span>Tránh số 4, 7</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tra...</span>
                </>
              ) : (
                <span>Tra Kho Viettel</span>
              )}
            </button>
          </div>
        </form>

        {errorMsg && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
            {errorMsg}
          </p>
        )}

        {searchedOnce && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                Không có số khả dụng khớp mẫu "{query}". Hãy thử mẫu khác như *68 hoặc *79.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((sim) => {
                  const inCart = cartIds.has(sim.id);
                  const tierLabel = PRICE_TIERS.find((t) => t.id === sim.priceTier)?.shortLabel;
                  return (
                    <div
                      key={sim.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-500 truncate">
                          {sim.category} <span aria-hidden="true">·</span> {tierLabel}
                        </p>
                        <p className="font-mono tabular-nums text-lg font-bold text-slate-900 mt-0.5">
                          {sim.phoneNumber}
                        </p>
                        <p className="font-mono tabular-nums text-sm font-bold text-[#E6002E] mt-0.5">
                          {formatVnd(sim.price)}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={sim.status !== 'available' || inCart}
                        onClick={() => onAddToCart(sim)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          inCart
                            ? 'bg-emerald-600 text-white'
                            : sim.status !== 'available'
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {inCart ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã thêm</span>
                          </>
                        ) : sim.status !== 'available' ? (
                          <span>Đã bán</span>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Đặt số</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
