# PRD — Physical Editions

## Original problem statement
A website for a gamer's print business, minimal (not funky): customers order (1) posters of favorite games in A4/A5, (2) custom posters via image upload, (3) "physical edition" cover art — customer names game + platform (PlayStation 5/PlayStation 4/Xbox/PC) and receives a DVD case with printed cover art only (no game disc). Aesthetic: collector's press / vinyl reissue label — warm cream paper, terracotta accent, distinctive serif display, editorial, non-tech. Secret promocode FREEHOSTEL5050 = 50% off posters only; coded orders show progress (packed/shipped/delivered) but NO tracking number; uncoded orders get progress + tracking ID with courier brand.

## User choices (gathered)
- Payment: Razorpay (keys pending from user — currently MOCKED mock-pay while keys are empty)
- Admin dashboard: yes (order status + tracking/courier entry)
- Customer accounts: yes (login/signup + order history)
- Pricing: user to confirm; pre-filled defaults — Poster A4 ₹299 / A5 ₹199, Custom A4 ₹399 / A5 ₹299, Cover art ₹499
- Catalog: agent-picked starter set of 8 posters (editable)

## Architecture
- FastAPI + MongoDB (motor) backend, JWT cookie+Bearer auth (bcrypt), Razorpay orders + signature verify, Emergent object storage for uploads (local disk fallback), admin seeding on startup.
- React frontend: Tailwind + shadcn base, framer-motion (masked line reveal, scroll reveals, 3D tilt), lenis smooth scroll, react-fast-marquee, sonner toasts. Design per /app/design_guidelines.json (Cormorant Garamond / Bodoni Moda / IBM Plex Mono, #F4F0EA cream, #C85A43 terracotta, 0px radius).

## Implemented (2026-08-21)
- Full auth: register/login/logout/me/refresh/forgot/reset, brute-force lockout, admin role
- Catalog: 8 seeded poster editions with edition numbers
- Order flows: poster (A4/A5), custom poster (image upload to object storage), cover art (game + PlayStation 5/PlayStation 4/Xbox/PC)
- Promo logic: FREEHOSTEL5050 → 50% off poster/custom items only (server-computed); coded orders strip tracking fields from customer API responses
- Payments: Razorpay create-order + signature verify endpoints; MOCKED mock-pay path while keys are absent
- Customer account: order history with Placed→Packed→Shipped→Delivered timeline; tracking ID + courier for uncoded orders
- Admin "Press Office": order ledger table, status select, tracking ID + courier inputs, status counts
- Design: kinetic masked-line hero with parallax proof image, registration marks, slow editorial marquee, numbered manifesto chapters, gridded catalog with hairline rules

## Verified
- curl chain: register → order with/without promo → invalid promo rejected → mock pay → admin status/tracking updates → customer sees tracking only on uncoded order → customer 403 on admin routes
- Upload → object storage → file fetch (200 image/png)
- Browser e2e: login, add poster + cover art, promo in cart (₹798→₹649), checkout, order appears with timeline and promo tracking note

## Pending / needs user
- Razorpay keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET in backend/.env) — until then checkout auto-completes via MOCKED payment
- Final prices from user
- Real cover-art/game imagery for catalog (currently curated stock art)

## Backlog
- P0: Live Razorpay keys; ~~final pricing~~ pricing set from menu (2026-08-21): A4 framed ₹259/unframed ₹149, A3 framed ₹399/unframed ₹179, A5 unframed ₹89, DVD cover boxes ₹199 (PlayStation 5/PlayStation 4/Xbox/PC, includes free A5 poster)
- P1: Admin product management (add/edit posters, prices) in Press Office; email notifications on status change
- P2: Discount reporting, order cancellation, address book, multiple cover-art platform templates
## Google sign-in
- Native Google Identity Services button on `/auth`; backend verifies the Google ID token against `GOOGLE_CLIENT_ID`, links verified email accounts, and issues the app's JWT.
- Set `GOOGLE_CLIENT_ID` on the backend and configure authorized frontend origins in Google Cloud Console. The frontend reads the public client ID from `/api/auth/google/config`; the Emergent OAuth session endpoint and callback are removed.

## Branding (2026-08-21, round 3)
- Startup renamed to **Physicality** (tagline: "Make digital tangible"); logo applied: P disc-box mark in nav + auth page, full wordmark logo in footer, favicon from the mark, Razorpay checkout name, email sender name + email header. Logo files at /app/frontend/public/brand/ (white background converted to transparency).

## Implemented (2026-08-21, round 2)
- Order status emails via Emergent-managed Resend: admin marking an order packed/shipped/delivered auto-emails the customer (branded editorial template, progress line, tracking block only for uncoded orders). Verified sending to delivered@resend.dev (PE-1006). Note: fake test addresses like collector@test.com are blocked by the proxy as undeliverable — by design.
- Catalog Manager in Press Office ("Editions" tab): add/edit/remove poster editions, auto edition numbers, image via URL or upload to object storage. CRUD verified via API; customers get 403.

## Redesign (2026-08-21)
- Restyled home to match the "Physicality." reference: masthead rule bar, giant masked serif headline ("The archive for players who still collect."), black game-name marquee, split N°01/N°02 type panels, process steps, dark colophon CTA
- Nav: Posters / Custom Poster / DVD Cover / Track Order; footer: Shop + Support columns
- New product model: posters take any game name (or catalog pick) + A4/A3/A5 + framed/unframed; custom uploads share the poster price table; DVD covers are PlayStation 5/PlayStation 4/Xbox/PC at ₹199 with free A5 poster flagged on the order item
