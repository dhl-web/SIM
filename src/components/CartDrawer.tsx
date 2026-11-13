import React, { useState } from 'react';
import { CreditCard, Loader2, MessageSquare, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { formatVnd, PaymentMethod, SimCard } from '../types';

export interface CheckoutFormPayload {
  customerName: string;
  customerPhone: string;
  zaloOptIn: boolean;
  shippingAddress: string;
  simType: 'physical' | 'esim';
  paymentMethod: PaymentMethod;
}

interface CartDrawerProps {
  open: boolean;
  items: SimCard[];
  submitting: boolean;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onSubmitOrder: (payload: CheckoutFormPayload) => Promise<void>;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  items,
  submitting,
  onClose,
  onRemoveItem,
  onSubmitOrder
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [zaloOptIn, setZaloOptIn] = useState(true);
  const [simType, setSimType] = useState<'physical' | 'esim'>('esim');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vnpay');
  const [validationError, setValidationError] = useState('');

  if (!open) return null;

  const subtotal = items.reduce((sum, s) => sum + s.price, 0);
  const vnpayDiscount = paymentMethod === 'vnpay' ? Math.round(subtotal * 0.05) : 0;
  const totalAmount = Math.max(50000, subtotal - vnpayDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (items.length === 0) {
      setValidationError('Giỏ hàng của bạn đang trống.');
      return;
    }
    if (customerName.trim().length < 2) {
      setValidationError('Vui lòng nhập họ tên đầy đủ.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 11) {
      setValidationError('Vui lòng nhập số điện thoại liên hệ hợp lệ (9–11 số).');
      return;
    }
    if (shippingAddress.trim().length < 3) {
      setValidationError(
        simType === 'esim'
          ? 'Vui lòng nhập Email hoặc địa chỉ để nhận mã QR eSIM.'
          : 'Vui lòng nhập địa chỉ giao SIM.'
      );
      return;
    }

    await onSubmitOrder({
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      zaloOptIn,
      shippingAddress: shippingAddress.trim(),
      simType,
      paymentMethod
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Giỏ hàng và thanh toán"
    >
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#E6002E]" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Giỏ Hàng ({items.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-600">
                Chưa có số SIM nào trong giỏ hàng.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                Tiếp tục chọn số
              </button>
            </div>
          ) : (
            <>
              {/* Itemized List */}
              <div className="space-y-2.5">
                {items.map((sim) => (
                  <div
                    key={sim.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <p className="text-xs text-slate-500">
                        Viettel {sim.prefix} · {sim.category}
                      </p>
                      <p className="font-mono tabular-nums text-base font-bold text-slate-900">
                        {sim.phoneNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums text-sm font-bold text-[#E6002E]">
                        {formatVnd(sim.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(sim.id)}
                        aria-label={`Xóa số ${sim.phoneNumber}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Form */}
              <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-display text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                  Thông tin nhận SIM & Thông báo Zalo OA
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E6002E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số điện thoại (Zalo) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0988123456"
                      className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#E6002E]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50 border border-sky-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zaloOptIn}
                    onChange={(e) => setZaloOptIn(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-sky-300 text-sky-600"
                  />
                  <div className="text-xs text-sky-900 leading-relaxed">
                    <span className="font-semibold flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                      Nhận thông báo trạng thái đơn hàng tự động qua Zalo OA
                    </span>
                    <span className="text-sky-700 block mt-0.5">
                      Hệ thống gửi tin ZNS ngay khi xác nhận thanh toán, xuất kho và giao SIM.
                    </span>
                  </div>
                </label>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Hình thức SIM
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSimType('esim')}
                      className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                        simType === 'esim'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      eSIM Viettel (QR 5 phút)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimType('physical')}
                      className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                        simType === 'physical'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      SIM vật lý (Ship COD)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {simType === 'esim' ? 'Email nhận QR eSIM & địa chỉ đăng ký *' : 'Địa chỉ giao SIM tận nơi *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder={
                      simType === 'esim'
                        ? 'email@domain.com - Quận Cầu Giấy, Hà Nội'
                        : 'Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP'
                    }
                    className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E6002E]"
                  />
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phương thức thanh toán
                  </span>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                        paymentMethod === 'vnpay'
                          ? 'border-[#005BAA] bg-sky-50/70'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'vnpay'}
                          onChange={() => setPaymentMethod('vnpay')}
                        />
                        <div>
                          <p className="text-sm font-bold text-[#005BAA] flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4" />
                            <span>Thanh toán trực tuyến VNPAY</span>
                          </p>
                          <p className="text-xs text-slate-600">
                            Quét mã VNPAY-QR, thẻ ATM nội địa, Visa/Mastercard (Giảm ngay 5%)
                          </p>
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                        paymentMethod === 'cod'
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'cod'}
                          onChange={() => setPaymentMethod('cod')}
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <Truck className="w-4 h-4" />
                            <span>Thanh toán khi nhận hàng (COD)</span>
                          </p>
                          <p className="text-xs text-slate-600">
                            Kiểm tra đúng số SIM Viettel mới thanh toán tiền mặt
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {validationError && (
                  <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                    {validationError}
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        {/* Sticky Footer Totals */}
        {items.length > 0 && (
          <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính ({items.length} SIM)</span>
                <span className="font-mono tabular-nums">{formatVnd(subtotal)}</span>
              </div>
              {vnpayDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Ưu đãi thanh toán VNPAY (5%)</span>
                  <span className="font-mono tabular-nums">-{formatVnd(vnpayDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Tổng thanh toán</span>
                <span className="font-mono tabular-nums text-lg text-[#E6002E]">
                  {formatVnd(totalAmount)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className={`w-full inline-flex items-center justify-center gap-2 py-3.5 min-h-[48px] rounded-xl text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-60 ${
                paymentMethod === 'vnpay'
                  ? 'bg-[#005BAA] hover:bg-[#004A8C]'
                  : 'bg-[#E6002E] hover:bg-[#C80026]'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý đơn hàng...</span>
                </>
              ) : paymentMethod === 'vnpay' ? (
                <span>Tiếp tục thanh toán qua VNPAY</span>
              ) : (
                <span>Đặt Mua & Nhận Tin Zalo OA</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
