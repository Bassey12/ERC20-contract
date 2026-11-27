# Nexus — Web App (simulated devnet)

**Founder & CEO:** Abasiofon Joseph Bassey
**Status: DEVNET ONLY — simulated prototype. No real wallet, no real SOL, no backend, no deployed program, no mainnet.**

This is the standalone, runnable web source for Nexus — the Solana
devnet-first capsule / token launch and studio campaign platform.
It is a Vite + React + TypeScript single-page app. All state is local
and simulated: deposits, vesting, claims, referrals, Pirates points
and campaign numbers are demo data, clearly labelled in the UI.

Source of truth: **Nexus v2.0**
(`../your_files/nexus-v2-perfected/nexus-v2-perfected.pdf` in the
parent workspace; the contract README is `../README.md`).

## Run it

```bash
cd web
npm install
npm run dev      # local dev server, hot reload
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
```

Requires Node 18+ and npm. No environment variables, no secrets,
no keys — never paste a private key anywhere in this project.

## Figma design build (2026-11-27, file "Untitled")

The full Figma design is coded in `src/App.tsx` (pages) and
`src/lib/dialogs.ts` (all 67 dialog states, one reusable template).
Design system: warm cream `#FFF3E4`, dark brown `#38271F`, tan 1px
inside stroke `#DEC9B4`, radius 24px, Grandstander ExtraBold
headings (Google Fonts), plain sans body. Shared header on every
page (NEXUS wordmark, "THE PLAYGROUND ON SOLANA", Connect wallet,
DEVNET badge, Play / For studios / How it works switch) plus the
transparency banner. Player pill nav (Capsules, Vault, Earn,
Pirates, Rankings, Activity) and Studio pill nav (Campaigns, Share,
Launch controls, Business).

- **51 pages**, all reachable: the 40 Figma pages (Prototype
  scenarios index + Journey directory (8 journeys) + AI guide,
  terms & privacy, business model, campaign management/report,
  recovery, safety & support, how it works, public campaign,
  campaign editor/dashboard, studio sign-in, business, launch
  controls, campaigns, refund center, campaign completed/cancelled/
  live, crew standings, activity with evidence, referral account,
  connected vault, crew progress, transaction detail, claim review,
  airdrop eligibility, capsule opening, wallet connection, capsule
  review, capsule guide, share, activity, rankings, pirates, earn,
  vault, capsules) **plus 11 v2.0 pages** in `src/lib/v2.ts`:
  Network & mainnet readiness, Token economics, Referrals &
  money flows, Evidence classes, Wallet safety, FAQ, Business
  Model Canvas, The five scholarly models, Pricing & unit
  economics, Operations, Gates/risk/checklists.
- **67 dialog states** in one template (eyebrow "EXAMPLE STATE ·
  NOT LIVE", tinted details table, guidance, working buttons).
- **Canonical tiers** (tablet design + v2.0 maths — the desktop
  ORIGIN/PULSE/APEX pricing was NOT coded): Airdrop free preview ·
  Retail ≤2 SOL fully claimable · Whale >2 SOL, 72h release,
  25/15/5/0% penalty, 80% burned / 20% rewards pot.
- **Original art only**: vertical capsule with lid + star (NOT a
  sphere with a band — the Figma orbs read as near-copies of a
  Poké Ball) and an original floating-city-at-sunset hero, CSS/SVG,
  no external images, no photos of people. One "Link copied" toast
  only. One responsive codebase, not three breakpoint copies.

## v2.0 completeness (2026-11-27)

Everything stated in the v2.0 document is now in the app, in the
Figma design system (`src/lib/v2.ts` + the 11 new pages above):

- **Mainnet-ready, NOT mainnet-live:** target Solana mainnet-beta,
  current devnet, Gates 1–5 with pass/kill criteria (p. 17), each
  honestly marked. Gate 1 is in progress (anchor test running,
  Phase 1 on-chain tests, separate run); Gates 2–5 not passed.
  "READ THIS FIRST — DEVNET ONLY" is stated on the readiness page.
  Deposits/claims stay GATED (simulated, test SOL only).
- **Token:** 400M presale / 100M airdrop (Merkle only, 72h vest,
  no penalty) / 500M RECOMMENDED 150/100/100/100/50 — labelled NOT
  approved, must be approved and locked before launch or the launch
  does not proceed. 1B is a mint cap; mint + freeze authority
  revoked at initialisation. Retail = fully claimable (not
  tradable, no listing promised). 65.12 USD/SOL is a fixed
  illustrative baseline, not a live price.
- **Vesting worked examples, corrected:** 7,200 tokens → 1,200 /
  2,400 / 4,800 / 7,200 at 12/24/48/72h; 1,000,000-token whale at
  12h claims 166,667 gross, penalty 41,667 (33,334 burned, 8,333
  escrow), net 125,000. Claimable = vested − already gross-claimed,
  never below zero. Network clock governs; the Vault slider is a
  calculator, not a time machine.
- **Referrals & money flows:** 10/2/88 table (10 SOL → 1.00/0.20/
  8.80; 1 SOL no referrers → pool 1.00), ancestry rules, and three
  SEPARATE flows (A. protocol SOL — not revenue; B. campaign USDC
  fees — revenue when earned; C. sponsored rewards — separate
  obligation, pay approved rewards or return unused).
- **Canvas (9 blocks) + five scholarly models** (Canvas,
  Lean Startup, Two-Sided Platforms, Porter + Blue Ocean with
  ERRC, JTBD + Traction + Flywheel), each with decision rule and
  metric.
- **Pricing & unit economics:** Free Pilot 7 days, Studio 750
  USDC 14 days, Growth 2,000 USDC 30 days, each feature tagged
  CURRENT / GATED / RECOMMENDED. Refund policy + the pre-payment
  blockers shown as NOT YET DEFINED (start timestamp + timezone,
  day-3 cutoff, refund processing time, fee/tax treatment).
  Studio 750 − 150 = 600, 80% margin; Growth variable 500 is a
  v2.0 planning assumption, labelled so; break-even 5 campaigns
  (6 with 100 USDC CAC). Scenarios table, illustrative only.
- **Evidence classes, wallet safety (5 checks), Pirates
  guardrails, AI guide bounds** (incl. the two v2.0 test
  questions), **operations** (delivery checklists, team — only
  confirmed role Abasiofon Joseph Bassey, Founder & CEO —
  separation of duties, rhythms, Bullseye table, first cohort 5
  studios, validation gates 3 of 5 / 2 repeat), **gates &
  checklists** (risk register incl. the no-withdrawal warning,
  technical + commercial checklists, SOPs), and the **FAQ** with
  the honest answers.
- **Removed:** the Kabu Shards economy (daily Shards claim,
  Shards Store, Shards balances/sorting) — v2.0 p. 16: local
  points are not tokens. Pins & badges and crew points remain as
  device-local game marks only, with the "not tokens" rule stated.
  There was no 10-minute demo vault clock in this web source
  (the vault uses the real 72h rule).

## What is inside

- **Beginner-first redesign (2026-11-24): 4 bottom tabs only,
  mobile-first — Play, Vaults, Invite, Help.** Plain language
  throughout the main UI. Browse and preview capsules *before* any
  wallet connection; the wallet is only asked for when joining,
  behind a plain-language explainer and a 1-tap demo wallet.
  One idea per screen.
  - **Play:** "Open a capsule, join the launch" — 3 big capsule
    cards with colourful artwork, Free first ("Try it free, no
    wallet needed"), spring flip-to-open, confetti on the first
    free open; join with amount presets and a split preview shown
    before committing; Pirates crews inside Play, labelled "Game
    points — not money, not tokens".
  - **Vaults (was Rewards):** the Dribbble vault table — each
    join becomes a vault row (# | Vault artwork | Vault ID, e.g.
    NEX-83762 | Unlocked % with a green–yellow–red gradient bar |
    You put in | Your share | Manage / Take now pill buttons),
    "Showing 1–5 of N" + "Load more". Manage opens a two-column
    modal: artwork + "Smart Vault" on the left, a plain breakdown
    on the right (you put in X, your share is Y, ready now Z,
    early cost W, total after 3 days). Take now goes to a
    confirm screen with a solid teal "Sign and Confirm" button,
    then a concrete success state with a next step.
  - **Invite (was Earn):** "Invite a friend — you both get a
    share", one copy-link button, calculator ("If your friend
    joins with 1, you get 0.10") — no percentages as the headline.
  - **Help (was AI Guide):** plain questions, answers only from
    approved facts, "I don't know" for odds/prices.
  - **Removed / hidden from users:** the Contract page
    (program id, authority, Gates 1–5, the 14 checks) lives only
    on a single "For builders & studios" page, reached from a
    small footer link and the Studio HQ map pin — not in the main
    nav, not on the home screen.
  - **Full feature set (2026-11-25) — every v2.0 feature is
    reachable from the Vaults tab or the map, not hidden:**
    capsules (Free preview-only, Small ≤2, Big >2); presale join
    with split shown before committing and the 15,000 SOL cap
    enforced; Close the sale then Start the launch as two
    separate steps; per-vault rows with Manage modal and Take-now
    confirm screen showing gross / net / burned / escrow, then a
    success state; **Airdrop** — check a name/wallet against the
    list, which honestly says "No approved list yet, so nobody
    can claim free tokens yet", plus a labelled demo entry
    (Ada Demo / DEMOADA, 1,000 demo tokens) whose claim runs the
    same 72h vesting + penalty maths; **Pool dashboard** —
    supply buckets, cap progress, burned and rewards-pot totals
    from real simulated claims; **Studio** — packages, create-a-
    campaign form, dashboard keeping sessions / wallets /
    verified contributors separate, refund policy shown. The
    map has 8 pins (Capsule Pier, Vault Museum, Invite Arcade,
    Rewards Lookout, Studio HQ, Help Centre, Airdrop Grove,
    Pool Pond).
  - **In-app footer:** Home / How it works / FAQ / For builders
    &amp; studios, adapted from the shot's footer.
- **Exact v2.0 maths** (`src/lib/math.ts`, a TypeScript mirror of
  `contracts/crates/nexus-math`): 1B supply (400M presale, 100M
  airdrop, remaining 500M **RECOMMENDED** split 150M liquidity /
  100M ecosystem / 100M team / 100M treasury / 50M marketing —
  flagged unapproved), referral split 10% / 2% / 88% (missing
  shares to the vault), cumulative tier exactly 2 SOL = retail,
  15,000 SOL hard cap, allocation = gross/total × 400,000,000,
  72h / 259,200s linear vesting, whale penalty 25% / 15% / 5% / 0%
  on newly claimed only, 80% burned / 20% rewards escrow.
- **Corrected v1 error, pinned by a check:** a 1,000,000-token
  whale allocation vests **166,667 at hour 12, not 500,000**
  (500,000 is hour 36).
- **Simulation controls:** connect a simulated wallet, deposit
  with a split preview, finalise, launch, advance the vesting
  clock (slider, +12h, jump to 3 days), claim with penalty /
  burn / escrow figures, referral calculator and ledger, Pirates
  crews and challenges (local points are **explicitly not
  tokens**), Studio packages (Free Pilot / Studio 750 USDC /
  Growth 2,000 USDC) with a campaign dashboard that keeps
  sessions, connected wallets, verified contributors and test SOL
  in separate evidence classes, a Contract page with 14 live
  worked-example checks, and an AI Guide that answers only from
  approved facts and says “unknown” for odds and prices.
  Deliberately absent, as in v2.0: no SOL withdrawal, no
  contribution refunds, no real money, no mainnet, no price —
  the UI says "not in this design" where those are asked about.
- **Design (Kabu redesign, 2026-11-24):** reference is
  kabu.xyz — light, warm, playful storybook world. Warm cream /
  pale peach background, footer deeper tan-peach, text dark
  brown, accents peach-orange (main EXPLORE button), pastel
  pink, lilac-purple, sky blue, soft yellow, purple crystal
  accents. Chunky rounded all-caps headings, ~30px card corners,
  thick dark-brown outlines, pill buttons, floating translucent
  cream pill header (logo, tabs, pill Connect).
  **Nexus Bay:** a full-bleed illustrated sunset scene
  (CSS/SVG only, no external images) with a bottom-centre cream
  pill "Welcome to Nexus Bay" + peach-orange EXPLORE button,
  opening a pannable illustrated map with clickable cream pins
  (Capsule Pier, Vault Museum, Invite Arcade, Rewards Lookout,
  Studio HQ, Help Centre) — a pin slides in a side panel with a
  description and STEP INSIDE. **Capsule friends:** three
  Nexus-original characters (Pip the Cub, Lumi the Firefly,
  Wally the Whale) in a Museum-style carousel with Previous /
  Next arrows and a badge on a cream card. **Progression, in
  plain words, from real simulated actions only:** device-local
  crew points and Pins &amp; Badges for real achievements, XP /
  Ranks, and a Hall of
  Legends leaderboard (top 3 on capsule podium cards, "My Rank",
  footnote explaining the metric; crews are the seeded demo
  entries, your row is your real simulated play). Vaults keep
  the Dribbble table
  (# | Vault artwork | Vault ID | Unlocked % with a
  green–yellow–red gradient bar | You put in | Your share |
  Manage / Take now), the two-column vault modal and the
  "Sign and Confirm" flow, restyled warm. 4 bottom tabs on
  mobile: Play, Vaults, Invite, Help.
  Deliberately NOT copied from Kabu: no Kabu characters,
  names, or artwork; no slow loading splash (Nexus loads
  fast); no sign-in wall on arrival — everything is free to
  browse, the gate appears only at the point of value
  (the Arcade). Earlier references (Coinbase / Revolut /
  Robinhood / Cash App / Mercury / ChangeNOW; Polygon
  onboarding 2026 — ~70% abandon at the wallet step, so the
  wallet is removed from entry) still shape the
  beginner-first flow: browse before connecting, plain words,
  one action per screen, instant feedback on every tap.
  All motion respects `prefers-reduced-motion`.

## Deploy to GitHub Pages

**GitHub target (confirmed 2026-11-20): `Bassey12/ERC20-contract`,
branch `main`, head `0845c868598f78d2fdc16342dd9e72f14a869cbf`.**
That repo currently contains only a `README.md` — pushing this
project there will replace that README and repurpose the repo
for Nexus. Expected Pages URL once deployed:
`https://bassey12.github.io/ERC20-contract/`

The repo root has `.github/workflows/deploy.yml`. On every push to
`main` it builds `web/` (`npm ci && npm run build`) and deploys
`web/dist` to GitHub Pages. `vite.config.ts` uses `base: './'` so
the site works under that repository path.

In the repository on GitHub: **Settings → Pages → Build and
deployment → Source: GitHub Actions**. The first successful workflow
run publishes the site; the workflow summary shows its URL.

## Still missing for a real launch

Gate 1 is in progress (`anchor test` running, Phase 1 on-chain
tests, separate run). Gates 2–5 are still open: there is no funded
devnet deployment signer, and no deposit-to-claim lifecycle has
been verified on-chain. The contract has no SOL withdrawal /
liquidity-migration instruction and no contribution-refund
instruction. Do not accept production funds. See `../README.md`.
