# SESSION_STATE.md
> Auto-maintained by agent. Last updated: 2026-09-05

## Active Session
- **Session ID:** ses_20260905
- **Agent:** Luke (Lead Orchestrator)
- **Mode:** luke-fullstack
- **Project:** Guardian (formerly Sentari) — Africa-First AI-Native Cyber Defense
- **Repo:** https://github.com/Le-e-lab/guardian (main)

## Task Tree
| ID | Summary | Status | Notes |
|---|---|---|---|
| G1 | Reviewer pass: fix real-domain scan invitations across all pages | ✅ Done | 4 files fixed (how-it-works was already drafted) |
| G2 | Soften competitor pricing to "from" phrasing | ✅ Done | pricing/page.tsx — Pentera from $35K/yr, XBOW from $6K/test |
| G3 | Verify tier enforcement matches pricing copy | ✅ Done | Found + fixed: Starter had credentials/social (now Professional-only) |
| G4 | Clean lint errors (4 no-use-before-define) | ✅ Done | settings, ScanInterface, ScannerPage, admin dashboard |
| G5 | Visual verification of changed pages | ✅ Done | 11/11 browser assertions passed (desktop + mobile 375px) |
| G6 | Update docs to current state | ✅ Done | README + this file |
| G7 | luke analyse startup audit | ✅ Done | Tool: 100/100 shallow; real audit below in handoff |
| B1 | **LIVE BUG: "Failed to create scan" on tarisai.co.zw** | ✅ Done | ROOT CAUSE: orphaned profiles → FK 23503. 6 orphans backfilled. |
| B2 | Multiple GoTrueClient instances warning | ✅ Done | 9 client files now share supabase-browser singleton |
| B3 | Self-healing profile guard in auth-middleware | ✅ Done | Auto-creates profile if missing |

## Live Bug Root Cause (B1) — RECORDED FOR HARDENING
- **Symptom:** scan POST → 500 "Failed to create scan" for lmutsambiwa57@gmail.com (and ALL pre-2026-09-05 users)
- **Root cause:** `scan_targets.created_by` FK → `profiles(id)`. Users created before migration 001 (or whose trigger never fired) had NO profile row → every INSERT failed with 23503.
- **Fix:** migration `004_backfill_profiles.sql` backfilled 6 orphan profiles + ensured trigger. App guard in auth-middleware now auto-creates missing profiles (self-healing).
- **Verified:** E2E scan on tarisai.co.zw returned 200, risk_score 57, 5 findings. New-user trigger fires (test user got profile automatically). Zero orphans (8/8).
- **Lesson:** profile trigger must be monitored; NEVER rely on trigger backfilling existing users. Add to lessons_learned.md.

## Active Files Modified (uncommitted)
- src/app/how-it-works/page.tsx (domain copy — was already drafted)
- src/app/scan/page.tsx (placeholder econet.co.zw → yourcompany.co.zw + singleton client)
- src/components/ScanInterface.tsx (DEMOS cleaned + hoisted loadHistory + singleton client)
- src/components/scanner/ScannerPage.tsx (DEMOS cleaned + hoisted loadHistory + singleton client)
- src/lib/demo-targets.ts (removed github.com/vercel.com demo targets)
- src/lib/guardrails.ts (moved credentials/social from Starter → Professional)
- src/app/pricing/page.tsx (softened competitor pricing)
- src/app/settings/page.tsx (hoisted loadProfile + singleton client)
- src/app/dashboard/admin/page.tsx (hoisted checkAuthAndFetch + singleton client)
- src/lib/compliance-checker.ts, src/lib/email-security.ts (eslint --fix prefer-const)
- src/lib/auth-middleware.ts (SELF-HEALING profile guard)
- src/lib/supabase-browser.ts (NEW browser-only singleton)
- src/lib/auth.ts (singleton client)
- src/app/dashboard/page.tsx (singleton client)
- src/components/landing/Navbar.tsx (singleton client)
- src/components/auth/SignInModal.tsx (singleton client)
- src/components/AuthButton.tsx (singleton client)
- src/app/settings/page.tsx (singleton client)
- supabase/migrations/004_backfill_profiles.sql (NEW — backfills 6 orphan profiles)
- scripts/run-migration.mjs (NEW — working DB migration runner; run-sql.mjs TLS is broken)
- README.md, docs/orchestration/SESSION_STATE.md (docs sync)

## Last Known Compiler/Lint State
- `tsc --noEmit`: CLEAN (0 errors)
- `eslint .`: 0 errors, 40 pre-existing warnings (unused vars — debt, not from this session)
- `npm run build`: PASSES (13 API routes + 8 static pages)
- **LIVE E2E:** scan of tarisai.co.zw → 200 OK (risk 57, 5 findings). No GoTrueClient warnings on scan/home.
- **DB:** 8 auth users = 8 profiles, zero orphans. Trigger verified firing.

## Known Issues / Debt
1. **image-vision skill broken** — `describe-image.mjs` gets Gemini 403 (API disabled for project 558263624017). Visual checks fell back to DOM/computed-style assertions, which passed. Fix: enable Generative Language API or swap provider.
2. **40 lint warnings** — unused imports/vars across lib files. Pre-existing, cleanup backlog.
3. **`middleware.ts` deprecated** — Next 16 wants `proxy.ts` convention. Rename on next middleware touch.
4. **Free-tier quota mismatch** — commit history says "3 free scans/month beta" but guardrails.ts enforces `free: maxScansPerDay 10`. Decide intended quota before pricing launch.
5. **README still says** Next.js 14 / old tiers — fixed this session (see G6).

## Next Steps (for next agent)
1. Get Lesley's decision: commit the batch (9 files + how-it-works) as one PR, and update live Vercel deploy (sentari-seven.vercel.app — verify current production URL after repo rename)
2. Decide free-tier quota: "3 scans/month" vs current "10/day" enforcement
3. Pick post-beta pricing (TBA cards on pricing page) — or keep beta-unlocked until traction
4. MSSP pivot (T6 from Session 3) still open — needs per-client pricing decision
5. Payment integration (EcoCash/Stripe) still not built — no checkout flow
6. Fix image-vision skill (Gemini API key)