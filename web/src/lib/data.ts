// Seeded demo data. All of it is simulated devnet data, labelled as such in the UI.
// Nothing here is a real wallet, a real campaign, or real money.
export interface Capsule {
  id: string
  name: string
  tier: string
  emoji: string
  cost: string
  blurb: string
  status: 'CURRENT' | 'GATED'
}

export const CAPSULES: Capsule[] = [
  { id: 'free', name: 'Free Capsule', tier: 'Tier 1 — Airdrop preview', emoji: '🎁', cost: 'Free — no payment', blurb: 'A preview and learning tool. Opening it never moves money and never awards tokens by itself. Airdrop eligibility needs an approved Merkle list.', status: 'CURRENT' },
  { id: 'retail', name: 'Retail Capsule', tier: 'Tier 2 — up to 2 SOL total', emoji: '💎', cost: 'Up to 2 SOL per wallet', blurb: 'Retail tokens are fully claimable after finalisation + launch activation. A separate signed claim is still required.', status: 'CURRENT' },
  { id: 'whale', name: 'Whale Capsule', tier: 'Tier 3 — above 2 SOL total', emoji: '🐋', cost: 'Above 2 SOL per wallet', blurb: 'Tokens vest linearly over 72 hours. Early claims pay a penalty: 25% / 15% / 5% / 0%.', status: 'CURRENT' },
]

export interface Crew { id: string; name: string; members: number; points: number; challenge: string }
export const CREWS: Crew[] = [
  { id: 'trench', name: 'Trench Divers', members: 42, points: 1280, challenge: 'Complete 3 capsule previews and leave one piece of feedback' },
  { id: 'vault', name: 'Vault Keepers', members: 31, points: 940, challenge: 'Explain the 10 / 2 / 88 split to a new player, correctly' },
  { id: 'reef', name: 'Reef Riders', members: 27, points: 760, challenge: 'Find and report one confusing label in the app' },
]

export interface Campaign {
  id: string
  studio: string
  name: string
  pkg: string
  sessions: number
  wallets: number
  contributors: number
  testSol: number
  status: string
}
export const DEMO_CAMPAIGNS: Campaign[] = [
  { id: 'c1', studio: 'Reef Games', name: 'Tide Runner — tutorial test', pkg: 'Devnet Pilot', sessions: 128, wallets: 34, contributors: 6, testSol: 9.5, status: 'Completed — report issued' },
  { id: 'c2', studio: 'Pixel Harbour', name: 'Harbour Quest — onboarding', pkg: 'Devnet Pilot', sessions: 86, wallets: 21, contributors: 3, testSol: 4.2, status: 'Running (simulated)' },
]

export const PACKAGES = [
  { name: 'Devnet Pilot', price: 'Free', days: '7 days, first campaign only', features: ['Campaign link + Blink', 'Live session / player / verified-contributor numbers'], tag: 'CURRENT' as const },
  { name: 'Studio', price: '750 USDC', days: '14 days', features: ['Pilot + exportable report + hands-on setup', 'Custom quests / Pirates raid — GATED, only when the workflow is proven'], tag: 'GATED' as const },
  { name: 'Growth', price: '2,000 USDC', days: '30 days', features: ['Studio + weekly results call + priority placement', 'Fake-player screening review — GATED, manual review only, never an automated guarantee'], tag: 'GATED' as const },
]

/** AI Guide: answers only from approved facts. Unknown for odds, prices and anything not in the spec. */
export function guideAnswer(q: string): string {
  const s = q.toLowerCase()
  if (s.includes('2 sol') || s.includes('retail') || s.includes('whale'))
    return 'Exactly 2 SOL total per wallet is retail. 2.000000001 SOL is whale. Tier is cumulative — splitting payments does not preserve retail status. Retail claims in full after finalisation + launch; whale vests linearly over 72 hours.'
  if (s.includes('odd') || s.includes('win') || s.includes('chance') || s.includes('luck'))
    return 'Unknown — Nexus publishes no verified random reward odds. A capsule opening is a visual preview, not a prize, a payment, or a tradable reward.'
  if (s.includes('price') || s.includes('worth') || s.includes('value') || s.includes('market cap'))
    return 'Unknown — no token price is promised or forecast. The 65.12 USD/SOL figure in the original draft was a fixed illustrative baseline, not a live feed. Tokens may have no liquid market.'
  if (s.includes('referral') || s.includes('invite') || s.includes('10'))
    return 'Referrals pay 10% to the direct referrer and 2% to the upline, in the same transaction as the deposit, with 88% to the pool. Missing shares go to the pool. Ancestry is fixed at the first deposit; no self-referral and no cycles.'
  if (s.includes('vest') || s.includes('72') || s.includes('unlock'))
    return 'Whale and airdrop tokens vest linearly over 259,200 seconds (72 hours) from launch activation. A 1,000,000-token whale allocation vests 166,667 tokens at hour 12 and 500,000 at hour 36. Retail claims in full.'
  if (s.includes('penalt') || s.includes('burn'))
    return 'Whale early-claim penalty is 25% before 24h, 15% from 24h to before 48h, 5% from 48h to before 72h, and 0% after — on the newly claimed amount only. Of the penalty, 80% is burned with the SPL Token burn instruction and 20% goes to the marketing rewards escrow.'
  if (s.includes('claim'))
    return 'Claims need finalisation and launch activation, then a separate wallet-approved claim transaction. Claimable = vested − already gross-claimed, never below zero. Retail and airdrop claims pay no penalty.'
  if (s.includes('airdrop') || s.includes('merkle'))
    return 'The airdrop is 100,000,000 tokens for wallets on an approved Merkle list only. A proof shows list membership, not that the list was fair. No approved list exists yet, so no airdrop claim is available.'
  if (s.includes('devnet') || s.includes('real money') || s.includes('mainnet'))
    return 'Nexus is devnet-only. Devnet uses free test SOL with no cash value. Paid checkout, production reward custody and a mainnet launch are not active. Gates 1–3 are still open.'
  if (s.includes('refund'))
    return 'Studio hosting fees: full refund before the campaign starts, 50% within the first 3 days, none after day 3 unless Nexus fails to deliver. Unused reward budgets are always returned. This policy does not refund protocol contributions — the contract has no contribution-refund instruction.'
  if (s.includes('deposit') || s.includes('contribut') || s.includes('sol'))
    return 'A deposit is a wallet-approved devnet SOL contribution, capped at 15,000 SOL in total for the sale. Allocation = your gross contribution ÷ total gross contributions × 400,000,000 tokens, fixed at sale close.'
  return 'Unknown — I can only answer from the approved Nexus facts: tiers, the 10 / 2 / 88 referral split, vesting and penalties, allocation, devnet status, packages and refunds. Try asking about one of those.'
}
