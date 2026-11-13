import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Database,
  KeyRound,
  Layers,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Upload
} from 'lucide-react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { DEFAULT_INTEGRATIONS, DEFAULT_PUBLIC_CMS, INITIAL_DEMO_SIMS } from '../data/seedSims';
import {
  classifyPriceTierClient,
  formatVnd,
  IntegrationSettings,
  OrderRecord,
  OrderStatus,
  PaymentStatus,
  PRICE_TIERS,
  PublicCmsSettings,
  SIM_CATEGORIES,
  SimCard,
  SimStatus,
  ZaloLogRecord
} from '../types';

type AdminTab = 'overview' | 'inventory' | 'orders' | 'settings';

const BOOTSTRAP_ADMIN_EMAIL = 'nguyenduylam894@gmail.com';

interface AdminPortalProps {
  onBackToStore: () => void;
}

const ORDER_STATUS_VI: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao SIM',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy'
};

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToStore }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Live Firestore collections
  const [sims, setSims] = useState<SimCard[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [zaloLogs, setZaloLogs] = useState<ZaloLogRecord[]>([]);
  const [publicCms, setPublicCms] = useState<PublicCmsSettings>(DEFAULT_PUBLIC_CMS);
  const [integrations, setIntegrations] = useState<IntegrationSettings>(DEFAULT_INTEGRATIONS);

  const [toast, setToast] = useState<string>('');
  const [busyAction, setBusyAction] = useState(false);

  // Inventory CRUD state
  const [invSearch, setInvSearch] = useState('');
  const [invTierFilter, setInvTierFilter] = useState('all');
  const [newPhone, setNewPhone] = useState('');
  const [newPrice, setNewPrice] = useState('1500000');
  const [newCategory, setNewCategory] = useState('Lộc phát');
  const [newNote, setNewNote] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  // Orders filter
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Monitor Firebase Auth + Verify Admin Access
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError('');
      if (!currentUser) {
        setIsAdminVerified(false);
        setAuthReady(true);
        return;
      }

      if (!currentUser.emailVerified) {
        setIsAdminVerified(false);
        setAuthReady(true);
        return;
      }

      try {
        if (currentUser.email === BOOTSTRAP_ADMIN_EMAIL) {
          // Ensure admin doc exists for RBAC directory
          const adminRef = doc(db, 'admins', currentUser.uid);
          const snap = await getDoc(adminRef);
          if (!snap.exists()) {
            await setDoc(adminRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              role: 'super_admin',
              createdAt: serverTimestamp()
            });
          }
          setIsAdminVerified(true);
        } else {
          const snap = await getDoc(doc(db, 'admins', currentUser.uid));
          setIsAdminVerified(snap.exists());
        }
      } catch (err) {
        console.error('Admin verification check error:', err);
        setIsAdminVerified(false);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Attach real-time Firestore listeners once Admin is verified
  useEffect(() => {
    if (!authReady || !isAdminVerified) return;

    const unsubSims = onSnapshot(
      query(collection(db, 'sims'), orderBy('price', 'asc')),
      (snap) => {
        setSims(snap.docs.map((d) => d.data() as SimCard));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sims')
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        setOrders(snap.docs.map((d) => d.data() as OrderRecord));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubZalo = onSnapshot(
      query(collection(db, 'zalo_logs'), orderBy('createdAt', 'desc')),
      (snap) => {
        setZaloLogs(snap.docs.map((d) => d.data() as ZaloLogRecord));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'zalo_logs')
    );

    getDoc(doc(db, 'cms_settings', 'public'))
      .then((snap) => {
        if (snap.exists()) setPublicCms(snap.data() as PublicCmsSettings);
      })
      .catch((err) => handleFirestoreError(err, OperationType.GET, 'cms_settings/public'));

    getDoc(doc(db, 'cms_settings', 'integrations'))
      .then((snap) => {
        if (snap.exists()) setIntegrations(snap.data() as IntegrationSettings);
      })
      .catch((err) => handleFirestoreError(err, OperationType.GET, 'cms_settings/integrations'));

    return () => {
      unsubSims();
      unsubOrders();
      unsubZalo();
    };
  }, [authReady, isAdminVerified]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Đăng nhập Google không thành công.'
      );
    }
  };

  // Real-time Revenue Calculations
  const metrics = useMemo(() => {
    const activeOrders = orders.filter((o) => o.orderStatus !== 'cancelled');
    const totalRevenue = activeOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const paidVnpay = activeOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const pendingCod = activeOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    const tierStats = PRICE_TIERS.map((tier) => {
      const matched = activeOrders.filter((o) => o.tierBreakdown.includes(tier.id));
      const revenue = matched.reduce((acc, o) => acc + o.totalAmount, 0);
      return {
        ...tier,
        orderCount: matched.length,
        revenue
      };
    });

    // 7-day revenue series
    const days: Array<{ label: string; dateKey: string; amount: number; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      days.push({ label, dateKey, amount: 0, count: 0 });
    }

    for (const order of activeOrders) {
      let createdIso = new Date().toISOString().slice(0, 10);
      const ts = order.createdAt as { toDate?: () => Date } | undefined;
      if (ts && typeof ts.toDate === 'function') {
        createdIso = ts.toDate().toISOString().slice(0, 10);
      }
      const bucket = days.find((b) => b.dateKey === createdIso);
      if (bucket) {
        bucket.amount += order.totalAmount || 0;
        bucket.count += 1;
      }
    }

    const availableSimsCount = sims.filter((s) => s.status === 'available').length;
    const vnpayCount = activeOrders.filter((o) => o.paymentMethod === 'vnpay').length;
    const codCount = activeOrders.filter((o) => o.paymentMethod === 'cod').length;

    return {
      totalRevenue,
      paidVnpay,
      pendingCod,
      orderCount: activeOrders.length,
      availableSimsCount,
      tierStats,
      days,
      vnpayCount,
      codCount
    };
  }, [orders, sims]);

  // Seed 30 Demo SIMs into Firestore
  const handleSeedDemoSims = async () => {
    setBusyAction(true);
    try {
      const batch = writeBatch(db);
      for (const sim of INITIAL_DEMO_SIMS) {
        const ref = doc(db, 'sims', sim.id);
        batch.set(ref, {
          ...sim,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      showToast('Đã đồng bộ 30 SIM Viettel mẫu across 5 phân khúc lên Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sims/batch');
    } finally {
      setBusyAction(false);
    }
  };

  // Add Single SIM
  const handleAddSim = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawDigits = newPhone.replace(/\D/g, '');
    if (rawDigits.length < 10 || rawDigits.length > 11) {
      showToast('Số điện thoại phải gồm 10 hoặc 11 chữ số.');
      return;
    }
    const price = Number(newPrice);
    if (!Number.isFinite(price) || price < 50000) {
      showToast('Giá SIM tối thiểu là 50.000đ.');
      return;
    }

    const formatted =
      rawDigits.length === 10
        ? `${rawDigits.slice(0, 4)}.${rawDigits.slice(4, 7)}.${rawDigits.slice(7, 10)}`
        : rawDigits;
    const id = `sim_${rawDigits}`;
    const simDoc: SimCard = {
      id,
      phoneNumber: formatted,
      rawDigits,
      prefix: rawDigits.slice(0, 3),
      category: newCategory,
      priceTier: classifyPriceTierClient(price),
      price,
      status: 'available',
      fengShuiNote: newNote.trim() || `SIM Viettel ${newCategory} chính chủ`,
      featured: price >= 5000000,
      source: 'warehouse'
    };

    setBusyAction(true);
    try {
      await setDoc(doc(db, 'sims', id), {
        ...simDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewPhone('');
      setNewNote('');
      showToast(`Đã thêm số ${formatted} vào kho Firestore.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sims/${id}`);
    } finally {
      setBusyAction(false);
    }
  };

  // Bulk Import SIMs
  const handleBulkImport = async () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    setBusyAction(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      for (const line of lines.slice(0, 50)) {
        const parts = line.split(/[|,-]/).map((p) => p.trim());
        const rawDigits = (parts[0] || '').replace(/\D/g, '');
        if (rawDigits.length < 10) continue;
        const price = Math.max(50000, Number((parts[1] || '250000').replace(/\D/g, '')) || 250000);
        const category = parts[2] || 'Số đẹp dễ nhớ';
        const note = parts[3] || `SIM Viettel ${category} nhập kho`;
        const formatted = `${rawDigits.slice(0, 4)}.${rawDigits.slice(4, 7)}.${rawDigits.slice(7, 10)}`;
        const id = `sim_${rawDigits}`;
        batch.set(doc(db, 'sims', id), {
          id,
          phoneNumber: formatted,
          rawDigits,
          prefix: rawDigits.slice(0, 3),
          category,
          priceTier: classifyPriceTierClient(price),
          price,
          status: 'available',
          fengShuiNote: note,
          featured: price >= 5000000,
          source: 'warehouse',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        count++;
      }
      await batch.commit();
      setBulkText('');
      setShowBulkPanel(false);
      showToast(`Đã nhập thành công ${count} số SIM vào kho.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sims/bulk');
    } finally {
      setBusyAction(false);
    }
  };

  const handleUpdateSimStatus = async (sim: SimCard, nextStatus: SimStatus) => {
    try {
      await updateDoc(doc(db, 'sims', sim.id), {
        status: nextStatus,
        updatedAt: serverTimestamp()
      });
      showToast(`Đã cập nhật ${sim.phoneNumber} → ${nextStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sims/${sim.id}`);
    }
  };

  const handleDeleteSim = async (sim: SimCard) => {
    try {
      await deleteDoc(doc(db, 'sims', sim.id));
      showToast(`Đã xóa ${sim.phoneNumber} khỏi kho.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sims/${sim.id}`);
    }
  };

  // Update Order Status + Auto Dispatch Zalo OA Notification
  const handleUpdateOrderStatus = async (
    order: OrderRecord,
    nextOrderStatus: OrderStatus,
    nextPaymentStatus?: PaymentStatus
  ) => {
    setBusyAction(true);
    try {
      const resolvedPaymentStatus = nextPaymentStatus || order.paymentStatus;
      let nextZaloCount = order.zaloNotifiedCount;
      let zaloPreview = '';

      if (order.zaloOptIn) {
        const resp = await fetch('/api/zalo/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderCode: order.orderCode,
            customerName: order.customerName,
            recipientPhone: order.customerPhone,
            eventType: 'STATUS_UPDATED',
            orderStatus: nextOrderStatus,
            totalAmount: order.totalAmount,
            simNumbers: order.simNumbers,
            mode: integrations.mode,
            accessToken: integrations.zaloOaAccessToken,
            templateId: integrations.zaloZnsTemplateId
          })
        });
        if (resp.ok) {
          const zaloData = await resp.json();
          nextZaloCount += 1;
          zaloPreview = zaloData.messagePreview;
          const logId = `zlog_${Date.now()}`;
          await setDoc(doc(db, 'zalo_logs', logId), {
            id: logId,
            orderCode: order.orderCode,
            recipientPhone: order.customerPhone,
            eventType: `STATUS_${nextOrderStatus.toUpperCase()}`,
            messagePreview: zaloData.messagePreview,
            deliveryStatus: zaloData.deliveryStatus,
            createdAt: serverTimestamp()
          });
        }
      }

      await updateDoc(doc(db, 'orders', order.id), {
        orderStatus: nextOrderStatus,
        paymentStatus: resolvedPaymentStatus,
        zaloNotifiedCount: nextZaloCount,
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'order_tracking', order.orderCode), {
        orderStatus: nextOrderStatus,
        paymentStatus: resolvedPaymentStatus,
        zaloNotifiedCount: nextZaloCount,
        updatedAt: serverTimestamp()
      });

      // Sync SIM statuses if completed or cancelled
      if (nextOrderStatus === 'completed' || nextOrderStatus === 'cancelled') {
        const targetSimStatus: SimStatus = nextOrderStatus === 'completed' ? 'sold' : 'available';
        for (const formattedNum of order.simNumbers) {
          const digits = formattedNum.replace(/\D/g, '');
          const matchedSim = sims.find((s) => s.rawDigits === digits);
          if (matchedSim) {
            await updateDoc(doc(db, 'sims', matchedSim.id), {
              status: targetSimStatus,
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      showToast(
        zaloPreview
          ? `Đã cập nhật đơn ${order.orderCode} & gửi tin Zalo OA tự động.`
          : `Đã cập nhật đơn ${order.orderCode}.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setBusyAction(false);
    }
  };

  // Save Public CMS Settings
  const handleSavePublicCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction(true);
    try {
      await setDoc(doc(db, 'cms_settings', 'public'), {
        ...publicCms,
        updatedAt: serverTimestamp()
      });
      showToast('Đã lưu nội dung trang chủ & cấu hình SEO.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'cms_settings/public');
    } finally {
      setBusyAction(false);
    }
  };

  // Save Integration API Settings
  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction(true);
    try {
      await setDoc(doc(db, 'cms_settings', 'integrations'), {
        ...integrations,
        updatedAt: serverTimestamp()
      });
      showToast(`Đã lưu cấu hình cổng API (${integrations.mode.toUpperCase()}).`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'cms_settings/integrations');
    } finally {
      setBusyAction(false);
    }
  };

  const filteredSims = useMemo(() => {
    return sims.filter((s) => {
      if (invTierFilter !== 'all' && s.priceTier !== invTierFilter) return false;
      if (invSearch.trim()) {
        const q = invSearch.replace(/\D/g, '');
        if (q && !s.rawDigits.includes(q)) return false;
      }
      return true;
    });
  }, [sims, invTierFilter, invSearch]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter((o) => o.orderStatus === orderFilter);
  }, [orders, orderFilter]);

  // --- Auth Gate Views ---
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin text-[#E6002E]" />
          <span>Đang kiểm tra phiên đăng nhập quản trị...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E6002E] text-white font-display font-extrabold text-xl flex items-center justify-center mx-auto">
              V
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Cổng Quản Trị V-Sim Hub
            </h1>
            <p className="text-sm text-slate-600">
              Đăng nhập bằng tài khoản Google quản trị để quản lý kho SIM, đơn hàng, Zalo OA và báo cáo doanh thu thời gian thực.
            </p>
          </div>

          {authError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
              {authError}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-4 min-h-[46px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer transition-colors"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Đăng nhập bằng Google</span>
          </button>

          <button
            type="button"
            onClick={onBackToStore}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang bán hàng</span>
          </button>
        </div>
      </div>
    );
  }

  if (!isAdminVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-rose-200 rounded-2xl p-8 space-y-5 text-center">
          <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
          <div className="space-y-1.5">
            <h1 className="font-display text-xl font-bold text-slate-900">
              Tài khoản chưa được cấp quyền Admin
            </h1>
            <p className="text-sm text-slate-600">
              Email <span className="font-mono font-semibold">{user.email}</span> hiện không nằm trong danh sách quản trị viên được phép truy cập hệ thống CMS.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Đổi tài khoản
            </button>
            <button
              type="button"
              onClick={onBackToStore}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 cursor-pointer"
            >
              Về Cửa Hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxDayRevenue = Math.max(...metrics.days.map((d) => d.amount), 1000000);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar Navigation (260px on Desktop) */}
      <aside className="lg:w-[260px] bg-slate-900 text-slate-300 shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-white font-display font-extrabold text-lg">
              <span className="w-7 h-7 rounded-lg bg-[#E6002E] text-white text-sm flex items-center justify-center">
                V
              </span>
              <span>V-Sim Admin</span>
            </div>
            <button
              type="button"
              onClick={onBackToStore}
              className="lg:hidden text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cửa hàng
            </button>
          </div>

          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'overview', label: 'Doanh Thu Live', icon: BarChart3 },
              { id: 'inventory', label: 'Kho Số Viettel', icon: Database },
              { id: 'orders', label: 'Đơn Hàng & Zalo OA', icon: ShoppingCart },
              { id: 'settings', label: 'CMS, SEO & API', icon: Layers }
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 min-h-[42px] rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#E6002E] text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block p-5 border-t border-slate-800 space-y-3">
          <div className="text-xs">
            <p className="text-slate-400">Đăng nhập quản trị</p>
            <p className="font-mono text-white truncate mt-0.5">{user.email}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onBackToStore}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Xem Trang Bán Hàng</span>
            </button>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Breadcrumb Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="text-sm">
            <span className="text-slate-400">V-Sim Hub Admin</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="font-semibold text-slate-900">
              {activeTab === 'overview'
                ? 'Báo Cáo Doanh Thu Thời Gian Thực'
                : activeTab === 'inventory'
                  ? 'Quản Lý Kho Số & Phân Khúc'
                  : activeTab === 'orders'
                    ? 'Quản Lý Đơn Hàng & Zalo OA'
                    : 'Cấu Hình CMS, SEO & Cổng API'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600">
              Chế độ API:{' '}
              <strong className={integrations.mode === 'production' ? 'text-emerald-700' : 'text-sky-700'}>
                {integrations.mode === 'production' ? 'PRODUCTION' : 'SANDBOX'}
              </strong>
            </span>
            <button
              type="button"
              onClick={onBackToStore}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cửa hàng</span>
            </button>
          </div>
        </header>

        {toast && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        <div className="p-6 space-y-6 flex-1">
          {/* TAB 1: REAL-TIME REVENUE DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4 KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-medium text-slate-500">Tổng Doanh Thu (Live)</p>
                  <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-2">
                    {formatVnd(metrics.totalRevenue)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    Trên {metrics.orderCount} đơn hàng hợp lệ
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-medium text-slate-500">Đã Thu Qua VNPAY</p>
                  <p className="font-mono tabular-nums text-2xl font-bold text-emerald-600 mt-2">
                    {formatVnd(metrics.paidVnpay)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    {metrics.vnpayCount} giao dịch VNPAY
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-medium text-slate-500">Đơn Chờ Thu / COD</p>
                  <p className="font-mono tabular-nums text-2xl font-bold text-amber-600 mt-2">
                    {formatVnd(metrics.pendingCod)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    {metrics.codCount} đơn thanh toán khi nhận
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-medium text-slate-500">Kho SIM Sẵn Sàng</p>
                  <p className="font-mono tabular-nums text-2xl font-bold text-[#E6002E] mt-2">
                    {metrics.availableSimsCount} số
                  </p>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    Tổng kho Firestore: {sims.length} SIM
                  </p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* 7-Day Real-time SVG Revenue Chart */}
                <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-lg font-bold text-slate-900">
                        Doanh Thu 7 Ngày Gần Nhất
                      </h2>
                      <p className="text-xs text-slate-500">
                        Tự động cập nhật tức thì qua Firestore onSnapshot
                      </p>
                    </div>
                    {hoveredDayIndex !== null && (
                      <div className="text-right text-xs">
                        <span className="font-semibold text-slate-900">
                          Ngày {metrics.days[hoveredDayIndex].label}:{' '}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[#E6002E]">
                          {formatVnd(metrics.days[hoveredDayIndex].amount)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="h-64 w-full pt-4">
                    <svg viewBox="0 0 700 220" className="w-full h-full overflow-visible">
                      {/* Horizontal grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = 180 - ratio * 150;
                        return (
                          <g key={idx}>
                            <line
                              x1="40"
                              y1={y}
                              x2="680"
                              y2={y}
                              stroke="#E2E8F0"
                              strokeDasharray="4 4"
                            />
                            <text
                              x="32"
                              y={y + 4}
                              textAnchor="end"
                              className="fill-slate-400 text-[10px] font-mono"
                            >
                              {Math.round((maxDayRevenue * ratio) / 1000000)}M
                            </text>
                          </g>
                        );
                      })}

                      {/* Bars */}
                      {metrics.days.map((day, idx) => {
                        const barWidth = 48;
                        const x = 75 + idx * 88;
                        const barHeight = Math.max(4, (day.amount / maxDayRevenue) * 150);
                        const y = 180 - barHeight;
                        const active = hoveredDayIndex === idx;
                        return (
                          <g
                            key={day.dateKey}
                            onMouseEnter={() => setHoveredDayIndex(idx)}
                            onMouseLeave={() => setHoveredDayIndex(null)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              rx="8"
                              fill={active ? '#C80026' : '#E6002E'}
                              opacity={day.amount > 0 ? 1 : 0.25}
                            />
                            <text
                              x={x + barWidth / 2}
                              y="202"
                              textAnchor="middle"
                              className="fill-slate-600 text-[11px] font-mono"
                            >
                              {day.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Revenue by 5 Financial Tiers */}
                <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Doanh Thu Theo 5 Phân Khúc Giá
                    </h2>
                    <p className="text-xs text-slate-500">
                      Hiệu suất bán hàng từ phân khúc 100k đến SIM VIP
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {metrics.tierStats.map((t) => {
                      const pct =
                        metrics.totalRevenue > 0
                          ? Math.round((t.revenue / metrics.totalRevenue) * 100)
                          : 0;
                      return (
                        <div key={t.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{t.label}</span>
                            <span className="font-mono tabular-nums text-slate-600">
                              {formatVnd(t.revenue)} ({t.orderCount} đơn · {pct}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${t.accentBg}`}
                              style={{ width: `${Math.max(pct, t.revenue > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Seed Prompt if Firestore Warehouse is Empty */}
              {sims.length === 0 && (
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-base font-bold text-sky-950">
                      Kho Firestore hiện chưa có bản ghi SIM
                    </p>
                    <p className="text-xs text-sky-800 mt-0.5">
                      Bấm nút bên cạnh để nạp toàn bộ 30 số Viettel mẫu thuộc cả 5 phân khúc lên Cloud Firestore ngay lập tức.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleSeedDemoSims}
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Nạp 30 SIM Mẫu Lên Firestore</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INVENTORY CMS */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Action Header */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Cập Nhật Kho Số Viettel
                    </h2>
                    <p className="text-xs text-slate-500">
                      Tự động phân loại vào 5 phân khúc (100k-300k, 500k-1tr, 1tr-5tr, 5tr-10tr, VIP &gt; 10tr)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkPanel((p) => !p)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Nhập hàng loạt</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={handleSeedDemoSims}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Đồng bộ 30 SIM Demo</span>
                    </button>
                  </div>
                </div>

                {/* Add Single SIM Form */}
                <form onSubmit={handleAddSim} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
                  <div className="lg:col-span-3">
                    <input
                      type="text"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Số SIM (VD: 0989888686)"
                      className="w-full px-3 py-2 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <input
                      type="number"
                      required
                      min={50000}
                      step={10000}
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="Giá (VND)"
                      className="w-full px-3 py-2 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      {SIM_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-3">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Ý nghĩa phong thủy..."
                      className="w-full px-3 py-2 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      disabled={busyAction}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[42px] rounded-xl bg-[#E6002E] hover:bg-[#C80026] text-white text-sm font-semibold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm SIM</span>
                    </button>
                  </div>
                </form>

                {/* Bulk Import Drawer */}
                {showBulkPanel && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-700">
                      Dán danh sách SIM (mỗi dòng: Số SIM | Giá | Loại | Ghi chú)
                    </p>
                    <textarea
                      rows={4}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={'0988777888 | 18000000 | Tam hoa | Tam hoa kép 777 888\n0389123268 | 240000 | Lộc phát | Mãi lộc phát giá tốt'}
                      className="w-full p-3 rounded-xl bg-white border border-slate-200 font-mono text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBulkPanel(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={handleBulkImport}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                      >
                        Xác nhận nhập kho
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter + Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between">
                  <input
                    type="text"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder="Lọc số trong kho..."
                    className="px-3.5 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm sm:w-64"
                  />
                  <select
                    value={invTierFilter}
                    onChange={(e) => setInvTierFilter(e.target.value)}
                    className="px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="all">Tất cả 5 phân khúc</option>
                    {PRICE_TIERS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-3 px-4">Số SIM</th>
                        <th className="py-3 px-4">Phân khúc</th>
                        <th className="py-3 px-4">Loại</th>
                        <th className="py-3 px-4 text-right">Giá niêm yết</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSims.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                            Chưa có SIM nào khớp bộ lọc. Hãy bấm "Đồng bộ 30 SIM Demo" ở trên.
                          </td>
                        </tr>
                      ) : (
                        filteredSims.map((sim) => (
                          <tr key={sim.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900">
                              {sim.phoneNumber}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600">
                              {PRICE_TIERS.find((t) => t.id === sim.priceTier)?.shortLabel}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600">{sim.category}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#E6002E]">
                              {formatVnd(sim.price)}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={sim.status}
                                onChange={(e) =>
                                  handleUpdateSimStatus(sim, e.target.value as SimStatus)
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                              >
                                <option value="available">Sẵn sàng</option>
                                <option value="reserved">Đang giữ</option>
                                <option value="sold">Đã bán</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteSim(sim)}
                                title="Xóa SIM"
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS & AUTOMATED ZALO OA */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Đơn Hàng & Kích Hoạt Zalo OA Tự Động
                    </h2>
                    <p className="text-xs text-slate-500">
                      Khi đổi trạng thái đơn hàng, hệ thống tự động gọi /api/zalo/notify gửi tin ZNS cho khách.
                    </p>
                  </div>
                  <select
                    value={orderFilter}
                    onChange={(e) => setOrderFilter(e.target.value as 'all' | OrderStatus)}
                    className="px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="shipping">Đang giao SIM</option>
                    <option value="completed">Hoàn tất</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-3 px-4">Mã Đơn</th>
                        <th className="py-3 px-4">Khách Hàng</th>
                        <th className="py-3 px-4">Số SIM</th>
                        <th className="py-3 px-4 text-right">Tổng Tiền</th>
                        <th className="py-3 px-4">Thanh Toán</th>
                        <th className="py-3 px-4">Trạng Thái & Zalo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            Chưa có đơn hàng nào.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {order.orderCode}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900">{order.customerName}</p>
                              <p className="font-mono text-xs text-slate-500">{order.customerPhone}</p>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-800">
                              {order.simNumbers.join(', ')}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#E6002E]">
                              {formatVnd(order.totalAmount)}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <span className="font-semibold uppercase">{order.paymentMethod}</span>
                              <span className="block text-slate-500">
                                {order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <select
                                  disabled={busyAction}
                                  value={order.orderStatus}
                                  onChange={(e) =>
                                    handleUpdateOrderStatus(
                                      order,
                                      e.target.value as OrderStatus,
                                      e.target.value === 'completed' ? 'paid' : order.paymentStatus
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                                >
                                  {Object.entries(ORDER_STATUS_VI).map(([val, label]) => (
                                    <option key={val} value={val}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-[11px] font-mono text-sky-700 whitespace-nowrap">
                                  {order.zaloNotifiedCount} ZNS
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Zalo OA Logs Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-600" />
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Nhật Ký Gửi Tin Tự Động Qua Zalo OA
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {zaloLogs.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500">
                      Chưa có tin nhắn Zalo OA nào được gửi.
                    </p>
                  ) : (
                    zaloLogs.map((log) => (
                      <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <span className="font-mono">{log.orderCode}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-600">{log.recipientPhone}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-sky-700">{log.eventType}</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{log.messagePreview}</p>
                        </div>
                        <span
                          className={`shrink-0 font-semibold ${
                            log.deliveryStatus === 'sent_live'
                              ? 'text-emerald-600'
                              : log.deliveryStatus === 'simulated_sandbox'
                                ? 'text-sky-600'
                                : 'text-rose-600'
                          }`}
                        >
                          {log.deliveryStatus === 'sent_live'
                            ? 'Đã gửi Live'
                            : log.deliveryStatus === 'simulated_sandbox'
                              ? 'Sandbox ZNS'
                              : 'Lỗi gửi'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CMS, SEO & API INTEGRATION KEYS */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Public CMS & SEO Form */}
              <form
                onSubmit={handleSavePublicCms}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Nội Dung Trang Chủ & Tối Ưu SEO
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tiêu đề Hero chính (H1)
                  </label>
                  <input
                    type="text"
                    required
                    value={publicCms.heroTitle}
                    onChange={(e) => setPublicCms({ ...publicCms, heroTitle: e.target.value })}
                    className="w-full px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mô tả ngắn Hero
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={publicCms.heroSubtitle}
                    onChange={(e) => setPublicCms({ ...publicCms, heroSubtitle: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Banner khuyến mãi đầu trang
                  </label>
                  <input
                    type="text"
                    value={publicCms.promoBanner}
                    onChange={(e) => setPublicCms({ ...publicCms, promoBanner: e.target.value })}
                    className="w-full px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SEO Meta Title
                  </label>
                  <input
                    type="text"
                    required
                    value={publicCms.seoTitle}
                    onChange={(e) => setPublicCms({ ...publicCms, seoTitle: e.target.value })}
                    className="w-full px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SEO Meta Description
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={publicCms.seoDescription}
                    onChange={(e) =>
                      setPublicCms({ ...publicCms, seoDescription: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hotline tư vấn
                    </label>
                    <input
                      type="text"
                      required
                      value={publicCms.hotline}
                      onChange={(e) => setPublicCms({ ...publicCms, hotline: e.target.value })}
                      className="w-full px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Zalo OA ID
                    </label>
                    <input
                      type="text"
                      value={publicCms.zaloOaId}
                      onChange={(e) => setPublicCms({ ...publicCms, zaloOaId: e.target.value })}
                      className="w-full px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer"
                >
                  Lưu Cấu Hình CMS & SEO
                </button>
              </form>

              {/* Integration Credentials Form */}
              <form
                onSubmit={handleSaveIntegrations}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Cấu Hình VNPAY · Zalo OA · Viettel API</span>
                  </h2>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Chế độ vận hành tích hợp
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIntegrations({ ...integrations, mode: 'sandbox' })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                        integrations.mode === 'sandbox'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Sandbox (Kiểm thử nội bộ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntegrations({ ...integrations, mode: 'production' })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                        integrations.mode === 'production'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Production (API Thật)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      VNPAY TMN Code
                    </label>
                    <input
                      type="text"
                      value={integrations.vnpayTmnCode}
                      onChange={(e) =>
                        setIntegrations({ ...integrations, vnpayTmnCode: e.target.value })
                      }
                      className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      VNPAY Hash Secret
                    </label>
                    <input
                      type="password"
                      value={integrations.vnpayHashSecret}
                      onChange={(e) =>
                        setIntegrations({ ...integrations, vnpayHashSecret: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    VNPAY Gateway URL
                  </label>
                  <input
                    type="text"
                    value={integrations.vnpayUrl}
                    onChange={(e) =>
                      setIntegrations({ ...integrations, vnpayUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Zalo OA Access Token
                    </label>
                    <input
                      type="password"
                      value={integrations.zaloOaAccessToken}
                      onChange={(e) =>
                        setIntegrations({ ...integrations, zaloOaAccessToken: e.target.value })
                      }
                      placeholder="Nhập Access Token Zalo OA"
                      className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Zalo ZNS Template ID
                    </label>
                    <input
                      type="text"
                      value={integrations.zaloZnsTemplateId}
                      onChange={(e) =>
                        setIntegrations({ ...integrations, zaloZnsTemplateId: e.target.value })
                      }
                      className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Viettel Stock API URL
                    </label>
                    <input
                      type="text"
                      value={integrations.viettelApiUrl}
                      onChange={(e) =>
                        setIntegrations({ ...integrations, viettelApiUrl: e.target.value })
                      }
                      placeholder="https://api.partner-viettel..."
                      className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Viettel API Key
                    </label>
                    <input
                      type="password"
                      value={integrations.viettelApiKey}
                      onChange={(e) =>
                        setIntegrations({ ...integrations, viettelApiKey: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full px-3 py-2 min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#005BAA] hover:bg-[#004A8C] text-white text-sm font-semibold cursor-pointer"
                >
                  Lưu Khóa Tích Hợp (Bảo Mật Admin)
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
