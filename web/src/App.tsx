import { useMemo, useState } from 'react'
import {
  AIRDROP_TOKENS, HARD_CAP_SOL, LAMPORTS_PER_SOL, PRESALE_TOKENS, TOTAL_SUPPLY,
  allocationFor, claimableNow, fmtSol, fmtTokens,
  isRetail, penaltyRatePercent, penaltySplit, referralSplit,
  vestedAmount, workedChecks,
} from './lib/math'
import { BADGES, CAPSULES, CREWS, DEMO_AIRDROP, DEMO_CAMPAIGNS, PACKAGES, PLACES, guideAnswer } from './lib/data'
import { DIALOGS, DIALOG_BY_ID } from './lib/dialogs'
import { BULLSEYE, CANVAS, CANVAS_TEST, DELIVERY_CHECKLISTS, DEVNET_FIRST, EVIDENCE, FAQ, GATES, GUIDE_TESTS, MODELS, PIRATES_RULES, PRICING_ROWS, PREPAYMENT_BLOCKERS, RISK_REGISTER, SCENARIOS, SOPS, TEAM, TECH_CHECKLIST, COMM_CHECKLIST, TX_STATUSES, WALLET_SAFETY } from './lib/v2'
import type { DialogAction, DialogDef } from './lib/dialogs'
import type { Campaign, Crew, Place } from './lib/data'

// Nexus — Figma design build (2026-11-27, file "Untitled").
// Design system: warm cream #FFF3E4, dark brown #38271F, tan 1px
// inside stroke #DEC9B4, radius 24px, cards 24px padding / 20px gap,
// dialogs 640px / 32px padding / 28px gap. Grandstander ExtraBold
// headings, plain sans body. Shared header + transparency banner on
// every page. Simple main nav (Home · Join · Vault · Earn · Pirates
// · Help); all technical/business v2.0 pages live behind one
// "Learn more" hub (footer + Help), never in the main nav. Plain
// words on main screens — no PDA/Merkle/escrow/SPL/Anchor/vesting/
// mint unless the user taps "Learn more". Pirates has a Create a
// Crew section at the top (free, no wallet) + join by invite code.
// Canonical tiers (tablet design + v2.0 maths — NOT the desktop
// ORIGIN/PULSE/APEX pricing): Airdrop free preview · Retail ≤2 SOL
// fully claimable · Whale >2 SOL, 72h release, 25/15/5/0% penalty,
// 80% burned / 20% rewards pot. Allocation = gross/total × 400M,
// hard cap 15,000 SOL, referral 10/2/88. Maths in lib/math.ts
// unchanged. Original capsule art (vertical capsule + lid + star,
// NOT a sphere with a band) and original floating-city-at-sunset
// hero, CSS/SVG only, no photos, no external images. No real money,
// no mainnet, no SOL withdrawal, no price.

export type PageId =
  | 'home' | 'scenarios' | 'journeys' | 'ai-guide' | 'terms' | 'business-model'
  | 'campaign-management' | 'campaign-report' | 'recovery' | 'safety' | 'how-it-works'
  | 'public-campaign' | 'campaign-editor' | 'campaign-dashboard' | 'studio-signin'
  | 'business' | 'launch-controls' | 'campaigns' | 'refund-center' | 'campaign-completed'
  | 'campaign-cancelled' | 'campaign-live' | 'crew-standings' | 'activity-evidence'
  | 'referral-account' | 'connected-vault' | 'crew-progress' | 'transaction-detail'
  | 'claim-review' | 'airdrop-eligibility' | 'capsule-opening' | 'wallet'
  | 'capsule-review' | 'capsule-guide' | 'share' | 'activity' | 'rankings'
  | 'pirates' | 'earn' | 'vault' | 'capsules' | 'builders' | 'learn'
  | 'mainnet' | 'token' | 'flows' | 'canvas' | 'models' | 'pricing'
  | 'evidence' | 'wallet-safety' | 'operations' | 'gates' | 'faq'

export const PAGES: { id: PageId; title: string; group: string; blurb: string }[] = [
  { id: 'home', title: 'Home — The playground on Solana', group: 'Player', blurb: 'Welcome to the test world. Big curiosity. New possibilities.' },
  { id: 'capsules', title: 'Capsules', group: 'Player', blurb: 'Three ways in. Clear rules all the way.' },
  { id: 'capsule-guide', title: 'Capsule guide', group: 'Player', blurb: 'What a capsule is, what opening one does — and does not do.' },
  { id: 'capsule-review', title: 'Capsule review', group: 'Player', blurb: 'Review your capsule and your amount before you join.' },
  { id: 'capsule-opening', title: 'Capsule opening', group: 'Player', blurb: 'The visual opening. A preview only — it never moves SOL.' },
  { id: 'vault', title: 'Vault', group: 'Player', blurb: 'Your vaults, your share, and what is ready to take.' },
  { id: 'connected-vault', title: 'Connected Vault', group: 'Player', blurb: 'One vault, connected — its share, unlock and history.' },
  { id: 'claim-review', title: 'Claim review', group: 'Player', blurb: 'Check a claim before you confirm it.' },
  { id: 'airdrop-eligibility', title: 'Airdrop eligibility', group: 'Player', blurb: 'Check the list. There is no approved list yet.' },
  { id: 'earn', title: 'Earn', group: 'Player', blurb: 'Invite a friend. You both get a share.' },
  { id: 'referral-account', title: 'Referral account', group: 'Player', blurb: 'Your invite link, your history, your share.' },
  { id: 'share', title: 'Share', group: 'Player', blurb: 'Share your adventure — one link, copied once.' },
  { id: 'pirates', title: 'Pirates', group: 'Player', blurb: 'Crews, challenges and points. A game, not money.' },
  { id: 'crew-progress', title: 'Crew progress', group: 'Player', blurb: 'Your crew, your progress, your challenges.' },
  { id: 'crew-standings', title: 'Crew standings', group: 'Player', blurb: 'Every crew, ranked by points.' },
  { id: 'rankings', title: 'Rankings', group: 'Player', blurb: 'Hall of Legends — the top collectors in the Bay.' },
  { id: 'activity', title: 'Activity', group: 'Player', blurb: 'Everything you did, in order.' },
  { id: 'activity-evidence', title: 'Activity with evidence', group: 'Player', blurb: 'Each activity, with the evidence behind it.' },
  { id: 'transaction-detail', title: 'Transaction detail', group: 'Player', blurb: 'One transaction, step by step.' },
  { id: 'wallet', title: 'Wallet connection', group: 'Player', blurb: 'Connect, switch network, or disconnect.' },
  { id: 'ai-guide', title: 'AI guide', group: 'Help', blurb: 'Ask in plain words. Answers only from the approved facts.' },
  { id: 'how-it-works', title: 'How it works', group: 'Help', blurb: 'The whole system, in plain words, in order.' },
  { id: 'safety', title: 'Safety & support', group: 'Help', blurb: 'Stay safe, and get help when you need it.' },
  { id: 'recovery', title: 'Recovery states', group: 'Help', blurb: 'Session problems, access problems, missing campaigns.' },
  { id: 'terms', title: 'Campaign terms & privacy', group: 'Help', blurb: 'The rules for campaigns, and what happens to your details.' },
  { id: 'campaigns', title: 'Campaigns', group: 'Studio', blurb: 'Your studio, your playground.' },
  { id: 'campaign-editor', title: 'Campaign editor', group: 'Studio', blurb: 'Name it, aim it, date it — then save a draft.' },
  { id: 'campaign-dashboard', title: 'Campaign dashboard', group: 'Studio', blurb: 'Sessions, wallets and verified contributors — kept separate.' },
  { id: 'campaign-management', title: 'Campaign management', group: 'Studio', blurb: 'Manage a campaign: edit, publish, cancel, refund.' },
  { id: 'campaign-report', title: 'Campaign report', group: 'Studio', blurb: 'The results, with gaps shown as gaps.' },
  { id: 'campaign-live', title: 'Campaign live', group: 'Studio', blurb: 'Your campaign is live for players to see.' },
  { id: 'campaign-completed', title: 'Campaign completed', group: 'Studio', blurb: 'The campaign ran its course. Here is what happened.' },
  { id: 'campaign-cancelled', title: 'Campaign cancelled', group: 'Studio', blurb: 'The campaign was cancelled. Here is what that means.' },
  { id: 'public-campaign', title: 'Public campaign', group: 'Studio', blurb: 'What players see when they find a campaign.' },
  { id: 'studio-signin', title: 'Studio sign-in', group: 'Studio', blurb: 'Sign in with a link sent to your email.' },
  { id: 'launch-controls', title: 'Launch controls', group: 'Studio', blurb: 'The launch checklist — authority steps, gates separate.' },
  { id: 'refund-center', title: 'Refund center', group: 'Studio', blurb: 'Ask for a refund, see the calculation, track the decision.' },
  { id: 'business', title: 'Business', group: 'Studio', blurb: 'Packages, scope, readiness and the operating model.' },
  { id: 'business-model', title: 'Business model', group: 'Studio', blurb: 'The canvas, the unit economics, the roadmap.' },
  { id: 'mainnet', title: 'Network & mainnet readiness', group: 'Learn more', blurb: 'Target: Solana mainnet-beta. Current: devnet. Gates 1–5, honestly marked.' },
  { id: 'token', title: 'Token economics', group: 'Learn more', blurb: '1B mint cap, the buckets, vesting worked examples, corrected C.6.' },
  { id: 'flows', title: 'Referrals & money flows', group: 'Learn more', blurb: '10/2/88, the fairness rules, and three money flows never mixed.' },
  { id: 'evidence', title: 'Evidence classes', group: 'Learn more', blurb: 'Sessions are not people. Test SOL is never revenue.' },
  { id: 'wallet-safety', title: 'Wallet safety', group: 'Learn more', blurb: 'The 5 checks. Nexus never asks for a seed phrase or private key. Ever.' },
  { id: 'faq', title: 'FAQ — honest answers', group: 'Learn more', blurb: 'Short answers, no promises. Is Nexus using real money now? No.' },
  { id: 'canvas', title: 'Business Model Canvas', group: 'Learn more', blurb: 'The nine blocks, after Osterwalder & Pigneur.' },
  { id: 'models', title: 'The five scholarly models', group: 'Learn more', blurb: 'Canvas → Lean → Platform → Positioning → Jobs/Traction/Flywheel.' },
  { id: 'pricing', title: 'Pricing & unit economics', group: 'Learn more', blurb: 'Free pilot, 750 Studio, 2,000 Growth — and what each one earns.' },
  { id: 'operations', title: 'Operations', group: 'Learn more', blurb: 'Delivery checklists, team, rhythms, Bullseye experiments.' },
  { id: 'gates', title: 'Gates, risk & checklists', group: 'Learn more', blurb: 'Gates 1–5 pass/kill criteria, risk register, SOPs.' },
  { id: 'scenarios', title: 'Prototype scenarios', group: 'Index', blurb: 'Every page and every dialog, in one place.' },
  { id: 'journeys', title: 'Journey directory', group: 'Index', blurb: 'Eight journeys through the whole prototype.' },
  { id: 'builders', title: 'For builders & studios', group: 'Studio', blurb: 'Contract, gates and the 14 worked-example checks.' },
  { id: 'learn', title: 'Learn more — the full document', group: 'Learn more', blurb: 'The money rules, the business plan, the launch checklist. Here when you want it, out of the way when you do not.' },
]

export const PAGE_BY_ID: Record<string, (typeof PAGES)[number]> = Object.fromEntries(PAGES.map((p) => [p.id, p]))

export interface Journey { id: string; title: string; blurb: string; steps: { label: string; page?: PageId; dialog?: string }[] }
export const JOURNEYS: Journey[] = [
  { id: 'j1', title: '1 · Wallet & network', blurb: 'Connect, switch, disconnect — and what happens when the network is wrong.', steps: [
    { label: 'Wallet connection', page: 'wallet' }, { label: 'Choose wallet', dialog: 'choose-wallet' }, { label: 'Connecting wallet', dialog: 'connecting-wallet' }, { label: 'Wallet account menu', dialog: 'wallet-menu' }, { label: 'Wrong network', dialog: 'wrong-network' }, { label: 'Disconnect wallet', dialog: 'disconnect-wallet' } ] },
  { id: 'j2', title: '2 · Capsules & deposits', blurb: 'From discovery to a finalised join — with every failure state on the way.', steps: [
    { label: 'Capsules', page: 'capsules' }, { label: 'Capsule review', page: 'capsule-review' }, { label: 'Capsule opening', page: 'capsule-opening' }, { label: 'Invalid contribution', dialog: 'invalid-contribution' }, { label: 'Crossing whale threshold', dialog: 'crossing-whale' }, { label: 'Review deposit recipients', dialog: 'review-recipients' }, { label: 'Awaiting wallet approval', dialog: 'awaiting-approval' }, { label: 'Deposit submitted', dialog: 'deposit-submitted' }, { label: 'Deposit confirmed', dialog: 'deposit-confirmed' }, { label: 'Deposit finalized', dialog: 'deposit-finalized' }, { label: 'Request declined', dialog: 'request-declined' }, { label: 'Transaction failed', dialog: 'tx-failed' }, { label: 'Transaction unknown', dialog: 'tx-unknown' }, { label: 'Insufficient test SOL', dialog: 'insufficient-sol' }, { label: 'Hardcap exceeded', dialog: 'hardcap' }, { label: 'Sale closed', dialog: 'sale-closed' } ] },
  { id: 'j3', title: '3 · Airdrop & claims', blurb: 'Check the list, register, claim — retail, whale and airdrop, each with its own review.', steps: [
    { label: 'Airdrop eligibility', page: 'airdrop-eligibility' }, { label: 'Checking eligibility', dialog: 'checking-eligibility' }, { label: 'Eligible allocation', dialog: 'eligible-allocation' }, { label: 'Missing eligibility proof', dialog: 'missing-proof' }, { label: 'Invalid Merkle proof', dialog: 'invalid-proof' }, { label: 'Already registered', dialog: 'already-registered' }, { label: 'Review airdrop registration', dialog: 'review-registration' }, { label: 'Registration finalized', dialog: 'registration-finalized' }, { label: 'Retail claim review', dialog: 'retail-claim-review' }, { label: 'Whale claim review', dialog: 'whale-claim-review' }, { label: 'Airdrop claim review', dialog: 'airdrop-claim-review' }, { label: 'Confirm early penalty', dialog: 'confirm-penalty' }, { label: 'Nothing vested yet', dialog: 'nothing-vested' }, { label: 'Claim finalized', dialog: 'claim-finalized' }, { label: 'Allocation fully claimed', dialog: 'allocation-claimed' } ] },
  { id: 'j4', title: '4 · Crew, referrals & sharing', blurb: 'Start your own crew, join a crew, invite a friend, share the link — and leave when you want.', steps: [
    { label: 'Pirates', page: 'pirates' }, { label: 'Start your own crew', page: 'pirates' }, { label: 'Join with a code', page: 'pirates' }, { label: 'Join crew', dialog: 'join-crew' }, { label: 'Crew progress', page: 'crew-progress' }, { label: 'Crew standings', page: 'crew-standings' }, { label: 'Leave crew', dialog: 'leave-crew' }, { label: 'Reset local progress', dialog: 'reset-progress' }, { label: 'Earn', page: 'earn' }, { label: 'Referral account', page: 'referral-account' }, { label: 'Share', page: 'share' }, { label: 'Share adventure', dialog: 'share-adventure' } ] },
  { id: 'j5', title: '5 · Studio & campaign lifecycle', blurb: 'Sign in, draft, publish, launch, report, refund — the whole campaign life.', steps: [
    { label: 'Studio sign-in', page: 'studio-signin' }, { label: 'Sign-in email sent', dialog: 'signin-sent' }, { label: 'Sign-in link expired', dialog: 'signin-expired' }, { label: 'Campaigns', page: 'campaigns' }, { label: 'Campaign editor', page: 'campaign-editor' }, { label: 'Draft saved', dialog: 'draft-saved' }, { label: 'Discard unsaved changes', dialog: 'discard-changes' }, { label: 'Delete draft campaign', dialog: 'delete-draft' }, { label: 'Campaign dashboard', page: 'campaign-dashboard' }, { label: 'Review campaign publication', dialog: 'review-publication' }, { label: 'Publication blocked', dialog: 'publication-blocked' }, { label: 'Campaign published', dialog: 'campaign-published' }, { label: 'Campaign live', page: 'campaign-live' }, { label: 'Launch controls', page: 'launch-controls' }, { label: 'Campaign completed', page: 'campaign-completed' }, { label: 'Campaign cancelled', page: 'campaign-cancelled' }, { label: 'Cancel campaign', dialog: 'cancel-campaign' }, { label: 'Campaign report', page: 'campaign-report' }, { label: 'Export campaign report', dialog: 'export-report' }, { label: 'Report data gap', dialog: 'report-gap' }, { label: 'Refund center', page: 'refund-center' }, { label: 'Review refund calculation', dialog: 'review-refund-calc' }, { label: 'Refund request received', dialog: 'refund-received' } ] },
  { id: 'j6', title: '6 · Authority & release', blurb: 'Launch steps are authority steps — gates are separate from wallet approval.', steps: [
    { label: 'Launch controls', page: 'launch-controls' }, { label: 'Initialize pool review', dialog: 'init-pool-review' }, { label: 'Finalize sale review', dialog: 'finalize-review' }, { label: 'Activate launch review', dialog: 'activate-review' }, { label: 'Authority access denied', dialog: 'authority-denied' }, { label: 'Network & mainnet readiness', page: 'mainnet' }, { label: 'Gates, risk & checklists', page: 'gates' }, { label: 'For builders & studios', page: 'builders' } ] },
  { id: 'j7', title: '7 · Guidance, help & recovery', blurb: 'Ask the guide, read how it works, get help, recover a session.', steps: [
    { label: 'AI guide', page: 'ai-guide' }, { label: 'Answer stopped', dialog: 'answer-stopped' }, { label: 'Guide unavailable', dialog: 'guide-unavailable' }, { label: 'How it works', page: 'how-it-works' }, { label: 'Safety & support', page: 'safety' }, { label: 'Support request received', dialog: 'support-received' }, { label: 'Support submission failed', dialog: 'support-failed' }, { label: 'Recovery states', page: 'recovery' }, { label: 'Session expired', dialog: 'session-expired' }, { label: 'Campaign terms & privacy', page: 'terms' }, { label: 'Legal policy pending', dialog: 'legal-pending' }, { label: 'Wallet safety', page: 'wallet-safety' }, { label: 'Network & mainnet readiness', page: 'mainnet' }, { label: 'FAQ — honest answers', page: 'faq' } ] },
  { id: 'j8', title: '8 · Business & operating model', blurb: 'Packages, scope, readiness, fees, the canvas and the roadmap.', steps: [
    { label: 'Business', page: 'business' }, { label: 'Business model', page: 'business-model' }, { label: 'Business Model Canvas', page: 'canvas' }, { label: 'The five scholarly models', page: 'models' }, { label: 'Pricing & unit economics', page: 'pricing' }, { label: 'Token economics', page: 'token' }, { label: 'Referrals & money flows', page: 'flows' }, { label: 'Evidence classes', page: 'evidence' }, { label: 'Operations', page: 'operations' }, { label: 'Gates, risk & checklists', page: 'gates' }, { label: 'Campaigns', page: 'campaigns' }, { label: 'Refund center', page: 'refund-center' }, { label: 'Request hosting refund', dialog: 'request-hosting-refund' }, { label: 'Refund under review', dialog: 'refund-review' }, { label: 'Refund approved', dialog: 'refund-approved' }, { label: 'Refund processing', dialog: 'refund-processing' }, { label: 'Refund completed', dialog: 'refund-completed' }, { label: 'Refund rejected', dialog: 'refund-rejected' }, { label: 'Refund failed', dialog: 'refund-failed' } ] },
]

interface Deposit {
  id: number; vaultId: string; art: number; label: string; amount: number
  direct: number; upline: number; vault: number; referrer: string
  isAirdrop?: boolean; airdropAllocation?: number
}
/** A crew the player creates themselves. Free, no wallet, seconds to make.
 *  Points are device-local game points — just for fun, not tokens, not money. */
interface MyCrew {
  id: string; name: string; colour: string; flag: string; about: string
  code: string; points: number; members: string[]; challenge: string
}
const CREW_COLOURS = ['#ffb38a', '#f7a8c4', '#b79ced', '#7cc4e8', '#ffd166', '#a8e6a1']
const CREW_FLAGS = ['🏴‍☠️', '⚓', '🌊', '☀️', '🐋', '⭐']
function fakeAddress() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `Demo${s.slice(0, 4)}`
}
const newVaultId = () => `NEX-${Math.floor(10000 + Math.random() * 89999)}`
const ART_EMOJI = ['🧑‍🚀', '💎', '🐋']
const RANKS = ['Newcomer', 'Explorer', 'Collector', 'Bay Regular', 'Legend of the Bay']

/** Original capsule art: a vertical capsule with a lid and a star.
 *  Deliberately NOT a sphere with a horizontal band (IP risk). */
function CapsuleArt({ tier, label }: { tier: 'green' | 'orange' | 'purple'; label: string }) {
  const colors = { green: ['#7fb069', '#cdeac0'], orange: ['#ff7a3d', '#ffd9bd'], purple: ['#8b5cf6', '#ddd0fa'] }[tier]
  return (
    <div className={`capsule-art tier-${tier}`} role="img" aria-label={label}>
      <svg viewBox="0 0 120 160" width="90" height="140" aria-hidden="true">
        <rect x="28" y="18" width="64" height="26" rx="13" fill={colors[0]} stroke="#38271f" strokeWidth="3" />
        <rect x="24" y="44" width="72" height="96" rx="34" fill={colors[1]} stroke="#38271f" strokeWidth="3" />
        <rect x="24" y="44" width="72" height="14" fill={colors[0]} opacity="0.45" />
        <path d="M60 66 l7 14 15 2 -11 11 3 15 -14 -8 -14 8 3 -15 -11 -11 15 -2 z" fill="#ffd166" stroke="#38271f" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="48" cy="118" r="4" fill="#38271f" opacity="0.35" />
        <circle cx="72" cy="118" r="4" fill="#38271f" opacity="0.35" />
        <path d="M50 128 q10 8 20 0" fill="none" stroke="#38271f" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

/** Original floating-city-at-sunset hero illustration, CSS/SVG only. */
function HeroCity() {
  return (
    <svg className="hero-city" viewBox="0 0 800 260" role="img" aria-label="A floating city at sunset over the sea">
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd166" /><stop offset="0.55" stopColor="#ffb38a" /><stop offset="1" stopColor="#f7a8c4" /></linearGradient></defs>
      <rect width="800" height="260" fill="url(#sky)" />
      <circle cx="620" cy="70" r="42" fill="#fff7cc" stroke="#38271f" strokeWidth="3" />
      <ellipse cx="140" cy="60" rx="70" ry="16" fill="#fffaf0" opacity="0.9" />
      <ellipse cx="420" cy="40" rx="50" ry="12" fill="#fffaf0" opacity="0.8" />
      <g stroke="#38271f" strokeWidth="3" fill="#fff3e4">
        <rect x="90" y="150" width="70" height="70" rx="10" /><rect x="105" y="165" width="14" height="14" rx="3" fill="#ffd166" /><rect x="130" y="165" width="14" height="14" rx="3" fill="#7cc4e8" />
        <rect x="200" y="120" width="60" height="100" rx="10" /><rect x="214" y="135" width="12" height="12" rx="3" fill="#f7a8c4" /><rect x="234" y="135" width="12" height="12" rx="3" fill="#ffd166" />
        <rect x="300" y="160" width="90" height="60" rx="10" /><rect x="470" y="140" width="70" height="80" rx="10" /><rect x="580" y="165" width="80" height="55" rx="10" />
      </g>
      <g fill="#38271f"><circle cx="330" cy="205" r="5" /><circle cx="360" cy="205" r="5" /><circle cx="345" cy="196" r="7" /></g>
      <rect y="220" width="800" height="40" fill="#7cc4e8" opacity="0.85" />
      <path d="M0 232 q100 -10 200 0 t200 0 t200 0 t200 0" fill="none" stroke="#38271f" strokeWidth="2" opacity="0.4" />
    </svg>
  )
}

export default function App() {
  const [page, setPage] = useState<PageId>('home')
  const [mode, setMode] = useState<'play' | 'studio'>('play')
  const [dialogId, setDialogId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [showWalletSheet, setShowWalletSheet] = useState(false)
  const [hasReferrer, setHasReferrer] = useState(true)
  const [referrer, setReferrer] = useState('Ben')
  const [amountSol, setAmountSol] = useState('1')
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [claimedByVault, setClaimedByVault] = useState<Record<number, number>>({})
  const [finalized, setFinalized] = useState(false)
  const [launched, setLaunched] = useState(false)
  const [elapsedHours, setElapsedHours] = useState(0)
  const [burned, setBurned] = useState(0)
  const [escrow, setEscrow] = useState(0)
  const [opened, setOpened] = useState<Record<string, boolean>>({})
  const [opens, setOpens] = useState<Record<string, number>>({})
  const [crews, setCrews] = useState<Crew[]>(CREWS)
  const [joined, setJoined] = useState<string[]>([])
  // Create a Crew — free, no wallet. One crew per player in this demo.
  const [myCrew, setMyCrew] = useState<MyCrew | null>(null)
  const [crewName, setCrewName] = useState('')
  const [crewColour, setCrewColour] = useState(CREW_COLOURS[0])
  const [crewFlag, setCrewFlag] = useState(CREW_FLAGS[0])
  const [crewAbout, setCrewAbout] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState('')
  const [crewCopied, setCrewCopied] = useState(false)
  const [editingCrew, setEditingCrew] = useState(false)
  const [confirmDisband, setConfirmDisband] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS)
  const [newStudio, setNewStudio] = useState('')
  const [newCampaign, setNewCampaign] = useState('')
  const [newPkg, setNewPkg] = useState('Devnet Pilot')
  const [calcSol, setCalcSol] = useState('1')
  const [copied, setCopied] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('Hi — ask me anything about Nexus in plain words. If I don’t know the answer, I’ll say so. I never invent prices or odds.')
  const [guideState, setGuideState] = useState<'idle' | 'answering' | 'stopped' | 'unavailable'>('idle')
  const [notice, setNotice] = useState('')
  const [managedId, setManagedId] = useState<number | null>(null)
  const [modalStep, setModalStep] = useState<'detail' | 'confirm' | 'success'>('detail')
  const [lastClaim, setLastClaim] = useState<{ net: number; penalty: number; gross: number; burned: number; escrow: number } | null>(null)
  const [visibleVaults, setVisibleVaults] = useState(5)
  const [charIndex, setCharIndex] = useState(0)
  const [airdropName, setAirdropName] = useState('')
  const [airdropWallet, setAirdropWallet] = useState('')
  const [airdropResult, setAirdropResult] = useState<'idle' | 'not-found' | 'demo' | 'claimed'>('idle')
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState<{ x: number; y: number; px: number; py: number } | null>(null)
  const [selectedCapsule, setSelectedCapsule] = useState('free')
  const [studioSignedIn, setStudioSignedIn] = useState(false)
  const [studioEmail, setStudioEmail] = useState('')
  const [campName, setCampName] = useState('')
  const [campStudio, setCampStudio] = useState('')
  const [campObjective, setCampObjective] = useState('')
  const [campStart, setCampStart] = useState('')
  const [campDuration, setCampDuration] = useState('7')
  const [campSaved, setCampSaved] = useState(false)
  const [campPkg, setCampPkg] = useState('Devnet Pilot')
  const [refundAmount, setRefundAmount] = useState('750')
  const [refundDay, setRefundDay] = useState('2')
  const [activityLog, setActivityLog] = useState<string[]>(['Opened the app — welcome to the test world.'])
  const [supportMsg, setSupportMsg] = useState('')
  const [launchSteps, setLaunchSteps] = useState<Record<string, boolean>>({})

  const totalGross = useMemo(() => deposits.reduce((a, d) => a + d.amount, 0), [deposits])
  const totalReferral = useMemo(() => deposits.reduce((a, d) => a + d.direct + d.upline, 0), [deposits])
  const retail = isRetail(totalGross)
  const elapsedSeconds = elapsedHours * 3600
  const totalOpens = Object.values(opens).reduce((a, b) => a + b, 0)
  const claimedAny = Object.keys(claimedByVault).length > 0
  const xp = totalOpens * 10 + deposits.length * 50 + joined.length * 20 + (claimedAny ? 20 : 0)
  const rank = RANKS[Math.min(RANKS.length - 1, Math.floor(xp / 100))]
  const badgesEarned = [totalOpens > 0 ? 'first-open' : '', deposits.length > 0 ? 'first-join' : '', copied ? 'first-invite' : '', claimedAny ? 'first-claim' : '', joined.length > 0 ? 'crew-mate' : ''].filter(Boolean)
  const leaderboard = useMemo(() => {
    const rows = crews.map((c) => ({ name: c.name, members: c.members, xp: c.points, you: false }))
    rows.push({ name: connected ? `You (${address})` : 'You', members: 1, xp, you: true })
    rows.sort((a, b) => b.xp - a.xp)
    return rows
  }, [crews, xp, connected, address])
  const myRank = leaderboard.findIndex((r) => r.you) + 1
  const allocationForDeposit = (d: Deposit) => (d.isAirdrop ? d.airdropAllocation || 0 : finalized ? allocationFor(d.amount, totalGross) : 0)
  const unlockedForDeposit = (d: Deposit) => {
    const alloc = allocationForDeposit(d)
    if (!launched) return 0
    if (d.isAirdrop) return vestedAmount(alloc, elapsedSeconds)
    return retail ? alloc : vestedAmount(alloc, elapsedSeconds)
  }
  const claimableForDeposit = (d: Deposit) => claimableNow(unlockedForDeposit(d), claimedByVault[d.id] || 0)
  const penaltyForDeposit = (d: Deposit) => {
    const c = claimableForDeposit(d)
    if ((!d.isAirdrop && retail) || c <= 0) return { rate: 0, penalty: 0, burned: 0, escrow: 0, net: c }
    return penaltySplit(c, elapsedSeconds)
  }
  const ratioForDeposit = (d: Deposit) => {
    if (!launched) return 0
    if (!d.isAirdrop && retail) return 100
    return Math.min(100, Math.round((elapsedHours / 72) * 100))
  }
  const totalAllocation = useMemo(() => deposits.reduce((a, d) => a + allocationForDeposit(d), 0), // eslint-disable-next-line react-hooks/exhaustive-deps
    [deposits, finalized, totalGross])
  const totalClaimable = deposits.reduce((a, d) => a + claimableForDeposit(d), 0)
  const rate = retail ? 0 : penaltyRatePercent(elapsedSeconds)
  const checks = useMemo(() => workedChecks(), [])
  const passed = checks.filter((c) => c.pass).length
  const managed = deposits.find((d) => d.id === managedId) || null
  const amountLamports = Math.round((parseFloat(amountSol) || 0) * LAMPORTS_PER_SOL)
  const split = referralSplit(amountLamports, hasReferrer, hasReferrer)
  const inviteLink = `https://nexus.example/r/${connected ? address : 'demo'}`
  const calcLamports = Math.round((parseFloat(calcSol) || 0) * LAMPORTS_PER_SOL)
  const calcSplit = referralSplit(calcLamports, true, true)
  const refundPct = Number(refundDay) <= 0 ? 100 : Number(refundDay) <= 3 ? 50 : 0
  const refundValue = Math.round((parseFloat(refundAmount) || 0) * refundPct) / 100

  function go(p: PageId) { setPage(p); setNotice(''); window.scrollTo({ top: 0 }) }
  function showToast(msg: string) { setToast(msg); window.setTimeout(() => setToast(''), 2600) }
  function logActivity(msg: string) { setActivityLog((l) => [msg, ...l].slice(0, 20)) }
  function connect() {
    setAddress(fakeAddress()); setConnected(true); setShowWalletSheet(false)
    setNotice('Demo wallet ready. This is practice money only — not real money, and nothing leaves your device.')
    logActivity('Connected the demo wallet.')
  }
  function disconnect() { setConnected(false); setAddress(''); setDialogId(null); setNotice('Wallet disconnected. Your demo progress stays saved here.'); logActivity('Disconnected the wallet.') }
  function openCapsule(id: string) {
    setOpened((o) => ({ ...o, [id]: true })); setOpens((o) => ({ ...o, [id]: (o[id] || 0) + 1 }))
    setSelectedCapsule(id); logActivity(`Opened a capsule preview (${id}).`)
  }
  function deposit() {
    if (!connected) { setShowWalletSheet(true); return }
    if (finalized) { setDialogId('sale-closed'); return }
    if (amountLamports <= 0) { setDialogId('invalid-contribution'); return }
    if (totalGross + amountLamports > HARD_CAP_SOL * LAMPORTS_PER_SOL) { setDialogId('hardcap'); return }
    const d: Deposit = { id: Date.now(), vaultId: newVaultId(), art: deposits.length % 3, label: amountLamports <= 2 * LAMPORTS_PER_SOL ? 'Small vault' : 'Big vault', amount: amountLamports, direct: split.direct, upline: split.upline, vault: split.vault, referrer: hasReferrer ? referrer : 'No one' }
    setDeposits((ds) => [...ds, d]); setDialogId('deposit-confirmed')
    setNotice(`Done — you joined with ${fmtSol(amountLamports)} in practice coins and opened vault ${d.vaultId}.`)
    logActivity(`Joined with ${fmtSol(amountLamports)} SOL — vault ${d.vaultId} opened.`)
  }
  function checkAirdrop() {
    const name = airdropName.trim().toLowerCase()
    const wallet = airdropWallet.trim().toLowerCase()
    if (!name && !wallet) { setNotice('Type a name or a wallet first, then check the list.'); return }
    if (name === DEMO_AIRDROP.name.toLowerCase() || wallet === DEMO_AIRDROP.wallet.toLowerCase()) {
      setAirdropResult('demo'); setDialogId('eligible-allocation')
    } else { setAirdropResult('not-found'); setNotice('Not on the list. There is no approved list yet, so nobody can claim free tokens yet.') }
  }
  function claimDemoAirdrop() {
    const d: Deposit = { id: Date.now(), vaultId: newVaultId(), art: 1, label: 'Airdrop vault — demo', amount: 0, direct: 0, upline: 0, vault: 0, referrer: 'Airdrop (demo)', isAirdrop: true, airdropAllocation: DEMO_AIRDROP.tokens * 1_000_000 }
    setDeposits((ds) => [...ds, d]); setAirdropResult('claimed'); setDialogId('registration-finalized')
    logActivity(`Claimed the demo airdrop (${DEMO_AIRDROP.tokens} demo tokens) — vault ${d.vaultId}.`)
  }
  function openManage(d: Deposit) { setManagedId(d.id); setModalStep('detail'); setLastClaim(null) }
  function closeModal() { setManagedId(null); setModalStep('detail'); setLastClaim(null) }
  function confirmClaim() {
    if (!managed) return
    const c = claimableForDeposit(managed)
    if (!launched || c <= 0) return
    const p = retail && !managed.isAirdrop ? { rate: 0, penalty: 0, burned: 0, escrow: 0, net: c } : penaltySplit(c, elapsedSeconds)
    setClaimedByVault((m) => ({ ...m, [managed.id]: (m[managed.id] || 0) + c }))
    setBurned((b) => b + p.burned); setEscrow((e) => e + p.escrow)
    setLastClaim({ net: p.net, penalty: p.penalty, gross: c, burned: p.burned, escrow: p.escrow })
    setModalStep('success'); logActivity(`Took ${fmtTokens(p.net)} tokens from vault ${managed.vaultId}.`)
  }
  function copyLink() {
    if (navigator.clipboard) navigator.clipboard.writeText(inviteLink).catch(() => undefined)
    setCopied(true); showToast('Link copied')
    logActivity('Copied the invite link.')
  }
  const crewCodeFor = (name: string) => `CREW-${name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'CREW'}-${Math.floor(1000 + Math.random() * 9000)}`
  function createCrew() {
    if (!crewName.trim()) { setNotice('Give your crew a name first.'); return }
    const code = crewCodeFor(crewName)
    const crew: MyCrew = { id: 'mine', name: crewName.trim(), colour: crewColour, flag: crewFlag, about: crewAbout.trim(), code, points: 0, members: ['You'], challenge: 'Open 3 capsules and leave one piece of feedback' }
    setMyCrew(crew)
    setCrews((cs) => [...cs.filter((c) => c.id !== 'mine'), { id: 'mine', name: crew.name, members: 1, points: 0, challenge: crew.challenge }])
    setJoined((j) => [...j.filter((x) => x !== 'mine'), 'mine'])
    setEditingCrew(false)
    setNotice(`Your crew “${crew.name}” is ready — invite your friends with code ${code}.`)
    logActivity(`Created your crew “${crew.name}” (${code}).`)
  }
  function copyCrewInvite() {
    if (!myCrew) return
    const link = `https://nexus.example/crew/${myCrew.code}`
    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => undefined)
    setCrewCopied(true); showToast('Crew invite copied')
    logActivity(`Copied the invite link for crew “${myCrew.name}”.`)
  }
  function completeCrewChallenge(id: string) {
    setCrews((cs) => cs.map((x) => x.id === id ? { ...x, points: x.points + 50 } : x))
    if (id === 'mine') setMyCrew((m) => m ? { ...m, points: m.points + 50 } : m)
    logActivity('Completed a crew challenge · +50 points.')
  }
  function joinByCode() {
    const code = joinCode.trim().toUpperCase()
    if (!code) { setJoinMsg('Type a crew code first — it looks like CREW-SUNSET-1234.'); return }
    const seeded: Record<string, string> = { 'CREW-TRENCH-1234': 'trench', 'CREW-VAULT-1234': 'vault', 'CREW-REEF-1234': 'reef' }
    const target = myCrew && code === myCrew.code ? 'mine' : seeded[code]
    if (!target) { setJoinMsg('We could not find a crew with that code. Check the letters and try again.'); return }
    if (target === 'mine') { setJoinMsg('That is your own crew — you are already the captain.'); return }
    if (joined.includes(target)) { setJoinMsg('You are already in that crew.'); return }
    setJoined((j) => [...j, target]); setJoinMsg('')
    setNotice(`Welcome aboard — you joined ${crews.find((c) => c.id === target)?.name || 'the crew'}!`)
    logActivity(`Joined a crew with code ${code}.`)
  }
  function disbandCrew() {
    if (!myCrew) return
    setCrews((cs) => cs.filter((c) => c.id !== 'mine'))
    setJoined((j) => j.filter((x) => x !== 'mine'))
    setNotice(`Crew “${myCrew.name}” is gone. You can start a new one any time.`)
    logActivity(`Disbanded crew “${myCrew.name}”.`)
    setMyCrew(null); setConfirmDisband(false); setCrewName(''); setCrewAbout('')
  }
  function createCampaign() {
    if (!newStudio.trim() || !newCampaign.trim()) { setNotice('Enter a studio name and a campaign name.'); return }
    setCampaigns((c) => [...c, { id: `c${Date.now()}`, studio: newStudio.trim(), name: newCampaign.trim(), pkg: newPkg, sessions: 0, wallets: 0, contributors: 0, testSol: 0, status: 'Draft — simulated, not live' }])
    setNewStudio(''); setNewCampaign('')
    setNotice('Campaign created in the simulated dashboard. No invoice, no payment — packages are sold by written scope only.')
    logActivity(`Created campaign draft “${newCampaign.trim()}”.`)
  }
  function saveDraft() {
    if (!campName.trim()) { setNotice('Give the campaign a name first.'); return }
    setCampSaved(true); setDialogId('draft-saved'); logActivity(`Saved draft “${campName.trim()}”.`)
  }
  function publishCampaign() {
    setCampaigns((c) => [...c, { id: `c${Date.now()}`, studio: campStudio.trim() || 'Your studio', name: campName.trim() || 'Untitled campaign', pkg: campPkg, sessions: 0, wallets: 0, contributors: 0, testSol: 0, status: 'Live (example)' }])
    setDialogId('campaign-published'); logActivity(`Published campaign “${campName.trim() || 'Untitled campaign'}”.`)
  }
  function resetProgress() {
    setDeposits([]); setClaimedByVault({}); setFinalized(false); setLaunched(false); setElapsedHours(0)
    setBurned(0); setEscrow(0); setOpened({}); setOpens({}); setJoined([])
    setCrews(CREWS); setMyCrew(null); setCrewName(''); setCrewAbout(''); setJoinCode(''); setJoinMsg(''); setEditingCrew(false); setConfirmDisband(false)
    setAirdropResult('idle'); setActivityLog(['Started over — fresh demo.'])
    setDialogId(null); setNotice('Started over. Everything in the demo is fresh.'); go('capsules')
  }
  function askGuide(q: string) {
    setQuestion(q); setGuideState('answering')
    window.setTimeout(() => { setAnswer(guideAnswer(q)); setGuideState('idle') }, 600)
  }
  function stepInside(p: Place) {
    setSelectedPlace(null)
    if (p.go === 'builders') { go('learn'); return }
    if (p.go === 'store') { go('earn'); return }
    go(p.go === 'play' ? 'capsules' : p.go === 'vaults' ? 'vault' : p.go === 'invite' ? 'earn' : 'ai-guide')
  }
  function onMapDown(e: React.PointerEvent) { setDragging({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }) }
  function onMapMove(e: React.PointerEvent) {
    if (!dragging) return
    setPan({ x: Math.max(-260, Math.min(260, dragging.px + (e.clientX - dragging.x))), y: Math.max(-140, Math.min(140, dragging.py + (e.clientY - dragging.y))) })
  }

  /** Dialog actions: every button navigates, opens another dialog,
   *  or runs a real simulated action — none is dead. */
  function handleDialogAction(a: DialogAction, def: DialogDef) {
    if (a.dialog) {
      if (a.dialog === 'deposit-submitted' && def.id === 'awaiting-approval') { deposit(); return }
      if (a.dialog === 'claim-finalized' && def.id === 'confirm-penalty') { confirmClaim(); setDialogId('claim-finalized'); return }
      if (a.dialog === 'registration-finalized' && def.id === 'review-registration') { claimDemoAirdrop(); return }
      if (a.dialog === 'campaign-published' && def.id === 'review-publication') { publishCampaign(); return }
      setDialogId(a.dialog); return
    }
    if (a.go) {
      if (a.go === 'wallet' && def.id === 'disconnect-wallet') { disconnect(); return }
      if (a.go === 'capsules' && def.id === 'reset-progress') { resetProgress(); return }
      if (a.go === 'crew-progress' && def.id === 'join-crew') { if (!joined.includes('trench')) setJoined((j) => [...j, 'trench']); setDialogId(null); go('crew-progress'); return }
      if (a.go === 'pirates' && def.id === 'leave-crew') { setJoined((j) => j.filter((x) => x !== 'trench')); setDialogId(null); go('pirates'); return }
      if (a.go === 'share' && def.id === 'share-adventure') { setDialogId(null); copyLink(); go('share'); return }
      if (a.go === 'studio-signin' && def.id === 'sign-out') { setStudioSignedIn(false); setConnected(false); setDialogId(null); go('studio-signin'); return }
      setDialogId(null); go(a.go as PageId); return
    }
    setDialogId(null)
  }

  const timelineDone = (h: number) => launched && elapsedHours >= h
  const managedClaimable = managed ? claimableForDeposit(managed) : 0
  const managedPreview = managed ? penaltyForDeposit(managed) : null
  const managedAlloc = managed ? allocationForDeposit(managed) : 0
  const managedRatio = managed ? ratioForDeposit(managed) : 0
  const char = CAPSULES[charIndex]
  const dialog: DialogDef | null = dialogId ? DIALOG_BY_ID[dialogId] || null : null
  // Simple main nav — Home, Join, Vault, Earn, Pirates, Help.
  // Everything technical lives behind one "Learn more" link (footer + Help).
  const playerNav: { id: PageId; label: string }[] = [
    { id: 'home', label: 'Home' }, { id: 'capsules', label: 'Join' }, { id: 'vault', label: 'Vault' },
    { id: 'earn', label: 'Earn' }, { id: 'pirates', label: 'Pirates' }, { id: 'ai-guide', label: 'Help' },
  ]
  const studioNav: { id: PageId; label: string }[] = [
    { id: 'campaigns', label: 'Campaigns' }, { id: 'share', label: 'Share' }, { id: 'launch-controls', label: 'Launch controls' }, { id: 'business', label: 'Business' },
  ]
  const isStudioPage = ['campaigns', 'campaign-editor', 'campaign-dashboard', 'campaign-management', 'campaign-report', 'campaign-live', 'campaign-completed', 'campaign-cancelled', 'public-campaign', 'studio-signin', 'launch-controls', 'refund-center', 'business', 'business-model', 'builders'].includes(page)
  const capsuleTier = (id: string) => (id === 'free' ? 'green' : id === 'retail' ? 'orange' : 'purple') as 'green' | 'orange' | 'purple'

  const pageMeta = PAGE_BY_ID[page]
  return (
    <div>
      <header className="figma-header"><div className="figma-header-inner">
        <button className="logo" onClick={() => go('home')}><span className="logo-mark">⬡</span> NEXUS</button>
        <span className="figma-tagline">The playground on Solana</span>
        <span className="devnet-badge">DEVNET</span>
        <div className="header-switch" role="tablist" aria-label="Mode">
          <button className={mode === 'play' ? 'active' : ''} onClick={() => { setMode('play'); go('home') }}>Play</button>
          <button className={mode === 'studio' ? 'active' : ''} onClick={() => { setMode('studio'); go('campaigns') }}>For studios</button>
          <button onClick={() => go('how-it-works')}>How it works</button>
        </div>
        <span className="spacer" style={{ flex: 1 }} />
        {connected
          ? <button className="wallet-chip" onClick={() => setDialogId('wallet-menu')}>Demo · {address}</button>
          : <button className="pill connect-pill" onClick={() => setDialogId('choose-wallet')}>Connect wallet</button>}
      </div></header>
      <div className="transparency-banner"><div className="transparency-banner-inner">
        <span><strong>TEST WORLD, REAL TRANSPARENCY.</strong> Test SOL has no cash value. Deposits and claims are gated pending deployment approval.</span>
        <button onClick={() => go('learn')}>Learn more →</button>
      </div></div>

      <main className="wrap">
        <nav className="pill-nav" aria-label={isStudioPage ? 'Studio' : 'Player'}>
          <span className="pill-nav-label">{isStudioPage ? 'Studio' : 'Player'}</span>
          {(isStudioPage ? studioNav : playerNav).map((n) => (
            <button key={n.id} className={`pill${page === n.id ? ' active' : ''}`} onClick={() => go(n.id)}>{n.label}</button>
          ))}
        </nav>
        {notice && <div className="notice info fade-up" style={{ marginTop: 14 }} role="status">{notice}</div>}

        {page === 'home' && (
          <section>
            <div className="page-head">
              <p className="eyebrow">Welcome to the test world</p>
              <h1>Big curiosity. New possibilities.</h1>
              <p className="big">Explore capsules. Find your crew. Discover a more playful side of Solana.</p>
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn" style={{ width: 'auto' }} onClick={() => go('capsules')}>Explore capsules →</button>
                <button className="pill" onClick={() => go('how-it-works')}>Learn how allocations work →</button>
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>No wallet needed to preview.</p>
            </div>
            <HeroCity />
            <section className="card" style={{ marginTop: 18 }}>
              <p className="eyebrow">A world in the making</p>
              <h2>Pick your next adventure.</h2>
              <p className="muted">Three ways in. Clear rules all the way.</p>
              <div className="grid cols-2" style={{ marginTop: 12 }}>
                <div className="capsule-tile tier-green"><CapsuleArt tier="green" label="Tier 01 Airdrop — the curious one, free capsule" /><div><h3>Tier 01 · Airdrop — “The curious one”</h3><p className="muted">Free capsule, free preview. Get a feel for the world. A preview does not award tokens or establish airdrop eligibility.</p><button className="btn small" onClick={() => { openCapsule('free'); go('capsule-opening') }}>Try the free preview</button></div></div>
                <div className="capsule-tile tier-orange"><CapsuleArt tier="orange" label="Tier 02 Retail — the explorer, up to 2 test SOL" /><div><h3>Tier 02 · Retail — “The explorer”</h3><p className="muted">Up to 2 test SOL in total. Ready in full once the launch starts.</p><button className="btn small" onClick={() => { setSelectedCapsule('retail'); go('capsule-review') }}>Join as Retail</button></div></div>
                <div className="capsule-tile tier-purple"><CapsuleArt tier="purple" label="Tier 03 Whale — the deep diver, above 2 test SOL" /><div><h3>Tier 03 · Whale — “The deep diver”</h3><p className="muted">Above 2 test SOL. 72-hour release, with an early cost: 25% in day 1, 15% in day 2, 5% in day 3, nothing after. Most of the cost disappears forever; a small part goes to the rewards pot.</p><button className="btn small" onClick={() => { setSelectedCapsule('whale'); go('capsule-review') }}>Join as Whale</button></div></div>
                <div className="capsule-tile"><div style={{ fontSize: '3rem' }} aria-hidden="true">🏴‍☠️</div><div><h3>Find your crew</h3><p className="muted">Pirates are crews with challenges and points. A game — not money, not tokens.</p><button className="btn small" onClick={() => go('pirates')}>Meet the crews</button></div></div>
              </div>
              <p className="small muted" style={{ marginTop: 14 }}>✦ An opening is just a visual preview. It never transfers SOL, awards a prize or guarantees an allocation.</p>
            </section>
            <section className="card" style={{ marginTop: 14 }}>
              <h2>Explore the map</h2>
              <p className="muted">Drag the map to look around. Tap a pin to peek inside, then step in when you are ready.</p>
              <div className="map-stage" style={{ borderRadius: 24, border: '1px solid var(--tan)' }} onPointerDown={onMapDown} onPointerMove={onMapMove} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}>
                <div className="map-inner" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
                  <div className="map-sun" aria-hidden="true" /><div className="map-sea" aria-hidden="true" /><div className="map-land" aria-hidden="true" /><div className="map-road" aria-hidden="true" />
                  {PLACES.map((p) => (
                    <button key={p.id} className="map-pin" style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.colour }} onClick={(e) => { e.stopPropagation(); setSelectedPlace(p) }} aria-label={p.name}>
                      <span aria-hidden="true">{p.emoji}</span><span className="pin-label">{p.name}</span>
                    </button>
                  ))}
                </div>
                {selectedPlace && (
                  <aside className="place-panel" role="dialog" aria-label={selectedPlace.name}>
                    <button className="pill" onClick={() => setSelectedPlace(null)}>✕ Close</button>
                    <div className="place-art" style={{ background: selectedPlace.colour }} aria-hidden="true">{selectedPlace.emoji}</div>
                    <h2>{selectedPlace.name}</h2>
                    <p className="muted">{selectedPlace.detail}</p>
                    <button className="btn" onClick={() => stepInside(selectedPlace)}>Step inside</button>
                  </aside>
                )}
              </div>
            </section>
          </section>
        )}

        {page === 'capsules' && (
          <section>
            <div className="page-head"><p className="eyebrow">Capsules</p><h1>Pick your next adventure.</h1><p className="muted">Three ways in. Clear rules all the way. <button className="linklike" onClick={() => go('capsule-guide')}>Read the capsule guide →</button></p></div>
            <div className="grid" style={{ marginTop: 14 }}>
              {CAPSULES.map((c, i) => (
                <article key={c.id} className="capsule-tile" style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CapsuleArt tier={capsuleTier(c.id)} label={`${c.name} capsule`} />
                  <div style={{ flex: 1 }}>
                    <h3>{c.name} {c.id === 'free' && <span className="tag free-badge">Try it free</span>}</h3>
                    <p className="small muted">{c.tier} · {c.cost}</p>
                    <p>{c.blurb}</p>
                    <p className="small muted">Friend: <b>{c.character}</b> — {c.personality} · Opened {opens[c.id] || 0}×</p>
                    <div className="row">
                      <button className="btn small" onClick={() => { openCapsule(c.id); go('capsule-opening') }}>Open preview</button>
                      <button className="pill" onClick={() => { setSelectedCapsule(c.id); go('capsule-review') }}>{c.id === 'free' ? 'Review the free capsule' : 'Review & join'}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <section className="card" style={{ marginTop: 16 }}>
              <h2>Meet the capsule friends</h2>
              <div className="carousel">
                <button className="pill" onClick={() => setCharIndex((v) => (v - 1 + CAPSULES.length) % CAPSULES.length)} aria-label="Previous character">← Prev</button>
                <div className="char-card"><CapsuleArt tier={capsuleTier(char.id)} label={`${char.character} capsule`} /><span className="char-badge">{char.character}</span><h3>{char.name}</h3><p className="muted">{char.personality}</p><p className="small muted">{char.tier} · {char.cost}</p><button className="btn small" onClick={() => { openCapsule(char.id); go('capsule-opening') }}>Open {char.name}&apos;s capsule</button></div>
                <button className="pill" onClick={() => setCharIndex((v) => (v + 1) % CAPSULES.length)} aria-label="Next character">Next →</button>
              </div>
            </section>
            <section className="card" style={{ marginTop: 16 }}>
              <h2>Your Pins &amp; Badges</h2>
              <div className="badge-row">
                {BADGES.map((b) => { const earned = badgesEarned.includes(b.id); return (<div key={b.id} className={`badge${earned ? ' earned' : ''}`} title={b.desc}><span aria-hidden="true">{b.emoji}</span><strong>{b.name}</strong><span className="small muted">{earned ? 'Earned ✓' : 'Not yet'}</span></div>) })}
              </div>
              <p className="small muted">XP: <b>{xp}</b> (10 per capsule open · 50 per join · 20 per crew joined · 20 per first claim) · Rank: <b>{rank}</b></p>
              <p className="small muted">Pins &amp; badges are device-local game marks — not tokens, not money, not transferable, and they never change your share.</p>
            </section>
          </section>
        )}

        {page === 'capsule-guide' && (
          <section>
            <div className="page-head"><p className="eyebrow">Capsule guide</p><h1>What a capsule is.</h1><p className="muted">A capsule is the way in. It holds the launch — the vault holds the value.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Opening is a preview</h2>
              <p>Opening a capsule shows you what is inside. It never transfers SOL, awards a prize, or guarantees an allocation. The free capsule is for learning only.</p>
              <h2>Three tiers, clear rules</h2>
              <div className="kv"><span>Tier 01 · Airdrop — “The curious one”</span><b>Free preview</b></div>
              <div className="kv"><span>Tier 02 · Retail — “The explorer”</span><b>Up to 2 test SOL · fully claimable</b></div>
              <div className="kv"><span>Tier 03 · Whale — “The deep diver”</span><b>Above 2 test SOL · 72-hour release</b></div>
              <h2>How your share is worked out</h2>
              <p>Your share = what you put in ÷ what everyone put in × 400,000,000 NEXUS. It is fixed when the sale closes. Example: 1 SOL of 100 SOL total → 4,000,000 tokens.</p>
              <div className="row"><button className="btn" style={{ width: 'auto' }} onClick={() => go('capsules')}>Pick a capsule</button><button className="pill" onClick={() => go('how-it-works')}>How allocations work</button></div>
            </div>
          </section>
        )}

        {page === 'capsule-review' && (
          <section>
            <div className="page-head"><p className="eyebrow">Capsule review</p><h1>Review before you join.</h1><p className="muted">Check the capsule, the amount and the split — before anything moves.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="row" role="group" aria-label="Capsule">
                {CAPSULES.map((c) => (<button key={c.id} className={`preset${selectedCapsule === c.id ? ' active' : ''}`} onClick={() => setSelectedCapsule(c.id)}>{c.name}</button>))}
              </div>
              <CapsuleArt tier={capsuleTier(selectedCapsule)} label="Selected capsule" />
              <div className="preset-row" role="group" aria-label="Amount">
                {['0.5', '1', '2', '3'].map((v) => (<button key={v} className={`preset${amountSol === v ? ' active' : ''}`} onClick={() => setAmountSol(v)}>{v} SOL</button>))}
              </div>
              <div className="field"><label>Or type your own amount (test SOL)</label><input type="number" min="0" step="0.1" value={amountSol} onChange={(e) => setAmountSol(e.target.value)} /></div>
              <div className="field"><label>Who invited you?</label><select value={hasReferrer ? referrer : 'none'} onChange={(e) => { if (e.target.value === 'none') setHasReferrer(false); else { setHasReferrer(true); setReferrer(e.target.value) } }}><option value="Ben">Ben invited me</option><option value="Ada">Ada invited me</option><option value="none">No one invited me</option></select></div>
              <div className="kv"><span>{hasReferrer ? `${referrer} gets` : 'Your inviter gets'}</span><b>{fmtSol(split.direct)} SOL</b></div>
              <div className="kv"><span>{hasReferrer ? `${referrer}’s inviter gets` : 'Their inviter gets'}</span><b>{fmtSol(split.upline)} SOL</b></div>
              <div className="kv"><span>The launch gets</span><b>{fmtSol(split.vault)} SOL</b></div>
              <div className="kv"><span>Your total after this join</span><b>{fmtSol(totalGross + amountLamports)} SOL — {isRetail(totalGross + amountLamports) ? 'Retail (small)' : 'Whale (big)'}</b></div>
              <p className="small muted">If there is no inviter, their share goes to the launch instead. Crossing 2 in total makes you a big join — the 72-hour release and early cost apply.</p>
              <button className="btn" onClick={() => {
                if (amountLamports <= 0) { setDialogId('invalid-contribution'); return }
                if (totalGross + amountLamports > HARD_CAP_SOL * LAMPORTS_PER_SOL) { setDialogId('hardcap'); return }
                if (!connected) { setShowWalletSheet(true); return }
                if (isRetail(totalGross) && !isRetail(totalGross + amountLamports)) { setDialogId('crossing-whale'); return }
                setDialogId('review-recipients')
              }}>Review recipients →</button>
              <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => go('capsule-opening')}>Open the capsule first</button>
            </div>
          </section>
        )}

        {page === 'capsule-opening' && (
          <section>
            <div className="page-head"><p className="eyebrow">Capsule opening</p><h1>It opened — and that&apos;s all.</h1><p className="muted">A visual preview. It never transfers SOL, awards a prize or guarantees an allocation.</p></div>
            <div className="card" style={{ marginTop: 14, textAlign: 'center' }}>
              <CapsuleArt tier={capsuleTier(selectedCapsule)} label="Opened capsule" />
              <h2>{CAPSULES.find((c) => c.id === selectedCapsule)?.name || 'Capsule'}</h2>
              <p className="muted">{opened[selectedCapsule] ? 'You opened it. Nothing was paid, nothing was given.' : 'Tap below to open it.'}</p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn small" onClick={() => openCapsule(selectedCapsule)}>Open it</button>
                <button className="pill" onClick={() => go('capsule-review')}>Join with this capsule</button>
                <button className="pill" onClick={() => go('capsules')}>Pick another</button>
              </div>
              <p className="small muted" style={{ marginTop: 12 }}>Opened {opens[selectedCapsule] || 0}× in this demo.</p>
            </div>
          </section>
        )}

        {page === 'vault' && (
          <section>
            <div className="page-head"><p className="eyebrow">Vault</p><h1>Your vaults.</h1><p className="muted">Each join opens a vault. Whoever controls a vault controls that share — in this demo, that is you.</p></div>
            {deposits.length === 0 ? (
              <div className="card" style={{ marginTop: 14 }}><h2>You haven&apos;t joined yet</h2><p className="muted">Your vaults will appear here once you join. Try a free capsule first — it costs nothing.</p><button className="btn" style={{ width: 'auto' }} onClick={() => go('capsules')}>Go to Capsules</button></div>
            ) : (
              <>
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="stat-label">Your share {finalized ? '(fixed when the sale closed)' : '(not fixed yet — the sale is still open)'}</div>
                  <div className="stat-num">{finalized ? `${fmtTokens(totalAllocation)} tokens` : '—'}</div>
                  <div className="kv"><span>You put in</span><b>{fmtSol(totalGross)} SOL</b></div>
                  <div className="kv"><span>Your join</span><b>{retail ? 'Small — 2 or less' : 'Big — more than 2'}</b></div>
                  <div className="kv"><span>Ready to take now</span><b>{fmtTokens(totalClaimable)} tokens</b></div>
                </div>
                <div className="card" style={{ marginTop: 14 }}>
                  <h2>Next steps</h2>
                  <div className="timeline">
                    <div className={`timeline-step${timelineDone(0) ? ' done' : ''}`}><div className="timeline-dot">✓</div><div className="tl-label">Now<br />{retail ? 'All ready' : 'Nothing yet'}</div></div>
                    <div className={`timeline-step${timelineDone(24) ? ' done' : ''}`}><div className="timeline-dot">1d</div><div className="tl-label">After 1 day<br />About a third</div></div>
                    <div className={`timeline-step${timelineDone(48) ? ' done' : ''}`}><div className="timeline-dot">2d</div><div className="tl-label">After 2 days<br />About two thirds</div></div>
                    <div className={`timeline-step${timelineDone(72) ? ' done' : ''}`}><div className="timeline-dot">3d</div><div className="tl-label">After 3 days<br />All of it</div></div>
                  </div>
                  <div className="progress"><div style={{ width: `${launched ? Math.min(100, (elapsedHours / 72) * 100) : 0}%` }} /></div>
                  <p className="small muted">{launched ? `${elapsedHours} hours have passed of 3 days.` : 'The 3-day clock has not started yet.'}</p>
                  <div className="field"><label>Move the clock — see what you could take (hours: {elapsedHours})</label><input type="range" min="0" max="72" value={elapsedHours} disabled={!launched} onChange={(e) => setElapsedHours(Number(e.target.value))} /></div>
                  <div className="row"><button className="pill" onClick={() => setElapsedHours((h) => Math.min(72, h + 12))} disabled={!launched}>+12 hours</button><button className="pill" onClick={() => setElapsedHours(72)} disabled={!launched}>Jump to 3 days</button></div>
                  <p className="small muted">This slider is just a preview. Moving it changes nothing. What you can take is what has unlocked so far, minus what you already took.</p>
                  <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 12 }}>
                    <button className="btn ghost" onClick={() => { setFinalized(true); setDialogId('deposit-finalized'); logActivity('Sale finalised — shares fixed.') }} disabled={finalized || deposits.length === 0}>1 · Close the sale</button>
                    <button className="btn ghost" onClick={() => { setLaunched(true); setNotice('The launch started. The 3-day clock is running.'); logActivity('Launch activated — 72-hour clock started.') }} disabled={!finalized || launched}>2 · Start the launch</button>
                  </div>
                  <p className="small muted">A 1,000,000-token big share has 166,667 ready after 12 hours — not 500,000. 500,000 is after 36 hours.</p>
                </div>
                <div className="card" style={{ marginTop: 14 }}>
                  <h2>Vaults</h2>
                  <div className="table-wrap"><table className="vault-table">
                    <thead><tr><th>#</th><th>Vault</th><th>Vault ID</th><th>Unlocked</th><th>You put in</th><th>Your share</th><th>Actions</th></tr></thead>
                    <tbody>{deposits.slice(0, visibleVaults).map((d, i) => {
                      const ratio = ratioForDeposit(d); const preview = penaltyForDeposit(d); const claimable = claimableForDeposit(d)
                      return (<tr key={d.id}><td>{i + 1}</td><td><div className={`vault-thumb art-${'abc'[d.art]}`} aria-hidden="true">{ART_EMOJI[d.art]}</div><div className="small" style={{ marginTop: 6 }}>{d.label}</div></td><td><strong>{d.vaultId}</strong><br /><span className="small muted">via {d.referrer}</span></td><td><span className="ratio-num">{ratio}%</span><div className="ratio-bar"><div style={{ width: `${ratio}%` }} /></div><div className="small muted">{launched ? `${fmtTokens(claimable)} ready now` : 'Not started yet'}</div></td><td>{d.isAirdrop ? '— (free tokens)' : `${fmtSol(d.amount)} SOL`}</td><td>{d.isAirdrop || finalized ? `${fmtTokens(allocationForDeposit(d))} tokens` : '—'}</td><td><div className="row" style={{ flexWrap: 'nowrap' }}><button className="pill" onClick={() => openManage(d)}>Manage</button><button className={`pill${preview.penalty > 0 ? ' red' : ''}`} onClick={() => { setManagedId(d.id); setModalStep('confirm'); setLastClaim(null) }} disabled={!launched || claimable <= 0}>Take now</button><button className="pill" onClick={() => { setManagedId(d.id); go('connected-vault') }}>Open</button></div></td></tr>)
                    })}</tbody>
                  </table></div>
                  <div className="table-foot"><span className="small muted">Showing 1–{Math.min(visibleVaults, deposits.length)} of {deposits.length}</span>{deposits.length > visibleVaults && (<button className="pill wide" onClick={() => setVisibleVaults((v) => v + 5)}>Load more</button>)}</div>
                </div>
              </>
            )}
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Pool dashboard 🌊</h2>
              <div className="kv"><span>Token supply in total</span><b>{TOTAL_SUPPLY.toLocaleString()} NEXUS</b></div>
              <div className="kv"><span>Presale pool</span><b>{PRESALE_TOKENS.toLocaleString()} (40%)</b></div>
              <div className="kv"><span>Airdrop pool</span><b>{AIRDROP_TOKENS.toLocaleString()} (10%)</b></div>
              <div className="kv"><span>Recommended remainder — NOT approved</span><b>500M: Liquidity 150M · Ecosystem 100M · Team 100M · Treasury 100M · Marketing 50M</b></div>
              <div className="kv"><span>Put in so far</span><b>{fmtSol(totalGross)} SOL of {HARD_CAP_SOL.toLocaleString()} SOL</b></div>
              <div className="progress"><div style={{ width: `${Math.min(100, (totalGross / (HARD_CAP_SOL * LAMPORTS_PER_SOL)) * 100)}%` }} /></div>
              <div className="kv"><span>Burned so far (from real early claims)</span><b>{fmtTokens(burned)} NEXUS</b></div>
              <div className="kv"><span>Rewards pot so far (from real early claims)</span><b>{fmtTokens(escrow)} NEXUS</b></div>
              <p className="small muted">Burned tokens disappear forever. The rewards pot is set aside for community rewards. Both only move when someone actually takes a share early in this demo.</p>
              <div className="row"><button className="pill" onClick={() => go('airdrop-eligibility')}>Free tokens — Airdrop</button><button className="pill" onClick={() => go('claim-review')}>Review a claim</button></div>
            </div>
          </section>
        )}

        {page === 'connected-vault' && (
          <section>
            <div className="page-head"><p className="eyebrow">Connected Vault</p><h1>One vault, up close.</h1><p className="muted">The vault your wallet is connected to — its share, its unlock, its history.</p></div>
            {managed ? (
              <div className="card" style={{ marginTop: 14 }}>
                <h2>Vault {managed.vaultId}</h2>
                <div className="kv"><span>You put in</span><b>{managed.isAirdrop ? '— (free tokens)' : `${fmtSol(managed.amount)} SOL`}</b></div>
                <div className="kv"><span>Your share</span><b>{finalized ? `${fmtTokens(managedAlloc)} tokens` : 'Not fixed yet — the sale is still open'}</b></div>
                <div className="kv"><span>Unlocked so far</span><b>{managedRatio}%</b></div>
                <div className="kv"><span>Ready to take now</span><b>{fmtTokens(managedClaimable)} tokens</b></div>
                <div className="kv"><span>Already taken</span><b>{fmtTokens(claimedByVault[managed.id] || 0)} tokens</b></div>
                <div className="kv"><span>Early cost if you take it now</span><b>{managedPreview && managedPreview.penalty > 0 ? `${fmtTokens(managedPreview.penalty)} tokens (${managedPreview.rate}%)` : 'None'}</b></div>
                <div className="row"><button className="btn" style={{ width: 'auto' }} onClick={() => { setModalStep('confirm'); openManage(managed) }} disabled={!launched || managedClaimable <= 0}>Take my share</button><button className="pill" onClick={() => go('vault')}>Back to all vaults</button><button className="pill" onClick={() => go('claim-review')}>Claim review</button></div>
                {!launched && <p className="small muted" style={{ marginTop: 10 }}>Close the sale and start the launch first — then you can take what is ready.</p>}
              </div>
            ) : (
              <div className="card" style={{ marginTop: 14 }}><h2>No vault selected</h2><p className="muted">Open a vault from the Vault page first — then it shows here, connected.</p><button className="btn" style={{ width: 'auto' }} onClick={() => go('vault')}>Go to Vaults</button></div>
            )}
          </section>
        )}

        {page === 'claim-review' && (
          <section>
            <div className="page-head"><p className="eyebrow">Claim review</p><h1>Check before you take it.</h1><p className="muted">Every claim gets a review — retail, whale and airdrop each have their own.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              {deposits.length === 0 ? (<><h2>Nothing to claim yet</h2><p className="muted">Join first, then finalise the sale and start the launch. Claims open after that.</p><button className="btn" style={{ width: 'auto' }} onClick={() => go('capsules')}>Go to Capsules</button></>) : (
                <>
                  <div className="kv"><span>Ready to take now (all vaults)</span><b>{fmtTokens(totalClaimable)} tokens</b></div>
                  <div className="kv"><span>Early cost rate now</span><b>{rate}% {retail ? '(small joins pay none)' : ''}</b></div>
                  <div className="kv"><span>Burned so far</span><b>{fmtTokens(burned)} NEXUS</b></div>
                  <div className="kv"><span>Rewards pot so far</span><b>{fmtTokens(escrow)} NEXUS</b></div>
                  <div className="row">
                    <button className="pill" onClick={() => setDialogId('retail-claim-review')}>Retail claim review</button>
                    <button className="pill" onClick={() => setDialogId('whale-claim-review')}>Whale claim review</button>
                    <button className="pill" onClick={() => setDialogId('airdrop-claim-review')}>Airdrop claim review</button>
                    <button className="pill" onClick={() => setDialogId(totalClaimable <= 0 ? 'nothing-vested' : 'confirm-penalty')}>Take early — see the cost</button>
                  </div>
                  <p className="small muted">The cost applies only to the amount you take now. Waiting until after 3 days costs nothing.</p>
                </>
              )}
            </div>
          </section>
        )}

        {page === 'airdrop-eligibility' && (
          <section>
            <div className="page-head"><p className="eyebrow">Airdrop eligibility</p><h1>Free tokens — if you are on the list.</h1><p className="muted">Free tokens go only to people on an approved list. <strong>There is no approved list yet, so nobody can claim free tokens yet.</strong></p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="field"><label>Your name</label><input value={airdropName} onChange={(e) => setAirdropName(e.target.value)} placeholder="e.g. Ada" /></div>
              <div className="field"><label>Your wallet (demo name or address)</label><input value={airdropWallet} onChange={(e) => setAirdropWallet(e.target.value)} placeholder="e.g. DemoAda" /></div>
              <div className="row"><button className="btn" style={{ width: 'auto' }} onClick={() => setDialogId('checking-eligibility')}>Check eligibility</button><button className="pill" onClick={checkAirdrop}>Check the list</button></div>
              {airdropResult === 'not-found' && (<p className="notice" style={{ marginTop: 12 }} role="status">Not on the list — and the list itself does not exist yet. No approved list has been made, so nobody can claim free tokens yet.</p>)}
              {airdropResult === 'demo' && (<div style={{ marginTop: 12 }}><p className="notice info" role="status">✓ DEMO entry found: {DEMO_AIRDROP.name} ({DEMO_AIRDROP.wallet}) — {DEMO_AIRDROP.tokens.toLocaleString()} demo tokens. Labelled demo entry only, not a real approval.</p><button className="btn" onClick={() => setDialogId('review-registration')}>Review registration</button></div>)}
              {airdropResult === 'claimed' && (<p className="notice info" style={{ marginTop: 12 }} role="status">Demo airdrop claimed — see your new airdrop vault on the Vault page. It unlocks over 3 days once the launch starts.</p>)}
              <p className="small muted">Try the demo entry: name <b>Ada Demo</b>, wallet <b>DEMOADA</b>. Any other name or wallet comes back as not on the list — because the real list does not exist yet.</p>
              <div className="row"><button className="pill" onClick={() => setDialogId('missing-proof')}>Missing proof</button><button className="pill" onClick={() => setDialogId('invalid-proof')}>Invalid proof</button><button className="pill" onClick={() => setDialogId('already-registered')}>Already registered</button></div>
            </div>
          </section>
        )}

        {page === 'earn' && (
          <section>
            <div className="page-head"><p className="eyebrow">Earn</p><h1>Invite a friend.</h1><p className="muted">When a friend joins through your link, you get a share — and the person who invited you gets a smaller share. Only 2 levels.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>You both get a share</h2>
              <p><code>{inviteLink}</code></p>
              <button className="btn" onClick={copyLink}>{copied ? 'Copied! ✓' : 'Copy my invite link'}</button>
              <div className="kv" style={{ marginTop: 12 }}><span>Friends who joined through you</span><b>{deposits.filter((d) => d.direct > 0).length}</b></div>
              <div className="kv"><span>Your share from invites, so far</span><b>{fmtSol(totalReferral)} SOL</b></div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Try the numbers</h2>
              <div className="field"><label>If your friend joins with (test SOL)</label><input type="number" min="0" step="0.1" value={calcSol} onChange={(e) => setCalcSol(e.target.value)} /></div>
              <div className="kv"><span>You get</span><b>{fmtSol(calcSplit.direct)} SOL</b></div>
              <div className="kv"><span>The person who invited you gets</span><b>{fmtSol(calcSplit.upline)} SOL</b></div>
              <div className="kv"><span>The launch gets</span><b>{fmtSol(calcSplit.vault)} SOL</b></div>
              <p className="small muted">Example: if your friend joins with 1, you get 0.10. If they join with 10, you get 1.00.</p>
              <div className="row"><button className="pill" onClick={() => go('referral-account')}>My referral account</button><button className="pill" onClick={() => go('share')}>Share my adventure</button></div>
            </div>
          </section>
        )}

        {page === 'referral-account' && (
          <section>
            <div className="page-head"><p className="eyebrow">Referral account</p><h1>Your invites, in one place.</h1><p className="muted">Your link, your history, and what you earned from inviting.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <p><code>{inviteLink}</code></p>
              <button className="btn" onClick={copyLink}>{copied ? 'Copied! ✓' : 'Copy my invite link'}</button>
              <div className="kv" style={{ marginTop: 12 }}><span>Your share from invites</span><b>{fmtSol(totalReferral)} SOL</b></div>
              <div className="kv"><span>Levels</span><b>Only 2 — you, and the person who invited you</b></div>
              <h3 style={{ marginTop: 14 }}>Your invites, so far</h3>
              {deposits.length === 0 ? <p className="muted">No invites yet. Share your link and come back here.</p> : deposits.map((d) => (<div key={d.id} className="kv"><span>{fmtSol(d.amount)} SOL join via {d.referrer} · vault {d.vaultId}</span><b>You got {fmtSol(d.direct)}</b></div>))}
              <div className="row"><button className="pill" onClick={() => go('share')}>Share</button><button className="pill" onClick={() => go('earn')}>Back to Earn</button></div>
            </div>
          </section>
        )}

        {page === 'share' && (
          <section>
            <div className="page-head"><p className="eyebrow">Share</p><h1>Share your adventure.</h1><p className="muted">One link, one toast. Send it to a friend — they join, you both get a share.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <p><code>{inviteLink}</code></p>
              <button className="btn" onClick={copyLink}>{copied ? 'Copied! ✓' : 'Copy my invite link'}</button>
              <p className="small muted" style={{ marginTop: 10 }}>Only 2 levels: you, and the person who invited you. There is no third level.</p>
              <div className="row"><button className="pill" onClick={() => setDialogId('share-adventure')}>Share adventure dialog</button><button className="pill" onClick={() => go('earn')}>Back to Earn</button></div>
            </div>
          </section>
        )}

        {page === 'pirates' && (
          <section>
            <div className="page-head"><p className="eyebrow">Pirates</p><h1>Crews, challenges and points.</h1><p className="muted">Crews are a game. Points are <strong>just for fun — not tokens, not money</strong>. They never change your share.</p></div>

            {myCrew ? (
              <div className="card" style={{ marginTop: 14, borderTop: `8px solid ${myCrew.colour}` }}>
                <span className="tag">Your crew · You are the Captain</span>
                <h2 style={{ marginTop: 10 }}>{myCrew.flag} {myCrew.name}</h2>
                {myCrew.about && <p className="muted">{myCrew.about}</p>}
                <div className="kv"><span>Invite code</span><b>{myCrew.code}</b></div>
                <div className="kv"><span>Crew points</span><b>{myCrew.points} points — just for fun</b></div>
                <div className="kv"><span>Challenge</span><b>{myCrew.challenge}</b></div>
                <h3 style={{ marginTop: 14 }}>Members ({myCrew.members.length})</h3>
                {myCrew.members.map((m) => (<div key={m} className="kv"><span>👤 {m}</span><b>{m === 'You' ? 'Captain' : 'Member'}</b></div>))}
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn" style={{ width: 'auto' }} onClick={copyCrewInvite}>{crewCopied ? 'Copied! ✓' : 'Copy invite link'}</button>
                  <button className="btn small" onClick={() => completeCrewChallenge('mine')}>Complete challenge · +50 points</button>
                  <button className="pill" onClick={() => { setCrewName(myCrew.name); setCrewColour(myCrew.colour); setCrewFlag(myCrew.flag); setCrewAbout(myCrew.about); setEditingCrew(true) }}>Edit crew</button>
                  <button className="pill" onClick={() => go('crew-progress')}>See my progress</button>
                </div>
                {editingCrew && (
                  <div style={{ marginTop: 14 }}>
                    <div className="field"><label>Crew name</label><input value={crewName} onChange={(e) => setCrewName(e.target.value)} maxLength={30} /></div>
                    <div className="field"><label>Pick a colour</label><div className="row" role="group" aria-label="Crew colour">{CREW_COLOURS.map((col) => (<button key={col} className={`preset${crewColour === col ? ' active' : ''}`} style={{ background: col, width: 44, height: 44, borderRadius: 12 }} onClick={() => setCrewColour(col)} aria-label={`Colour ${col}`}>{crewColour === col ? '✓' : ''}</button>))}</div></div>
                    <div className="field"><label>Pick a flag</label><div className="row" role="group" aria-label="Crew flag">{CREW_FLAGS.map((f) => (<button key={f} className={`preset${crewFlag === f ? ' active' : ''}`} style={{ fontSize: '1.5rem' }} onClick={() => setCrewFlag(f)} aria-label={`Flag ${f}`}>{f}</button>))}</div></div>
                    <div className="field"><label>What is your crew about? (one short line)</label><input value={crewAbout} onChange={(e) => setCrewAbout(e.target.value)} maxLength={80} /></div>
                    <div className="row"><button className="btn small" onClick={() => { if (!crewName.trim()) { setNotice('Give your crew a name first.'); return } const name = crewName.trim(); setMyCrew((m) => m ? { ...m, name, colour: crewColour, flag: crewFlag, about: crewAbout.trim() } : m); setCrews((cs) => cs.map((c) => c.id === 'mine' ? { ...c, name } : c)); setEditingCrew(false); setNotice('Crew updated.'); }}>Save changes</button><button className="pill" onClick={() => setEditingCrew(false)}>Cancel</button></div>
                  </div>
                )}
                {confirmDisband ? (
                  <div className="notice" style={{ marginTop: 12 }} role="alert"><p><strong>Disband this crew?</strong> Your crew and its points will be gone.</p><div className="row"><button className="btn small" onClick={disbandCrew}>Yes, disband it</button><button className="pill" onClick={() => setConfirmDisband(false)}>Keep my crew</button></div></div>
                ) : (
                  <button className="pill red" style={{ marginTop: 12 }} onClick={() => setConfirmDisband(true)}>Disband crew</button>
                )}
              </div>
            ) : (
              <div className="card" style={{ marginTop: 14 }}>
                <span className="tag">Start your own crew</span>
                <h2 style={{ marginTop: 10 }}>Start your own crew</h2>
                <p className="muted">Free. Takes seconds. No wallet needed. Pick a name, a colour and a flag — then invite your friends.</p>
                <div className="field"><label>Crew name</label><input value={crewName} onChange={(e) => setCrewName(e.target.value)} placeholder="e.g. Sunset Sailors" maxLength={30} /></div>
                <div className="field"><label>Pick a colour</label><div className="row" role="group" aria-label="Crew colour">{CREW_COLOURS.map((col) => (<button key={col} className={`preset${crewColour === col ? ' active' : ''}`} style={{ background: col, width: 44, height: 44, borderRadius: 12 }} onClick={() => setCrewColour(col)} aria-label={`Colour ${col}`}>{crewColour === col ? '✓' : ''}</button>))}</div></div>
                <div className="field"><label>Pick a flag</label><div className="row" role="group" aria-label="Crew flag">{CREW_FLAGS.map((f) => (<button key={f} className={`preset${crewFlag === f ? ' active' : ''}`} style={{ fontSize: '1.5rem' }} onClick={() => setCrewFlag(f)} aria-label={`Flag ${f}`}>{f}</button>))}</div></div>
                <div className="field"><label>What is your crew about? (one short line)</label><input value={crewAbout} onChange={(e) => setCrewAbout(e.target.value)} placeholder="e.g. We explore together and help new players" maxLength={80} /></div>
                <button className="btn" onClick={createCrew}>Create crew</button>
                <p className="small muted">Free, takes seconds, no wallet needed. Crew points are just for fun — not tokens, not money.</p>
              </div>
            )}

            <div className="card" style={{ marginTop: 14 }}>
              <h2>Join a crew with a code</h2>
              <p className="muted">Got a code from a friend? Type it here. It looks like CREW-SUNSET-1234.</p>
              <div className="field"><label>Crew code</label><input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. CREW-TRENCH-1234" /></div>
              <button className="btn" style={{ width: 'auto' }} onClick={joinByCode}>Join this crew</button>
              {joinMsg && <p className="notice" style={{ marginTop: 12 }} role="status">{joinMsg}</p>}
              <p className="small muted">Try a demo code: CREW-TRENCH-1234, CREW-VAULT-1234 or CREW-REEF-1234.</p>
            </div>

            <h2 style={{ marginTop: 18 }}>Crews to join</h2>
            <div className="grid" style={{ marginTop: 10 }}>
              {crews.filter((c) => c.id !== 'mine').map((c) => (
                <article key={c.id} className="card">
                  <h3>🏴‍☠️ {c.name}</h3>
                  <p className="muted">{c.members} members · {c.points.toLocaleString()} crew points (just for fun)</p>
                  <p>Challenge: {c.challenge}</p>
                  <div className="row">
                    {joined.includes(c.id)
                      ? <><button className="pill" onClick={() => go('crew-progress')}>See my progress</button><button className="pill" onClick={() => setDialogId('leave-crew')}>Leave crew</button></>
                      : <button className="btn small" onClick={() => setDialogId('join-crew')}>Join crew</button>}
                    <button className="btn small" onClick={() => completeCrewChallenge(c.id)} disabled={!joined.includes(c.id)}>Complete challenge · +50 points</button>
                  </div>
                </article>
              ))}
            </div>
            <div className="row" style={{ marginTop: 14 }}><button className="pill" onClick={() => go('crew-standings')}>Crew standings</button><button className="pill" onClick={() => go('rankings')}>Hall of Legends</button></div>
          </section>
        )}

        {page === 'crew-progress' && (
          <section>
            <div className="page-head"><p className="eyebrow">Crew progress</p><h1>Your crew, your progress.</h1><p className="muted">Local progress only — it lives in this demo.</p></div>
            {joined.length === 0 ? (<div className="card" style={{ marginTop: 14 }}><h2>You are not in a crew yet</h2><p className="muted">Join one from the Pirates page, then your progress shows here.</p><button className="btn" style={{ width: 'auto' }} onClick={() => go('pirates')}>Meet the crews</button></div>) : (
              crews.filter((c) => joined.includes(c.id)).map((c) => (
                <div key={c.id} className="card" style={{ marginTop: 14 }}>
                  <h2>🏴‍☠️ {c.name}</h2>
                  <div className="kv"><span>Crew points</span><b>{c.points.toLocaleString()} XP</b></div>
                  <div className="kv"><span>Challenge</span><b>{c.challenge}</b></div>
                  <div className="progress"><div style={{ width: `${Math.min(100, (c.points % 200) / 2)}%` }} /></div>
                  <p className="small muted">Progress is local to this demo. Complete the challenge to earn +50 XP.</p>
                  <div className="row"><button className="btn small" onClick={() => setCrews((cs) => cs.map((x) => x.id === c.id ? { ...x, points: x.points + 50 } : x))}>Complete challenge · +50 XP</button><button className="pill" onClick={() => setDialogId('leave-crew')}>Leave crew</button><button className="pill" onClick={() => setDialogId('reset-progress')}>Reset local progress</button></div>
                </div>
              ))
            )}
          </section>
        )}

        {page === 'crew-standings' && (
          <section>
            <div className="page-head"><p className="eyebrow">Crew standings</p><h1>Every crew, ranked.</h1><p className="muted">Points come from playing — challenges, opens, invites. Example values, from the seeded demo crews.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="table-wrap"><table><thead><tr><th>Rank</th><th>Crew</th><th>Members</th><th>Crew points</th></tr></thead><tbody>
                {[...crews].sort((a, b) => b.points - a.points).map((c, i) => (<tr key={c.id}><td>#{i + 1}</td><td><strong>🏴‍☠️ {c.name}</strong></td><td>{c.members}</td><td>{c.points.toLocaleString()}</td></tr>))}
              </tbody></table></div>
              <p className="small muted">Seeded demo crews — example values, not real people.</p>
              <button className="pill" onClick={() => go('pirates')}>Back to Pirates</button>
            </div>
          </section>
        )}

        {page === 'rankings' && (
          <section>
            <div className="page-head"><p className="eyebrow">Rankings</p><h1>Hall of Legends.</h1><p className="muted">The top collectors in the Bay. Points come from playing — opening capsules, joining, inviting. Points are device-local game points — not tokens, not money, not a verified ranking of unique people.</p></div>
            <section className="card" style={{ marginTop: 14 }}>
              <div className="podium">
                {leaderboard.slice(0, 3).map((r, i) => (
                  <div key={r.name} className={`podium-card place-${i + 1}`}><div className="podium-medal" aria-hidden="true">{['🥇', '🥈', '🥉'][i]}</div><strong>{r.name}</strong><span className="stat-num">{r.xp} XP</span><span className="small muted">{r.members} {r.members === 1 ? 'collector' : 'collectors'}</span></div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <span className="small muted">My Rank: <b>#{myRank}</b> of {leaderboard.length} · You: <b>{xp} XP</b></span>
              </div>
              <div className="table-wrap" style={{ marginTop: 12 }}><table><thead><tr><th>Rank</th><th>Collector</th><th>XP</th></tr></thead><tbody>{leaderboard.map((r, i) => (<tr key={r.name} className={r.you ? 'you-row' : ''}><td>#{i + 1}</td><td><strong>{r.name}</strong>{r.you ? ' — that is you!' : ''}</td><td>{r.xp}</td></tr>))}</tbody></table></div>
              <p className="small muted">In this demo, the crews are seeded practice crews and your row is your real simulated play. Nobody here is a real person with real earnings.</p>
            </section>
          </section>
        )}

        {page === 'activity' && (
          <section>
            <div className="page-head"><p className="eyebrow">Activity</p><h1>Everything you did.</h1><p className="muted">Newest first. This list lives in this demo only.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              {activityLog.map((a, i) => (<div key={i} className="kv"><span>{a}</span><b>{i === 0 ? 'Latest' : ''}</b></div>))}
              <div className="row"><button className="pill" onClick={() => go('activity-evidence')}>Activity with evidence</button><button className="pill" onClick={() => go('transaction-detail')}>Transaction detail</button></div>
            </div>
          </section>
        )}

        {page === 'activity-evidence' && (
          <section>
            <div className="page-head"><p className="eyebrow">Activity with evidence</p><h1>Each step, with proof.</h1><p className="muted">Every activity links to the evidence behind it — a vault, a transaction, or a campaign number.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              {activityLog.map((a, i) => (
                <div key={i} className="kv"><span>{a}</span><b>{deposits[0] ? `Vault ${deposits[0].vaultId}` : 'Example: no vault yet'}</b></div>
              ))}
              <div className="kv"><span>Sessions and wallets are not people</span><b>Evidence classes kept separate</b></div>
              <div className="kv"><span>Test SOL is never sales or revenue</span><b>Example: labelled as test</b></div>
              <button className="pill" onClick={() => go('activity')}>Back to Activity</button>
            </div>
          </section>
        )}

        {page === 'transaction-detail' && (
          <section>
            <div className="page-head"><p className="eyebrow">Transaction detail</p><h1>One transaction, step by step.</h1><p className="muted">Example values — this is a simulated devnet transaction, not a real one.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="kv"><span>Status</span><b>{deposits.length > 0 ? 'Confirmed (example)' : 'No transaction yet (example)'}</b></div>
              <div className="kv"><span>Amount</span><b>{deposits.length > 0 ? `${fmtSol(deposits[deposits.length - 1].amount)} SOL` : 'Example: 1.00 SOL'}</b></div>
              <div className="kv"><span>Split</span><b>10% inviter · 2% their inviter · 88% launch</b></div>
              <div className="kv"><span>Vault</span><b>{deposits.length > 0 ? deposits[deposits.length - 1].vaultId : 'Example: NEX-00000'}</b></div>
              <div className="kv"><span>Network</span><b>Solana devnet (test network)</b></div>
              <div className="kv"><span>Signature</span><b>Example: 5xK…9Qm (example, not a real signature)</b></div>
              <div className="row"><button className="pill" onClick={() => setDialogId('tx-unknown')}>Transaction unknown</button><button className="pill" onClick={() => setDialogId('tx-failed')}>Transaction failed</button><button className="pill" onClick={() => go('vault')}>Back to Vaults</button></div>
            </div>
          </section>
        )}

        {page === 'wallet' && (
          <section>
            <div className="page-head"><p className="eyebrow">Wallet connection</p><h1>Your wallet.</h1><p className="muted">Connect, switch network, or disconnect. Spending stays unavailable on the wrong network or with no wallet.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="kv"><span>Status</span><b>{connected ? `Connected — Demo · ${address}` : 'Not connected'}</b></div>
              <div className="kv"><span>Network</span><b>Solana devnet (test network)</b></div>
              <div className="kv"><span>Balance</span><b>Practice coins only — no cash value</b></div>
              <div className="row">
                {connected ? <><button className="btn" style={{ width: 'auto' }} onClick={() => setDialogId('wallet-menu')}>Account menu</button><button className="pill" onClick={() => setDialogId('disconnect-wallet')}>Disconnect wallet</button></> : <button className="btn" style={{ width: 'auto' }} onClick={() => setDialogId('choose-wallet')}>Choose a wallet</button>}
                <button className="pill" onClick={() => setDialogId('wrong-network')}>Wrong network</button>
                <button className="pill" onClick={() => setDialogId('connecting-wallet')}>Connecting wallet</button>
              </div>
              <p className="small muted">Real wallets are not connected in this demo. The demo wallet is practice only, and nothing leaves your device.</p>
            </div>
          </section>
        )}

        {page === 'ai-guide' && (
          <section>
            <div className="page-head"><p className="eyebrow">AI guide</p><h1>Ask in plain words.</h1><p className="muted">I answer only from the approved Nexus facts. If I don&apos;t know, I&apos;ll say so — I never invent prices or odds. Never paste a password or secret phrase here.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="row" style={{ marginBottom: 12 }}>
                {['Does 3 SOL make me whale?', 'How do invites pay?', 'What are the odds of winning?', 'What is it worth?', 'When can I take my share?', 'Is this real money?'].map((q) => (<button key={q} className="pill" onClick={() => askGuide(q)}>{q}</button>))}
              </div>
              <div className="field"><label>Ask a question</label><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') askGuide(question) }} placeholder="e.g. Does 3 SOL make me whale?" /></div>
              <div className="row"><button className="btn" style={{ width: 'auto' }} onClick={() => askGuide(question)} disabled={guideState === 'answering'}>{guideState === 'answering' ? 'Answering…' : 'Ask'}</button><button className="pill" onClick={() => setDialogId('answer-stopped')}>Answer stopped</button><button className="pill" onClick={() => setDialogId('guide-unavailable')}>Guide unavailable</button></div>
              <div className="notice info" style={{ marginTop: 16 }}>{guideState === 'answering' ? 'Answering…' : answer}</div>
              {guideState === 'stopped' && <p className="small muted">The answer stopped. Your question is preserved above — ask it again.</p>}
              <p className="small muted">Example answer, verified: “Does 3 SOL make me whale?” → “Yes. The boundary is cumulative.”</p>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>What this guide is — and is not</h2>
              <p className="muted">I answer only from the approved Nexus facts: small and big joins, invites, when you can take your share, and practice money. I say “unknown” for odds, rewards, or the live launch. I am <strong>not</strong> a wallet, and I cannot check if you are on a list. Never paste a password or secret phrase into me.</p>
              <h3>Test questions — with the correct answers</h3>
              {GUIDE_TESTS.map((t) => (<div key={t.q} className="kv"><span>{t.q}</span><b>{t.a}</b></div>))}
              <div className="row"><button className="pill" onClick={() => go('learn')}>Learn more — the full document</button><button className="pill" onClick={() => go('how-it-works')}>How it works</button></div>
            </div>
          </section>
        )}

        {page === 'how-it-works' && (
          <section>
            <div className="page-head"><p className="eyebrow">How it works</p><h1>The whole system, in order.</h1><p className="muted">Plain words only. No wallet needed to read this.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>1 · Open a capsule</h2><p>Try the free one first. Opening is just a preview — it never moves money.</p>
              <h2>2 · Join with practice coins</h2><p>Choose an amount. You see the split first: 10% to your inviter, 2% to their inviter, 88% to the launch. No inviter? Their share goes to the launch.</p>
              <h2>3 · The sale closes</h2><p>At 15,000 SOL, or when it is closed by hand. Your share is fixed: what you put in ÷ what everyone put in × 400,000,000 tokens.</p>
              <h2>4 · The launch starts</h2><p>The 3-day clock runs. Small joins (2 or less in total) are ready in full. Big joins unlock a little at a time.</p>
              <h2>5 · Take your share</h2><p>Take what is ready. Taking a big share early costs 25% / 15% / 5% / 0%. Most of the cost disappears forever; a small part goes to the rewards pot.</p>
              <h2>6 · Invite, crew up, collect</h2><p>Invite friends, join a Pirates crew, collect device-local points and badges. A game — not money.</p>
              <h2>Allocation math, worked</h2>
              <div className="kv"><span>1 SOL of 100 SOL total</span><b>4,000,000 tokens</b></div>
              <div className="kv"><span>1,000,000 tokens at 12h</span><b>166,667 ready (not 500,000)</b></div>
              <div className="kv"><span>1,000,000 tokens at 36h</span><b>500,000 ready</b></div>
              <div className="kv"><span>1,000 tokens taken at 12h</span><b>750 kept · 200 burned · 50 to the pot</b></div>
              <div className="row"><button className="pill" onClick={() => go('ai-guide')}>Ask the guide</button><button className="pill" onClick={() => go('safety')}>Safety &amp; support</button><button className="pill" onClick={() => go('terms')}>Terms &amp; privacy</button></div>
            </div>
          </section>
        )}

        {page === 'safety' && (
          <section>
            <div className="page-head"><p className="eyebrow">Safety &amp; support</p><h1>Stay safe. Get help.</h1><p className="muted">Nexus never asks for your password or secret phrase. Anyone who does is not Nexus.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Three rules</h2>
              <p>1 · Never share a secret phrase or password — not here, not anywhere.<br />2 · Test SOL has no cash value. Nobody can sell you “real” Nexus tokens here.<br />3 · If a deal sounds guaranteed, it is not Nexus.</p>
              <p><strong>Nexus never asks for a seed phrase or private key. Ever.</strong> Any screen that does is not Nexus.</p>
              <div className="row"><button className="pill" onClick={() => go('learn')}>Learn more — the full document</button><button className="pill" onClick={() => go('recovery')}>Recovery states</button></div>
              <h2>Ask for help</h2>
              <div className="field"><label>What do you need help with?</label><input value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} placeholder="e.g. I cannot see my vault" /></div>
              <button className="btn" style={{ width: 'auto' }} onClick={() => { if (!supportMsg.trim()) { setNotice('Write a line about the problem first.'); return } setDialogId('support-received') }}>Send the request</button>
              <p className="small muted">Example: replies within 2 working days. Reference example: NEX-HELP-1042.</p>
              <div className="row"><button className="pill" onClick={() => setDialogId('support-failed')}>Support submission failed</button><button className="pill" onClick={() => go('recovery')}>Recovery states</button></div>
            </div>
          </section>
        )}

        {page === 'recovery' && (
          <section>
            <div className="page-head"><p className="eyebrow">Recovery states</p><h1>Something went wrong? Start here.</h1><p className="muted">Session problems, access problems, and campaigns that cannot be found.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Session &amp; access</h2>
              <p className="muted">Sign-in links expire after one hour. Sessions expire too. Drafts are saved — nothing is lost.</p>
              <div className="row"><button className="pill" onClick={() => setDialogId('session-expired')}>Session expired</button><button className="pill" onClick={() => setDialogId('signin-expired')}>Sign-in link expired</button><button className="pill" onClick={() => setDialogId('sign-out')}>Sign out</button></div>
              <h2>Missing campaign</h2>
              <p className="muted">If a campaign cannot be found, check the spelling of the link, then check whether you are signed in to the right studio. Deleted drafts cannot be recovered.</p>
              <div className="row"><button className="pill" onClick={() => go('campaigns')}>Back to Campaigns</button><button className="pill" onClick={() => go('safety')}>Ask for help</button></div>
            </div>
          </section>
        )}

        {page === 'terms' && (
          <section>
            <div className="page-head"><p className="eyebrow">Campaign terms &amp; privacy</p><h1>The rules, in plain words.</h1><p className="muted">Campaign terms and privacy, as they stand in this test world.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Campaign terms (example)</h2>
              <p>Packages are sold by written scope only — no checkout here. Devnet Pilot is free for 7 days, first campaign only. Studio is 750 USDC for 14 days. Growth is 2,000 USDC for 30 days. Sponsored rewards are invoiced and tracked separately.</p>
              <p>Refund: full before start, 50% within the first 3 days, none after day 3 unless Nexus fails to deliver. Unused rewards are always returned. This does not refund practice coins put into the launch.</p>
              <h2>Privacy (example)</h2>
              <p>Demo data stays in this demo. No real wallet, no real money, no real personal data is collected here. Studio sign-in uses an email link — the email is used only to send that link.</p>
              <div className="row"><button className="pill" onClick={() => setDialogId('legal-pending')}>Legal policy pending</button><button className="pill" onClick={() => go('refund-center')}>Refund center</button></div>
            </div>
          </section>
        )}

        {page === 'campaigns' && (
          <section>
            <div className="page-head"><p className="eyebrow">Campaigns</p><h1>Your studio, your playground.</h1><p className="muted">Plan an unpaid pilot. Keep participation evidence in focus.</p></div>
            <div className="stat-cards" style={{ marginTop: 14 }}>
              <div className="stat-card"><div className="stat-label">Visitor sessions</div><div className="stat-num">214</div><p className="small muted">Example value</p></div>
              <div className="stat-card"><div className="stat-label">Player sessions</div><div className="stat-num">96</div><p className="small muted">Example value</p></div>
              <div className="stat-card"><div className="stat-label">Contributing wallets</div><div className="stat-num">55</div><p className="small muted">Example value</p></div>
              <div className="stat-card"><div className="stat-label">Test SOL deposited</div><div className="stat-num">13.7</div><p className="small muted">Example value — test SOL, never revenue</p></div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <span className="tag">New pilot · Draft only</span>
              <h2 style={{ marginTop: 10 }}>Give your next campaign a starting point.</h2>
              <div className="stat-num">FREE</div>
              <p className="muted">7 days · first campaign only</p>
              <div className="field"><label>Campaign name</label><input value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="e.g. Tide Runner — tutorial test" /></div>
              <div className="field"><label>Studio name</label><input value={campStudio} onChange={(e) => setCampStudio(e.target.value)} placeholder="e.g. Reef Games" /></div>
              <div className="field"><label>Campaign objective</label><input value={campObjective} onChange={(e) => setCampObjective(e.target.value)} placeholder="e.g. Test whether players finish the tutorial" /></div>
              <div className="field"><label>Start date</label><input type="date" value={campStart} onChange={(e) => setCampStart(e.target.value)} /></div>
              <div className="field"><label>Duration (days)</label><select value={campDuration} onChange={(e) => setCampDuration(e.target.value)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div>
              <button className="btn" onClick={() => { if (!studioSignedIn) { setDialogId('signin-sent'); return } go('campaign-editor') }}>Sign in to save pilot →</button>
              <p className="small muted">A draft is not a live campaign.</p>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Your campaigns</h2>
              {campaigns.map((c) => (<div key={c.id} className="kv"><span><strong>{c.name}</strong><br /><span className="small muted">{c.studio} · {c.pkg} · {c.status}</span></span><span className="row"><button className="pill" onClick={() => go('campaign-dashboard')}>Dashboard</button><button className="pill" onClick={() => go('campaign-management')}>Manage</button></span></div>))}
              <div className="row"><button className="pill" onClick={() => go('campaign-editor')}>New campaign in the editor</button><button className="pill" onClick={() => go('studio-signin')}>Studio sign-in</button></div>
            </div>
          </section>
        )}

        {page === 'campaign-editor' && (
          <section>
            <div className="page-head"><p className="eyebrow">Campaign editor</p><h1>Name it, aim it, date it.</h1><p className="muted">A draft is not a live campaign. Save it, then review publication when it is ready.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="field"><label>Campaign name</label><input value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="e.g. Tide Runner — tutorial test" /></div>
              <div className="field"><label>Studio name</label><input value={campStudio} onChange={(e) => setCampStudio(e.target.value)} placeholder="e.g. Reef Games" /></div>
              <div className="field"><label>Campaign objective</label><input value={campObjective} onChange={(e) => setCampObjective(e.target.value)} placeholder="e.g. Test whether players finish the tutorial" /></div>
              <div className="field"><label>Start date</label><input type="date" value={campStart} onChange={(e) => setCampStart(e.target.value)} /></div>
              <div className="field"><label>Duration (days)</label><select value={campDuration} onChange={(e) => setCampDuration(e.target.value)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div>
              <div className="field"><label>Package</label><select value={campPkg} onChange={(e) => setCampPkg(e.target.value)}>{PACKAGES.map((p) => <option key={p.name}>{p.name}</option>)}</select></div>
              {campSaved && <p className="notice info" role="status">Draft saved. It is not live — players cannot see it yet.</p>}
              <div className="row">
                <button className="btn" style={{ width: 'auto' }} onClick={saveDraft}>Save draft</button>
                <button className="pill" onClick={() => setDialogId('discard-changes')}>Discard unsaved changes</button>
                <button className="pill" onClick={() => setDialogId('delete-draft')}>Delete draft</button>
                <button className="pill" onClick={() => setDialogId(campName.trim() && campObjective.trim() && campStart ? 'review-publication' : 'publication-blocked')}>Review publication</button>
              </div>
            </div>
          </section>
        )}

        {page === 'campaign-dashboard' && (
          <section>
            <div className="page-head"><p className="eyebrow">Campaign dashboard</p><h1>The numbers, kept separate.</h1><p className="muted">Sessions and wallets are <em>not</em> people. Only verified contributors count as verified — and test SOL is never sales or revenue.</p></div>
            <div className="stat-cards" style={{ marginTop: 14 }}>
              <div className="stat-card"><div className="stat-label">Visitor sessions</div><div className="stat-num">214</div><p className="small muted">Example value</p></div>
              <div className="stat-card"><div className="stat-label">Player sessions</div><div className="stat-num">96</div><p className="small muted">Example value</p></div>
              <div className="stat-card"><div className="stat-label">Contributing wallets</div><div className="stat-num">55</div><p className="small muted">Example value</p></div>
              <div className="stat-card"><div className="stat-label">Test SOL deposited</div><div className="stat-num">13.7</div><p className="small muted">Example value</p></div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="table-wrap"><table><thead><tr><th>Campaign</th><th>Sessions</th><th>Wallets</th><th>Verified</th><th>Test SOL</th></tr></thead><tbody>
                {campaigns.map((c) => (<tr key={c.id}><td><strong>{c.name}</strong><br /><span className="small muted">{c.studio} · {c.pkg} · {c.status}</span></td><td>{c.sessions}</td><td>{c.wallets}</td><td>{c.contributors}</td><td>{c.testSol}</td></tr>))}
              </tbody></table></div>
              <div className="row" style={{ marginTop: 12 }}><button className="pill" onClick={() => go('campaign-report')}>Campaign report</button><button className="pill" onClick={() => go('campaign-management')}>Manage this campaign</button><button className="pill" onClick={() => go('launch-controls')}>Launch controls</button></div>
            </div>
          </section>
        )}

        {page === 'campaign-management' && (
          <section>
            <div className="page-head"><p className="eyebrow">Campaign management</p><h1>Manage a campaign.</h1><p className="muted">Edit, publish, cancel, refund — each step has its own review.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              {campaigns.map((c) => (<div key={c.id} className="kv"><span><strong>{c.name}</strong><br /><span className="small muted">{c.studio} · {c.pkg} · {c.status}</span></span><span className="row"><button className="pill" onClick={() => go('campaign-editor')}>Edit</button><button className="pill" onClick={() => go('campaign-dashboard')}>Dashboard</button><button className="pill" onClick={() => go('campaign-report')}>Report</button></span></div>))}
              <div className="row" style={{ marginTop: 12 }}>
                <button className="pill" onClick={() => setDialogId('review-publication')}>Review publication</button>
                <button className="pill" onClick={() => setDialogId('cancel-campaign')}>Cancel campaign</button>
                <button className="pill" onClick={() => go('refund-center')}>Refund center</button>
                <button className="pill" onClick={() => go('campaign-live')}>Campaign live</button>
              </div>
            </div>
          </section>
        )}

        {page === 'campaign-report' && (
          <section>
            <div className="page-head"><p className="eyebrow">Campaign report</p><h1>The results.</h1><p className="muted">What happened, in plain numbers. Gaps are shown as gaps — never filled in with a guess.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Tide Runner — tutorial test (example)</h2>
              <div className="kv"><span>Visitor sessions</span><b>128 (example)</b></div>
              <div className="kv"><span>Player sessions</span><b>64 (example)</b></div>
              <div className="kv"><span>Contributing wallets</span><b>34 (example)</b></div>
              <div className="kv"><span>Verified contributors</span><b>6 (example)</b></div>
              <div className="kv"><span>Test SOL deposited</span><b>9.5 (example — never revenue)</b></div>
              <div className="kv"><span>Day 2 verified contributors</span><b>Missing — see data gap</b></div>
              <div className="row">
                <button className="pill" onClick={() => setDialogId('export-report')}>Export campaign report</button>
                <button className="pill" onClick={() => setDialogId('report-gap')}>Report data gap</button>
                <button className="pill" onClick={() => go('campaign-dashboard')}>Back to dashboard</button>
              </div>
            </div>
          </section>
        )}

        {page === 'campaign-live' && (
          <section>
            <div className="page-head"><p className="eyebrow">Campaign live</p><h1>Your campaign is live.</h1><p className="muted">Players can find it now. Watch the dashboard for sessions, wallets and verified contributors.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>{campName.trim() || 'Tide Runner — tutorial test'} (example)</h2>
              <div className="kv"><span>Status</span><b>Live (example)</b></div>
              <div className="kv"><span>Link</span><b>Example: nexus.example/c/tide-runner</b></div>
              <div className="kv"><span>Package</span><b>{campPkg} — {campDuration} days</b></div>
              <div className="row"><button className="pill" onClick={() => go('campaign-dashboard')}>View the dashboard</button><button className="pill" onClick={() => go('public-campaign')}>See the public page</button><button className="pill" onClick={() => go('campaign-management')}>Manage</button></div>
            </div>
          </section>
        )}

        {page === 'campaign-completed' && (
          <section>
            <div className="page-head"><p className="eyebrow">Campaign completed</p><h1>The campaign ran its course.</h1><p className="muted">Here is what happened — and what happens next.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Tide Runner — tutorial test (example)</h2>
              <div className="kv"><span>Status</span><b>Completed — report issued</b></div>
              <div className="kv"><span>Verified contributors</span><b>6 (example)</b></div>
              <div className="kv"><span>Test SOL deposited</span><b>9.5 (example)</b></div>
              <div className="kv"><span>Unused rewards</span><b>Returned in full (example)</b></div>
              <div className="row"><button className="pill" onClick={() => go('campaign-report')}>Read the report</button><button className="pill" onClick={() => go('campaigns')}>Plan the next one</button></div>
            </div>
          </section>
        )}

        {page === 'campaign-cancelled' && (
          <section>
            <div className="page-head"><p className="eyebrow">Campaign cancelled</p><h1>This campaign was cancelled.</h1><p className="muted">Players no longer see it. Refunds follow the refund rules.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Harbour Quest — onboarding (example)</h2>
              <div className="kv"><span>Status</span><b>Cancelled</b></div>
              <div className="kv"><span>Refund</span><b>See the Refund center — full before start, 50% within 3 days</b></div>
              <div className="kv"><span>Unused rewards</span><b>Returned in full (example)</b></div>
              <div className="row"><button className="pill" onClick={() => go('refund-center')}>Refund center</button><button className="pill" onClick={() => go('campaigns')}>Back to Campaigns</button></div>
            </div>
          </section>
        )}

        {page === 'public-campaign' && (
          <section>
            <div className="page-head"><p className="eyebrow">Public campaign</p><h1>What players see.</h1><p className="muted">This is the public page for a campaign — the same words players read.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>{campName.trim() || 'Tide Runner — tutorial test'}</h2>
              <p className="muted">{campObjective.trim() || 'Test whether players finish the tutorial — and find out where they get stuck.'}</p>
              <div className="kv"><span>Studio</span><b>{campStudio.trim() || 'Reef Games'} (example)</b></div>
              <div className="kv"><span>Package</span><b>{campPkg} — {campDuration} days</b></div>
              <div className="kv"><span>Cost to players</span><b>Nothing to look — practice coins only to join</b></div>
              <HeroCity />
              <div className="row" style={{ marginTop: 14 }}><button className="btn" style={{ width: 'auto' }} onClick={() => go('capsules')}>Open a capsule</button><button className="pill" onClick={() => go('campaign-dashboard')}>Studio dashboard</button></div>
            </div>
          </section>
        )}

        {page === 'studio-signin' && (
          <section>
            <div className="page-head"><p className="eyebrow">Studio sign-in</p><h1>Sign in with a link.</h1><p className="muted">No password. We send a link to your email — it expires in one hour.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              {studioSignedIn ? (<><h2>Signed in</h2><p className="muted">Signed in as {studioEmail || 'studio@reefgames.example'} (example).</p><div className="row"><button className="btn" style={{ width: 'auto' }} onClick={() => go('campaigns')}>Go to Campaigns</button><button className="pill" onClick={() => setDialogId('sign-out')}>Sign out</button></div></>) : (<>
                <div className="field"><label>Work email</label><input type="email" value={studioEmail} onChange={(e) => setStudioEmail(e.target.value)} placeholder="studio@reefgames.example" /></div>
                <button className="btn" onClick={() => { if (!studioEmail.includes('@')) { setNotice('Enter a work email first.'); return } setStudioSignedIn(true); setDialogId('signin-sent') }}>Send sign-in link</button>
                <p className="small muted">The link expires in one hour. If it does not arrive, check spam — or ask for a new one.</p>
                <div className="row"><button className="pill" onClick={() => setDialogId('signin-expired')}>Sign-in link expired</button><button className="pill" onClick={() => setDialogId('session-expired')}>Session expired</button></div>
              </>)}
            </div>
          </section>
        )}

        {page === 'launch-controls' && (
          <section>
            <div className="page-head"><p className="eyebrow">Launch controls</p><h1>The launch checklist.</h1><p className="muted">Authority steps — gates are separate from wallet approval. Nothing here is live yet.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Readiness checklist</h2>
              {[
                ['01', 'Reviewed source & tests', 'SOURCE AVAILABLE', 'ok'],
                ['02', 'Funded deployment signer', 'AWAITING APPROVAL', 'warn'],
                ['03', 'Verified devnet program & mint', 'NOT VERIFIED', 'gated'],
                ['04', 'Escrow funding & airdrop dataset', 'NOT VERIFIED', 'gated'],
                ['05', 'Full deposit-to-claim execution', 'NOT VERIFIED', 'gated'],
              ].map(([n, label, status, tone]) => (
                <div key={n} className="kv"><span><strong>{n}</strong> · {label}</span><span className={`tag ${tone === 'ok' ? 'ok' : tone === 'warn' ? 'warn' : 'gated'}`}>{status}</span></div>
              ))}
              <p className="small muted">Authority wallet: <code>BHxkjg3MvcWitw6i2MQDNrCWmC6vqB5U98C3JUk8LmTB</code> — a public address is not proof of control.</p>
              <h2>Launch steps</h2>
              <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <button className="btn ghost" onClick={() => setDialogId('init-pool-review')}>1 · Initialise pool</button>
                <button className="btn ghost" onClick={() => setDialogId('finalize-review')}>2 · Finalise sale</button>
                <button className="btn ghost" onClick={() => setDialogId('activate-review')}>3 · Activate launch</button>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="pill" onClick={() => setDialogId('authority-denied')}>Authority access denied</button>
                <button className="pill" onClick={() => go('builders')}>For builders &amp; studios</button>
              </div>
              <p className="small muted">These are authority steps, not wallet approvals. The authority wallet must be connected — and all gates cleared — before any step can run.</p>
            </div>
          </section>
        )}

        {page === 'refund-center' && (
          <section>
            <div className="page-head"><p className="eyebrow">Refund center</p><h1>Refunds, worked out in the open.</h1><p className="muted">Full before start, 50% within the first 3 days, none after day 3 unless Nexus fails to deliver. Unused rewards are always returned.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="field"><label>Package amount (USDC)</label><input type="number" min="0" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} /></div>
              <div className="field"><label>Day of request (0 = before start)</label><input type="number" min="0" max="30" value={refundDay} onChange={(e) => setRefundDay(e.target.value)} /></div>
              <div className="kv"><span>Refund rate</span><b>{refundPct}%</b></div>
              <div className="kv"><span>Refund amount</span><b>{refundValue.toLocaleString()} USDC</b></div>
              <div className="kv"><span>Unused rewards</span><b>Returned in full</b></div>
              <div className="row">
                <button className="btn" style={{ width: 'auto' }} onClick={() => setDialogId('review-refund-calc')}>Review the calculation</button>
                <button className="pill" onClick={() => setDialogId('request-hosting-refund')}>Request hosting refund</button>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="pill" onClick={() => setDialogId('refund-received')}>Refund request received</button>
                <button className="pill" onClick={() => setDialogId('refund-review')}>Under review</button>
                <button className="pill" onClick={() => setDialogId('refund-approved')}>Approved</button>
                <button className="pill" onClick={() => setDialogId('refund-processing')}>Processing</button>
                <button className="pill" onClick={() => setDialogId('refund-completed')}>Completed</button>
                <button className="pill" onClick={() => setDialogId('refund-rejected')}>Rejected</button>
                <button className="pill" onClick={() => setDialogId('refund-failed')}>Failed</button>
              </div>
            </div>
          </section>
        )}

        {page === 'business' && (
          <section>
            <div className="page-head"><p className="eyebrow">Business</p><h1>How Nexus earns — and what it costs.</h1><p className="muted">Packages, written scope, readiness, and the split between hosting fees and reward funding.</p></div>
            <div className="grid cols-2" style={{ marginTop: 14 }}>
              {PACKAGES.map((p) => (
                <article key={p.name} className="card"><h3>{p.name}</h3><div className="stat-num">{p.price}</div><p className="small muted">{p.days} · USDC on Solana, by invoice only — no checkout.</p><ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul><span className={`tag ${p.tag === 'GATED' ? 'gated' : 'ok'}`}>{p.tag}</span></article>
              ))}
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Written scope, not a checkout</h2>
              <p className="muted">Every package is sold by written scope. Sponsored rewards are invoiced and tracked separately from hosting fees.</p>
              <h2>Commercial readiness</h2>
              <div className="kv"><span>Devnet pilots</span><b>5 unpaid pilots planned — not started</b></div>
              <div className="kv"><span>Security review</span><b>Not done — needed before mainnet</b></div>
              <div className="kv"><span>Legal review</span><b>Not done — needed before mainnet</b></div>
              <div className="row"><button className="pill" onClick={() => go('business-model')}>Business model</button><button className="pill" onClick={() => go('campaigns')}>Plan a pilot</button><button className="pill" onClick={() => go('refund-center')}>Refund center</button></div>
            </div>
          </section>
        )}

        {page === 'business-model' && (
          <section>
            <div className="page-head"><p className="eyebrow">Business model</p><h1>The model, on one page.</h1><p className="muted">Canvas, unit economics and the roadmap — all labelled as examples where they are examples.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>The model, in full</h2>
              <p className="muted">The canvas, the five scholarly models, pricing and unit economics, and operations each have their own page — all from v2.0, all labelled where they are examples.</p>
              <div className="row">
                <button className="pill" onClick={() => go('canvas')}>Business Model Canvas</button>
                <button className="pill" onClick={() => go('models')}>The five scholarly models</button>
                <button className="pill" onClick={() => go('pricing')}>Pricing &amp; unit economics</button>
                <button className="pill" onClick={() => go('operations')}>Operations</button>
                <button className="pill" onClick={() => go('gates')}>Gates, risk &amp; checklists</button>
              </div>
              <h2>Unit economics (example)</h2>
              <div className="kv"><span>Studio package</span><b>750 USDC</b></div>
              <div className="kv"><span>Variable cost</span><b>Example: 150 USDC</b></div>
              <div className="kv"><span>Contribution</span><b>Example: 600 USDC — 80% margin</b></div>
              <div className="kv"><span>Break-even</span><b>Example: 5 campaigns at 3,000 USDC fixed overhead</b></div>
              <h2>Release roadmap (example)</h2>
              <p className="muted">1 · Devnet pilots (5 unpaid) → 2 · Verified deposit-to-claim run → 3 · Security + legal review → 4 · Commercial launch decision. None of these is done yet.</p>
              <div className="row"><button className="pill" onClick={() => go('business')}>Back to Business</button><button className="pill" onClick={() => go('launch-controls')}>Launch readiness</button><button className="pill" onClick={() => go('mainnet')}>Mainnet readiness</button></div>
            </div>
          </section>
        )}

        {page === 'builders' && (
          <section>
            <div className="page-head"><p className="eyebrow">For builders &amp; studios</p><h1>The technical pages.</h1><p className="muted">Kept here on purpose, so new players are never confused by them.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Token supply — 1,000,000,000 in total</h2>
              <div className="kv"><span>Presale pool</span><b>400M (40%)</b></div>
              <div className="kv"><span>Airdrop pool</span><b>100M (10%) — Merkle list only, no approved list yet</b></div>
              <div className="kv"><span>Recommended remainder (not approved)</span><b>500M — Liquidity 150M · Ecosystem 100M · Team 100M · Treasury 100M · Marketing 50M</b></div>
              <div className="kv"><span>Hard cap</span><b>15,000 SOL</b></div>
              <div className="kv"><span>Burned in simulation</span><b>{fmtTokens(burned)} NEXUS</b></div>
              <div className="kv"><span>Rewards escrow</span><b>{fmtTokens(escrow)} NEXUS</b></div>
              <p className="small muted">6 decimals. Supply can only fall, via verified burns. Program id (placeholder, not deployed): <code>3py1rKZt6n5CicNQELDRFWrAZx9zBXurX6wYAZxG2B8i</code>. Authority (public address only): <code>BHxkjg3MvcWitw6i2MQDNrCWmC6vqB5U98C3JUk8LmTB</code>.</p>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Contract — 14 worked-example checks · {passed}/14 pass</h2>
              <p className="muted small">Computed live from <code>src/lib/math.ts</code>, a mirror of <code>contracts/crates/nexus-math</code>.</p>
              <div className="table-wrap"><table><thead><tr><th>#</th><th>Check</th><th>Expected</th><th>Actual</th><th>Result</th></tr></thead><tbody>{checks.map((c) => (<tr key={c.id}><td>{c.id}</td><td>{c.label}</td><td>{c.expected}</td><td>{c.actual}</td><td className={c.pass ? 'check-pass' : 'check-fail'}>{c.pass ? 'PASS' : 'FAIL'}</td></tr>))}</tbody></table></div>
              <h3 style={{ marginTop: 18 }}>Penalty table</h3>
              <div className="table-wrap"><table><thead><tr><th>Claim time</th><th>Rate</th><th>On 1,000 gross: net / burned / escrow</th></tr></thead><tbody>
                <tr><td>0 to &lt;24h</td><td>25%</td><td>750 / 200 / 50</td></tr>
                <tr><td>24h to &lt;48h (at exactly 24h: 15%)</td><td>15%</td><td>850 / 120 / 30</td></tr>
                <tr><td>48h to &lt;72h</td><td>5%</td><td>950 / 40 / 10</td></tr>
                <tr><td>72h and later</td><td>0%</td><td>1,000 / 0 / 0</td></tr>
              </tbody></table></div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Launch Gates 1–5 — still open</h2>
              <ol>
                <li><strong>Gate 1:</strong> reviewed source + tests — <span className="tag warn">In progress</span> — anchor test running (Phase 1 on-chain tests, separate run).</li>
                <li><strong>Gate 2:</strong> devnet configuration — <span className="tag warn">Open</span> — no funded deployment signer.</li>
                <li><strong>Gate 3:</strong> complete devnet execution — <span className="tag warn">Open</span> — deposit → claim not verified on-chain.</li>
                <li><strong>Gate 4:</strong> 5 unpaid devnet pilots — <span className="tag gated">Not started</span></li>
                <li><strong>Gate 5:</strong> commercial readiness + mainnet decision — <span className="tag gated">Not started</span> — needs independent security + legal review.</li>
              </ol>
              <p className="small muted">Deliberately absent from the contract: no SOL withdrawal / liquidity-migration instruction and no contribution-refund instruction. Do not accept production funds expecting one.</p>
              <div className="row"><button className="pill" onClick={() => go('launch-controls')}>Launch controls</button><button className="pill" onClick={() => go('mainnet')}>Mainnet readiness</button><button className="pill" onClick={() => go('gates')}>Gates, risk &amp; checklists</button><button className="pill" onClick={() => go('campaign-dashboard')}>Campaign dashboard</button></div>
            </div>
          </section>
        )}

        {page === 'mainnet' && (
          <section>
            <div className="page-head"><p className="eyebrow">Network &amp; mainnet readiness</p><h1>Mainnet-ready, not mainnet-live.</h1><p className="muted">The target and the truth, side by side. Nothing here is live on mainnet.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <p><strong>{DEVNET_FIRST}</strong></p>
              <div className="kv"><span>Target network</span><b>Solana mainnet-beta</b></div>
              <div className="kv"><span>Current network</span><b>Solana devnet (test network)</b></div>
              <div className="kv"><span>Deposits &amp; claims</span><b>GATED — simulated, test SOL only, until Gates 1–3 pass</b></div>
              <div className="kv"><span>Paid checkout</span><b>Not active</b></div>
              <div className="kv"><span>Production reward custody</span><b>Not active</b></div>
              <div className="kv"><span>Mainnet launch</span><b>Not active — needs its own approval + independent security review</b></div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Gates 1–5 — pass / kill criteria</h2>
              {GATES.map((g) => (
                <div key={g.n} style={{ marginBottom: 14 }}>
                  <h3>Gate {g.n} · {g.title} — <span className={`tag ${g.status === 'in-progress' ? 'warn' : 'gated'}`}>{g.statusText}</span></h3>
                  <p className="small muted">Pass requires: {g.pass}</p>
                  <p className="small muted">Kill / hold if: {g.kill}</p>
                </div>
              ))}
              <p className="small muted">No gate, no launch. No evidence, no claim. No timeline overrides a gate.</p>
              <div className="row"><button className="pill" onClick={() => go('gates')}>Gates, risk &amp; checklists</button><button className="pill" onClick={() => go('launch-controls')}>Launch controls</button><button className="pill" onClick={() => go('builders')}>For builders &amp; studios</button></div>
            </div>
          </section>
        )}

        {page === 'token' && (
          <section>
            <div className="page-head"><p className="eyebrow">Token economics</p><h1>1 billion cap. Proportional means everyone pays the same price.</h1><p className="muted">The contract requires a standard SPL mint with 6 decimals (1 NEXUS = 1,000,000 base units), exactly 1,000,000,000 minted, and mint + freeze authority revoked at initialisation. Those are requirements for a future configured mint — not proof a live mint exists.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>The buckets</h2>
              <div className="table-wrap"><table><thead><tr><th>Bucket</th><th>Amount</th><th>Status</th><th>Rule</th></tr></thead><tbody>
                <tr><td><strong>Presale</strong></td><td>400M (40%)</td><td>ESCROW DESIGN</td><td>Proportional allocation at sale close</td></tr>
                <tr><td><strong>Airdrop</strong></td><td>100M (10%)</td><td>ESCROW DESIGN</td><td>Merkle-list only; vests 72h, no penalty</td></tr>
                <tr><td><strong>Liquidity</strong></td><td>150M</td><td>RECOMMENDED — NOT approved</td><td rowSpan={5}>Must be visibly accounted for and locked/vested per a published schedule before launch — or the launch does not proceed. Requires founder approval and a locking/vesting mechanism that does not yet exist.</td></tr>
                <tr><td><strong>Ecosystem</strong></td><td>100M</td><td>RECOMMENDED — NOT approved</td></tr>
                <tr><td><strong>Team</strong></td><td>100M</td><td>RECOMMENDED — NOT approved</td></tr>
                <tr><td><strong>Treasury</strong></td><td>100M</td><td>RECOMMENDED — NOT approved</td></tr>
                <tr><td><strong>Marketing</strong></td><td>50M</td><td>RECOMMENDED — NOT approved</td></tr>
              </tbody></table></div>
              <div className="kv"><span>Supply rule</span><b>1B is a mint cap. Supply can only fall, via verified SPL burns. No re-minting once mint authority is revoked.</b></div>
              <div className="kv"><span>Retail</span><b>Fully claimable after finalisation + launch activation. Claimable is not tradable; no listing is promised.</b></div>
              <div className="kv"><span>65.12 USD/SOL</span><b>A fixed illustrative baseline from v1 — not a live price. No market-cap figure in this document is a forecast or promise.</b></div>
              <div className="kv"><span>Allocation</span><b>Your gross ÷ total gross × 400,000,000. Example: 1 SOL of 100 SOL total → 4,000,000 tokens. Hard cap: 15,000 SOL.</b></div>
              <p className="small muted">The contract in this phase has no SOL withdrawal or liquidity-migration instruction — do not promise migration it cannot do.</p>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Vesting, worked — corrected (v1 Part C.6 was wrong)</h2>
              <div className="table-wrap"><table><thead><tr><th>Whale with 7,200 tokens</th><th>Vested</th></tr></thead><tbody>
                <tr><td>At 12 hours</td><td><b>1,200</b></td></tr>
                <tr><td>At 24 hours</td><td><b>2,400</b></td></tr>
                <tr><td>At 48 hours</td><td><b>4,800</b></td></tr>
                <tr><td>At 72 hours</td><td><b>7,200</b></td></tr>
              </tbody></table></div>
              <p className="muted">A separate 1,000,000-token whale claiming the vested amount at hour 12 claims <strong>166,667 gross</strong>, not 500,000 (500,000 is the 36-hour figure). Penalty 25% = <strong>41,667</strong> (33,334 burned, 8,333 to escrow, subject to base-unit rounding), net <strong>125,000</strong>.</p>
              <div className="kv"><span>Claimable</span><b>Vested − already gross-claimed, never below zero</b></div>
              <div className="kv"><span>Who governs time</span><b>The network clock. Device clock and the Vault slider govern nothing.</b></div>
              <div className="kv"><span>Registration</span><b>Does not restart the clock</b></div>
              <div className="kv"><span>Splitting payments</span><b>Does not preserve retail status — tier is cumulative</b></div>
              <div className="row"><button className="pill" onClick={() => go('vault')}>See the Vault</button><button className="pill" onClick={() => go('flows')}>Referrals &amp; money flows</button><button className="pill" onClick={() => go('builders')}>The 14 worked-example checks</button></div>
            </div>
          </section>
        )}

        {page === 'flows' && (
          <section>
            <div className="page-head"><p className="eyebrow">Referrals &amp; money flows</p><h1>10 / 2 / 88 — paid on-chain, in the same transaction, or not at all.</h1><p className="muted">Missing shares always go to the pool — never silently to Nexus. Integer rounding remainder stays with the pool.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>The split</h2>
              <div className="table-wrap"><table><thead><tr><th>From a valid deposit</th><th>Share</th><th>On 10 SOL</th><th>On 1 SOL, no referrers</th></tr></thead><tbody>
                <tr><td>Direct referrer</td><td>10%</td><td>1.00 SOL</td><td>Redirected to pool</td></tr>
                <tr><td>Upline (referrer&apos;s referrer)</td><td>2%</td><td>0.20 SOL</td><td>Redirected to pool</td></tr>
                <tr><td>Protocol SOL vault (pool)</td><td>88%</td><td>8.80 SOL</td><td><strong>1.00 SOL total</strong></td></tr>
              </tbody></table></div>
              <h2>Rules that keep it fair</h2>
              <ul>
                <li>Ancestry is fixed at a wallet&apos;s <strong>first</strong> deposit; a valid parent must predate the child.</li>
                <li>No self-referral, no cycles — checked by the contract.</li>
                <li>Two levels only. Commission on a real contribution. No recruitment fee chain.</li>
                <li>Never promise passive or guaranteed earnings. Income is conditional on valid, successful transactions.</li>
                <li>The builder may use the authority address as a no-referral sentinel. That is routing, <strong>not</strong> a founder commission.</li>
                <li>Review resolved recipients before signing.</li>
              </ul>
              <h2>What referrals are not</h2>
              <p className="muted">Not proof of a unique human — one person can control many wallets. Not complete Sybil protection. Not a pyramid: two levels only, commission on a real contribution, no recruitment fee chain.</p>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Three money flows — never mix them</h2>
              <div className="table-wrap"><table><thead><tr><th>Flow</th><th>What moves</th><th>Where it goes</th><th>Booked as</th></tr></thead><tbody>
                <tr><td><strong>A. Protocol contributions</strong></td><td>Wallet-approved SOL deposits</td><td>Referral shares + contract SOL vault</td><td>Not company revenue</td></tr>
                <tr><td><strong>B. Campaign service fees</strong></td><td>Studio hosting fee, USDC on Solana, by invoice</td><td>Treasury, against a written scope</td><td>Service revenue when earned per the agreement</td></tr>
                <tr><td><strong>C. Sponsored rewards</strong></td><td>Studio reward budget, invoiced separately</td><td>Separately tracked obligation: pay approved rewards or return unused</td><td>Not revenue</td></tr>
              </tbody></table></div>
              <p className="muted">Example: studio fee 750 USDC + illustrative 300 USDC reward budget = 1,050 USDC invoiced if collected together under approved terms. Revenue is still only the earned fee portion. A USDC quote must never be silently converted into a SOL deposit.</p>
              <div className="row"><button className="pill" onClick={() => go('earn')}>Earn — try the numbers</button><button className="pill" onClick={() => go('pricing')}>Pricing &amp; unit economics</button></div>
            </div>
          </section>
        )}

        {page === 'evidence' && (
          <section>
            <div className="page-head"><p className="eyebrow">Evidence classes</p><h1>The reporting rule that protects everyone.</h1><p className="muted">Displaying a number is not calculating it from chain data. Keep the classes separate on every page, every report, every export.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="table-wrap"><table><thead><tr><th>Label</th><th>Counts</th><th>Never say</th></tr></thead><tbody>
                {EVIDENCE.map((e) => (<tr key={e.label}><td><strong>{e.label}</strong></td><td>{e.counts}</td><td>{e.never}</td></tr>))}
              </tbody></table></div>
              <p className="small muted">Exports must carry evidence class + network beside every number.</p>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Transaction statuses</h2>
              {TX_STATUSES.map((t) => (<div key={t.status} className="kv"><span><strong>{t.status}</strong></span><b>{t.meaning}</b></div>))}
              <p className="muted">Awaiting approval → Submitted (signature returned) → Confirmed → <strong>Finalised</strong> (the standard for campaign counting). Failed requires affirmative evidence. Unknown means evidence is incomplete — it is not proof of loss or failure.</p>
              <div className="row"><button className="pill" onClick={() => go('activity-evidence')}>Activity with evidence</button><button className="pill" onClick={() => go('campaign-dashboard')}>Campaign dashboard</button></div>
            </div>
          </section>
        )}

        {page === 'wallet-safety' && (
          <section>
            <div className="page-head"><p className="eyebrow">Wallet safety</p><h1>The 5 checks — every time, before you sign.</h1><p className="muted">A preview never moves SOL, awards tokens, or proves a transaction. A signature is a receipt, not instant settlement.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              {WALLET_SAFETY.map((c) => (<div key={c.n} style={{ marginBottom: 12 }}><h3>{c.n} · {c.title}</h3><p className="muted">{c.text}</p></div>))}
              <p><strong>Nexus never asks for a seed phrase or private key. Ever.</strong></p>
              <p className="muted">If a connection drops, check the signature on an explorer before ever repeating a payment. Submitted can still expire or fail.</p>
              <div className="row"><button className="pill" onClick={() => go('wallet')}>Wallet connection</button><button className="pill" onClick={() => go('safety')}>Safety &amp; support</button></div>
            </div>
          </section>
        )}

        {page === 'faq' && (
          <section>
            <div className="page-head"><p className="eyebrow">FAQ — honest answers</p><h1>Short answers. No promises.</h1><p className="muted">If the answer is no, it says no.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              {FAQ.map((f) => (<div key={f.q} className="kv"><span>{f.q}</span><b>{f.a}</b></div>))}
              <div className="row"><button className="pill" onClick={() => go('ai-guide')}>Ask the guide</button><button className="pill" onClick={() => go('safety')}>Safety &amp; support</button></div>
            </div>
          </section>
        )}

        {page === 'canvas' && (
          <section>
            <div className="page-head"><p className="eyebrow">Business Model Canvas</p><h1>The nine blocks must fit, or the price is wrong.</h1><p className="muted">After Osterwalder &amp; Pigneur, Business Model Generation (2010) / Strategyzer. The canvas is a set of testable assumptions, not a poster.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              {CANVAS.map((b) => (<div key={b.block} style={{ marginBottom: 12 }}><h3>{b.block}</h3><p className="muted">{b.text}</p></div>))}
              <p className="muted">{CANVAS_TEST}</p>
              <p className="small muted">Scheme — how to use the canvas: pin it, date it, and rewrite any block the moment a pilot contradicts it. A canvas that never changes is decoration. Central tension: a premium, hands-on service cannot be priced as if it were automated software.</p>
              <div className="row"><button className="pill" onClick={() => go('models')}>The five scholarly models</button><button className="pill" onClick={() => go('pricing')}>Pricing &amp; unit economics</button></div>
            </div>
          </section>
        )}

        {page === 'models' && (
          <section>
            <div className="page-head"><p className="eyebrow">The five scholarly models</p><h1>Five models, one operating system for Nexus.</h1><p className="muted">Each model answers a different question, comes from peer-reviewed or canonical scholarly work, and ends with a decision rule and a metric — so it changes behaviour, not just vocabulary. Together: Canvas → Lean → Platform → Positioning → Jobs/Traction/Flywheel.</p></div>
            {MODELS.map((m) => (
              <div key={m.n} className="card" style={{ marginTop: 14 }}>
                <p className="eyebrow">Model {m.n}</p>
                <h2>{m.name}</h2>
                <p className="small muted">{m.scholars}</p>
                <p><strong>Question:</strong> {m.question}</p>
                <p className="muted">{m.application}</p>
                <div className="kv"><span>Decision rule</span><b>{m.rule}</b></div>
                <div className="kv"><span>Metric</span><b>{m.metric}</b></div>
              </div>
            ))}
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Supporting lens</h2>
              <p className="muted">Silbiger, The Ten-Day MBA — assign one owner + one dashboard across marketing, operations, finance, accounting, and strategy. Books inform decisions; they never replace cash reconciliation, legal advice, or security testing.</p>
              <div className="row"><button className="pill" onClick={() => go('canvas')}>Business Model Canvas</button><button className="pill" onClick={() => go('operations')}>Operations</button></div>
            </div>
          </section>
        )}

        {page === 'pricing' && (
          <section>
            <div className="page-head"><p className="eyebrow">Pricing &amp; unit economics</p><h1>Free pilot, 750 Studio, 2,000 Growth — sold only when ready.</h1><p className="muted">Prices are chosen business terms. Nothing GATED may be sold as included until delivery is proven. Payment by invoice only, after written confirmation and readiness checks. No checkout here.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="table-wrap"><table><thead><tr><th>Package</th><th>Price</th><th>Duration</th><th>Includes — only if tagged ready</th><th>Tag</th></tr></thead><tbody>
                {PRICING_ROWS.map((r) => (<tr key={r.pkg}><td><strong>{r.pkg}</strong></td><td>{r.price}</td><td>{r.duration}</td><td>{r.includes}</td><td><span className={`tag ${r.tag === 'GATED' ? 'gated' : 'ok'}`}>{r.tag}</span></td></tr>))}
              </tbody></table></div>
              <p className="muted">Currency: USDC on Solana — verify the actual mint + network; a ticker alone is insufficient. Sponsored rewards are always invoiced separately.</p>
              <h2>Refund policy</h2>
              <div className="kv"><span>Before start</span><b>Full refund</b></div>
              <div className="kv"><span>Within the first 3 days</span><b>50%</b></div>
              <div className="kv"><span>After day 3</span><b>None, unless Nexus fails to deliver what was promised</b></div>
              <div className="kv"><span>Unused rewards</span><b>Always returned</b></div>
              <p className="muted">This policy covers hosting fees only. It does not refund practice coins put into the launch — the contract has no contribution-refund instruction.</p>
              <h2>Not yet defined — do not invent</h2>
              <p className="muted">Before any payment, these must be in the signed scope:</p>
              <ul>{PREPAYMENT_BLOCKERS.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Unit economics (example)</h2>
              <div className="kv"><span>Studio</span><b>750 − 150 variable = 600 contribution, 80% margin</b></div>
              <div className="kv"><span>Growth</span><b>2,000 − 500 variable = 1,500 contribution, 75% margin — the 500 variable cost is a v2.0 planning assumption, not a v1 figure; validate from time records in the first paid campaigns</b></div>
              <div className="kv"><span>Break-even</span><b>5 campaigns at 3,000 USDC fixed overhead; 6 with 100 USDC CAC per campaign (contribution falls to 500)</b></div>
              <p className="small muted">Contribution is not net profit. Replace every assumption with real invoices before quoting this.</p>
              <h2>Scenarios — illustrative only, not forecasts</h2>
              <div className="table-wrap"><table><thead><tr><th>Scenario</th><th>Paid campaigns / month</th><th>Mix</th><th>Fees</th><th>Contribution</th><th>What it proves</th></tr></thead><tbody>
                {SCENARIOS.map((sc) => (<tr key={sc.name}><td><strong>{sc.name}</strong></td><td>{sc.campaigns}</td><td>{sc.mix}</td><td>{sc.fees}</td><td>{sc.contribution}</td><td>{sc.proves}</td></tr>))}
              </tbody></table></div>
              <p className="small muted">Assumes Studio variable cost 150 USDC (80% margin) and Growth variable cost 500 USDC (75% margin — more manual service), before CAC, fixed overhead, tax, and refunds.</p>
              <h2>Finance controls</h2>
              <p className="muted">Invoice IDs, verified receipts (not screenshots), campaign-linked expenses, approval trail, separate reward ledger (received / paid / unused / returned), runway + CAC + refund + concentration tracking. Revenue is recognised when earned per the agreement, not when invoiced.</p>
              <div className="row"><button className="pill" onClick={() => go('refund-center')}>Refund center</button><button className="pill" onClick={() => go('operations')}>Operations</button></div>
            </div>
          </section>
        )}

        {page === 'operations' && (
          <section>
            <div className="page-head"><p className="eyebrow">Operations</p><h1>Plan in scenarios. Operate on checklists. Hire for the workload that exists.</h1><p className="muted">Campaign delivery, team and decision rights, growth experiments — from v2.0 pp. 15–16.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Campaign delivery — before / during / close</h2>
              {DELIVERY_CHECKLISTS.map((d) => (<div key={d.phase} style={{ marginBottom: 12 }}><h3>{d.phase}</h3><ul>{d.items.map((i) => <li key={i}>{i}</li>)}</ul></div>))}
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Team &amp; decision rights</h2>
              <p className="muted"><strong>Confirmed:</strong> Abasiofon Joseph Bassey, Founder &amp; CEO. All other roles below are <strong>open functions, not named hires</strong>. No staffed department, legal entity, auditor, or board is claimed.</p>
              <div className="table-wrap"><table><thead><tr><th>Function</th><th>Owns</th><th>Signs off</th></tr></thead><tbody>
                {TEAM.map((t) => (<tr key={t.fn}><td><strong>{t.fn}</strong></td><td>{t.owns}</td><td>{t.signs}</td></tr>))}
              </tbody></table></div>
              <p className="muted"><strong>Separation of duties:</strong> different people should request, approve, and reconcile significant payments/releases. Until the team can, use written checklists, independent review, and a complete audit trail.</p>
              <p className="muted"><strong>Rhythm (RECOMMENDED):</strong> Weekly — delivery, incidents, cash obligations, experiments. Monthly — margins, renewals, capacity, risks, canvas review. Before every release — source, tests, deployment config.</p>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Growth experiments — Bullseye discipline</h2>
              <div className="table-wrap"><table><thead><tr><th>Experiment</th><th>Hypothesis</th><th>Qualified outcome</th><th>Budget rule</th></tr></thead><tbody>
                {BULLSEYE.map((b) => (<tr key={b.experiment}><td><strong>{b.experiment}</strong></td><td>{b.hypothesis}</td><td>{b.outcome}</td><td>{b.budget}</td></tr>))}
              </tbody></table></div>
              <p className="muted"><strong>First cohort (RECOMMENDED):</strong> five suitable studios, unpaid devnet pilots. <strong>Validation gates, not customer counts:</strong> 3 of 5 pilots state willingness to pay in writing; 2 repeat paid campaigns.</p>
              <h2>Pirates — engagement with guardrails</h2>
              <ul>{PIRATES_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
              <p className="small muted">After Xi, Al-Msallam &amp; Hamari (2023), on unethical gamification. The Shards currency and its store were removed from this app — device-local points only, never tokens, never financial rewards.</p>
              <div className="row"><button className="pill" onClick={() => go('pirates')}>Pirates</button><button className="pill" onClick={() => go('gates')}>Gates, risk &amp; checklists</button></div>
            </div>
          </section>
        )}

        {page === 'gates' && (
          <section>
            <div className="page-head"><p className="eyebrow">Gates, risk &amp; checklists</p><h1>No gate, no launch. No evidence, no claim.</h1><p className="muted">Gates 1–5 with pass/kill criteria (v2.0 p. 17), the risk register, both checklists, and the SOPs.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Gates 1–5</h2>
              {GATES.map((g) => (
                <div key={g.n} style={{ marginBottom: 14 }}>
                  <h3>Gate {g.n} · {g.title} — <span className={`tag ${g.status === 'in-progress' ? 'warn' : 'gated'}`}>{g.statusText}</span></h3>
                  <p className="small muted">Pass requires: {g.pass}</p>
                  <p className="small muted">Kill / hold if: {g.kill}</p>
                </div>
              ))}
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Risk register — plainly stated</h2>
              {RISK_REGISTER.map((r) => (<div key={r.group} style={{ marginBottom: 12 }}><h3>{r.group}</h3><ul>{r.risks.map((x) => <li key={x}>{x}</li>)}</ul></div>))}
              <p className="muted"><strong>What Nexus will never do:</strong> ask for a seed phrase. Mark success from a browser alone. Show invented numbers, fake odds, or guaranteed profits. Let an animation imply a prize. Activate real-money features without a separate explicit decision + independent review.</p>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Technical launch checklist</h2>
              <ul>{TECH_CHECKLIST.map((c) => <li key={c}>{c}</li>)}</ul>
              <h2>Commercial campaign checklist</h2>
              <ul>{COMM_CHECKLIST.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="muted"><strong>Any unchecked item is a blocker.</strong></p>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>SOPs — standard operating procedures</h2>
              {SOPS.map((s) => (<div key={s.title} style={{ marginBottom: 12 }}><h3>{s.title}</h3><ul>{s.steps.map((x) => <li key={x}>{x}</li>)}</ul></div>))}
              <p className="small muted">Three calculations to remember: Allocation = wallet gross / final gross total × 400M. Claimable = vested − previously gross-claimed. Contribution margin = hosting fee − variable delivery cost (not net profit).</p>
              <div className="row"><button className="pill" onClick={() => go('mainnet')}>Mainnet readiness</button><button className="pill" onClick={() => go('launch-controls')}>Launch controls</button></div>
            </div>
          </section>
        )}

        {page === 'scenarios' && (
          <section>
            <div className="page-head"><p className="eyebrow">Prototype scenarios</p><h1>Every page. Every dialog.</h1><p className="muted">The full prototype index — tap any row to open that page or dialog. One responsive codebase, not three copies.</p></div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>All {PAGES.filter((p) => p.id !== 'home' && p.id !== 'builders').length} pages</h2>
              <div className="table-wrap"><table className="scenario-table"><thead><tr><th>Page</th><th>Group</th><th>What it is</th><th></th></tr></thead><tbody>
                {PAGES.filter((p) => p.id !== 'home' && p.id !== 'builders').map((p) => (<tr key={p.id}><td>{p.title}</td><td>{p.group}</td><td className="muted">{p.blurb}</td><td><button className="pill" onClick={() => go(p.id)}>Open →</button></td></tr>))}
              </tbody></table></div>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <h2>All 67 dialog states</h2>
              <p className="muted">One reusable template: eyebrow “EXAMPLE STATE · NOT LIVE”, heading, short body, tinted details table, guidance, dark primary button + pale secondaries + Close.</p>
              <div className="chip-row">
                {DIALOGS.map((d) => (<button key={d.id} className="pill" onClick={() => setDialogId(d.id)}>{d.title}</button>))}
              </div>
            </div>
          </section>
        )}

        {page === 'learn' && (
          <section>
            <div className="page-head"><p className="eyebrow">Learn more</p><h1>Want the full detail?</h1><p className="muted">Everything from the Nexus document lives here — the money rules, the business plan, and the launch checklist. You do not need any of this to play. It is here when you want it, and out of the way when you do not.</p></div>
            <div className="grid" style={{ marginTop: 14 }}>
              <div className="card">
                <h2>Money &amp; tokens</h2>
                <p className="muted">How the sale, the shares and the rewards work.</p>
                <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <button className="pill" onClick={() => go('token')}>Token economics</button>
                  <button className="pill" onClick={() => go('flows')}>Referrals &amp; money flows</button>
                  <button className="pill" onClick={() => go('pricing')}>Pricing &amp; unit economics</button>
                </div>
              </div>
              <div className="card">
                <h2>The business</h2>
                <p className="muted">The plan behind Nexus — the model, the costs, the roadmap.</p>
                <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <button className="pill" onClick={() => go('canvas')}>Business Model Canvas</button>
                  <button className="pill" onClick={() => go('models')}>The five scholarly models</button>
                  <button className="pill" onClick={() => go('operations')}>Operations</button>
                </div>
              </div>
              <div className="card">
                <h2>Safety &amp; launch</h2>
                <p className="muted">What is ready, what is not, and how to stay safe.</p>
                <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <button className="pill" onClick={() => go('mainnet')}>Network &amp; mainnet readiness</button>
                  <button className="pill" onClick={() => go('gates')}>Gates, risk &amp; checklists</button>
                  <button className="pill" onClick={() => go('evidence')}>Evidence classes</button>
                  <button className="pill" onClick={() => go('wallet-safety')}>Wallet safety</button>
                </div>
              </div>
              <div className="card">
                <h2>Help &amp; answers</h2>
                <p className="muted">Short, honest answers — and the people building this.</p>
                <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <button className="pill" onClick={() => go('faq')}>FAQ — honest answers</button>
                  <button className="pill" onClick={() => go('builders')}>For builders &amp; studios</button>
                  <button className="pill" onClick={() => go('journeys')}>Journey directory</button>
                  <button className="pill" onClick={() => go('scenarios')}>Prototype scenarios</button>
                </div>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 14 }}>Practice only. No real money, no guaranteed returns.</p>
          </section>
        )}

        {page === 'journeys' && (
          <section>
            <div className="page-head"><p className="eyebrow">Journey directory</p><h1>Eight journeys through Nexus.</h1><p className="muted">Each journey is a path through the prototype, in the order the Figma flows define it.</p></div>
            <div className="journey-grid" style={{ marginTop: 14 }}>
              {JOURNEYS.map((j) => (
                <article key={j.id} className="journey-card">
                  <h2>{j.title}</h2>
                  <p className="muted">{j.blurb}</p>
                  <div className="flow-steps">
                    {j.steps.map((s, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button className="pill" onClick={() => { if (s.page) go(s.page); else if (s.dialog) setDialogId(s.dialog) }}>{s.label}</button>
                        {i < j.steps.length - 1 && <span className="flow-arrow">→</span>}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="bay-footer">
          <div className="footer-links">
            <button className="linklike" onClick={() => go('home')}>Home</button>
            <button className="linklike" onClick={() => go('how-it-works')}>How it works</button>
            <button className="linklike" onClick={() => go('terms')}>Terms &amp; privacy</button>
            <button className="linklike" onClick={() => go('safety')}>Safety &amp; support</button>
            <button className="linklike" onClick={() => go('learn')}>Learn more — the full document</button>
            <button className="linklike" onClick={() => go('builders')}>For builders &amp; studios</button>
          </div>
          NEXUS / A little curiosity. A new adventure.<br />
          Nexus — practice only, no real money, no guaranteed returns.<br />
          Founder &amp; CEO: Abasiofon Joseph Bassey.
        </footer>
      </main>

      <nav className="bottom-nav" aria-label="Nexus">
        <div className="bottom-nav-inner">
          {[{ id: 'home', label: 'Home', icon: '🏠' }, { id: 'capsules', label: 'Join', icon: '🎁' }, { id: 'vault', label: 'Vault', icon: '🗄️' }, { id: 'pirates', label: 'Pirates', icon: '🏴‍☠️' }, { id: 'ai-guide', label: 'Help', icon: '💬' }].map((t) => (
            <button key={t.id} className={`bottom-tab${page === t.id ? ' active' : ''}`} onClick={() => go(t.id as PageId)} aria-current={page === t.id ? 'page' : undefined}>
              <span className="tab-icon" aria-hidden="true">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      {managed && (
        <>
          <div className="modal-backdrop" onClick={closeModal} />
          <div className="modal" role="dialog" aria-label={`Vault ${managed.vaultId}`}>
            {modalStep === 'detail' && (
              <>
                <div className="modal-cols">
                  <div>
                    <div className={`modal-art art-${'abc'[managed.art]}`} aria-hidden="true">{ART_EMOJI[managed.art]}</div>
                    <div className="modal-art-label">Smart Vault · {managed.label}</div>
                  </div>
                  <div>
                    <h2 style={{ marginTop: 0 }}>Vault {managed.vaultId}</h2>
                    <p className="muted small">Whoever controls this vault controls this share. In this demo, that is you.</p>
                    <div className="kv"><span>You put in</span><b>{managed.isAirdrop ? '— (free tokens)' : `${fmtSol(managed.amount)} SOL`}</b></div>
                    <div className="kv"><span>Your share</span><b>{finalized ? `${fmtTokens(managedAlloc)} tokens` : 'Not fixed yet — the sale is still open'}</b></div>
                    <div className="kv"><span>Unlocked so far</span><b>{managedRatio}%</b></div>
                    <div className="kv"><span>Ready to take now</span><b>{fmtTokens(managedClaimable)} tokens</b></div>
                    <div className="kv"><span>Early cost if you take it now</span><b>{managedPreview && managedPreview.penalty > 0 ? `${fmtTokens(managedPreview.penalty)} tokens (${managedPreview.rate}%)` : 'None'}</b></div>
                    <div className="kv"><span>Total after 3 days</span><b>{fmtTokens(managedAlloc)} tokens</b></div>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 18 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={() => setModalStep('confirm')} disabled={!launched || managedClaimable <= 0}>Take my share</button>
                  <button className="pill" onClick={closeModal}>Close</button>
                </div>
                {!launched && <p className="small muted" style={{ marginTop: 10 }}>Close the sale and start the launch first — then you can take what is ready.</p>}
              </>
            )}
            {modalStep === 'confirm' && managedPreview && (
              <>
                <h2 style={{ marginTop: 0 }}>Take from vault {managed.vaultId}?</h2>
                <p className="muted">Check this before you confirm. Nothing moves until you tap the button below.</p>
                <div className="kv"><span>You take now</span><b>{fmtTokens(managedClaimable)} tokens</b></div>
                <div className="kv"><span>Early cost</span><b>{managedPreview.penalty > 0 ? `${fmtTokens(managedPreview.penalty)} tokens (${managedPreview.rate}%)` : 'None'}</b></div>
                <div className="kv"><span>You keep</span><b>{fmtTokens(managedPreview.net)} tokens</b></div>
                {managedPreview.penalty > 0 && (<><div className="kv"><span>Of the early cost — disappears forever (burned)</span><b>{fmtTokens(managedPreview.burned)} tokens</b></div><div className="kv"><span>Of the early cost — to the rewards pot</span><b>{fmtTokens(managedPreview.escrow)} tokens</b></div></>)}
                <div className="row" style={{ marginTop: 18 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={confirmClaim}>Sign and Confirm</button>
                  <button className="pill" onClick={() => setModalStep('detail')}>Back</button>
                </div>
              </>
            )}
            {modalStep === 'success' && lastClaim && (
              <>
                <h2 style={{ marginTop: 0 }}>Done — you took {fmtTokens(lastClaim.net)} tokens</h2>
                <div className="success-box">
                  <p style={{ marginBottom: 6 }}>✓ {fmtTokens(lastClaim.net)} tokens are yours from vault {managed.vaultId}.</p>
                  {lastClaim.penalty > 0 && <p className="small muted" style={{ marginBottom: 0 }}>Early cost was {fmtTokens(lastClaim.penalty)} tokens — {fmtTokens(lastClaim.burned)} burned (gone forever) and {fmtTokens(lastClaim.escrow)} to the rewards pot. Waiting until after 3 days costs nothing.</p>}
                </div>
                <div className="row" style={{ marginTop: 18 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={closeModal}>Back to your vaults</button>
                  <button className="pill" onClick={() => { closeModal(); go('capsules') }}>Open a new vault</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {showWalletSheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setShowWalletSheet(false)} />
          <div className="sheet" role="dialog" aria-label="Join with practice money">
            <h2>Before you join — 3 quick things</h2>
            <ul>
              <li><strong>This is practice money.</strong> It runs on a test network. It is not real money and it is worth nothing.</li>
              <li><strong>You can see where it goes first.</strong> Your inviter gets a share, the launch gets the rest — shown above, before you commit.</li>
              <li><strong>Nothing is promised.</strong> Tokens may end up worth nothing, and practice coins you put in cannot be taken back.</li>
            </ul>
            <button className="btn" onClick={connect}>Use the demo wallet — 1 tap</button>
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setShowWalletSheet(false)}>Not yet — let me look around first</button>
          </div>
        </>
      )}

      {dialog && (
        <>
          <div className="dialog-backdrop" onClick={() => setDialogId(null)} />
          <div className="dialog" role="dialog" aria-label={dialog.title}>
            <button className="pill dlg-close" onClick={() => setDialogId(null)}>✕ Close</button>
            <div>
              <p className="eyebrow">Example state · Not live</p>
              <h2>{dialog.title}</h2>
              <p className="dlg-body">{dialog.body}</p>
            </div>
            <div className={`dlg-details ${dialog.tone === 'fail' || dialog.tone === 'warn' ? 'tone-peach' : dialog.tone === 'confirm' ? 'tone-green' : 'tone-lavender'}`}>
              {dialog.details.map(([k, v]) => (<div key={k} className="kv"><span>{k}</span><b>{v}</b></div>))}
            </div>
            <p className="dlg-guidance">{dialog.guidance}</p>
            <div className="dlg-actions">
              <button className="btn" onClick={() => handleDialogAction(dialog.primary, dialog)}>{dialog.primary.label}</button>
              {dialog.secondary && <button className="btn ghost" onClick={() => handleDialogAction(dialog.secondary!, dialog)}>{dialog.secondary.label}</button>}
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
