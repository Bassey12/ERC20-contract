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

## What is inside

- **Beginner-first redesign (2026-11-24): 4 bottom tabs only,
  mobile-first — Play, Rewards, Invite, Help.** Plain language
  throughout the main UI (no vesting / escrow / Merkle / PDA /
  Anchor / SPL words). Browse and preview capsules *before* any
  wallet connection; the wallet is only asked for when joining,
  behind a plain-language explainer and a 1-tap demo wallet.
  One primary action per screen, big type, generous whitespace,
  one accent colour (teal).
  - **Play:** "Open a capsule, join the launch" — 3 big capsule
    cards, Free first ("Try it free, no wallet needed"), spring
    flip-to-open, confetti on the first free open; join with
    amount presets and a split preview shown before committing;
    Pirates crews inside Play, labelled "Game points — not money,
    not tokens".
  - **Rewards (was Vault):** "Your share", "When you can take
    it" as a Now / 1 day / 2 days / 3 days timeline, a slider in
    plain hours, early-take cost in plain words ("Take it early
    and you keep a little less — most of that little bit
    disappears forever").
  - **Invite (was Earn):** "Invite a friend — you both get a
    share", one copy-link button, calculator ("If your friend
    joins with 1, you get 0.10") — no percentages as the headline.
  - **Help (was AI Guide):** plain questions, answers only from
    approved facts, "I don't know" for odds/prices.
  - **Removed / hidden from users:** Pool page, Contract page,
    Studio campaign dashboard, supply-bucket tables, cap progress
    in SOL. All of that now lives on a single "For builders &
    studios" page, reached only from a small footer link — not in
    the main nav, not on the home screen. It still shows the
    14 worked-example checks, penalty table, Gates 1–5, program
    id, authority address, Studio packages and the campaign
    dashboard.
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
  clock (+1h / +12h / +24h), claim with penalty / burn / escrow
  figures, referral calculator and ledger, Pirates crews and
  challenges (local points are **explicitly not tokens**), Studio
  packages (Free Pilot / Studio 750 USDC / Growth 2,000 USDC)
  with a campaign dashboard that keeps sessions, connected
  wallets, verified contributors and test SOL in separate
  evidence classes, a Contract page with 14 live worked-example
  checks, and an AI Guide that answers only from approved facts
  and says “unknown” for odds and prices.
- **Design:** light, clean, banking-like (Coinbase / Revolut /
  Robinhood / Cash App / Mercury / ChangeNOW references; Polygon
  onboarding 2026 — ~70% abandon at the wallet step, so the
  wallet is removed from entry): white cards on a pale
  background, dark ink, one teal accent, big type, generous
  whitespace, fixed 4-tab bottom nav, spring card flips,
  staggered fade-ups, confetti on first free open, progress
  shimmer, button press states, instant feedback on every tap.
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

Gates 1–3 are still open: `anchor test` has not run, there is no
funded devnet deployment signer, and no deposit-to-claim lifecycle
has been verified on-chain. The contract has no SOL withdrawal /
liquidity-migration instruction and no contribution-refund
instruction. Do not accept production funds. See `../README.md`.
