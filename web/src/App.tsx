import { useMemo, useState } from 'react'
import {
  HARD_CAP_SOL, LAMPORTS_PER_SOL,
  allocationFor, claimableNow, fmtSol, fmtTokens,
  isRetail, penaltyRatePercent, penaltySplit, referralSplit,
  vestedAmount, workedChecks,
} from './lib/math'
import { CAPSULES, CREWS, DEMO_CAMPAIGNS, PACKAGES, guideAnswer } from './lib/data'
import type { Campaign, Crew } from './lib/data'

// Dribbble vaults redesign (2026-11-24).
// Reference: "Web3 Vaults & Lending Against Crypto UI UX Dashboard
// Platform" by Extej, Dribbble shot 21827461. Dark navy + teal,
// vaults as a TABLE, vault-detail modal, pill buttons, one idea
// per screen. 4 bottom tabs only: Play, Vaults, Invite, Help.
// Plain language in the main UI. Everything technical lives on
// the "For builders & studios" page. Maths in lib/math.ts is unchanged.
// Deliberately NOT copied from the shot: no lending/borrowing,
// no APY, no charts, no health factor, no sidebar/top nav, and
// none of its placeholder EUR/sEURO figures.
type Tab = 'play' | 'vaults' | 'invite' | 'help'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'play', label: 'Play', icon: '🎁' },
  { id: 'vaults', label: 'Vaults', icon: '🗄️' },
  { id: 'invite', label: 'Invite', icon: '🤝' },
  { id: 'help', label: 'Help', icon: '💬' },
]

interface Deposit {
  id: number
  vaultId: string
  art: number // 0, 1 or 2 — colourful vault artwork gradient
  label: string // "Small vault" / "Big vault"
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
const CONFETTI_COLORS = ['#2dd4bf', '#f59e0b', '#22d3ee', '#f472b6', '#a78bfa', '#34d399']

export default function App() {
  const [tab, setTab] = useState<Tab>('play')
  const [view, setView] = useState<'main' | 'builders'>('main')
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
  // Vault modal: one vault at a time, one idea per screen.
  const [managedId, setManagedId] = useState<number | null>(null)
  const [modalStep, setModalStep] = useState<'detail' | 'confirm' | 'success'>('detail')
  const [lastClaim, setLastClaim] = useState<{ net: number; penalty: number; gross: number } | null>(null)
  const [visibleVaults, setVisibleVaults] = useState(5)

  const totalGross = useMemo(() => deposits.reduce((a, d) => a + d.amount, 0), [deposits])
  const totalReferral = useMemo(() => deposits.reduce((a, d) => a + d.direct + d.upline, 0), [deposits])
  const retail = isRetail(totalGross)
  const elapsedSeconds = elapsedHours * 3600
  // Per-vault share: this join's part of the whole sale, times 400,000,000.
  // Single-wallet simulation: this wallet is the only contributor, so the
  // vaults together hold the full presale pool once the sale closes.
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
  }
  function openManage(d: Deposit) {
    setManagedId(d.id); setModalStep('detail'); setLastClaim(null)
  }
  function openTakeNow(d: Deposit) {
    setManagedId(d.id); setModalStep('confirm'); setLastClaim(null)
  }
  function closeModal() {
    setManagedId(null); setModalStep('detail'); setLastClaim(null)
  }
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

  const timelineDone = (h: number) => launched && elapsedHours >= h
  const managedClaimable = managed ? claimableForDeposit(managed) : 0
  const managedPreview = managed ? penaltyForDeposit(managed) : null
  const managedAlloc = managed ? allocationForDeposit(managed) : 0
  const managedRatio = managed ? ratioForDeposit(managed) : 0

  if (view === 'builders') {
    return (
      <div>
        <header className="topbar"><div className="topbar-inner">
          <div className="logo"><span className="logo-mark">⬡</span> NEXUS</div>
          <span className="practice-pill">Practice only</span>
        </div></header>
        <main className="wrap">
          <button className="btn ghost small" onClick={() => setView('main')} style={{ marginTop: 18 }}>← Back to Nexus</button>
          <section className="card fade-up" style={{ marginTop: 14 }}>
            <h1 style={{ fontSize: '1.7rem' }}>For builders &amp; studios</h1>
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
          <footer>Nexus v2.0 — Founder &amp; CEO: Abasiofon Joseph Bassey. Simulated devnet prototype only.</footer>
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
        <div className="logo"><span className="logo-mark">⬡</span> NEXUS</div>
        <span className="practice-pill">Practice money only</span>
        <span className="spacer" />
        {connected && <span className="wallet-chip">Demo wallet · {address}</span>}
      </div></header>

      <main className="wrap">
        {notice && <div className="notice info fade-up" style={{ marginTop: 16 }} role="status">{notice}</div>}

        {tab === 'play' && (
          <section className="tab-panel">
            <div className="hero fade-up">
              <div className="hero-art" aria-hidden="true">
                <span className="capsule-mini">🎁</span><span className="capsule-mini">💎</span><span className="capsule-mini">🐋</span>
              </div>
              <h1>Open a capsule, <em>join the launch.</em></h1>
              <p className="big">Try it free first. No wallet needed to look around. This is practice money — not real money, and nothing here is promised to make money.</p>
              <div className="steps">
                <span className="step-chip">1 · Open a free capsule</span>
                <span className="step-chip">2 · Join with practice coins</span>
                <span className="step-chip">3 · Take your share later</span>
              </div>
            </div>

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
              <h2>Play together</h2>
              <p className="muted">Crews are a game. Game points are <strong>not money and not tokens</strong> — they never change your share.</p>
              {crews.map((c) => (
                <div key={c.id} className="kv"><span><strong>🏴‍☠️ {c.name}</strong><br /><span className="small muted">{c.members} members · {c.points.toLocaleString()} game points — {c.challenge}</span></span>
                  <span className="row">
                    <button className="pill" onClick={() => setJoined((j) => j.includes(c.id) ? j : [...j, c.id])}>{joined.includes(c.id) ? 'Joined ✓' : 'Join crew'}</button>
                    <button className="btn small" onClick={() => setCrews((cs) => cs.map((x) => x.id === c.id ? { ...x, points: x.points + 50 } : x))} disabled={!joined.includes(c.id)}>+50 points</button>
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
            <h1 style={{ fontSize: '1.7rem' }}>Your vaults</h1>
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
            <h1 style={{ fontSize: '1.7rem' }}>Invite a friend</h1>
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
          </section>
        )}

        {tab === 'help' && (
          <section className="tab-panel">
            <h1 style={{ fontSize: '1.7rem' }}>Help</h1>
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
            </div>
          </section>
        )}

        <footer>
          <div className="footer-links">
            <button className="linklike" onClick={() => goTab('play')}>Home</button>
            <button className="linklike" onClick={() => goTab('play')}>How it works</button>
            <button className="linklike" onClick={() => goTab('help')}>FAQ</button>
            <button className="linklike" onClick={() => { setView('builders'); window.scrollTo({ top: 0 }) }}>For builders &amp; studios</button>
          </div>
          Nexus — practice only, no real money, no guaranteed returns.<br />
          Founder &amp; CEO: Abasiofon Joseph Bassey.
        </footer>
      </main>

      <nav className="bottom-nav" aria-label="Nexus">
        <div className="bottom-nav-inner">
          {TABS.map((t) => (
            <button key={t.id} className={`bottom-tab${tab === t.id ? ' active' : ''}`} onClick={() => goTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <span className="tab-icon" aria-hidden="true">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Vault detail modal — two columns over the dimmed table, as in the shot */}
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
