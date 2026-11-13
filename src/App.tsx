import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { CartDrawer, CheckoutFormPayload } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { CompletedOrderSummary, OrderSuccessModal } from './components/OrderSuccessModal';
import { OrderTrackerSection } from './components/OrderTrackerSection';
import { SimCatalogGrid } from './components/SimCatalogGrid';
import { FilterState, SmartFilterBar } from './components/SmartFilterBar';
import { ViettelLookupSection } from './components/ViettelLookupSection';
import { VnpaySandboxModal, VnpaySessionInfo } from './components/VnpaySandboxModal';
import { DEFAULT_PUBLIC_CMS, INITIAL_DEMO_SIMS } from './data/seedSims';
import { db, handleFirestoreError, OperationType, validateFirestoreConnection } from './firebase';
import { maskPhoneNumber, PriceTierId, PublicCmsSettings, SimCard } from './types';

const AdminPortal = React.lazy(() =>
  import('./components/AdminPortal').then((m) => ({ default: m.AdminPortal }))
);

interface PendingVnpayContext {
  orderCode: string;
  form: CheckoutFormPayload;
  items: SimCard[];
  totalAmount: number;
}

function matchWildcardDigits(rawDigits: string, pattern: string): boolean {
  const clean = pattern.trim().replace(/[^0-9*]/g, '');
  if (!clean) return true;
  if (!clean.includes('*')) {
    return rawDigits.includes(clean);
  }
  const regexStr = '^' + clean.split('*').map((seg) => seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$';
  try {
    return new RegExp(regexStr).test(rawDigits);
  } catch {
    return rawDigits.includes(clean.replace(/\*/g, ''));
  }
}

export default function App() {
  const [route, setRoute] = useState<'store' | 'admin'>(() =>
    window.location.pathname.startsWith('/admin') ? 'admin' : 'store'
  );

  const [firestoreSims, setFirestoreSims] = useState<SimCard[] | null>(null);
  const [cms, setCms] = useState<PublicCmsSettings>(DEFAULT_PUBLIC_CMS);

  const [filters, setFilters] = useState<FilterState>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTier = params.get('tier') as PriceTierId | null;
    const validTiers: PriceTierId[] = ['100k-300k', '500k-1m', '1m-5m', '5m-10m', 'vip-10m+'];
    return {
      searchPattern: '',
      priceTier: urlTier && validTiers.includes(urlTier) ? urlTier : 'all',
      prefix: 'all',
      category: 'all',
      excludeDigits: [],
      sortBy: 'featured'
    };
  });

  const [cart, setCart] = useState<SimCard[]>(() => {
    try {
      const saved = localStorage.getItem('vsim_cart');
      return saved ? (JSON.parse(saved) as SimCard[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  const [vnpaySession, setVnpaySession] = useState<VnpaySessionInfo | null>(null);
  const [pendingVnpay, setPendingVnpay] = useState<PendingVnpayContext | null>(null);
  const [processingVnpay, setProcessingVnpay] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrderSummary | null>(null);
  const [globalAlert, setGlobalAlert] = useState<string>('');

  // Persist cart locally
  useEffect(() => {
    try {
      localStorage.setItem('vsim_cart', JSON.stringify(cart));
    } catch {
      // ignore storage quota
    }
  }, [cart]);

  // Sync browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname.startsWith('/admin') ? 'admin' : 'store');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Validate Firestore connection on boot + attach real-time SIMs & public CMS listeners
  useEffect(() => {
    validateFirestoreConnection();

    const unsubSims = onSnapshot(
      query(collection(db, 'sims'), orderBy('price', 'asc')),
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as SimCard);
        setFirestoreSims(docs);
      },
      (err) => {
        console.warn('Firestore sims read fallback:', err.message);
        setFirestoreSims([]);
      }
    );

    getDoc(doc(db, 'cms_settings', 'public'))
      .then((snap) => {
        if (snap.exists()) {
          setCms(snap.data() as PublicCmsSettings);
        }
      })
      .catch(() => {
        // Use default public CMS silently if not yet initialized by Admin
      });

    return () => unsubSims();
  }, []);

  // Dynamic SEO Title & Meta sync
  useEffect(() => {
    document.title = cms.seoTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', cms.seoDescription);
  }, [cms.seoTitle, cms.seoDescription]);

  // Handle VNPAY Live Return URL (/vnpay-return?vnp_...)
  useEffect(() => {
    if (!window.location.pathname.startsWith('/vnpay-return')) return;
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    if (!params.vnp_TxnRef) return;

    (async () => {
      try {
        const res = await fetch('/api/vnpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ params })
        });
        const verifyData = await res.json();
        const savedDraftRaw = sessionStorage.getItem('vsim_pending_live_vnpay');
        if (verifyData.success && savedDraftRaw) {
          const draft = JSON.parse(savedDraftRaw) as PendingVnpayContext;
          sessionStorage.removeItem('vsim_pending_live_vnpay');
          await finalizeOrderToFirestore(draft, 'paid', verifyData.transactionNo || params.vnp_TxnRef, verifyData.bankCode || 'VNPAY');
        } else {
          setGlobalAlert(verifyData.message || 'Thanh toán VNPAY không thành công hoặc đã bị hủy.');
        }
      } catch {
        setGlobalAlert('Không thể xác thực kết quả trả về từ VNPAY.');
      } finally {
        window.history.replaceState({}, '', '/');
      }
    })();
  }, []);

  // Active SIM catalog: Live Firestore when seeded, else curated 30 demo SIMs across all 5 tiers
  const activeSims = useMemo(() => {
    if (firestoreSims && firestoreSims.length > 0) {
      return firestoreSims;
    }
    return INITIAL_DEMO_SIMS;
  }, [firestoreSims]);

  const firestoreSimIds = useMemo(
    () => new Set((firestoreSims || []).map((s) => s.id)),
    [firestoreSims]
  );

  const existingSoldDigits = useMemo(
    () => new Set(activeSims.filter((s) => s.status !== 'available').map((s) => s.rawDigits)),
    [activeSims]
  );

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      '100k-300k': 0,
      '500k-1m': 0,
      '1m-5m': 0,
      '5m-10m': 0,
      'vip-10m+': 0
    };
    for (const sim of activeSims) {
      if (sim.status === 'available' && counts[sim.priceTier] !== undefined) {
        counts[sim.priceTier] += 1;
      }
    }
    return counts;
  }, [activeSims]);

  const filteredSims = useMemo(() => {
    const list = activeSims.filter((sim) => {
      if (filters.priceTier !== 'all' && sim.priceTier !== filters.priceTier) return false;
      if (filters.prefix !== 'all' && sim.prefix !== filters.prefix) return false;
      if (filters.category !== 'all' && sim.category !== filters.category) return false;
      if (
        filters.excludeDigits.length > 0 &&
        filters.excludeDigits.some((d) => sim.rawDigits.includes(d))
      ) {
        return false;
      }
      if (filters.searchPattern.trim()) {
        if (!matchWildcardDigits(sim.rawDigits, filters.searchPattern)) return false;
      }
      return true;
    });

    if (filters.sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (filters.sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [activeSims, filters]);

  const hasSearchOrFilter =
    filters.searchPattern.trim() !== '' ||
    filters.prefix !== 'all' ||
    filters.category !== 'all' ||
    filters.excludeDigits.length > 0;

  const cartIds = useMemo(() => new Set(cart.map((c) => c.id)), [cart]);

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setRoute('admin');
    window.scrollTo({ top: 0 });
  };

  const navigateToStore = () => {
    window.history.pushState({}, '', '/');
    setRoute('store');
    window.scrollTo({ top: 0 });
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectTier = (tier: PriceTierId) => {
    setFilters((prev) => ({ ...prev, priceTier: tier }));
    scrollToSection('price-tiers');
  };

  const handleAddToCart = (sim: SimCard) => {
    setCart((prev) => {
      if (prev.some((item) => item.id === sim.id)) return prev;
      return [...prev, sim];
    });
    setCartOpen(true);
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Persist order + order_tracking + reserve SIMs + dispatch Zalo OA notification
  const finalizeOrderToFirestore = async (
    ctx: PendingVnpayContext,
    paymentStatus: 'paid' | 'unpaid',
    vnpayTxnRef = '',
    vnpayBankCode = ''
  ) => {
    const orderId = `ord_${ctx.orderCode.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const simNumbers = ctx.items.map((i) => i.phoneNumber);
    const tierBreakdown = Array.from(new Set(ctx.items.map((i) => i.priceTier))).join(',');

    // 1. Dispatch automated Zalo OA notification if opted in
    let zaloPreview = '';
    let zaloDeliveryStatus: 'sent_live' | 'simulated_sandbox' | 'failed' = 'simulated_sandbox';
    let zaloCount = 0;

    if (ctx.form.zaloOptIn) {
      try {
        const zaloResp = await fetch('/api/zalo/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderCode: ctx.orderCode,
            customerName: ctx.form.customerName,
            recipientPhone: ctx.form.customerPhone,
            eventType: paymentStatus === 'paid' ? 'PAYMENT_PAID' : 'ORDER_CREATED',
            orderStatus: 'pending',
            totalAmount: ctx.totalAmount,
            simNumbers,
            mode: 'sandbox'
          })
        });
        if (zaloResp.ok) {
          const zData = await zaloResp.json();
          zaloPreview = zData.messagePreview;
          zaloDeliveryStatus = zData.deliveryStatus;
          zaloCount = 1;

          const logId = `zlog_${Date.now()}`;
          await setDoc(doc(db, 'zalo_logs', logId), {
            id: logId,
            orderCode: ctx.orderCode,
            recipientPhone: ctx.form.customerPhone,
            eventType: paymentStatus === 'paid' ? 'PAYMENT_PAID' : 'ORDER_CREATED',
            messagePreview: zaloPreview,
            deliveryStatus: zaloDeliveryStatus,
            createdAt: serverTimestamp()
          });
        }
      } catch (err) {
        console.warn('Zalo notification error:', err);
      }
    }

    // 2. Write Order (PII protected to admins)
    try {
      await setDoc(doc(db, 'orders', orderId), {
        id: orderId,
        orderCode: ctx.orderCode,
        customerName: ctx.form.customerName,
        customerPhone: ctx.form.customerPhone,
        zaloOptIn: ctx.form.zaloOptIn,
        shippingAddress: ctx.form.shippingAddress,
        simType: ctx.form.simType,
        simNumbers,
        totalAmount: ctx.totalAmount,
        tierBreakdown,
        paymentMethod: ctx.form.paymentMethod,
        paymentStatus,
        orderStatus: 'pending',
        vnpayTxnRef,
        vnpayBankCode,
        zaloNotifiedCount: zaloCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
    }

    // 3. Write Public Non-PII Order Tracking projection
    try {
      await setDoc(doc(db, 'order_tracking', ctx.orderCode), {
        orderCode: ctx.orderCode,
        maskedPhone: maskPhoneNumber(ctx.form.customerPhone),
        simNumbers,
        totalAmount: ctx.totalAmount,
        paymentMethod: ctx.form.paymentMethod,
        paymentStatus,
        orderStatus: 'pending',
        zaloNotifiedCount: zaloCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `order_tracking/${ctx.orderCode}`);
    }

    // 4. Mark any SIMs existing in Firestore as 'reserved'
    for (const item of ctx.items) {
      if (firestoreSimIds.has(item.id) && item.status === 'available') {
        try {
          await updateDoc(doc(db, 'sims', item.id), {
            status: 'reserved',
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.warn('SIM reserve update skipped:', err);
        }
      }
    }

    setCart([]);
    setCartOpen(false);
    setVnpaySession(null);
    setPendingVnpay(null);
    setCompletedOrder({
      orderCode: ctx.orderCode,
      customerName: ctx.form.customerName,
      simNumbers,
      totalAmount: ctx.totalAmount,
      paymentMethod: ctx.form.paymentMethod,
      paymentStatus,
      vnpayTxnRef,
      zaloPreview,
      zaloDeliveryStatus
    });
  };

  const handleCheckoutSubmit = async (form: CheckoutFormPayload) => {
    setSubmittingCheckout(true);
    setGlobalAlert('');
    try {
      const subtotal = cart.reduce((sum, s) => sum + s.price, 0);
      const vnpayDiscount = form.paymentMethod === 'vnpay' ? Math.round(subtotal * 0.05) : 0;
      const totalAmount = Math.max(50000, subtotal - vnpayDiscount);
      const orderCode = `VS-${Date.now().toString().slice(-6)}`;

      const ctx: PendingVnpayContext = {
        orderCode,
        form,
        items: [...cart],
        totalAmount
      };

      if (form.paymentMethod === 'cod') {
        await finalizeOrderToFirestore(ctx, 'unpaid');
        return;
      }

      // VNPAY Flow: Generate signed HMAC-SHA512 Payment URL via Express server
      const res = await fetch('/api/vnpay/create-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode,
          amount: totalAmount,
          orderInfo: `Thanh toan SIM Viettel ${cart.map((c) => c.rawDigits).join(', ')}`,
          returnUrl: `${window.location.origin}/vnpay-return`
        })
      });

      if (!res.ok) {
        throw new Error('Không thể khởi tạo phiên thanh toán VNPAY.');
      }

      const data = await res.json();
      if (data.mode === 'production') {
        sessionStorage.setItem('vsim_pending_live_vnpay', JSON.stringify(ctx));
        window.location.href = data.paymentUrl;
        return;
      }

      setPendingVnpay(ctx);
      setVnpaySession({
        orderCode,
        amount: totalAmount,
        tmnCode: data.tmnCode,
        secureHashPreview: data.secureHashPreview,
        paymentUrl: data.paymentUrl,
        simNumbers: cart.map((c) => c.phoneNumber)
      });
    } catch (err) {
      setGlobalAlert(
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi xử lý đơn hàng.'
      );
    } finally {
      setSubmittingCheckout(false);
    }
  };

  const handleConfirmSandboxVnpay = async (bankCode: string, responseCode: '00' | '24') => {
    if (!pendingVnpay || !vnpaySession) return;
    setProcessingVnpay(true);
    try {
      // 1. Request server-signed Sandbox return parameters
      const signResp = await fetch('/api/vnpay/sign-sandbox-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: vnpaySession.orderCode,
          amount: vnpaySession.amount,
          bankCode,
          responseCode
        })
      });
      const { params } = await signResp.json();

      // 2. Verify HMAC-SHA512 signature via /api/vnpay/verify
      const verifyResp = await fetch('/api/vnpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params })
      });
      const verifyData = await verifyResp.json();

      if (verifyData.success) {
        await finalizeOrderToFirestore(
          pendingVnpay,
          'paid',
          verifyData.transactionNo || params.vnp_TransactionNo,
          verifyData.bankCode || bankCode
        );
      } else {
        setVnpaySession(null);
        setPendingVnpay(null);
        setGlobalAlert(verifyData.message || 'Giao dịch VNPAY đã bị hủy.');
      }
    } catch {
      setGlobalAlert('Không thể xác thực giao dịch VNPAY Sandbox.');
    } finally {
      setProcessingVnpay(false);
    }
  };

  if (route === 'admin') {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin text-[#E6002E]" />
              <span>Đang tải cổng quản trị V-Sim Hub...</span>
            </div>
          </div>
        }
      >
        <AdminPortal onBackToStore={navigateToStore} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        cartCount={cart.length}
        onOpenCart={() => setCartOpen(true)}
        onNavigateSection={scrollToSection}
        onGoAdmin={navigateToAdmin}
      />

      {globalAlert && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm font-medium text-amber-900">
          <span>{globalAlert}</span>
          <button
            type="button"
            onClick={() => setGlobalAlert('')}
            className="ml-3 underline font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      <main className="flex-1">
        <HeroSection
          cms={cms}
          onSearchSubmit={(pattern) => {
            setFilters((prev) => ({ ...prev, searchPattern: pattern }));
            scrollToSection('price-tiers');
          }}
          onSelectTier={handleSelectTier}
        />

        <SmartFilterBar
          filters={filters}
          onChange={setFilters}
          tierCounts={tierCounts}
          totalMatched={filteredSims.length}
        />

        <SimCatalogGrid
          sims={filteredSims}
          allSims={activeSims}
          activeTier={filters.priceTier}
          hasSearchOrFilter={hasSearchOrFilter}
          cartIds={cartIds}
          onAddToCart={handleAddToCart}
          onSelectTier={handleSelectTier}
          onResetFilters={() =>
            setFilters({
              searchPattern: '',
              priceTier: 'all',
              prefix: 'all',
              category: 'all',
              excludeDigits: [],
              sortBy: 'featured'
            })
          }
        />

        <ViettelLookupSection
          existingSoldDigits={existingSoldDigits}
          cartIds={cartIds}
          onAddToCart={handleAddToCart}
        />

        <OrderTrackerSection />
      </main>

      <Footer
        cms={cms}
        onGoAdmin={navigateToAdmin}
        onSelectTier={handleSelectTier}
      />

      <CartDrawer
        open={cartOpen}
        items={cart}
        submitting={submittingCheckout}
        onClose={() => setCartOpen(false)}
        onRemoveItem={handleRemoveFromCart}
        onSubmitOrder={handleCheckoutSubmit}
      />

      <VnpaySandboxModal
        session={vnpaySession}
        processing={processingVnpay}
        onConfirmSandboxPay={handleConfirmSandboxVnpay}
        onClose={() => {
          setVnpaySession(null);
          setPendingVnpay(null);
        }}
      />

      <OrderSuccessModal
        summary={completedOrder}
        onClose={() => setCompletedOrder(null)}
      />
    </div>
  );
}
