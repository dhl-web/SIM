import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DEFAULT_SANDBOX_TMN = 'VSIMHUB1';
const DEFAULT_SANDBOX_SECRET = 'VSIMHUB_SANDBOX_HMAC_SHA512_SECRET_KEY_2026';
const DEFAULT_VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

function sortVnpayParams(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
    }
  }
  return sorted;
}

function buildSignData(sortedParams: Record<string, string>): string {
  return Object.entries(sortedParams)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

function formatVnpayDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return (
    vnDate.getUTCFullYear().toString() +
    pad(vnDate.getUTCMonth() + 1) +
    pad(vnDate.getUTCDate()) +
    pad(vnDate.getUTCHours()) +
    pad(vnDate.getUTCMinutes()) +
    pad(vnDate.getUTCSeconds())
  );
}

function formatViettelPhone(raw: string): string {
  return `${raw.slice(0, 4)}.${raw.slice(4, 7)}.${raw.slice(7, 10)}`;
}

function classifyPriceTier(price: number): string {
  if (price <= 300000) return '100k-300k';
  if (price <= 1000000) return '500k-1m';
  if (price <= 5000000) return '1m-5m';
  if (price <= 10000000) return '5m-10m';
  return 'vip-10m+';
}

function detectSimCategoryAndPrice(digits: string): {
  category: string;
  price: number;
  fengShuiNote: string;
} {
  const tail4 = digits.slice(-4);
  const tail3 = digits.slice(-3);
  const tail2 = digits.slice(-2);

  if (/^(\d)\1{3}$/.test(tail4)) {
    return {
      category: 'Tứ quý',
      price: tail4 === '8888' || tail4 === '9999' || tail4 === '6666' ? 38000000 : 18500000,
      fengShuiNote: `Đuôi tứ quý ${tail4} quyền uy, khẳng định vị thế chủ nhân`
    };
  }
  if (/^(\d)\1{2}$/.test(tail3)) {
    return {
      category: 'Tam hoa',
      price: ['666', '888', '999'].includes(tail3) ? 7900000 : 3200000,
      fengShuiNote: `Tam hoa ${tail3} vững chãi như kiềng ba chân, tài lộc hanh thông`
    };
  }
  if (tail4 === '6868' || tail4 === '8686' || tail2 === '68' || tail2 === '86') {
    return {
      category: 'Lộc phát',
      price: tail4 === '6868' || tail4 === '8686' ? 12500000 : 2400000,
      fengShuiNote: 'Số Lộc Phát vượng kinh doanh, thu hút tài khí dồi dào'
    };
  }
  if (tail2 === '39' || tail2 === '79') {
    return {
      category: 'Thần tài',
      price: tail4.includes('7979') ? 14800000 : 2900000,
      fengShuiNote: 'Cặp số Thần Tài phù trợ buôn bán phát đạt, gặp nhiều may mắn'
    };
  }
  if (['1234', '2345', '3456', '4567', '5678', '6789'].includes(tail4)) {
    return {
      category: 'Tiến lên',
      price: tail4 === '6789' ? 25000000 : 4800000,
      fengShuiNote: `Sảnh tiến ${tail4} sự nghiệp thăng tiến không ngừng`
    };
  }
  if (['1990', '1992', '1995', '1996', '1998', '1999', '2000', '2002'].includes(tail4)) {
    return {
      category: 'Năm sinh',
      price: 890000,
      fengShuiNote: `Số năm sinh ${tail4} mang dấu ấn cá nhân độc bản`
    };
  }
  const sum = digits.split('').reduce((acc, ch) => acc + Number(ch), 0);
  return {
    category: sum % 10 >= 8 ? 'Số đẹp dễ nhớ' : 'Phổ thông',
    price: sum % 10 >= 8 ? 650000 : 199000,
    fengShuiNote: `Tổng nút ${sum % 10 === 0 ? 10 : sum % 10} cân bằng âm dương, dễ nhớ`
  };
}

function generateViettelLookupCandidates(
  query: string,
  prefixFilter: string,
  excludeDigits: string[]
) {
  const prefixes = prefixFilter && prefixFilter !== 'all'
    ? [prefixFilter]
    : ['098', '097', '096', '086', '038', '039', '036', '035'];

  const cleaned = query.replace(/[^0-9*]/g, '');
  const results: Array<{
    id: string;
    phoneNumber: string;
    rawDigits: string;
    prefix: string;
    category: string;
    priceTier: string;
    price: number;
    status: 'available';
    fengShuiNote: string;
    featured: boolean;
    source: 'viettel_api';
  }> = [];

  const seen = new Set<string>();
  const seedBase = cleaned.split('').reduce((acc, c) => acc + c.charCodeAt(0), 17);

  for (let i = 0; i < 60 && results.length < 12; i++) {
    const pfx = prefixes[i % prefixes.length];
    let candidate = '';

    if (/^0\d{9}$/.test(cleaned)) {
      if (i > 0) break;
      candidate = cleaned;
    } else if (cleaned.includes('*')) {
      const parts = cleaned.split('*');
      const head = parts[0] || pfx;
      const tail = parts[parts.length - 1] || '';
      const baseHead = head.startsWith('0') ? head : pfx;
      const middleNeeded = Math.max(0, 10 - baseHead.length - tail.length);
      let middle = '';
      for (let m = 0; m < middleNeeded; m++) {
        let d = (seedBase + i * 7 + m * 3) % 10;
        while (excludeDigits.includes(String(d))) {
          d = (d + 1) % 10;
        }
        middle += String(d);
      }
      candidate = (baseHead + middle + tail).slice(0, 10);
    } else if (cleaned.length >= 2 && cleaned.length <= 6) {
      const middleNeeded = Math.max(0, 10 - pfx.length - cleaned.length);
      let middle = '';
      for (let m = 0; m < middleNeeded; m++) {
        let d = (seedBase + i * 5 + m * 11) % 10;
        while (excludeDigits.includes(String(d))) {
          d = (d + 1) % 10;
        }
        middle += String(d);
      }
      candidate = (pfx + middle + cleaned).slice(0, 10);
    } else {
      const endings = ['888', '6868', '7979', '668', '999', '1998', '5678', '239', '368', '268', '186', '989'];
      const ending = endings[i % endings.length];
      const middleNeeded = 10 - pfx.length - ending.length;
      let middle = '';
      for (let m = 0; m < middleNeeded; m++) {
        let d = (seedBase + i * 9 + m * 4) % 10;
        while (excludeDigits.includes(String(d))) {
          d = (d + 1) % 10;
        }
        middle += String(d);
      }
      candidate = pfx + middle + ending;
    }

    if (
      candidate.length === 10 &&
      !seen.has(candidate) &&
      !excludeDigits.some((ex) => ex && candidate.includes(ex))
    ) {
      seen.add(candidate);
      const meta = detectSimCategoryAndPrice(candidate);
      results.push({
        id: `vt_${candidate}`,
        phoneNumber: formatViettelPhone(candidate),
        rawDigits: candidate,
        prefix: candidate.slice(0, 3),
        category: meta.category,
        priceTier: classifyPriceTier(meta.price),
        price: meta.price,
        status: 'available',
        fengShuiNote: meta.fengShuiNote,
        featured: meta.price >= 5000000,
        source: 'viettel_api'
      });
    }
  }

  return results;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'v-sim-hub', timestamp: new Date().toISOString() });
  });

  // Dynamic SEO Sitemap
  app.get('/api/seo/sitemap.xml', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const tiers = ['100k-300k', '500k-1m', '1m-5m', '5m-10m', 'vip-10m+'];
    const urls = [
      `${baseUrl}/`,
      ...tiers.map((tier) => `${baseUrl}/?tier=${tier}`),
      `${baseUrl}/#viettel-lookup`,
      `${baseUrl}/#order-tracker`
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  });

  // VNPAY: Create HMAC-SHA512 Payment URL
  app.post('/api/vnpay/create-url', (req, res) => {
    const {
      orderCode,
      amount,
      orderInfo,
      bankCode,
      locale = 'vn',
      returnUrl,
      mode = 'sandbox',
      tmnCode,
      hashSecret,
      vnpayUrl
    } = req.body || {};

    if (!orderCode || !amount || Number(amount) <= 0) {
      res.status(400).json({ error: 'Thiếu mã đơn hàng hoặc số tiền thanh toán hợp lệ.' });
      return;
    }

    const resolvedMode =
      mode === 'production' || (process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET)
        ? 'production'
        : 'sandbox';
    const effectiveTmn =
      resolvedMode === 'production'
        ? String(tmnCode || process.env.VNPAY_TMN_CODE || DEFAULT_SANDBOX_TMN).trim()
        : DEFAULT_SANDBOX_TMN;
    const effectiveSecret =
      resolvedMode === 'production'
        ? String(hashSecret || process.env.VNPAY_HASH_SECRET || DEFAULT_SANDBOX_SECRET).trim()
        : DEFAULT_SANDBOX_SECRET;
    const baseUrl =
      resolvedMode === 'production'
        ? String(vnpayUrl || process.env.VNPAY_URL || DEFAULT_VNPAY_URL).trim()
        : DEFAULT_VNPAY_URL;

    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const createDate = formatVnpayDate(new Date());
    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: effectiveTmn,
      vnp_Locale: locale === 'en' ? 'en' : 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(orderCode),
      vnp_OrderInfo: String(orderInfo || `Thanh toan don hang SIM Viettel ${orderCode}`),
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(Number(amount) * 100)),
      vnp_ReturnUrl: String(
        returnUrl || `${process.env.APP_URL || 'http://localhost:3000'}/vnpay-return`
      ),
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate
    };

    if (bankCode) {
      vnpParams.vnp_BankCode = String(bankCode);
    }

    const sorted = sortVnpayParams(vnpParams);
    const signData = buildSignData(sorted);
    const hmac = crypto.createHmac('sha512', effectiveSecret);
    const vnp_SecureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const paymentUrl = `${baseUrl}?${signData}&vnp_SecureHash=${vnp_SecureHash}`;

    res.json({
      mode: mode === 'production' && tmnCode && hashSecret ? 'production' : 'sandbox',
      paymentUrl,
      txnRef: orderCode,
      tmnCode: effectiveTmn,
      createDate,
      secureHashPreview: `${vnp_SecureHash.slice(0, 16)}...${vnp_SecureHash.slice(-8)}`,
      vnpParams: { ...sorted, vnp_SecureHash }
    });
  });

  // VNPAY Sandbox: Sign simulated return payload with real HMAC-SHA512
  app.post('/api/vnpay/sign-sandbox-return', (req, res) => {
    const { orderCode, amount, bankCode = 'NCB', responseCode = '00' } = req.body || {};
    if (!orderCode || !amount) {
      res.status(400).json({ error: 'Thiếu thông tin giao dịch Sandbox.' });
      return;
    }

    const payDate = formatVnpayDate(new Date());
    const rawParams: Record<string, string> = {
      vnp_TmnCode: DEFAULT_SANDBOX_TMN,
      vnp_Amount: String(Math.round(Number(amount) * 100)),
      vnp_BankCode: String(bankCode),
      vnp_BankTranNo: `VNP${Date.now().toString().slice(-8)}`,
      vnp_CardType: 'ATM',
      vnp_OrderInfo: `Thanh toan don hang SIM Viettel ${orderCode}`,
      vnp_PayDate: payDate,
      vnp_ResponseCode: String(responseCode),
      vnp_TxnRef: String(orderCode),
      vnp_TransactionNo: `${Math.floor(14000000 + Math.random() * 999999)}`,
      vnp_TransactionStatus: String(responseCode)
    };

    const sorted = sortVnpayParams(rawParams);
    const signData = buildSignData(sorted);
    const vnp_SecureHash = crypto
      .createHmac('sha512', DEFAULT_SANDBOX_SECRET)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    res.json({
      params: { ...rawParams, vnp_SecureHash }
    });
  });

  // VNPAY: Verify HMAC-SHA512 return/IPN signature
  app.post('/api/vnpay/verify', (req, res) => {
    const { params = {}, mode = 'sandbox', hashSecret } = req.body || {};
    const effectiveSecret =
      mode === 'production' || process.env.VNPAY_HASH_SECRET
        ? String(hashSecret || process.env.VNPAY_HASH_SECRET || DEFAULT_SANDBOX_SECRET).trim()
        : DEFAULT_SANDBOX_SECRET;

    const receivedHash = String(params.vnp_SecureHash || '');
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType' && v !== undefined && v !== null) {
        filtered[k] = String(v);
      }
    }

    const sorted = sortVnpayParams(filtered);
    const signData = buildSignData(sorted);
    const expectedHash = crypto
      .createHmac('sha512', effectiveSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    const verified =
      receivedHash.length > 0 &&
      receivedHash.toLowerCase() === expectedHash.toLowerCase();
    const responseCode = String(params.vnp_ResponseCode || '99');
    const success = verified && responseCode === '00';

    res.json({
      verified,
      success,
      responseCode,
      txnRef: String(params.vnp_TxnRef || ''),
      bankCode: String(params.vnp_BankCode || 'VNPAY'),
      transactionNo: String(params.vnp_TransactionNo || ''),
      amount: Number(params.vnp_Amount || 0) / 100,
      message: success
        ? 'Xác thực chữ ký VNPAY HMAC-SHA512 thành công'
        : !verified
          ? 'Chữ ký bảo mật VNPAY không hợp lệ'
          : `Giao dịch chưa hoàn tất (Mã VNPAY: ${responseCode})`
    });
  });

  // Zalo OA: Send Automated Order Status Notification (ZNS Live or Sandbox)
  app.post('/api/zalo/notify', async (req, res) => {
    const {
      orderCode,
      customerName = 'Quý khách',
      recipientPhone,
      eventType = 'ORDER_CREATED',
      orderStatus = 'pending',
      totalAmount = 0,
      simNumbers = [],
      mode = 'sandbox',
      accessToken = '',
      templateId = ''
    } = req.body || {};

    if (!orderCode || !recipientPhone) {
      res.status(400).json({ error: 'Thiếu mã đơn hàng hoặc số điện thoại nhận tin Zalo OA.' });
      return;
    }

    const statusLabelMap: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận & giữ số',
      shipping: 'Đang giao SIM toàn quốc',
      completed: 'Đã giao & kích hoạt thành công',
      cancelled: 'Đã hủy đơn'
    };

    const statusVi = statusLabelMap[orderStatus] || orderStatus;
    const formattedAmount = new Intl.NumberFormat('vi-VN').format(Number(totalAmount)) + 'đ';
    const simListText = Array.isArray(simNumbers) ? simNumbers.join(', ') : String(simNumbers);

    const messagePreview = `[Zalo OA V-Sim Hub] Xin chào ${customerName}, đơn hàng #${orderCode} (${simListText}) - Tổng ${formattedAmount} hiện ở trạng thái: ${statusVi}. Cảm ơn bạn đã tin chọn SIM Viettel chính hãng!`;

    const normalizedPhone = String(recipientPhone).replace(/\D/g, '').replace(/^0/, '84');

    const effectiveToken = String(accessToken || process.env.ZALO_OA_ACCESS_TOKEN || '').trim();
    const effectiveTemplate = String(templateId || process.env.ZALO_ZNS_TEMPLATE_ID || '').trim();

    if ((mode === 'production' || (effectiveToken && effectiveTemplate)) && effectiveToken && effectiveTemplate) {
      try {
        const zaloResp = await fetch('https://business.openapi.zalo.me/message/template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            access_token: effectiveToken
          },
          body: JSON.stringify({
            phone: normalizedPhone,
            template_id: effectiveTemplate,
            template_data: {
              order_code: orderCode,
              customer_name: customerName,
              status: statusVi,
              amount: formattedAmount,
              sim_numbers: simListText
            },
            tracking_id: `${orderCode}_${Date.now()}`
          })
        });
        const zaloJson = (await zaloResp.json()) as { error?: number; message?: string; data?: unknown };
        if (zaloResp.ok && zaloJson.error === 0) {
          res.json({
            deliveryStatus: 'sent_live',
            eventType,
            messagePreview,
            providerResponse: zaloJson
          });
          return;
        }
        res.json({
          deliveryStatus: 'failed',
          eventType,
          messagePreview,
          providerResponse: zaloJson
        });
        return;
      } catch (err) {
        res.json({
          deliveryStatus: 'failed',
          eventType,
          messagePreview,
          providerResponse: { error: err instanceof Error ? err.message : 'Zalo API request failed' }
        });
        return;
      }
    }

    // Sandbox simulated ZNS dispatch
    res.json({
      deliveryStatus: 'simulated_sandbox',
      eventType,
      messagePreview,
      providerResponse: {
        sandbox: true,
        zaloPhone: normalizedPhone,
        dispatchedAt: new Date().toISOString()
      }
    });
  });

  // Viettel Stock Lookup API (Live Partner Endpoint or Sandbox Carrier Stock Engine)
  app.get('/api/viettel/lookup', async (req, res) => {
    const q = String(req.query.q || '');
    const prefix = String(req.query.prefix || 'all');
    const exclude = String(req.query.exclude || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const mode = String(req.query.mode || 'sandbox');
    const apiUrl = String(req.query.apiUrl || process.env.VIETTEL_API_URL || '');
    const apiKey = String(req.query.apiKey || process.env.VIETTEL_API_KEY || '');

    if ((mode === 'production' || (apiUrl && apiKey)) && apiUrl && apiKey) {
      try {
        const url = new URL(apiUrl);
        if (q) url.searchParams.set('q', q);
        if (prefix !== 'all') url.searchParams.set('prefix', prefix);
        const upstream = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json'
          }
        });
        if (upstream.ok) {
          const data = await upstream.json();
          res.json({ mode: 'production', items: Array.isArray(data) ? data : data.items || [] });
          return;
        }
      } catch {
        // Fall through cleanly with explicit fallback flag if upstream unreachable
      }
    }

    const items = generateViettelLookupCandidates(q, prefix, exclude);
    res.json({
      mode: 'sandbox',
      checkedAt: new Date().toISOString(),
      query: q || 'Kho số Viettel mới nhất',
      items
    });
  });

  // Vite Middleware (Dev) or Static Assets (Production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`V-Sim Hub server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
