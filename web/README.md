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
  - **Removed / hidden from users:** Pool page, Contract page,
    Studio campaign dashboard, supply-bucket tables, cap progress
    in SOL. All of that now lives on a single "For builders &
    studios" page, reached only from a small footer link — not in
    the main nav, not on the home screen. It still shows the
    14 worked-example checks, penalty table, Gates 1–5, program
    id, authority address, Studio packages and the campaign
    dashboard.
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
  clock (+1h / +12h / +24h), claim with penalty / burn / escrow
  figures, referral calculator and ledger, Pirates crews and
  challenges (local points are **explicitly not tokens**), Studio
  packages (Free Pilot / Studio 750 USDC / Growth 2,000 USDC)
  with a campaign dashboard that keeps sessions, connected
  wallets, verified contributors and test SOL in separate
  evidence classes, a Contract page with 14 live worked-example
  checks, and an AI Guide that answers only from approved facts
  and says “unknown” for odds and prices.
- **Design (Kabu redesign, 2026-11-24):** reference is
  kabu.xyz — light, warm, playful storybook world. Warm cream /
  pale peach background, footer deeper tan-peach, text dark
  brown, accents peach-orange (main EXPLORE button), pastel
  pink, lilac-purple, sky blue, soft yellow, purple crystal for
  Shards. Chunky rounded all-caps headings, ~30px card corners,
  thick dark-brown outlines, pill buttons, floating translucent
  cream pill header (logo, tabs, Shards balance, pill Connect).
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
  plain words, from real simulated actions only:** daily Shards
  claim (10/day), a Shards Store / Arcade (fun items only —
  Shards are practice points, not money, not tokens; the Arcade
  is the first place that asks you to connect), Pins &amp;
  Badges for real achievements, XP / Ranks, and a Hall of
  Legends leaderboard (top 3 on capsule podium cards, SORT BY
  XP / Shards earned, "My Rank", footnote explaining the
  metric; crews are the seeded demo entries, your row is your
  real simulated play). Vaults keep the Dribbble table
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

Gates 1–3 are still open: `anchor test` has not run, there is no
funded devnet deployment signer, and no deposit-to-claim lifecycle
has been verified on-chain. The contract has no SOL withdrawal /
liquidity-migration instruction and no contribution-refund
instruction. Do not accept production funds. See `../README.md`.
