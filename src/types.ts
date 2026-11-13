export type PriceTierId = '100k-300k' | '500k-1m' | '1m-5m' | '5m-10m' | 'vip-10m+';

export type SimStatus = 'available' | 'reserved' | 'sold';

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';

export type PaymentMethod = 'vnpay' | 'cod';

export type PaymentStatus = 'unpaid' | 'paid' | 'failed';

export interface SimCard {
  id: string;
  phoneNumber: string;
  rawDigits: string;
  prefix: string;
  category: string;
  priceTier: PriceTierId;
  price: number;
  status: SimStatus;
  fengShuiNote: string;
  featured: boolean;
  source: 'warehouse' | 'viettel_api';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderRecord {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  zaloOptIn: boolean;
  shippingAddress: string;
  simType: 'physical' | 'esim';
  simNumbers: string[];
  totalAmount: number;
  tierBreakdown: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  vnpayTxnRef: string;
  vnpayBankCode: string;
  zaloNotifiedCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderTrackingInfo {
  orderCode: string;
  maskedPhone: string;
  simNumbers: string[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  zaloNotifiedCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PublicCmsSettings {
  heroTitle: string;
  heroSubtitle: string;
  promoBanner: string;
  seoTitle: string;
  seoDescription: string;
  hotline: string;
  zaloOaId: string;
  updatedAt?: unknown;
}

export interface IntegrationSettings {
  mode: 'sandbox' | 'production';
  vnpayTmnCode: string;
  vnpayHashSecret: string;
  vnpayUrl: string;
  zaloOaAccessToken: string;
  zaloZnsTemplateId: string;
  viettelApiUrl: string;
  viettelApiKey: string;
  updatedAt?: unknown;
}

export interface ZaloLogRecord {
  id: string;
  orderCode: string;
  recipientPhone: string;
  eventType: string;
  messagePreview: string;
  deliveryStatus: 'sent_live' | 'simulated_sandbox' | 'failed';
  createdAt?: unknown;
}

export interface PriceTierMeta {
  id: PriceTierId;
  label: string;
  shortLabel: string;
  subtitle: string;
  min: number;
  max: number;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  isVip?: boolean;
}

export const PRICE_TIERS: PriceTierMeta[] = [
  {
    id: '100k-300k',
    label: '100k – 300k',
    shortLabel: '100k - 300k',
    subtitle: 'Sim Phổ Thông · Dễ Nhớ',
    min: 100000,
    max: 300000,
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200'
  },
  {
    id: '500k-1m',
    label: '500k – 1 triệu',
    shortLabel: '500k - 1tr',
    subtitle: 'Sim Số Đẹp · Năm Sinh',
    min: 500000,
    max: 1000000,
    accentBg: 'bg-sky-600',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-200'
  },
  {
    id: '1m-5m',
    label: '1 triệu – 5 triệu',
    shortLabel: '1tr - 5tr',
    subtitle: 'Sim Lộc Phát · Thần Tài',
    min: 1000001,
    max: 5000000,
    accentBg: 'bg-indigo-600',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200'
  },
  {
    id: '5m-10m',
    label: '5 triệu – 10 triệu',
    shortLabel: '5tr - 10tr',
    subtitle: 'Sim Doanh Nhân · Tam Hoa',
    min: 5000001,
    max: 10000000,
    accentBg: 'bg-amber-600',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-200'
  },
  {
    id: 'vip-10m+',
    label: 'SIM VIP > 10 triệu',
    shortLabel: 'VIP > 10tr',
    subtitle: 'Tứ Quý · Ngũ Quý · Độc Bản',
    min: 10000001,
    max: 5000000000,
    accentBg: 'bg-slate-900',
    accentText: 'text-amber-500',
    accentBorder: 'border-amber-400',
    isVip: true
  }
];

export const VIETTEL_PREFIXES = ['098', '097', '096', '086', '039', '038', '037', '036', '035', '034', '033', '032'];

export const SIM_CATEGORIES = [
  'Tứ quý',
  'Tam hoa',
  'Lộc phát',
  'Thần tài',
  'Tiến lên',
  'Năm sinh',
  'Gánh đảo',
  'Số đẹp dễ nhớ',
  'Phổ thông'
];

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export function classifyPriceTierClient(price: number): PriceTierId {
  if (price <= 300000) return '100k-300k';
  if (price <= 1000000) return '500k-1m';
  if (price <= 5000000) return '1m-5m';
  if (price <= 10000000) return '5m-10m';
  return 'vip-10m+';
}

export function maskPhoneNumber(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 7) return clean;
  return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
}
