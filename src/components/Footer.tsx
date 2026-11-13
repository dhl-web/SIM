import React from 'react';
import { Lock, Phone, ShieldCheck } from 'lucide-react';
import { PublicCmsSettings } from '../types';

interface FooterProps {
  cms: PublicCmsSettings;
  onGoAdmin: () => void;
  onSelectTier: (tier: '100k-300k' | '500k-1m' | '1m-5m' | '5m-10m' | 'vip-10m+') => void;
}

export const Footer: React.FC<FooterProps> = ({ cms, onGoAdmin, onSelectTier }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-800">
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-display text-lg font-extrabold">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6002E] text-white text-sm">
                V
              </span>
              <span>V-Sim Hub</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              Hệ thống phân phối SIM số đẹp Viettel chính chủ từ phổ thông đến VIP doanh nhân. Cam kết đăng ký thông tin chuẩn Nghị định 49 và bảo mật thanh toán VNPAY.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="inline-flex items-center gap-1.5 text-white font-semibold">
                <Phone className="w-3.5 h-3.5 text-[#E6002E]" />
                Hotline: {cms.hotline}
              </span>
              {cms.zaloOaId && (
                <span>Zalo OA: {cms.zaloOaId}</span>
              )}
            </div>
          </div>

          <div className="md:col-span-4 space-y-2.5">
            <h3 className="text-sm font-semibold text-white">Phân khúc giá phổ biến</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTier('100k-300k')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  SIM Viettel 100k – 300k
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTier('500k-1m')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  SIM Viettel 500k – 1 triệu
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTier('1m-5m')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  SIM Lộc Phát 1 triệu – 5 triệu
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTier('5m-10m')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  SIM Tam Hoa 5 triệu – 10 triệu
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTier('vip-10m+')}
                  className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  SIM VIP Đẳng Cấp Trên 10 Triệu
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-sm font-semibold text-white">Quản trị & SEO</h3>
            <div className="space-y-2 text-sm">
              <button
                type="button"
                onClick={onGoAdmin}
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Đăng Nhập Admin CMS</span>
              </button>
              <a
                href="/api/seo/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-slate-400 hover:text-white"
              >
                Sitemap XML cho Google Search
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} V-Sim Hub · Kho SIM Số Đẹp Viettel Chính Hãng.</p>
          <p className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Hỗ trợ VNPAY HMAC-SHA512 & Zalo OA ZNS</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
