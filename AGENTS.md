# Road Runner — agent briefing

Read this first in every new Cursor workspace opened on this folder. Then skim `docs/OPS_JOURNAL.md` for verified production/setup steps.

## What this product is

**Road Runner** is a standalone pharmacy delivery customer app for Ethiopia (React + Vite + TypeScript).

- **Own Supabase project:** RoadRunner — `https://iumdgtwwhkcqxfqhjywp.supabase.co` (not Kelal’s project).
- **Local path:** `C:\Users\Michel Tadesse\Road Runner`
- **GitHub:** https://github.com/KelalGatewayProject/Road-Runner.git
- **Not** part of the Kelal Gateway app codebase long-term. Do not put Road Runner product logic only inside KelalGatewayApp.

## Repo layout

| Path | Role |
|------|------|
| `apps/customer/` | Customer web app (Vite). Main work happens here. |
| `apps/customer/.env.local` | Local secrets only — never commit. Names: `VITE_GOOGLE_MAPS_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. |
| `supabase/migrations/` | SQL for RoadRunner project (apply in SQL Editor). |
| `supabase/functions/` | Edge Functions (e.g. `send-phone-otp`). |
| `scripts/publish-preview-to-kelal-dist.ps1` | Optional: build with `base=/road-runner/` into Kelal `dist/` + `public/` for web demo. |
| `docs/OPS_JOURNAL.md` | Verified working ops only (no failures, no secret values). |
| `branding/`, `Pharmacies/`, `Product categories/`, `Health Conditions/` | Assets / reference imagery. |

## Current product scope (built)

- Catalog: pharmacies + products from Supabase (demo fallback if unset).
- Auth: phone OTP / PIN stack; roles: `customer`, `pharmacy_staff`, `admin`, `super_admin`.
- Menu (bottom nav): Kelal-style slide-out; Super Admin / admin can open dashboard + catalog upload.
- Admin: stats, member role assignment (Super Admin), **The Bank** (gateway cashboxes + accounting + WHT), pharmacy/product upload.
- Pharmacy banner upload → Storage bucket `pharmacy-banners` (JPEG/PNG/WEBP, max 2 MB).
- Maps: delivery pin + pharmacy map pin (Ethiopia-only), satellite/roadmap, Places search (Ethiopia).
- Cart: delivery fee **25 ETB × ceil(km)**; service fee **2%** of item subtotal (not delivery).
- Checkout: Kelal Pay–style bottom sheet — all methods **Coming Soon** (no live bank APIs yet).

## Temporary Kelal demo bridge (not source of truth)

While demos run without a Road Runner domain:

- Kelal Super Admin header Pharmacy icon opens `/road-runner/`.
- Super Admin on Kelal always bypasses app shutdown.
- Publish script copies the built app into KelalGatewayApp for ngrok / Kelal web deploy.

Road Runner code and migrations live **here**. Kelal only hosts a built preview subpath until Road Runner has its own domain/host.

## Do / don’t

**Do**

- Keep features, maps, fees, admin, and env **names** in this repo.
- Log **verified** ops in `docs/OPS_JOURNAL.md` (secret **names** only).
- Ask before creating new `.md` / `.txt` files (except OPS journal updates when required).

**Don’t**

- Commit `.env.local`, API keys, tokens, or anon/service keys.
- Treat KelalGatewayApp as the home for Road Runner features.
- Tell anyone to “read secret values” from Supabase Dashboard (secrets are write-only after save).
- Implement live payment gateways until domain + callback URLs are ready.

## Dev commands

```powershell
cd "C:\Users\Michel Tadesse\Road Runner\apps\customer"
npm install   # if needed
npm run dev
npm run build
```

Optional Kelal preview publish:

```powershell
& "C:\Users\Michel Tadesse\Road Runner\scripts\publish-preview-to-kelal-dist.ps1"
```

## Hosting roadmap (don’t jump ahead)

1. **Now:** GitHub + local/`npm run dev` + optional Kelal `/road-runner/` demo.
2. **Later:** Own domain + DigitalOcean (or similar) for standalone production.
3. **Payment gateways:** Require own HTTPS domain + bank-whitelisted callbacks — not before that.

## Migrations order (RoadRunner SQL Editor)

Apply under `supabase/migrations/` in filename order when setting up or catching up. Banner storage migration is self-contained (includes admin helper functions).
