# Nexus — Solana Anchor Smart Contract

**Founder & CEO:** Abasiofon Joseph Bassey
**Status: DEVNET ONLY — NOT mainnet-ready, NOT audited, NOT deployed.**

This repository now contains **both halves of the full Nexus build**
(option 4: web app + contract, from scratch):

- **`web/` — the web app.** Standalone, runnable Vite + React +
  TypeScript source (no backend, no real wallet, no real SOL —
  simulated devnet only). See `web/README.md`: `npm install`,
  `npm run dev`, `npm run build`. It has all 8 sections (Pool,
  Capsules, Vault, Earn, Pirates, Studio, Contract, AI Guide),
  the six-step system map, and the exact v2.0 maths.
- **`contracts/` — the Anchor program and its tests** (below).
- **`.github/workflows/deploy.yml`** — deploys `web/` to GitHub
  Pages on every push to `main` (Settings → Pages → Source:
  GitHub Actions). `vite.config.ts` uses `base: './'` so the site
  works under the repo path.
  > **Note (2026-11-20):** this workflow file is in the local
  > source at `.github/workflows/deploy.yml`, but GitHub's API
  > blocked pushing it from Muse (403, App lacks Actions /
  > workflow permission). Add it manually in the GitHub web UI
  > at `.github/workflows/deploy.yml`, or grant the App Actions
  > access, then the first workflow run will publish the site.
- **GitHub target (confirmed 2026-11-20): `Bassey12/ERC20-contract`,
  branch `main`, head `0845c868598f78d2fdc16342dd9e72f14a869cbf`.**
  That repo currently contains only a `README.md`; pushing this
  project there replaces that README and repurposes the repo for
  Nexus. Expected Pages URL: `https://bassey12.github.io/ERC20-contract/`

Source of truth for every rule here: **Nexus v2.0**
(`workspace/your_files/nexus-v2-perfected/nexus-v2-perfected.pdf`), pp. 7–9.
The original 53-page draft is at
`workspace/user/files/Nexus___Documentation__Structure___Business_Model_0_8k77.pdf`.

> **No private key is used, requested, or stored anywhere in this codebase.**
> The production authority is a public address only:
> `BHxkjg3MvcWitw6i2MQDNrCWmC6vqB5U98C3JUk8LmTB`
> It is not proof of ownership, deployment, or audit. Verify control and
> network before any use. Never paste a private key into chat, a doc, or
> an application form.

---

## What the program does

| Instruction | What it does |
|---|---|
| `initialize` | Creates the Pool. Checks the mint is 6 decimals, exactly 1,000,000,000 tokens, mint + freeze authority revoked, and the token escrow holds ≥ 500,000,000 tokens (400M presale + 100M airdrop). |
| `deposit` | Accepts SOL. Splits **10% direct referrer / 2% upline / 88% vault**; missing shares and integer rounding remainder go to the vault. Enforces the **15,000 SOL hard cap**, binds referral ancestry on first deposit, rejects self-referral and cycles. |
| `finalize` | Authority only. Closes the sale and freezes `total_gross`, which fixes every allocation: `gross / total × 400,000,000`. |
| `activate_launch` | Authority only, once. Starts the 72-hour (259,200 s) vesting clock. |
| `claim_presale` | Retail (cumulative ≤ 2 SOL): claim in full. Whale (> 2 SOL): linear vesting, early-claim penalty **25% < 24h, 15% 24–48h, 5% 48–72h, 0% after**, on the newly claimed amount only. **80% of the penalty is burned** with the real SPL burn instruction; **20% goes to the marketing rewards escrow**. |
| `register_airdrop` | Registers a Merkle-proven allocation (100M inventory). Replay-protected — one registration per wallet. |
| `claim_airdrop` | Linear 72h vesting, **no penalty**. Registration does not restart the clock. |

**Deliberately absent — do not invent:** there is **no SOL withdrawal
instruction and no liquidity-migration instruction** in this phase, and
**no contribution-refund instruction**. The protocol SOL vault therefore
has no escape path yet. Never accept production funds expecting one.
Adding one is a design + review decision (Gates 2/5), not a quick patch.
The campaign refund policy in v2.0 covers hosting fees only.

**Corrected v1 error, pinned by tests:** for a 1,000,000-token whale
allocation, **166,667 tokens vest at hour 12, NOT 500,000**
(500,000 is hour 36). Exact integer value: 166,666,666,666 base units.

**Token supply:** 1,000,000,000 cap, 6 decimals. 400M presale + 100M
airdrop in escrow. The remaining 500M use the v2.0 **RECOMMENDED**
split — 150M liquidity / 100M ecosystem / 100M team / 100M treasury /
50M marketing — which is **not founder-approved** and requires approval
plus a locking/vesting mechanism that does not yet exist before launch.

**Program id is a placeholder:** `3py1rKZt6n5CicNQELDRFWrAZx9zBXurX6wYAZxG2B8i`
(deterministic, decodes to 32 bytes). Replace it with the real id from
`anchor keys list` after the first local build. Never present it as a
deployed program.

---

## Layout

```
workspace/nexus/
├── README.md                  # this file
└── contracts/
    ├── Anchor.toml             # cluster = devnet; placeholder program id
    ├── Cargo.toml              # workspace: nexus + nexus-math
    ├── Cargo.lock
    ├── package.json / tsconfig.json
    ├── programs/nexus/
    │   ├── Cargo.toml          # anchor-lang 0.31.1 (+ init-if-needed), anchor-spl
    │   └── src/
    │       ├── lib.rs          # all instructions + account contexts
    │       ├── state.rs        # Pool / Position / AirdropAccount
    │       ├── errors.rs       # NexusError
    │       └── merkle.rs       # leaf = SHA256("NEXUS-AIRDROP-V1" || pool || wallet || allocation_le)
    ├── crates/nexus-math/
    │   └── src/lib.rs          # pure maths, no Solana deps (see below)
    ├── tests/
    │   ├── nexus.ts            # Anchor on-chain test suite (needs validator)
    │   └── test_math.py        # independent Python mirror of the maths
    └── scripts/
        └── generate_merkle.js  # airdrop Merkle root + proofs (no npm deps)
```

All money/token maths lives in `crates/nexus-math` as pure functions
(referral split, proportional allocation, linear vesting, penalty rate
and split, tier test, claimable). The Anchor program calls exactly those
functions — there is no second, divergent copy of the arithmetic.

---

## What actually ran in this VM — honest test report

The build VM had **no Anchor CLI, no Solana CLI, and no Rust** at the
start. Rust 1.100 was installed via rustup during this build (that is
the only toolchain change made). Anchor/Solana CLIs were **not**
installed — installing the full Solana BPF toolchain was out of scope
for this step and is not needed to verify the maths.

| Test | Command | Real result |
|---|---|---|
| Rust maths unit tests (14) | `cargo test -p nexus-math` | **14 passed, 0 failed.** Includes the corrected C.6 case, 10 SOL split, 1 SOL / 100 SOL → 4,000,000 tokens, 7,200-token vesting, 1,000-token penalty, tier boundary, penalty boundaries, supply sum. |
| Python mirror tests (10) | `python3 -m unittest discover -s tests -p 'test_math.py'` | **10 passed, 0 failed.** Same cases, implemented independently. |
| Anchor program type-check | `cargo check -p nexus` (anchor-lang 0.31.3) | **Passes** (only warnings: Anchor-macro `cfg` warnings + one deprecated-`realloc` warning from Anchor itself). This check caught and fixed 4 real bugs during the build: a 33-byte placeholder program id, a missing `init-if-needed` feature, a wrong `solana_program` import path, and a `contributor`/`wallet` mix-up in `ClaimAirdrop`. |
| Merkle generator | `node scripts/generate_merkle.js` + independent Python verification | **Passes.** 2-entry fixture: root `d4961347…`, both proofs verified independently in Python. (A base58 edge-case bug for all-`1` addresses was found and fixed during this run.) |
| Anchor on-chain tests (`tests/nexus.ts`) | `anchor test` | **NOT RUN — no Anchor CLI / local validator in this VM.** Do not claim otherwise. |
| BPF build (`anchor build`) | — | **NOT RUN — no Solana toolchain in this VM.** `cargo check` is a host type-check only, not a BPF build. |

Two test assertions written by the builder were themselves wrong and
were fixed during the run (a base-unit conversion in the Rust C.6 test,
and the Merkle base58 decoder above). The program maths was not
changed to fit a test — the tests were corrected to the v2.0 spec.

---

## How to build / test (on a machine with the toolchains)

```bash
cd workspace/nexus/contracts

# 1. Fast maths only — no Solana needed:
cargo test -p nexus-math
python3 -m unittest discover -s tests -p 'test_math.py' -v

# 2. Type-check the Anchor program (needs internet for crates.io):
cargo check -p nexus

# 3. Full on-chain suite — needs Anchor CLI + Solana CLI + local validator:
anchor test
#    (builds the BPF program, runs tests/nexus.ts against a local
#     validator: referral split, cap, tier boundary, finalize,
#     vesting/penalty, Merkle replay protection, corrected C.6 case)

# 4. Airdrop list (after the approval process in v2.0, p. 9):
NEXUS_POOL=<Pool PDA> node scripts/generate_merkle.js allocations.json out.json
```

### Deployment runbook (Gates 1–3) — do not skip steps

1. **Gate 1 — reviewed source & tests:** `anchor test` green, including
   adversarial cases (referral conservation, repeated claims, account
   substitution, cap, Merkle replay, arithmetic boundaries). Get an
   independent review. Fix the program id (`anchor keys list`).
2. **Gate 2 — devnet configuration:** approved + funded deployment
   signer (key never in chat/docs/forms). Deploy the reviewed program.
   Create the 6-decimal mint, mint exactly 1B, **revoke mint + freeze
   authority**. Approve the Merkle root, initialise + fund the escrow
   (≥ 500M tokens). Account for the other 500M per the approved split.
3. **Gate 3 — complete execution:** verify program id, pool ownership,
   authority, mint and inventory; then run deposit → finalise → launch
   → retail claim, whale claim, airdrop register/claim, repeated-claim
   check end-to-end on devnet, comparing balances, claimed state and
   actual mint-supply reduction on burns.
4. **Gate 4 — public pilots:** 5 unpaid devnet studio pilots.
5. **Gate 5 — commercial readiness:** scopes, reward custody, treasury
   controls (multisig recommended), legal review, service capacity.
   **Mainnet needs its own explicit approval + independent security
   review. No timeline overrides a gate.**

---

## Still blocked / not done

- [ ] `anchor test` on-chain suite — not run (no Anchor/Solana CLI here).
- [ ] `anchor build` (BPF) — not run (no Solana toolchain here).
- [ ] Real program id + devnet deployment — not done, needs an approved
      funded deployment signer (founder decision).
- [ ] Approved Merkle airdrop list — does not exist yet.
- [ ] Independent security review and legal review — not done.
- [ ] SOL withdrawal / liquidity-migration design — deliberately absent;
      must be designed and reviewed before any mainnet decision.
- [ ] Recommended 500M-token allocation — not approved, no locking/
      vesting mechanism exists for it yet.
- [ ] The TS test file contains two cases that are intentionally
      documented as fixtures/runbook steps rather than self-contained
      assertions (the 100 SOL allocation fixture and the clock-warp
      whale-claim case) — see the comments in `tests/nexus.ts`. They
      must be completed as part of Gate 3, not papered over.
