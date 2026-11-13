import React, { useState } from 'react';
import { CheckCircle2, Lock, QrCode, ShieldCheck, X, XCircle } from 'lucide-react';
import { formatVnd } from '../types';

export interface VnpaySessionInfo {
  orderCode: string;
  amount: number;
  tmnCode: string;
  secureHashPreview: string;
  paymentUrl: string;
  simNumbers: string[];
}

interface VnpaySandboxModalProps {
  session: VnpaySessionInfo | null;
  processing: boolean;
  onConfirmSandboxPay: (bankCode: string, responseCode: '00' | '24') => Promise<void>;
  onClose: () => void;
}

const TEST_BANKS = [
  { code: 'NCB', name: 'Ngân hàng NCB (Thẻ test mặc định)' },
  { code: 'VNPAYQR', name: 'Ứng dụng Mobile Banking (VNPAY-QR)' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' }
];

export const VnpaySandboxModal: React.FC<VnpaySandboxModalProps> = ({
  session,
  processing,
  onConfirmSandboxPay,
  onClose
}) => {
  const [selectedBank, setSelectedBank] = useState('NCB');

  if (!session) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cổng thanh toán VNPAY Sandbox"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
        {/* VNPAY Header */}
        <div className="bg-[#005BAA] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-sky-100 font-medium">Cổng thanh toán trực tuyến</p>
            <h3 className="font-display text-xl font-extrabold tracking-tight">
              VNPAY-QR <span className="font-normal text-sm text-sky-200">Sandbox Gateway</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cổng thanh toán"
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Merchant & Transaction Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã đơn hàng (vnp_TxnRef)</span>
              <span className="font-mono font-bold text-slate-900">{session.orderCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số SIM đặt mua</span>
              <span className="font-mono font-semibold text-slate-800">
                {session.simNumbers.join(', ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mã Website (vnp_TmnCode)</span>
              <span className="font-mono text-slate-700">{session.tmnCode}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-700">Số tiền thanh toán</span>
              <span className="font-mono tabular-nums text-lg font-bold text-[#005BAA]">
                {formatVnd(session.amount)}
              </span>
            </div>
          </div>

          {/* QR & Signature Check */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-sky-50/60 border border-sky-200 rounded-xl p-4">
            <div className="w-24 h-24 rounded-xl bg-white border border-sky-200 flex items-center justify-center shrink-0">
              <QrCode className="w-16 h-16 text-[#005BAA]" aria-hidden="true" />
            </div>
            <div className="space-y-1 text-xs text-slate-700">
              <p className="font-semibold text-[#005BAA] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Đã ký bảo mật HMAC-SHA512</span>
              </p>
              <p className="font-mono text-[11px] text-slate-500 break-all">
                Hash: {session.secureHashPreview}
              </p>
              <p className="text-slate-600">
                Chế độ Sandbox cho phép kiểm thử xác thực chữ ký trả về từ VNPAY mà không trừ tiền thật.
              </p>
            </div>
          </div>

          {/* Bank Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn ngân hàng / Phương thức kiểm thử
            </label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
            >
              {TEST_BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={processing}
              onClick={() => onConfirmSandboxPay(selectedBank, '24')}
              className="inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" />
              <span>Hủy giao dịch (Code 24)</span>
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={() => onConfirmSandboxPay(selectedBank, '00')}
              className="inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{processing ? 'Đang xác thực...' : 'Thanh toán thành công (00)'}</span>
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Giao dịch được ký số và đối soát tự động tại /api/vnpay/verify</span>
          </p>
        </div>
      </div>
    </div>
  );
};
