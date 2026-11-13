# Security Specification — V-Sim Hub

## 1. Data Invariants
1. **Default Deny**: No Firestore document is readable or writable unless explicitly permitted by a matching rule block.
2. **PII Isolation**: Customer phone numbers, full names, and shipping addresses live exclusively inside `/orders/{orderId}`, which is strictly readable and updatable only by verified Admins (`isAdmin()`). Public order tracking uses `/order_tracking/{orderCode}` with masked phone numbers (`098***5678`) and `allow get` only (no `allow list`).
3. **Credential Protection**: VNPAY `vnpayHashSecret`, Zalo OA `zaloOaAccessToken`, and `viettelApiKey` live exclusively inside `/cms_settings/integrations`, readable and writable only by verified Admins.
4. **RBAC Privilege Escalation Guard**: Users cannot self-assign admin roles in `/admins/{uid}`; `isAdmin()` verifies `request.auth.token.email_verified == true` and membership in `/admins/{uid}` or the bootstrapped owner email.
5. **Temporal & Structural Integrity**: All `create` operations enforce `createdAt == request.time`, exact key allowlists (`hasAll` + `hasOnly`), string length bounds, and regex ID guards (`^[a-zA-Z0-9_\\-]+$`).

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Admin Read on Orders**: `GET /orders` without auth -> Denied.
2. **Unauthenticated Read on Integration Secrets**: `GET /cms_settings/integrations` without auth -> Denied.
3. **Email Spoofing Attack**: Signed-in user with `email_verified: false` claiming admin email writing to `/sims/sim1` -> Denied.
4. **Self-Assigned Admin Escalation**: Non-admin authenticated user attempting `CREATE /admins/{myUid}` -> Denied.
5. **Shadow Ghost Field on Order**: Creating `/orders/ord1` with extra field `isAdminApproved: true` -> Denied by `hasOnly`.
6. **Client Timestamp Forgery**: Creating `/orders/ord1` with backdated `createdAt` instead of `request.time` -> Denied.
7. **ID Poisoning Attack**: Creating `/sims/` with a 500-char ID or invalid characters `../admin` -> Denied by `isValidId`.
8. **List Scraping on Order Tracking**: `LIST /order_tracking` to scrape all customer order codes -> Denied (only `get` allowed).
9. **Public Mutation on Public CMS**: Non-admin user attempting `UPDATE /cms_settings/public` -> Denied.
10. **Status Shortcutting on Order Create**: Creating `/orders/ord1` with `orderStatus: 'completed'` -> Denied (`orderStatus == 'pending'` required on create).
11. **Value Poisoning on SIM Price**: Admin/attacker updating `/sims/sim1` with negative `price: -500` or 1MB `phoneNumber` -> Denied by `isValidSim`.
12. **Unbounded Array Injection**: Creating `/orders/ord1` with 100 items in `simNumbers` -> Denied (`simNumbers.size() >= 1 && simNumbers.size() <= 10`).
