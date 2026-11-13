import React, { useState } from 'react';
import { ArrowRight, Check, Crown, ShoppingBag, Sparkles } from 'lucide-react';
import {
  formatVnd,
  PRICE_TIERS,
  PriceTierId,
  SimCard
} from '../types';

interface SimCatalogGridProps {
  sims: SimCard[];
  allSims: SimCard[];
  activeTier: PriceTierId | 'all';
  hasSearchOrFilter: boolean;
  cartIds: Set<string>;
  onAddToCart: (sim: SimCard) => void;
  onSelectTier: (tier: PriceTierId) => void;
  onResetFilters: () => void;
}

const SimCardItem: React.FC<{
  sim: SimCard;
  inCart: boolean;
  onAddToCart: (sim: SimCard) => void;
}> = ({ sim, inCart, onAddToCart }) => {
  const tierMeta = PRICE_TIERS.find((t) => t.id === sim.priceTier);
  const isVip = sim.priceTier === 'vip-10m+';
  const isAvailable = sim.status === 'available';

  return (
    <article
      className={`group rounded-2xl p-5 transition-transform duration-150 hover:-translate-y-0.5 flex flex-col justify-between ${
        isVip
          ? 'bg-slate-900 text-white border border-amber-400/50 shadow-sm'
          : 'bg-white text-slate-900 border border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="space-y-3">
        {/* Clean Unboxed Metadata Row (Zero-Pill Rule) */}
        <div
          className={`flex items-center justify-between gap-2 text-xs font-medium ${
            isVip ? 'text-amber-300' : 'text-slate-500'
          }`}
        >
          <span className="truncate">
            Đầu {sim.prefix} <span aria-hidden="true">·</span> {sim.category}{' '}
            <span aria-hidden="true">·</span> {tierMeta?.shortLabel}
          </span>
          <span
            className={`shrink-0 font-semibold ${
              isAvailable
                ? isVip
                  ? 'text-emerald-400'
                  : 'text-emerald-600'
                : 'text-amber-500'
            }`}
          >
            {sim.status === 'available'
              ? 'Sẵn sàng'
              : sim.status === 'reserved'
                ? 'Đang giữ'
                : 'Đã bán'}
          </span>
        </div>

        {/* Prominent Monospace SIM Number */}
        <div className="pt-1">
          <p
            className={`font-mono tabular-nums text-2xl sm:text-[1.6rem] font-bold tracking-tight ${
              isVip ? 'text-amber-300' : 'text-slate-900'
            }`}
          >
            {sim.phoneNumber}
          </p>
          <p
            className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${
              isVip ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {sim.fengShuiNote}
          </p>
        </div>
      </div>

      {/* Price & CTA Footer */}
      <div
        className={`mt-5 pt-4 border-t flex items-center justify-between gap-3 ${
          isVip ? 'border-slate-800' : 'border-slate-100'
        }`}
      >
        <div>
          <span className={`block text-[11px] ${isVip ? 'text-slate-400' : 'text-slate-500'}`}>
            Giá niêm yết
          </span>
          <span
            className={`font-mono tabular-nums text-lg font-bold ${
              isVip ? 'text-white' : 'text-[#E6002E]'
            }`}
          >
            {formatVnd(sim.price)}
          </span>
        </div>

        <button
          type="button"
          disabled={!isAvailable || inCart}
          onClick={() => onAddToCart(sim)}
          className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed ${
            inCart
              ? 'bg-emerald-600 text-white'
              : !isAvailable
                ? 'bg-slate-200 text-slate-500'
                : isVip
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-[#E6002E] hover:bg-[#C80026] text-white'
          }`}
        >
          {inCart ? (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>Đã thêm</span>
            </>
          ) : !isAvailable ? (
            <span>Hết hàng</span>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              <span>Chọn mua</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};

export const SimCatalogGrid: React.FC<SimCatalogGridProps> = ({
  sims,
  allSims,
  activeTier,
  hasSearchOrFilter,
  cartIds,
  onAddToCart,
  onSelectTier,
  onResetFilters
}) => {
  const [vipImgError, setVipImgError] = useState(false);
  const [esimImgError, setEsimImgError] = useState(false);

  // When no filter/search is active and "all" is selected, group by the 5 financial tiers
  // showing 3 curated demo numbers per tier so customers can compare across all budgets immediately.
  const showGroupedShowcase = activeTier === 'all' && !hasSearchOrFilter;

  return (
    <section id="sim-catalog" className="py-6 sm:py-10 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {showGroupedShowcase ? (
          <div className="space-y-10">
            {PRICE_TIERS.map((tier) => {
              const tierSims = allSims
                .filter((s) => s.priceTier === tier.id && s.status === 'available')
                .slice(0, 3);
              const totalInTier = allSims.filter(
                (s) => s.priceTier === tier.id && s.status === 'available'
              ).length;

              return (
                <div key={tier.id} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2.5 h-7 rounded-full ${tier.accentBg}`}
                        aria-hidden="true"
                      />
                      <div>
                        <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                          <span>Phân khúc {tier.label}</span>
                          {tier.isVip && <Crown className="w-5 h-5 text-amber-500" aria-hidden="true" />}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500">{tier.subtitle}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectTier(tier.id)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E6002E] hover:underline whitespace-nowrap self-start sm:self-auto py-1 cursor-pointer"
                    >
                      <span>Xem toàn bộ {totalInTier} số</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {tierSims.map((sim) => (
                      <SimCardItem
                        key={sim.id}
                        sim={sim}
                        inCart={cartIds.has(sim.id)}
                        onAddToCart={onAddToCart}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : sims.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
            <p className="font-display text-lg font-bold text-slate-900">
              Không tìm thấy số phù hợp trong kho hiện tại
            </p>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Bạn hãy thử xóa bớt điều kiện lọc hoặc sử dụng công cụ Tra Cứu Kho Số Viettel bên dưới để quét thêm số mới.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 cursor-pointer"
            >
              Xem lại toàn bộ kho số
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sims.map((sim) => (
              <SimCardItem
                key={sim.id}
                sim={sim}
                inCart={cartIds.has(sim.id)}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}

        {/* Dual Editorial Spotlight: VIP Collection & Instant eSIM 5G */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <div className="bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 grid grid-cols-1 sm:grid-cols-12 items-stretch">
            <div className="sm:col-span-5 relative min-h-[200px]">
              {!vipImgError ? (
                <img
                  src="/src/assets/images/vip_gold_sim_card_1794577128236.jpg"
                  alt="Bộ sưu tập SIM VIP Viettel mạ vàng đẳng cấp doanh nhân"
                  referrerPolicy="no-referrer"
                  onError={() => setVipImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-slate-950 flex items-center justify-center">
                  <Crown className="w-12 h-12 text-amber-400" />
                </div>
              )}
            </div>
            <div className="sm:col-span-7 p-6 flex flex-col justify-between space-y-4">
              <div>
                <p className="text-xs font-semibold text-amber-400">Bộ sưu tập giới hạn</p>
                <h3 className="font-display text-xl font-bold mt-1">
                  SIM VIP Doanh Nhân Trên 10 Triệu
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  Lục quý, Ngũ quý, Tứ quý và Tam Lộc Phát đầu cổ 098, 097, 086 giao dịch trực tiếp hoặc ký hợp đồng sang tên tại cửa hàng Viettel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectTier('vip-10m+')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold self-start cursor-pointer"
              >
                <span>Khám phá kho SIM VIP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white text-slate-900 rounded-2xl overflow-hidden border border-slate-200 grid grid-cols-1 sm:grid-cols-12 items-stretch">
            <div className="sm:col-span-5 relative min-h-[200px]">
              {!esimImgError ? (
                <img
                  src="/src/assets/images/esim_instant_activation_1794577127597.jpg"
                  alt="Kích hoạt eSIM Viettel 5G trực tuyến trên smartphone"
                  referrerPolicy="no-referrer"
                  onError={() => setEsimImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-rose-100 to-sky-100 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-[#E6002E]" />
                </div>
              )}
            </div>
            <div className="sm:col-span-7 p-6 flex flex-col justify-between space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#E6002E]">Trải nghiệm số không chờ đợi</p>
                <h3 className="font-display text-xl font-bold mt-1">
                  Kích Hoạt eSIM 5G & Thông Báo Zalo OA
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Thanh toán VNPAY xong nhận ngay mã QR eSIM và tin nhắn xác nhận tự động qua Zalo Official Account.
                </p>
              </div>
              <a
                href="#viettel-lookup"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold self-start"
              >
                <span>Tra kho số Viettel ngay</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
