import { useMemo, useState } from 'react'
import {
  HARD_CAP_SOL, LAMPORTS_PER_SOL,
  allocationFor, claimableNow, fmtSol, fmtTokens,
  isRetail, penaltyRatePercent, penaltySplit, referralSplit,
  vestedAmount, workedChecks,
} from './lib/math'
import { BADGES, CAPSULES, CREWS, DEMO_CAMPAIGNS, PACKAGES, PLACES, SHOP_ITEMS, guideAnswer } from './lib/data'
import type { Campaign, Crew, Place } from './lib/data'

// Kabu redesign (2026-11-24). Reference: kabu.xyz — light, warm,
// playful storybook world. Warm cream / pale peach background,
// dark-brown ink, peach-orange main button, pastel pink / lilac /
// sky blue / soft yellow, purple crystal for Shards. Chunky rounded
// all-caps headings, ~30px card corners, thick brown outlines,
// floating cream pill header, sunset hero, pannable map with pins,
// Pins / Badges / XP / Ranks / Hall of Legends, daily Shards claim.
// Maths in lib/math.ts is unchanged. Technical parts live only on
// the "For builders & studios" page. Deliberately NOT copied from
// Kabu: no Kabu characters, names or artwork (all Nexus-original),
// no slow loading splash, no sign-in wall on arrival.
type Tab = 'play' | 'vaults' | 'invite' | 'help'
type View = 'bay' | 'map' | 'main' | 'builders'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'play', label: 'Play', icon: '🎁' },
  { id: 'vaults', label: 'Vaults', icon: '🗄️' },
  { id: 'invite', label: 'Invite', icon: '🤝' },
  { id: 'help', label: 'Help', icon: '💬' },
]

interface Deposit {
  id: number
  vaultId: string
  art: number
  label: string
  amount: number
  direct: number
  upline: number
  vault: number
  referrer: string
}

function fakeAddress() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `Demo${s.slice(0, 4)}`
}
function newVaultId() {
  return `NEX-${Math.floor(10000 + Math.random() * 89999)}`
}
const ART_EMOJI = ['🧑‍🚀', '💎', '🐋']
const CONFETTI_COLORS = ['#ff7a3d', '#f7a8c4', '#b79ced', '#7cc4e8', '#ffd166', '#8b5cf6']
const RANKS = ['Newcomer', 'Explorer', 'Collector', 'Bay Regular', 'Legend of the Bay']

export default function App() {
  const [tab, setTab] = useState<Tab>('play')
  const [view, setView] = useState<View>('bay')
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
  const [celebrated, setCelebrated] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [crews, setCrews] = useState<Crew[]>(CREWS)
  const [joined, setJoined] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS)
  const [newStudio, setNewStudio] = useState('')
  const [newCampaign, setNewCampaign] = useState('')
  const [newPkg, setNewPkg] = useState('Devnet Pilot')
  const [calcSol, setCalcSol] = useState('1')
  const [copied, setCopied] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('Hi — ask me anything about Nexus in plain words. If I don\u2019t know the answer, I\u2019ll say so. I never invent prices or odds.')
  const [notice, setNotice] = useState('')
  const [managedId, setManagedId] = useState<number | null>(null)
  const [modalStep, setModalStep] = useState<'detail' | 'confirm' | 'success'>('detail')
  const [lastClaim, setLastClaim] = useState<{ net: number; penalty: number; gross: number } | null>(null)
  const [visibleVaults, setVisibleVaults] = useState(5)
  // Kabu-style progression — all from real simulated actions in this session.
  const [shards, setShards] = useState(0)
  const [shardsEarned, setShardsEarned] = useState(0)
  const [claimedDate, setClaimedDate] = useState('')
  const [ownedItems, setOwnedItems] = useState<string[]>([])
  const [charIndex, setCharIndex] = useState(0)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState<{ x: number; y: number; px: number; py: number } | null>(null)
  const [sortBy, setSortBy] = useState<'xp' | 'shards'>('xp')

  const totalGross = useMemo(() => deposits.reduce((a, d) => a + d.amount, 0), [deposits])
  const totalReferral = useMemo(() => deposits.reduce((a, d) => a + d.direct + d.upline, 0), [deposits])
  const retail = isRetail(totalGross)
  const elapsedSeconds = elapsedHours * 3600
  const totalOpens = Object.values(opens).reduce((a, b) => a + b, 0)
  // XP from real actions only: 10 per capsule open, 50 per join, 20 per crew joined, 20 per daily claim.
  const xp = totalOpens * 10 + deposits.length * 50 + joined.length * 20 + (claimedDate ? 20 : 0)
  const rank = RANKS[Math.min(RANKS.length - 1, Math.floor(xp / 100))]
  const today = new Date().toDateString()
  const canClaimDaily = claimedDate !== today
  const badgesEarned = [
    totalOpens > 0 ? 'first-open' : '',
    deposits.length > 0 ? 'first-join' : '',
    copied ? 'first-invite' : '',
    claimedDate ? 'first-claim' : '',
    joined.length > 0 ? 'crew-mate' : '',
  ].filter(Boolean)
  const leaderboard = useMemo(() => {
    const rows = crews.map((c) => ({ name: c.name, members: c.members, xp: c.points, shards: c.shards, you: false }))
    rows.push({ name: connected ? `You (${address})` : 'You', members: 1, xp, shards: shardsEarned, you: true })
    rows.sort((a, b) => (sortBy === 'xp' ? b.xp - a.xp : b.shards - a.shards))
    return rows
  }, [crews, xp, shardsEarned, sortBy, connected, address])
  const myRank = leaderboard.findIndex((r) => r.you) + 1

  const allocationForDeposit = (d: Deposit) =>
    finalized ? allocationFor(d.amount, totalGross) : 0
  const unlockedForDeposit = (d: Deposit) => {
    const alloc = allocationForDeposit(d)
    if (!launched) return 0
    return retail ? alloc : vestedAmount(alloc, elapsedSeconds)
  }
  const claimableForDeposit = (d: Deposit) =>
    claimableNow(unlockedForDeposit(d), claimedByVault[d.id] || 0)
  const penaltyForDeposit = (d: Deposit) => {
    const c = claimableForDeposit(d)
    if (retail || c <= 0) return { rate: 0, penalty: 0, burned: 0, escrow: 0, net: c }
    return penaltySplit(c, elapsedSeconds)
  }
  const ratioForDeposit = (d: Deposit) => {
    if (!launched) return 0
    if (retail) return 100
    return Math.min(100, Math.round((elapsedHours / 72) * 100))
  }
  const totalAllocation = useMemo(
    () => deposits.reduce((a, d) => a + allocationForDeposit(d), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deposits, finalized, totalGross],
  )
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

  function connect() {
    setAddress(fakeAddress())
    setConnected(true)
    setShowWalletSheet(false)
    setNotice('Demo wallet ready. This is practice money only — not real money, and nothing leaves your device.')
  }
  function openCapsule(id: string) {
    const firstFree = id === 'free' && !celebrated
    setOpened((o) => ({ ...o, [id]: true }))
    setOpens((o) => ({ ...o, [id]: (o[id] || 0) + 1 }))
    if (firstFree) {
      setCelebrated(true)
      setShowConfetti(true)
      window.setTimeout(() => setShowConfetti(false), 2400)
    }
  }
  function claimDaily() {
    if (!canClaimDaily) return
    setShards((s) => s + 10)
    setShardsEarned((s) => s + 10)
    setClaimedDate(today)
    setNotice('Nice — you claimed 10 Shards for today. Come back tomorrow for 10 more. Shards are practice points, not money and not tokens.')
  }
  function buyItem(id: string, cost: number, name: string) {
    if (shards < cost) { setNotice(`You need ${cost} Shards for that — you have ${shards}. Claim your daily Shards or open more capsules.`); return }
    setShards((s) => s - cost)
    setOwnedItems((o) => [...o, id])
    setNotice(`You got the ${name}! It is yours in this demo. It changes nothing about your share — it is just for fun.`)
  }
  function deposit() {
    if (!connected) { setShowWalletSheet(true); return }
    if (finalized) { setNotice('The sale is closed — joining is finished.'); return }
    if (amountLamports <= 0) { setNotice('Choose an amount above 0 first.'); return }
    if (totalGross + amountLamports > HARD_CAP_SOL * LAMPORTS_PER_SOL) { setNotice('That would go over the 15,000 limit for the whole sale.'); return }
    const d: Deposit = {
      id: Date.now(), vaultId: newVaultId(), art: deposits.length % 3,
      label: amountLamports <= 2 * LAMPORTS_PER_SOL ? 'Small vault' : 'Big vault',
      amount: amountLamports, direct: split.direct, upline: split.upline, vault: split.vault,
      referrer: hasReferrer ? referrer : 'No one',
    }
    setDeposits((ds) => [...ds, d])
    setNotice(`Done — you joined with ${fmtSol(amountLamports)} in practice coins and opened vault ${d.vaultId}. ${hasReferrer ? `${referrer} gets ${fmtSol(split.direct)}.` : ''} The launch gets ${fmtSol(split.vault)}.`)
    setTab('vaults')
    setView('main')
  }
  function openManage(d: Deposit) { setManagedId(d.id); setModalStep('detail'); setLastClaim(null) }
  function openTakeNow(d: Deposit) { setManagedId(d.id); setModalStep('confirm'); setLastClaim(null) }
  function closeModal() { setManagedId(null); setModalStep('detail'); setLastClaim(null) }
  function confirmClaim() {
    if (!managed) return
    const c = claimableForDeposit(managed)
    if (!launched || c <= 0) return
    const p = retail ? { rate: 0, penalty: 0, burned: 0, escrow: 0, net: c } : penaltySplit(c, elapsedSeconds)
    setClaimedByVault((m) => ({ ...m, [managed.id]: (m[managed.id] || 0) + c }))
    setBurned((b) => b + p.burned)
    setEscrow((e) => e + p.escrow)
    setLastClaim({ net: p.net, penalty: p.penalty, gross: c })
    setModalStep('success')
  }
  function copyLink() {
    if (navigator.clipboard) navigator.clipboard.writeText(inviteLink).catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  function createCampaign() {
    if (!newStudio.trim() || !newCampaign.trim()) { setNotice('Enter a studio name and a campaign name.'); return }
    setCampaigns((c) => [...c, { id: `c${Date.now()}`, studio: newStudio.trim(), name: newCampaign.trim(), pkg: newPkg, sessions: 0, wallets: 0, contributors: 0, testSol: 0, status: 'Draft — simulated, not live' }])
    setNewStudio(''); setNewCampaign('')
    setNotice('Campaign created in the simulated dashboard. No invoice, no payment — packages are sold by written scope only.')
  }
  function goTab(t: Tab) { setTab(t); setView('main'); window.scrollTo({ top: 0 }) }
  function stepInside(p: Place) {
    setSelectedPlace(null)
    if (p.go === 'builders') { setView('builders'); window.scrollTo({ top: 0 }); return }
    if (p.go === 'store') { goTab('invite'); return }
    goTab(p.go)
  }
  function onMapDown(e: React.PointerEvent) {
    setDragging({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y })
  }
  function onMapMove(e: React.PointerEvent) {
    if (!dragging) return
    setPan({ x: Math.max(-260, Math.min(260, dragging.px + (e.clientX - dragging.x))), y: Math.max(-140, Math.min(140, dragging.py + (e.clientY - dragging.y))) })
  }

  const timelineDone = (h: number) => launched && elapsedHours >= h
  const managedClaimable = managed ? claimableForDeposit(managed) : 0
  const managedPreview = managed ? penaltyForDeposit(managed) : null
  const managedAlloc = managed ? allocationForDeposit(managed) : 0
  const managedRatio = managed ? ratioForDeposit(managed) : 0
  const char = CAPSULES[charIndex]

  if (view === 'builders') {
    return (
      <div>
        <header className="topbar"><div className="topbar-inner">
          <div className="logo"><span className="logo-mark">⬡</span> NEXUS</div>
          <span className="practice-pill">Practice only</span>
          <span className="spacer" />
          <button className="pill" onClick={() => setView('bay')}>← Back to Nexus Bay</button>
        </div></header>
        <main className="wrap">
          <section className="card fade-up" style={{ marginTop: 18 }}>
            <h1>For builders &amp; studios</h1>
            <p className="muted">This page is for people building on Nexus or running a campaign. Everything here uses the technical words that are hidden from the main app — on purpose, so new players are not confused by them.</p>
          </section>

          <section className="card fade-up d1" style={{ marginTop: 14 }}>
            <h2>Token supply — 1,000,000,000 in total</h2>
            <div className="kv"><span>Presale pool</span><b>400M (40%)</b></div>
            <div className="kv"><span>Airdrop pool</span><b>100M (10%) — Merkle list only, no approved list yet</b></div>
            <div className="kv"><span>Recommended remainder (not approved)</span><b>500M — Liquidity 150M · Ecosystem 100M · Team 100M · Treasury 100M · Marketing 50M</b></div>
            <div className="kv"><span>Hard cap</span><b>15,000 SOL</b></div>
            <div className="kv"><span>Burned in simulation</span><b>{fmtTokens(burned)} NEXUS</b></div>
            <div className="kv"><span>Rewards escrow</span><b>{fmtTokens(escrow)} NEXUS</b></div>
            <p className="small muted">6 decimals. Supply can only fall, via verified SPL Token burns. Program id (placeholder, not deployed): <code>3py1rKZt6n5CicNQELDRFWrAZx9zBXurX6wYAZxG2B8i</code>. Authority (public address only): <code>BHxkjg3MvcWitw6i2MQDNrCWmC6vqB5U98C3JUk8LmTB</code>.</p>
          </section>

          <section className="card fade-up d2" style={{ marginTop: 14 }}>
            <h2>Contract — 14 worked-example checks · {passed}/14 pass</h2>
            <p className="muted small">Computed live from <code>src/lib/math.ts</code>, a mirror of <code>contracts/crates/nexus-math</code>.</p>
            <div className="table-wrap"><table>
              <thead><tr><th>#</th><th>Check</th><th>Expected</th><th>Actual</th><th>Result</th></tr></thead>
              <tbody>{checks.map((c) => (
                <tr key={c.id}><td>{c.id}</td><td>{c.label}</td><td>{c.expected}</td><td>{c.actual}</td><td className={c.pass ? 'check-pass' : 'check-fail'}>{c.pass ? 'PASS' : 'FAIL'}</td></tr>
              ))}</tbody>
            </table></div>
            <h3 style={{ marginTop: 18 }}>Penalty table</h3>
            <div className="table-wrap"><table><thead><tr><th>Claim time</th><th>Rate</th><th>On 1,000 gross: net / burned / escrow</th></tr></thead><tbody>
              <tr><td>0 to &lt;24h</td><td>25%</td><td>750 / 200 / 50</td></tr>
              <tr><td>24h to &lt;48h (at exactly 24h: 15%)</td><td>15%</td><td>850 / 120 / 30</td></tr>
              <tr><td>48h to &lt;72h</td><td>5%</td><td>950 / 40 / 10</td></tr>
              <tr><td>72h and later</td><td>0%</td><td>1,000 / 0 / 0</td></tr>
            </tbody></table></div>
          </section>

          <section className="card fade-up d3" style={{ marginTop: 14 }}>
            <h2>Launch Gates 1–5 — still open</h2>
            <ol>
              <li><strong>Gate 1:</strong> reviewed source + tests — <span className="tag warn">Open</span> — <code>anchor test</code> not yet run.</li>
              <li><strong>Gate 2:</strong> devnet configuration — <span className="tag warn">Open</span> — no funded deployment signer.</li>
              <li><strong>Gate 3:</strong> complete devnet execution — <span className="tag warn">Open</span> — deposit → claim not verified on-chain.</li>
              <li><strong>Gate 4:</strong> 5 unpaid devnet pilots — <span className="tag gated">Not started</span></li>
              <li><strong>Gate 5:</strong> commercial readiness + mainnet decision — <span className="tag gated">Not started</span> — needs independent security + legal review.</li>
            </ol>
            <p className="small muted">Deliberately absent from the contract: no SOL withdrawal / liquidity-migration instruction and no contribution-refund instruction. Do not accept production funds expecting one.</p>
          </section>

          <section className="card fade-up" style={{ marginTop: 14 }}>
            <h2>Studio campaigns</h2>
            <div className="grid cols-2">
              {PACKAGES.map((p) => (
                <article key={p.name} className="card" style={{ boxShadow: 'none' }}>
                  <h3>{p.name}</h3>
                  <div className="stat-num">{p.price}</div>
                  <p className="small muted">{p.days} · USDC on Solana, by invoice only — no checkout.</p>
                  <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                  <span className={`tag ${p.tag === 'GATED' ? 'gated' : 'ok'}`}>{p.tag}</span>
                </article>
              ))}
            </div>
            <div className="field"><label>Studio name</label><input value={newStudio} onChange={(e) => setNewStudio(e.target.value)} placeholder="e.g. Reef Games" /></div>
            <div className="field"><label>Campaign name</label><input value={newCampaign} onChange={(e) => setNewCampaign(e.target.value)} placeholder="e.g. Tutorial test" /></div>
            <div className="field"><label>Package</label><select value={newPkg} onChange={(e) => setNewPkg(e.target.value)}>{PACKAGES.map((p) => <option key={p.name}>{p.name}</option>)}</select></div>
            <button className="btn" onClick={createCampaign}>Create campaign</button>
            <p className="small muted">Refund policy: full refund before start, 50% within the first 3 days, none after day 3 unless Nexus fails to deliver. Unused reward budgets are always returned. It does not refund protocol contributions.</p>
            <h3 style={{ marginTop: 18 }}>Campaign dashboard — evidence classes kept separate</h3>
            <p className="small muted">Sessions and wallets are <em>not</em> people. Only verified contributors count as verified — and test SOL is never sales or revenue.</p>
            <div className="table-wrap"><table>
              <thead><tr><th>Campaign</th><th>Sessions</th><th>Wallets</th><th>Verified</th><th>Test SOL</th></tr></thead>
              <tbody>{campaigns.map((c) => (
                <tr key={c.id}><td><strong>{c.name}</strong><br /><span className="small muted">{c.studio} · {c.pkg} · {c.status}</span></td><td>{c.sessions}</td><td>{c.wallets}</td><td>{c.contributors}</td><td>{c.testSol}</td></tr>
              ))}</tbody>
            </table></div>
            {notice && <div className="notice info" style={{ marginTop: 14 }} role="status">{notice}</div>}
          </section>
          <footer className="bay-footer">Nexus v2.0 — Founder &amp; CEO: Abasiofon Joseph Bassey. Simulated devnet prototype only.</footer>
        </main>
      </div>
    )
  }

  return (
    <div>
      {showConfetti && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, background: CONFETTI_COLORS[i % CONFETTI_COLORS.length], animationDelay: `${(i % 7) * 0.08}s` }} />
          ))}
        </div>
      )}
      <header className="topbar"><div className="topbar-inner">
        <button className="logo" onClick={() => setView('bay')}><span className="logo-mark">⬡</span> NEXUS</button>
        <nav className="topnav" aria-label="Nexus">
          {TABS.map((t) => (
            <button key={t.id} className={`topnav-link${view === 'main' && tab === t.id ? ' active' : ''}`} onClick={() => goTab(t.id)}>{t.label}</button>
          ))}
          <button className="topnav-link" onClick={() => setView('map')}>Map</button>
        </nav>
        <span className="spacer" />
        <span className="shards-chip" title="Shards are practice points — not money, not tokens">🔮 {shards} Shards</span>
        {connected
          ? <span className="wallet-chip">Demo · {address}</span>
          : <button className="pill connect-pill" onClick={() => setShowWalletSheet(true)}>Connect</button>}
      </div></header>

      {view === 'bay' && (
        <main className="bay">
          <div className="sunset" aria-hidden="true">
            <div className="sun" />
            <div className="cloud c1" /><div className="cloud c2" /><div className="cloud c3" />
            <div className="birds">﹋ ﹋</div>
            <div className="hills" />
            <div className="sea" />
            <div className="bay-town"><span>🏛️</span><span>🎁</span><span>🕹️</span><span>🔭</span><span>🏢</span></div>
          </div>
          <div className="bay-pill fade-up">
            <p className="bay-eyebrow">Welcome to</p>
            <h1>Sunset City<br />of Nexus Bay</h1>
            <p className="muted">Explore a little town, open a capsule, collect Shards, and join the launch — all in plain words, all practice money.</p>
            <button className="btn explore-btn" onClick={() => setView('map')}>Explore</button>
            <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>No sign-in to look around · Try a capsule free · Practice only</p>
          </div>
          {notice && <div className="notice info fade-up bay-notice" role="status">{notice}</div>}
          <section className="wrap bay-steps">
            <div className="card"><h3>1 · Explore the map</h3><p className="muted">Tap a pin, peek inside a place, and step in when you are ready.</p></div>
            <div className="card"><h3>2 · Claim Shards daily</h3><p className="muted">Come back once a day for 10 free Shards. Spend them in the Arcade on fun things.</p></div>
            <div className="card"><h3>3 · Join the launch</h3><p className="muted">Open a capsule, join with practice coins, and take your share later.</p></div>
          </section>
          <footer className="bay-footer">Nexus — practice only, no real money, no guaranteed returns.<br />Founder &amp; CEO: Abasiofon Joseph Bassey.</footer>
        </main>
      )}

      {view === 'map' && (
        <main className="map-view">
          <div className="map-head wrap">
            <h1>Map of Nexus Bay</h1>
            <p className="muted">Drag the map to look around. Tap a pin to peek inside, then STEP INSIDE when you are ready. Everything here is free to browse — no sign-in needed.</p>
            <button className="pill" onClick={() => setView('bay')}>← Back to the Bay</button>
          </div>
          <div
            className="map-stage"
            onPointerDown={onMapDown}
            onPointerMove={onMapMove}
            onPointerUp={() => setDragging(null)}
            onPointerLeave={() => setDragging(null)}
          >
            <div className="map-inner" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
              <div className="map-sun" aria-hidden="true" />
              <div className="map-sea" aria-hidden="true" />
              <div className="map-land" aria-hidden="true" />
              <div className="map-road" aria-hidden="true" />
              {PLACES.map((p) => (
                <button
                  key={p.id}
                  className="map-pin"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.colour }}
                  onClick={(e) => { e.stopPropagation(); setSelectedPlace(p) }}
                  aria-label={p.name}
                >
                  <span aria-hidden="true">{p.emoji}</span>
                  <span className="pin-label">{p.name}</span>
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
          <p className="small muted wrap" style={{ textAlign: 'center' }}>Pins: {PLACES.map((p) => p.name).join(' · ')}</p>
        </main>
      )}

      {view === 'main' && (
      <main className="wrap">
        {notice && <div className="notice info fade-up" style={{ marginTop: 16 }} role="status">{notice}</div>}

        {tab === 'play' && (
          <section className="tab-panel">
            <div className="hero fade-up">
              <h1>Open a capsule, <em>join the launch.</em></h1>
              <p className="big">Try it free first. No wallet needed to look around. This is practice money — not real money, and nothing here is promised to make money.</p>
              <div className="steps">
                <span className="step-chip">1 · Open a free capsule</span>
                <span className="step-chip">2 · Join with practice coins</span>
                <span className="step-chip">3 · Take your share later</span>
              </div>
              <div className="row" style={{ marginTop: 16 }}>
                <button className="btn explore-btn" style={{ width: 'auto' }} onClick={() => setView('map')}>🗺️ Explore the map</button>
                <button className="pill" onClick={claimDaily} disabled={!canClaimDaily}>{canClaimDaily ? '🔮 Claim 10 daily Shards' : '✓ Daily Shards claimed — back tomorrow'}</button>
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>Your Shards: <b>{shards}</b> · Your XP: <b>{xp}</b> · Your Rank: <b>{rank}</b> — earned from real actions in this demo.</p>
            </div>

            <section className="card fade-up" style={{ marginTop: 18 }}>
              <h2>Meet the capsule friends</h2>
              <p className="muted">Every capsule has a friend. Flip through them — each one is a Nexus original.</p>
              <div className="carousel">
                <button className="pill" onClick={() => setCharIndex((i) => (i - 1 + CAPSULES.length) % CAPSULES.length)} aria-label="Previous character">← Prev</button>
                <div className="char-card">
                  <div className={`char-art art-${'abc'[charIndex]}`} aria-hidden="true">{char.characterEmoji}</div>
                  <span className="char-badge">{char.character}</span>
                  <h3>{char.name}</h3>
                  <p className="muted">{char.personality}</p>
                  <p className="small muted">{char.tier} · {char.cost}</p>
                  <button className="btn small" onClick={() => openCapsule(char.id)}>Open {char.name}&apos;s capsule</button>
                  <span className="small muted">Opened {opens[char.id] || 0}×</span>
                </div>
                <button className="pill" onClick={() => setCharIndex((i) => (i + 1) % CAPSULES.length)} aria-label="Next character">Next →</button>
              </div>
              <div className="dots" aria-hidden="true">{CAPSULES.map((c, i) => (<span key={c.id} className={i === charIndex ? 'dot on' : 'dot'}>●</span>))}</div>
            </section>

            <h2 style={{ marginTop: 26 }}>Pick a capsule</h2>
            <p className="muted">Tap one to open it. Opening is just a preview — it never moves money and never gives you tokens by itself.</p>
            <div className="grid">
              {CAPSULES.map((c, i) => (
                <div key={c.id} className={`flip fade-up d${i + 1}${opened[c.id] ? ' open' : ''}`}>
                  <div className="flip-inner">
                    <div className="flip-face">
                      <div className={`flip-art art-${'abc'[i]}`} aria-hidden="true">{c.emoji}</div>
                      <h3>{c.name} {c.id === 'free' && <span className="tag free-badge">Try it free</span>}</h3>
                      <p className="small muted">{c.tier} · {c.cost}</p>
                      <p>{c.blurb}</p>
                      <div className="row"><button className="btn small" onClick={() => openCapsule(c.id)}>Open preview</button>
                      <span className="small muted">Opened {opens[c.id] || 0}×</span></div>
                    </div>
                    <div className="flip-face flip-back">
                      <div className={`flip-art art-${'abc'[i]}`} aria-hidden="true">{c.emoji}</div>
                      <h3>It opened — and that&apos;s all</h3>
                      <p>Just a preview. Nothing was paid, nothing was given, and this does not change your share.</p>
                      <button className="btn ghost small" onClick={() => setOpened((o) => ({ ...o, [c.id]: false }))}>Flip it back</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {celebrated && (
              <div className="celebrate" role="status">🎉 Nice — you opened your first capsule! Nothing was paid. When you&apos;re ready, join below with practice coins.</div>
            )}

            <section className="card fade-up" style={{ marginTop: 26 }}>
              <h2>Your Pins &amp; Badges</h2>
              <p className="muted">Badges are for things you actually did in this demo. They are not money and not tokens.</p>
              <div className="badge-row">
                {BADGES.map((b) => {
                  const earned = badgesEarned.includes(b.id)
                  return (
                    <div key={b.id} className={`badge${earned ? ' earned' : ''}`} title={b.desc}>
                      <span aria-hidden="true">{b.emoji}</span>
                      <strong>{b.name}</strong>
                      <span className="small muted">{earned ? 'Earned ✓' : 'Not yet'}</span>
                    </div>
                  )
                })}
              </div>
              <p className="small muted">XP: <b>{xp}</b> (10 per capsule open · 50 per join · 20 per crew joined · 20 per daily claim) · Rank: <b>{rank}</b></p>
            </section>

            <section className="card fade-up" style={{ marginTop: 16 }}>
              <h2>Join the launch</h2>
              <p className="muted">SOL is the practice coin here. Choose how much to put in — you can see exactly where it goes before you commit.</p>
              <div className="preset-row" role="group" aria-label="Amount">
                {['0.5', '1', '2', '3'].map((v) => (
                  <button key={v} className={`preset${amountSol === v ? ' active' : ''}`} onClick={() => setAmountSol(v)}>{v} SOL</button>
                ))}
              </div>
              <div className="field"><label>Or type your own amount (SOL)</label>
                <input type="number" min="0" step="0.1" value={amountSol} onChange={(e) => setAmountSol(e.target.value)} />
              </div>
              <div className="field"><label>Who invited you?</label>
                <select value={hasReferrer ? referrer : 'none'} onChange={(e) => { if (e.target.value === 'none') setHasReferrer(false); else { setHasReferrer(true); setReferrer(e.target.value) } }}>
                  <option value="Ben">Ben invited me</option>
                  <option value="Ada">Ada invited me</option>
                  <option value="none">No one invited me</option>
                </select>
              </div>
              <div className="kv"><span>{hasReferrer ? `${referrer} gets` : 'Your inviter gets'}</span><b>{fmtSol(split.direct)} SOL</b></div>
              <div className="kv"><span>{hasReferrer ? `${referrer}’s inviter gets` : 'Their inviter gets'}</span><b>{fmtSol(split.upline)} SOL</b></div>
              <div className="kv"><span>The launch gets</span><b>{fmtSol(split.vault)} SOL</b></div>
              <p className="small muted">If there is no inviter, their share goes to the launch instead. Nothing is kept quietly.</p>
              {connected
                ? <button className="btn" onClick={deposit} disabled={finalized}>Join with {fmtSol(amountLamports)} SOL in practice coins</button>
                : <button className="btn" onClick={() => setShowWalletSheet(true)}>Join with practice money</button>}
              {finalized && <p className="small muted">The sale is closed — joining is finished.</p>}
              {deposits.length > 0 && <p className="small" style={{ marginTop: 10 }}>You have put in <strong>{fmtSol(totalGross)} SOL</strong> in total — {retail ? 'a small join (2 or less)' : 'a big join (more than 2)'}. See Vaults for your share.</p>}
            </section>

            <section className="card fade-up" style={{ marginTop: 16 }}>
              <h2>Shards Store — the Arcade</h2>
              <p className="muted">Spend Shards on fun things. Shards are practice points — <strong>not money, not tokens</strong> — and they never change your share.</p>
              {!connected ? (
                <div className="arcade-gate">
                  <h3>Sign in to browse the Arcade</h3>
                  <p className="muted">Connect your account to spend Shards on rewards. Looking around the Bay is free — this is the first place that asks you to connect.</p>
                  <button className="btn" onClick={() => setShowWalletSheet(true)}>Connect — 1 tap</button>
                </div>
              ) : (
                <>
                  <p>Your Shards: <b>🔮 {shards}</b> · <button className="pill" onClick={claimDaily} disabled={!canClaimDaily}>{canClaimDaily ? 'Claim 10 daily Shards' : 'Daily Shards claimed'}</button></p>
                  <div className="grid cols-2">
                    {SHOP_ITEMS.map((item) => {
                      const owned = ownedItems.includes(item.id)
                      return (
                        <article key={item.id} className="card shop-item" style={{ boxShadow: 'none' }}>
                          <div className="shop-emoji" aria-hidden="true">{item.emoji}</div>
                          <h3>{item.name}</h3>
                          <p className="small muted">{item.blurb}</p>
                          <div className="kv"><span>Price</span><b>🔮 {item.cost} Shards</b></div>
                          <button className="btn small" onClick={() => buyItem(item.id, item.cost, item.name)} disabled={owned || shards < item.cost}>{owned ? 'Owned ✓' : shards < item.cost ? 'Not enough Shards' : 'Buy with Shards'}</button>
                        </article>
                      )
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="card fade-up" style={{ marginTop: 16 }}>
              <h2>Play together</h2>
              <p className="muted">Crews are a game. Game points are <strong>not money and not tokens</strong> — they never change your share.</p>
              {crews.map((c) => (
                <div key={c.id} className="kv"><span><strong>🏴‍☠️ {c.name}</strong><br /><span className="small muted">{c.members} members · {c.points.toLocaleString()} XP — {c.challenge}</span></span>
                  <span className="row">
                    <button className="pill" onClick={() => setJoined((j) => j.includes(c.id) ? j : [...j, c.id])}>{joined.includes(c.id) ? 'Joined ✓' : 'Join crew'}</button>
                    <button className="btn small" onClick={() => setCrews((cs) => cs.map((x) => x.id === c.id ? { ...x, points: x.points + 50, shards: x.shards + 5 } : x))} disabled={!joined.includes(c.id)}>+50 XP</button>
                  </span>
                </div>
              ))}
            </section>

            <section className="card fade-up" style={{ marginTop: 16 }}>
              <h2>How it works — in 3 steps</h2>
              <div className="map-steps">
                <button className="map-step" onClick={() => goTab('play')}><span className="num">1</span><br /><strong>Open &amp; join</strong><br /><span className="small muted">Try free, then join with practice coins.</span></button>
                <button className="map-step" onClick={() => goTab('vaults')}><span className="num">2</span><br /><strong>Wait for your share</strong><br /><span className="small muted">Small joins are ready in full. Big joins unlock over 3 days.</span></button>
                <button className="map-step" onClick={() => goTab('invite')}><span className="num">3</span><br /><strong>Invite a friend</strong><br /><span className="small muted">You both get a share when they join.</span></button>
              </div>
            </section>
          </section>
        )}

        {tab === 'vaults' && (
          <section className="tab-panel">
            <h1>Your vaults</h1>
            <p className="muted">Each join opens a vault. Whoever controls a vault controls that share — in this demo, that is you. Your share is worked out when the sale closes: what you put in, divided by what everyone put in, times 400,000,000 tokens.</p>
            {deposits.length === 0 ? (
              <div className="card fade-up">
                <h2>You haven&apos;t joined yet</h2>
                <p className="muted">Your vaults will appear here once you join. Try a free capsule first — it costs nothing.</p>
                <button className="btn" onClick={() => goTab('play')}>Go to Play</button>
              </div>
            ) : (
              <>
                <div className="card fade-up">
                  <div className="stat-label">Your share {finalized ? '(fixed when the sale closed)' : '(not fixed yet — the sale is still open)'}</div>
                  <div className="stat-num">{finalized ? `${fmtTokens(totalAllocation)} tokens` : '—'}</div>
                  <div className="kv"><span>You put in</span><b>{fmtSol(totalGross)} SOL</b></div>
                  <div className="kv"><span>Your join</span><b>{retail ? 'Small — 2 or less' : 'Big — more than 2'}</b></div>
                  <div className="kv"><span>Ready to take now</span><b>{fmtTokens(totalClaimable)} tokens</b></div>
                </div>

                <div className="card fade-up d1" style={{ marginTop: 14 }}>
                  <h2>Next steps</h2>
                  <div className="timeline">
                    <div className={`timeline-step${timelineDone(0) ? ' done' : ''}`}><div className="timeline-dot">✓</div><div className="tl-label">Now<br />{retail ? 'All ready' : 'Nothing yet'}</div></div>
                    <div className={`timeline-step${timelineDone(24) ? ' done' : ''}`}><div className="timeline-dot">1d</div><div className="tl-label">After 1 day<br />About a third</div></div>
                    <div className={`timeline-step${timelineDone(48) ? ' done' : ''}`}><div className="timeline-dot">2d</div><div className="tl-label">After 2 days<br />About two thirds</div></div>
                    <div className={`timeline-step${timelineDone(72) ? ' done' : ''}`}><div className="timeline-dot">3d</div><div className="tl-label">After 3 days<br />All of it</div></div>
                  </div>
                  <div className="progress"><div style={{ width: `${launched ? Math.min(100, (elapsedHours / 72) * 100) : 0}%` }} /></div>
                  <p className="small muted">{launched ? `${elapsedHours} hours have passed of 3 days.` : 'The 3-day clock has not started yet.'}</p>
                  <div className="field"><label>Move the clock — see what you could take (hours: {elapsedHours})</label>
                    <input type="range" min="0" max="72" value={elapsedHours} disabled={!launched} onChange={(e) => setElapsedHours(Number(e.target.value))} />
                  </div>
                  <div className="row">
                    <button className="pill" onClick={() => setElapsedHours((h) => Math.min(72, h + 12))} disabled={!launched}>+12 hours</button>
                    <button className="pill" onClick={() => setElapsedHours(72)} disabled={!launched}>Jump to 3 days</button>
                  </div>
                  <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 12 }}>
                    <button className="btn ghost" onClick={() => { setFinalized(true); setNotice('Sale closed. Your share is now fixed.') }} disabled={finalized || deposits.length === 0}>1 · Close the sale</button>
                    <button className="btn ghost" onClick={() => { setLaunched(true); setNotice('The launch started. The 3-day clock is running.') }} disabled={!finalized || launched}>2 · Start the launch</button>
                  </div>
                  {!launched && <p className="small muted">Close the sale first, then start the launch. You can only take your share after that.</p>}
                  {retail && launched && <p className="small muted">Small joins pay no early cost.</p>}
                  <p className="small muted">A 1,000,000-token big share has 166,667 ready after 12 hours — not 500,000. 500,000 is after 36 hours.</p>
                </div>

                <div className="card fade-up d2" style={{ marginTop: 14 }}>
                  <h2>Vaults</h2>
                  <div className="table-wrap"><table className="vault-table">
                    <thead><tr><th>#</th><th>Vault</th><th>Vault ID</th><th>Unlocked</th><th>You put in</th><th>Your share</th><th>Actions</th></tr></thead>
                    <tbody>{deposits.slice(0, visibleVaults).map((d, i) => {
                      const ratio = ratioForDeposit(d)
                      const preview = penaltyForDeposit(d)
                      const claimable = claimableForDeposit(d)
                      return (
                        <tr key={d.id}>
                          <td>{i + 1}</td>
                          <td><div className={`vault-thumb art-${'abc'[d.art]}`} aria-hidden="true">{ART_EMOJI[d.art]}</div><div className="small" style={{ marginTop: 6 }}>{d.label}</div></td>
                          <td><strong>{d.vaultId}</strong><br /><span className="small muted">via {d.referrer}</span></td>
                          <td>
                            <span className="ratio-num">{ratio}%</span>
                            <div className="ratio-bar"><div style={{ width: `${ratio}%` }} /></div>
                            <div className="small muted">{launched ? `${fmtTokens(claimable)} ready now` : 'Not started yet'}</div>
                          </td>
                          <td>{fmtSol(d.amount)} SOL</td>
                          <td>{finalized ? `${fmtTokens(allocationForDeposit(d))} tokens` : '—'}</td>
                          <td>
                            <div className="row" style={{ flexWrap: 'nowrap' }}>
                              <button className="pill" onClick={() => openManage(d)}>Manage</button>
                              <button
                                className={`pill${preview.penalty > 0 ? ' red' : ''}`}
                                onClick={() => openTakeNow(d)}
                                disabled={!launched || claimable <= 0}
                              >Take now</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}</tbody>
                  </table></div>
                  <div className="table-foot">
                    <span className="small muted">Showing 1–{Math.min(visibleVaults, deposits.length)} of {deposits.length}</span>
                    {deposits.length > visibleVaults && (
                      <button className="pill wide" onClick={() => setVisibleVaults((v) => v + 5)}>Load more</button>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {tab === 'invite' && (
          <section className="tab-panel">
            <h1>Invite a friend</h1>
            <div className="card fade-up">
              <h2>You both get a share</h2>
              <p className="muted">When a friend joins through your link, you get a share of what they put in — and the person who invited you gets a smaller share. No promises, no guaranteed earnings.</p>
              <p><code>{inviteLink}</code></p>
              <button className="btn" onClick={copyLink}>{copied ? 'Copied! ✓' : 'Copy my invite link'}</button>
              <div className="kv" style={{ marginTop: 12 }}><span>Friends who joined through you</span><b>{deposits.filter((d) => d.direct > 0).length}</b></div>
              <div className="kv"><span>Your share from invites, so far</span><b>{fmtSol(totalReferral)} SOL</b></div>
            </div>
            <div className="card fade-up d1" style={{ marginTop: 14 }}>
              <h2>Try the numbers</h2>
              <div className="field"><label>If your friend joins with (SOL)</label>
                <input type="number" min="0" step="0.1" value={calcSol} onChange={(e) => setCalcSol(e.target.value)} />
              </div>
              <div className="kv"><span>You get</span><b>{fmtSol(calcSplit.direct)} SOL</b></div>
              <div className="kv"><span>The person who invited you gets</span><b>{fmtSol(calcSplit.upline)} SOL</b></div>
              <div className="kv"><span>The launch gets</span><b>{fmtSol(calcSplit.vault)} SOL</b></div>
              <p className="small muted">Example: if your friend joins with 1, you get 0.10. If they join with 10, you get 1.00.</p>
              {deposits.length > 0 && (
                <>
                  <h3 style={{ marginTop: 14 }}>Your invites, so far</h3>
                  {deposits.map((d) => (
                    <div key={d.id} className="kv"><span>{fmtSol(d.amount)} SOL join via {d.referrer}</span><b>You got {fmtSol(d.direct)}</b></div>
                  ))}
                </>
              )}
            </div>

            <section className="card fade-up d1" style={{ marginTop: 14 }}>
              <h2>Hall of Legends</h2>
              <p className="muted">The top collectors in Nexus Bay. XP comes from playing — opening capsules, joining, inviting, claiming daily Shards. Shards are practice points, not money.</p>
              <div className="podium">
                {leaderboard.slice(0, 3).map((r, i) => (
                  <div key={r.name} className={`podium-card place-${i + 1}`}>
                    <div className="podium-medal" aria-hidden="true">{['🥇', '🥈', '🥉'][i]}</div>
                    <strong>{r.name}</strong>
                    <span className="stat-num">{sortBy === 'xp' ? `${r.xp} XP` : `🔮 ${r.shards}`}</span>
                    <span className="small muted">{r.members} {r.members === 1 ? 'collector' : 'collectors'}</span>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <button className={`pill${sortBy === 'xp' ? ' active' : ''}`} onClick={() => setSortBy('xp')}>Sort by XP</button>
                <button className={`pill${sortBy === 'shards' ? ' active' : ''}`} onClick={() => setSortBy('shards')}>Sort by Shards earned</button>
                <span className="small muted">My Rank: <b>#{myRank}</b> of {leaderboard.length} · You: <b>{xp} XP</b> · <b>🔮 {shardsEarned} Shards</b></span>
              </div>
              <div className="table-wrap" style={{ marginTop: 12 }}><table>
                <thead><tr><th>Rank</th><th>Collector</th><th>XP</th><th>Shards earned</th></tr></thead>
                <tbody>{leaderboard.map((r, i) => (
                  <tr key={r.name} className={r.you ? 'you-row' : ''}><td>#{i + 1}</td><td><strong>{r.name}</strong>{r.you ? ' — that is you!' : ''}</td><td>{r.xp}</td><td>🔮 {r.shards}</td></tr>
                ))}</tbody>
              </table></div>
              <p className="small muted">Top 1000 collectors — in this demo, the crews are seeded practice crews and your row is your real simulated play. Nobody here is a real person with real earnings.</p>
            </section>
          </section>
        )}

        {tab === 'help' && (
          <section className="tab-panel">
            <h1>Help</h1>
            <div className="card fade-up">
              <h2>Ask in plain words</h2>
              <p className="muted">I answer only from the approved Nexus facts. If I don&apos;t know, I&apos;ll say so — I never invent prices or odds. Never paste a password or secret phrase here.</p>
              <div className="row" style={{ marginBottom: 12 }}>
                {['What happens if I put in 2?', 'How do invites pay?', 'What are the odds of winning?', 'What is it worth?', 'When can I take my share?', 'Is this real money?'].map((q) => (
                  <button key={q} className="pill" onClick={() => { setQuestion(q); setAnswer(guideAnswer(q)) }}>{q}</button>
                ))}
              </div>
              <div className="field"><label>Ask a question</label>
                <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setAnswer(guideAnswer(question)) }} placeholder="e.g. When can I take my share?" />
              </div>
              <button className="btn" onClick={() => setAnswer(guideAnswer(question))}>Ask</button>
              <div className="notice info" style={{ marginTop: 16 }}>{answer}</div>
            </div>
            <div className="card fade-up d1" style={{ marginTop: 14 }}>
              <h2>Good to know</h2>
              <div className="kv"><span>Is this real money?</span><b>No — practice only</b></div>
              <div className="kv"><span>Will I definitely make money?</span><b>No — nothing is promised</b></div>
              <div className="kv"><span>Do I need a wallet to look around?</span><b>No — only to join</b></div>
              <div className="kv"><span>Can I get my practice coins back?</span><b>No — not in this design</b></div>
              <div className="kv"><span>What are Shards?</span><b>Practice points for fun — not money, not tokens</b></div>
            </div>
          </section>
        )}

        <footer className="bay-footer">
          <div className="footer-links">
            <button className="linklike" onClick={() => setView('bay')}>Home</button>
            <button className="linklike" onClick={() => goTab('play')}>How it works</button>
            <button className="linklike" onClick={() => goTab('help')}>FAQ</button>
            <button className="linklike" onClick={() => setView('builders')}>For builders &amp; studios</button>
          </div>
          Nexus — practice only, no real money, no guaranteed returns.<br />
          Founder &amp; CEO: Abasiofon Joseph Bassey.
        </footer>
      </main>
      )}

      <nav className="bottom-nav" aria-label="Nexus">
        <div className="bottom-nav-inner">
          {TABS.map((t) => (
            <button key={t.id} className={`bottom-tab${view === 'main' && tab === t.id ? ' active' : ''}`} onClick={() => goTab(t.id)} aria-current={view === 'main' && tab === t.id ? 'page' : undefined}>
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
                    <div className="kv"><span>You put in</span><b>{fmtSol(managed.amount)} SOL</b></div>
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
                {managedPreview.penalty > 0 && (
                  <p className="notice" style={{ marginTop: 12 }}>Take it early and you keep a little less — most of that little bit disappears forever.</p>
                )}
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
                  {lastClaim.penalty > 0 && <p className="small muted" style={{ marginBottom: 0 }}>Early cost was {fmtTokens(lastClaim.penalty)} tokens. Waiting until after 3 days costs nothing.</p>}
                </div>
                <p className="muted">Next step: {managedClaimable > 0 ? 'there is still some left in this vault — come back when more has unlocked.' : 'this vault is empty now. Join again on Play to open a new vault, or invite a friend.'}</p>
                <div className="row" style={{ marginTop: 18 }}>
                  <button className="btn" style={{ flex: 1 }} onClick={closeModal}>Back to your vaults</button>
                  <button className="pill" onClick={() => { closeModal(); goTab('play') }}>Open a new vault</button>
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
    </div>
  )
}
