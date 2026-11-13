import React from 'react';
import { CheckCircle2, MessageSquare, ShieldCheck, X } from 'lucide-react';
import { formatVnd } from '../types';

export interface CompletedOrderSummary {
  orderCode: string;
  customerName: string;
  simNumbers: string[];
  totalAmount: number;
  paymentMethod: 'vnpay' | 'cod';
  paymentStatus: 'paid' | 'unpaid' | 'failed';
  vnpayTxnRef?: string;
  zaloPreview?: string;
  zaloDeliveryStatus?: string;
}

interface OrderSuccessModalProps {
  summary: CompletedOrderSummary | null;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ summary, onClose }) => {
  if (!summary) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận đơn hàng thành công"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  Đặt Hàng Thành Công
                </h3>
                <p className="text-xs text-slate-500">
                  Mã đơn hàng:{' '}
                  <span className="font-mono font-bold text-slate-900">{summary.orderCode}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng thông báo"
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Khách hàng</span>
              <span className="font-semibold text-slate-900">{summary.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số SIM đã giữ</span>
              <span className="font-mono font-bold text-slate-900">
                {summary.simNumbers.join(', ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thanh toán</span>
              <span className="font-semibold text-slate-900">
                {summary.paymentMethod === 'vnpay' ? 'VNPAY' : 'COD'} ·{' '}
                <span className={summary.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>
                  {summary.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Thanh toán khi nhận'}
                </span>
              </span>
            </div>
            {summary.vnpayTxnRef && (
              <div className="flex justify-between">
                <span className="text-slate-500">Mã giao dịch VNPAY</span>
                <span className="font-mono text-xs text-sky-700">{summary.vnpayTxnRef}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-700">Tổng giá trị</span>
              <span className="font-mono tabular-nums text-base font-bold text-[#E6002E]">
                {formatVnd(summary.totalAmount)}
              </span>
            </div>
          </div>

          {/* Zalo OA Dispatched Notification Preview */}
          {summary.zaloPreview && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-sky-600" />
                  <span>Thông báo Zalo OA đã gửi tự động</span>
                </span>
                <span>
                  {summary.zaloDeliveryStatus === 'sent_live' ? 'ZNS Live' : 'ZNS Sandbox'}
                </span>
              </div>
              <p className="text-xs text-sky-950 leading-relaxed bg-white rounded-lg p-3 border border-sky-100">
                {summary.zaloPreview}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bạn có thể dùng mã {summary.orderCode} để tra cứu đơn bất cứ lúc nào.</span>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
