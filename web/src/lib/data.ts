// Seeded demo data. All of it is simulated practice data, labelled as such in the UI.
// Nothing here is a real wallet, a real campaign, or real money.
// Plain language only in the main UI — technical terms live on the
// "For builders & studios" page, not here.
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
  { id: 'free', name: 'Free Capsule', tier: 'Free — try it first', emoji: '🎁', cost: 'Free — no wallet needed', blurb: 'A look inside, for learning. Opening it never moves money and never gives you tokens by itself.', status: 'CURRENT' },
  { id: 'retail', name: 'Small Capsule', tier: 'Small — up to 2 in total', emoji: '💎', cost: 'Up to 2 SOL per wallet', blurb: 'For a small join. Once the sale closes and the launch starts, your full share is ready to take.', status: 'CURRENT' },
  { id: 'whale', name: 'Big Capsule', tier: 'Big — more than 2 in total', emoji: '🐋', cost: 'Above 2 SOL per wallet', blurb: 'For a big join. Your share unlocks a little at a time over 3 days. Taking it early costs you a little.', status: 'CURRENT' },
]

export interface Crew { id: string; name: string; members: number; points: number; challenge: string }
export const CREWS: Crew[] = [
  { id: 'trench', name: 'Trench Divers', members: 42, points: 1280, challenge: 'Open 3 capsules and leave one piece of feedback' },
  { id: 'vault', name: 'Vault Keepers', members: 31, points: 940, challenge: 'Explain to a new player how the invite share works' },
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

/** Help guide: answers only from approved facts, in plain words.
 *  "I don't know" for odds, prices and anything not in the facts. */
export function guideAnswer(q: string): string {
  const s = q.toLowerCase()
  if (s.includes('2 sol') || s.includes('retail') || s.includes('whale') || s.includes('small') || s.includes('big'))
    return '2 in total is small. More than 2 in total is big. We count everything you put in together — splitting it into small payments does not keep you small. Small joins are ready in full once the launch starts. Big joins unlock a little at a time over 3 days.'
  if (s.includes('odd') || s.includes('win') || s.includes('chance') || s.includes('luck'))
    return "I don't know — Nexus does not publish any verified odds for winning. Opening a capsule is just a preview, not a prize, a payment, or something you can sell."
  if (s.includes('price') || s.includes('worth') || s.includes('value') || s.includes('market cap'))
    return "I don't know — no price is promised or forecast for these tokens. They may end up being worth nothing, or hard to sell."
  if (s.includes('referral') || s.includes('invite') || s.includes('friend') || s.includes('10'))
    return 'When a friend joins through your link, you get a share of what they put in, and the person who invited you gets a smaller share. The rest goes to the launch. It all happens in the same step as their join. There are only two levels — you, and the person who invited you.'
  if (s.includes('unlock') || s.includes('72') || s.includes('3 days') || s.includes('when can i') || s.includes('take'))
    return 'Big joins unlock a little at a time over 3 days from the moment the launch starts. After 1 day, about a third is ready. After 2 days, about two thirds. After 3 days, all of it. Small joins are ready in full when the launch starts. A 1,000,000-token big share has 166,667 ready after 12 hours, and 500,000 after 36 hours.'
  if (s.includes('early') || s.includes('penalt') || s.includes('cost') || s.includes('less'))
    return 'Taking a big share early costs you a little: 25% in the first day, 15% in the second day, 5% in the third day, and nothing after 3 days. The cost applies only to the amount you take at that moment. Most of that little bit disappears forever, and a small part goes to a pot for community rewards.'
  if (s.includes('claim') || s.includes('get my') || s.includes('my share'))
    return 'First the sale closes, then the launch starts. After that you can take what is ready, in a separate step. What you can take is what has unlocked so far, minus anything you have already taken. Small joins and free tokens never pay the early cost.'
  if (s.includes('airdrop') || s.includes('free token'))
    return 'Free tokens go only to people on an approved list. There is no approved list yet, so nobody can claim free tokens yet.'
  if (s.includes('devnet') || s.includes('real money') || s.includes('mainnet') || s.includes('practice'))
    return 'This is practice only. It runs on a test network with free practice coins that are worth nothing. No real money moves here, and the real launch has not happened.'
  if (s.includes('refund'))
    return 'For studios: a full refund before a campaign starts, half back within the first 3 days, and none after day 3 unless Nexus fails to deliver what it promised. Any reward money not used is always returned. This does not give back practice coins you put in — there is no way to get those back in the current design.'
  if (s.includes('deposit') || s.includes('contribut') || s.includes('join') || s.includes('sol') || s.includes('put in'))
    return 'Joining means putting in practice coins, with a limit of 15,000 in total for the whole sale. Your share is worked out at the end: what you put in, divided by what everyone put in, times 400,000,000 tokens.'
  return "I don't know — I can only answer from the approved Nexus facts: small and big joins, invites, when you can take your share, the early cost, practice money, and refunds. Try asking about one of those."
}
