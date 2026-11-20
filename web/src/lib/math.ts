// Nexus maths — a TypeScript mirror of contracts/crates/nexus-math.
// All money uses integer lamports (1 SOL = 1_000_000_000) and tokens use
// integer base units (1 NEXUS = 1_000_000, 6 decimals). No floats for money.
export const LAMPORTS_PER_SOL = 1_000_000_000
export const BASE_UNITS_PER_TOKEN = 1_000_000
export const TOTAL_SUPPLY = 1_000_000_000
export const PRESALE_TOKENS = 400_000_000
export const AIRDROP_TOKENS = 100_000_000
export const HARD_CAP_SOL = 15_000
export const HARD_CAP_LAMPORTS = HARD_CAP_SOL * LAMPORTS_PER_SOL
export const VESTING_SECONDS = 259_200 // 72h
export const RETAIL_MAX_LAMPORTS = 2 * LAMPORTS_PER_SOL

export const isRetail = (cumulativeLamports: number) => cumulativeLamports <= RETAIL_MAX_LAMPORTS

/** 10% direct / 2% upline / remainder to vault. Missing shares + remainder go to vault. */
export function referralSplit(amountLamports: number, hasDirect: boolean, hasUpline: boolean) {
  const direct = hasDirect ? Math.floor((amountLamports * 10) / 100) : 0
  const upline = hasUpline ? Math.floor((amountLamports * 2) / 100) : 0
  const vault = amountLamports - direct - upline
  return { direct, upline, vault }
}

export function allocationFor(grossLamports: number, totalGrossLamports: number): number {
  if (totalGrossLamports <= 0 || grossLamports <= 0) return 0
  // gross/total * 400,000,000 tokens, in base units, EXACT integer arithmetic.
  // Plain JS floats lose precision here (gross * 400M * 1e6 exceeds 2^53),
  // so use BigInt exactly as the Rust contract uses u64 checked arithmetic.
  return Number(
    (BigInt(grossLamports) * BigInt(PRESALE_TOKENS) * BigInt(BASE_UNITS_PER_TOKEN)) /
      BigInt(totalGrossLamports),
  )
}

export function vestedAmount(allocationBaseUnits: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0
  if (elapsedSeconds >= VESTING_SECONDS) return allocationBaseUnits
  return Number(
    (BigInt(allocationBaseUnits) * BigInt(elapsedSeconds)) / BigInt(VESTING_SECONDS),
  )
}

export function penaltyRatePercent(elapsedSeconds: number): number {
  if (elapsedSeconds < 24 * 3600) return 25
  if (elapsedSeconds < 48 * 3600) return 15
  if (elapsedSeconds < 72 * 3600) return 5
  return 0
}

/** Penalty on the newly claimed gross amount only. 80% burned, 20% to rewards escrow. */
export function penaltySplit(grossClaimBaseUnits: number, elapsedSeconds: number) {
  const rate = penaltyRatePercent(elapsedSeconds)
  // BigInt again: gross claims can be up to 4e14 base units.
  const penalty = Number((BigInt(grossClaimBaseUnits) * BigInt(rate)) / 100n)
  const burned = Number((BigInt(penalty) * 80n) / 100n)
  const escrow = penalty - burned
  return { rate, penalty, burned, escrow, net: grossClaimBaseUnits - penalty }
}

export const claimableNow = (vested: number, alreadyGrossClaimed: number) =>
  Math.max(0, vested - alreadyGrossClaimed)

export const sol = (lamports: number) => lamports / LAMPORTS_PER_SOL
export const tokens = (baseUnits: number) => baseUnits / BASE_UNITS_PER_TOKEN
export const fmtSol = (lamports: number) =>
  sol(lamports).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
export const fmtTokens = (baseUnits: number) =>
  tokens(baseUnits).toLocaleString('en-US', { maximumFractionDigits: 2 })

export interface WorkedCheck {
  id: string
  label: string
  expected: string
  actual: string
  pass: boolean
}

/** The 14 worked-example checks shown on the Contract page. Computed live, never hard-coded pass. */
export function workedChecks(): WorkedCheck[] {
  const checks: WorkedCheck[] = []
  const push = (id: string, label: string, expected: string, actual: string) =>
    checks.push({ id, label, expected, actual, pass: expected === actual })

  const s10 = referralSplit(10 * LAMPORTS_PER_SOL, true, true)
  push('1', '10 SOL split — direct 10%', '1.00 SOL', `${fmtSol(s10.direct)} SOL`)
  push('2', '10 SOL split — upline 2%', '0.20 SOL', `${fmtSol(s10.upline)} SOL`)
  push('3', '10 SOL split — vault 88%', '8.80 SOL', `${fmtSol(s10.vault)} SOL`)
  const s1 = referralSplit(1 * LAMPORTS_PER_SOL, false, false)
  push('4', '1 SOL, no referrers — pool receives', '1.00 SOL', `${fmtSol(s1.vault)} SOL`)
  const sAwk = referralSplit(1_000_000_001, true, true) // awkward amount: split must conserve
  push(
    '5',
    'Split conservation (1,000,000,001 lamports)',
    '1,000,000,001',
    (sAwk.direct + sAwk.upline + sAwk.vault).toLocaleString('en-US'),
  )
  push(
    '6',
    'Allocation: 1 SOL of 100 SOL total',
    '4,000,000',
    `${fmtTokens(allocationFor(LAMPORTS_PER_SOL, 100 * LAMPORTS_PER_SOL))}`,
  )
  push(
    '7',
    'Allocation: 1 SOL of 200 SOL total',
    '2,000,000',
    `${fmtTokens(allocationFor(LAMPORTS_PER_SOL, 200 * LAMPORTS_PER_SOL))}`,
  )
  push('8', 'Tier boundary: exactly 2 SOL is retail', 'retail', isRetail(2 * LAMPORTS_PER_SOL) ? 'retail' : 'whale')
  push('9', 'Tier boundary: 2.000000001 SOL is whale', 'whale', isRetail(2_000_000_001) ? 'retail' : 'whale')
  const alloc72 = 7200 * BASE_UNITS_PER_TOKEN
  push('10', 'Vesting: 7,200 tokens at 12h', '1,200', `${fmtTokens(vestedAmount(alloc72, 12 * 3600))}`)
  // CORRECTED v1 error: 1,000,000 tokens vest 166,667 at 12h, NOT 500,000 (500,000 is 36h).
  const alloc1m = 1_000_000 * BASE_UNITS_PER_TOKEN
  push('11', 'Corrected C.6: 1,000,000 tokens at 12h', '166,666.67', fmtTokens(vestedAmount(alloc1m, 12 * 3600)))
  push('12', 'Corrected C.6: 1,000,000 tokens at 36h', '500,000', `${fmtTokens(vestedAmount(alloc1m, 36 * 3600))}`)
  const p = penaltySplit(1000 * BASE_UNITS_PER_TOKEN, 12 * 3600)
  push(
    '13',
    'Penalty: 1,000 tokens at 12h — net / burned / escrow',
    '750 / 200 / 50',
    `${tokens(p.net)} / ${tokens(p.burned)} / ${tokens(p.escrow)}`,
  )
  push('14', 'Penalty rate at exactly 24h', '15%', `${penaltyRatePercent(24 * 3600)}%`)
  return checks
}
