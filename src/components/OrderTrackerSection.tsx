import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle2, Loader2, PackageSearch, Search } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatVnd, OrderTrackingInfo } from '../types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận & giữ số',
  shipping: 'Đang giao SIM toàn quốc',
  completed: 'Hoàn tất kích hoạt',
  cancelled: 'Đã hủy'
};

export const OrderTrackerSection: React.FC = () => {
  const [orderCodeInput, setOrderCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderTrackingInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = orderCodeInput.trim().toUpperCase();
    if (!code) return;
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      setErrorMsg('Mã đơn hàng chỉ gồm chữ cái, số và dấu gạch ngang.');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setErrorMsg('');
    setResult(null);

    const path = `order_tracking/${code}`;
    try {
      const snap = await getDoc(doc(db, 'order_tracking', code));
      if (!snap.exists()) {
        setNotFound(true);
      } else {
        setResult(snap.data() as OrderTrackingInfo);
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.GET, path);
      } catch {
        setErrorMsg('Không thể tra cứu đơn hàng lúc này. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="order-tracker" className="py-12 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                <PackageSearch className="w-4 h-4" aria-hidden="true" />
                <span>Tra cứu bảo mật · Không lộ thông tin cá nhân</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
                Kiểm Tra Trạng Thái Đơn Hàng
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Nhập mã đơn hàng (ví dụ <span className="font-mono font-semibold">VS-2026...</span>) để xem tiến trình thanh toán VNPAY, vận chuyển và lịch sử thông báo Zalo OA.
              </p>
            </div>
          </div>

          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={orderCodeInput}
                onChange={(e) => setOrderCodeInput(e.target.value)}
                placeholder="Nhập mã đơn hàng (VD: VS-894120)"
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !orderCodeInput.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Kiểm Tra Đơn</span>
            </button>
          </form>

          {errorMsg && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              {errorMsg}
            </p>
          )}

          {notFound && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              Không tìm thấy đơn hàng với mã này. Vui lòng kiểm tra lại tin nhắn xác nhận từ Zalo OA.
            </p>
          )}

          {result && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs text-slate-500">Mã đơn hàng</span>
                  <p className="font-mono text-lg font-bold text-slate-900">{result.orderCode}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{STATUS_LABELS[result.orderStatus] || result.orderStatus}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-slate-500">SIM đã đặt</span>
                  <p className="font-mono font-semibold text-slate-900 mt-0.5">
                    {result.simNumbers.join(', ')}
                  </p>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Thanh toán</span>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {result.paymentMethod === 'vnpay' ? 'VNPAY' : 'COD'} ·{' '}
                    <span
                      className={
                        result.paymentStatus === 'paid' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'
                      }
                    >
                      {result.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Tổng tiền · Zalo OA</span>
                  <p className="font-mono tabular-nums font-bold text-[#E6002E] mt-0.5">
                    {formatVnd(result.totalAmount)}{' '}
                    <span className="text-xs font-sans font-normal text-slate-500">
                      ({result.zaloNotifiedCount} tin ZNS)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
