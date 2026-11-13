import React, { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onNavigateSection: (sectionId: string) => void;
  onGoAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  onNavigateSection,
  onGoAdmin
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Kho SIM', target: 'sim-catalog' },
    { label: 'Phân Khúc', target: 'price-tiers' },
    { label: 'Tra Cứu Viettel', target: 'viettel-lookup' },
    { label: 'Kiểm Tra Đơn', target: 'order-tracker' }
  ];

  const handleNavClick = (target: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(target);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 rounded-md"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6002E] text-white text-sm font-bold">
            V
          </span>
          <span>V-Sim Hub</span>
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          {navItems.map((item) => (
            <button
              key={item.target}
              type="button"
              onClick={() => handleNavClick(item.target)}
              className="whitespace-nowrap shrink-0 py-1.5 text-slate-600 hover:text-[#E6002E] transition-colors border-b-2 border-transparent hover:border-[#E6002E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Drawer Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#E6002E] hover:bg-[#C80026] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-600 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>Giỏ Hàng</span>
            <span className="tabular-nums font-mono text-xs bg-white/20 px-1.5 py-0.5 rounded-md">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.target}
              type="button"
              onClick={() => handleNavClick(item.target)}
              className="w-full text-left px-3 py-3 min-h-[44px] rounded-lg text-sm font-semibold text-slate-700 hover:bg-rose-50 hover:text-[#E6002E] transition-colors"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onGoAdmin();
            }}
            className="w-full text-left px-3 py-3 min-h-[44px] rounded-lg text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cổng Quản Trị CMS
          </button>
        </div>
      )}
    </header>
  );
};
