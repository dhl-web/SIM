import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Search, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { PRICE_TIERS, PriceTierId, PublicCmsSettings } from '../types';

interface HeroSectionProps {
  cms: PublicCmsSettings;
  onSearchSubmit: (pattern: string) => void;
  onSelectTier: (tier: PriceTierId) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  cms,
  onSearchSubmit,
  onSelectTier
}) => {
  const [quickQuery, setQuickQuery] = useState('');
  const [imgError, setImgError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(quickQuery);
  };

  return (
    <section className="relative overflow-hidden bg-white border-b border-slate-200">
      {/* Slim Dismissible-Style Promo Strip */}
      {cms.promoBanner && (
        <div className="bg-slate-900 text-white text-xs sm:text-sm py-2 px-4 text-center font-medium">
          <span>{cms.promoBanner}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Column: Headline + Smart Search + Tier Quick Jump */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs sm:text-sm font-semibold text-[#E6002E] tracking-wide">
                Đại lý ủy quyền Viettel · Kho số cập nhật theo thời gian thực
              </p>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-slate-900 leading-[1.15] text-balance">
                {cms.heroTitle}
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                {cms.heroSubtitle}
              </p>
            </div>

            {/* Smart Pattern Search Form */}
            <form
              onSubmit={handleSubmit}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3"
            >
              <label htmlFor="hero-sim-search" className="block text-xs font-semibold text-slate-600">
                Tìm nhanh số đẹp (dùng dấu * làm ký tự đại diện: ví dụ 098*888, *6868, 1998)
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="hero-sim-search"
                    type="text"
                    value={quickQuery}
                    onChange={(e) => setQuickQuery(e.target.value)}
                    placeholder="Nhập số cần tìm: 098*888, *7979, 2000..."
                    className="w-full pl-10 pr-4 py-3 min-h-[46px] bg-white border border-slate-200 rounded-xl font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E6002E] focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] rounded-xl bg-[#E6002E] hover:bg-[#C80026] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <span>Tìm Số Ngay</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Direct Financial Tier Quick Selectors */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-medium text-slate-500 mr-1">Chọn nhanh ngân sách:</span>
                {PRICE_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => onSelectTier(tier.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      tier.isVip
                        ? 'bg-slate-900 text-amber-400 hover:bg-slate-800'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-[#E6002E] hover:text-[#E6002E]'
                    }`}
                  >
                    {tier.shortLabel}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Right Column: High-Impact Visual Card */}
          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[260px] lg:min-h-full">
            {!imgError ? (
              <img
                src="/src/assets/images/hero_viettel_sim_showcase_1794577126917.jpg"
                alt="SIM Viettel 5G chính hãng và điện thoại thông minh"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover lg:h-full"
              />
            ) : (
              <div className="w-full h-full min-h-[260px] bg-gradient-to-br from-rose-700 via-slate-900 to-indigo-950 flex items-center justify-center p-8">
                <Smartphone className="w-16 h-16 text-white/70" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent flex flex-col justify-end p-5 sm:p-6 text-white">
              <p className="text-xs font-medium text-amber-300">Sẵn sàng 5G & eSIM Viettel</p>
              <p className="font-display text-lg sm:text-xl font-bold mt-1">
                Đầu số 098 · 097 · 096 · 086 · 03x nguyên bản
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Đăng ký chính chủ tại điểm giao dịch hoặc eKYC trực tuyến
              </p>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Trust & Feature Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#E6002E] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900">100% Chính Chủ Viettel</p>
              <p className="text-xs text-slate-500 mt-0.5">Sang tên chính chủ ngay khi kích hoạt</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Thanh Toán VNPAY QR</p>
              <p className="text-xs text-slate-500 mt-0.5">Ký số HMAC-SHA512 an toàn tuyệt đối</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Nhận eSIM Trong 5 Phút</p>
              <p className="text-xs text-slate-500 mt-0.5">Hoặc giao SIM vật lý miễn phí toàn quốc</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Thông Báo Zalo OA Tự Động</p>
              <p className="text-xs text-slate-500 mt-0.5">Cập nhật từng bước đơn hàng qua ZNS</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
