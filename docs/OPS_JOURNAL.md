# Operations journal (Road Runner)

**Purpose:** Record **verified working** configurations and how we **confirmed** them — so we can reproduce success later. **Do not** log failed attempts or dead-end steps here; the journal is only for **passed** outcomes.

**Rules:** Do not paste private keys, tokens, or full secrets. Name scripts and secret **keys** only.

Newest entries **at the top**.

---

## 2026-07-27 — GitHub repo + AGENTS.md (standalone workspace)

**Working outcome:** Road Runner lives at `C:\Users\Michel Tadesse\Road Runner` with its own git remote. First push to https://github.com/KelalGatewayProject/Road-Runner.git (`main`, commit `13e7113`). Root `AGENTS.md` briefs new Cursor agents; `.gitignore` excludes `node_modules` / `*.local`; publish script path updated off `Documents\`.

**How we verified:** `git push -u origin main` succeeded; working tree clean; `.env.local` not staged.

**Rollback:** delete remote repo or `git remote remove origin` locally (local files remain).

---

## 2026-07-27 — Admin roles, The Bank, pharmacy banner storage, map pin screen, Super Admin bypass

**Working outcome:** Full admin layer operational on the RoadRunner Supabase project.

- **Admin roles + catalog writes:** `super_admin` / `admin` role constraint on `users`, `is_rr_super_admin()` / `is_rr_catalog_admin()` SQL helpers, RLS policies for `pharmacies`, `products`, `product_categories`. Role-guard trigger prevents customers from self-escalating.
- **The Bank (accounting):** `platform_cashbox` table (8 gateway keys + `platform_cashbox`), `accounting_records` table with types `income / expense / adjustment / withdrawal / gateway_payment / service_fee / wht`. `TheBankPanel.tsx` mirrors Kelal Super Admin bank card UI.
- **Pharmacy banner storage:** `pharmacy-banners` bucket (public, 2 MB cap, JPEG/PNG/WEBP). RLS: public read, admin write. Migration is self-contained (includes helper functions so it can run standalone).
- **Pharmacy map pin screen:** `PharmacyMapPinScreen.tsx` — full-screen Google Maps pin placement with Ethiopia-only validator, satellite/roadmap toggle (bottom-right), Places API search bar (Ethiopia scoped, autocomplete dropdown, pin moves to selected place). UI matches delivery map without extra headers/footer containers.
- **Super Admin bypass in Kelal Gateway:** `useAppShutdown.ts` skips the shutdown modal for `isSuperAdminUser`; Pharmacy icon (`pharmacy-icon.png`) added to Kelal header (Super Admin only) → opens `/road-runner/` in new tab; `scripts/publish-preview-to-kelal-dist.ps1` publishes Road Runner build to both `dist/road-runner` (ngrok) and `public/road-runner` (Kelal web build for live domain).

**Files (Road Runner):** `supabase/migrations/20260727010000_*.sql`, `20260727020000_*.sql`, `20260727030000_*.sql`; `src/components/admin/{AdminDashboard,TheBankPanel,CatalogUploadPanel}.tsx`; `src/components/menu/AppMenu.tsx`; `src/components/maps/{PharmacyMapPinScreen,MapTypeToggle,MapSearchBar}.tsx`; `src/lib/{roles,fees,media}.ts`; `src/constants/bankGateways.ts`; `src/services/adminApi.ts`.

**Files (Kelal Gateway):** `src/hooks/useAppShutdown.ts`, `src/pages/admin/SuperAdminDashboard.tsx`, `src/components/Header.tsx`, `public/pharmacy-icon.png`.

**How we verified:** SQL migrations applied successfully in RoadRunner SQL Editor (Success, no rows); `npm run build` in `apps/customer` passed; Kelal Gateway master build pending (web-only push to GitHub, no AAB update).

**Rollback (Road Runner):** drop `platform_cashbox`, `accounting_records`, `pharmacy-banners` bucket; revert role constraint; remove admin component imports from `App.tsx`. **Rollback (Kelal):** revert `useAppShutdown.ts`, `Header.tsx`; delete `public/pharmacy-icon.png`.

---

## 2026-07-26 — RoadRunner Supabase core schema applied

**Working outcome:** Empty **RoadRunner** project (`iumdgtwwhkcqxfqhjywp`) has `users`, `product_categories`, `pharmacies`, `products` (+ RLS, `is_phone_registered`, demo seed). Customer app loads catalog from this project via `VITE_SUPABASE_*` with demo fallback.

**Files:** `supabase/migrations/20260726220000_road_runner_core_catalog_and_users.sql`, `apps/customer/src/services/catalog.ts`, `App.tsx` catalog wiring.

**How we verified:** User ran SQL in RoadRunner SQL Editor (Success); Table Editor lists the four public tables.

**Rollback:** drop those four tables / RPC on RoadRunner only (never on KelalGatewayProject).

---

## 2026-07-26 — Checkout payment bottom sheet (all Coming Soon)

**Working outcome:** Cart “Continue to checkout” opens a Kelal Pay–style bottom sheet with the same local gateway grid. Every method (including CBE sub-options) shows the Coming Soon modal — no live bank calls. Requires sign-in + delivery location first.

**Road Runner files:** `constants/paymentOptions.ts`, `components/checkout/{PaymentBottomSheet,PaymentGridTile,PaymentMethodsSheet}.tsx`, cart wiring in `App.tsx`.

**How we verified:** `npm run build` / publish preview for `/road-runner/`.

**Rollback:** remove PaymentMethodsSheet wiring; restore checkout toast.

---

## 2026-07-26 — Pharmacy pins + ngrok preview publish script

**Working outcome:** Demo pharmacy coordinates updated from map/directory sources (Moringa @ Bar Melo / Mike Leyland; Super Pharmacy @ DH Geda Tower; Gishen No.8 @ Harambee/Ambassador Lideta). Preview publish script bakes `apps/customer/.env.local` into `KelalGatewayApp/dist/road-runner` for ngrok `/road-runner/`.

**Files:** `apps/customer/src/App.tsx` (pharmacy lat/lng/area/phone); `scripts/publish-preview-to-kelal-dist.ps1`.

**How we verified:** Publish script build completed; open `/road-runner/` on the reserved ngrok host after Kelal preview is up. Maps key HTTP referrer must include `https://retying-aging-rupture.ngrok-free.dev/*`.

**Note:** Zelalem Pharmacy no.3 still needs the exact Google Maps pin from the user’s saved place (photo phones updated to storefront).

**Rollback:** revert pharmacy coords; stop publishing to `dist/road-runner`.

---

## 2026-07-26 — Phone OTP auth modules copied into Road Runner customer app

**Working outcome:** Phone OTP sign-up / sign-in UI and utils live under Road Runner (`apps/customer`), with a slim AuthProvider, AuthSlide panel, and `send-phone-otp` Edge Function adapted for Road Runner naming (`phone.roadrunner.et`). App still builds without Supabase env (client exports `supabase=null`).

**Road Runner files (high level):**
- `apps/customer/src/components/auth/*` — OTP, numeric keypad, phone modals, AuthSlide, AccountPanel
- `apps/customer/src/utils/{pinAuth,phoneNumberUtils,loginWithIpRateLimit}.ts`
- `apps/customer/src/services/supabaseClient.ts`, `apps/customer/src/contexts/AuthContext.tsx`
- `supabase/functions/send-phone-otp/index.ts`
- `supabase/migrations/` — phone OTP / lock / blocked-phone / is_phone_registered migrations

**Env (local only):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `apps/customer/.env.local`. Edge secrets (names only): `AFROMESSAGE_API_TOKEN`, `AFROMESSAGE_API_URL`, `AFROMESSAGE_SENDER_NAMES`, `AFROMESSAGE_IDENTIFIER_ID`.

**How we verified:** `npm run build` in `apps/customer` completed successfully (26 Jul 2026).

**Rollback:** remove AuthProvider wrap / Sign-in wiring; delete auth modules above.

---

## 2026-07-26 — Customer cart delivery location + Maps stack in Road Runner

**Working outcome:** Delivery location lives on the customer cart (under line items). Full-screen **current location** and **pin** flows calculate pharmacy→drop-off distance (haversine) at **25 ETB per km** (`ceil(km) × 25`). Google Maps modules live **inside** the Road Runner repo (not as a dependency of another product codebase).

**Road Runner files:**
- `apps/customer/src/config/maps.ts` — API key from `VITE_GOOGLE_MAPS_API_KEY`, directions helpers
- `apps/customer/src/contexts/GoogleMapsContext.tsx` — single Maps JS loader
- `apps/customer/src/components/maps/InteractiveGoogleMap.tsx` — full-screen pin map
- `apps/customer/src/components/maps/EthiopiaLocationValidator.tsx` — Ethiopia bounds gate
- `apps/customer/src/components/maps/DeliveryLocationScreen.tsx` — GPS / pin chooser
- `apps/customer/src/lib/geo.ts` — haversine + delivery fee

**Env (local only):** `apps/customer/.env.local` → `VITE_GOOGLE_MAPS_API_KEY` (value never committed). Allow the preview/tunnel origin on the key’s HTTP referrers.

**How we verified:** `npm run build -- --base=/road-runner/` in `apps/customer` completed successfully (26 Jul 2026).

**Rollback:** remove cart location gate / Maps provider wrap; fee falls back only if location unset (checkout blocked).

---
