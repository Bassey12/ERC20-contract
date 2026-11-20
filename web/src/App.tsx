import { useMemo, useState } from 'react'
import {
  AIRDROP_TOKENS, BASE_UNITS_PER_TOKEN, HARD_CAP_SOL, LAMPORTS_PER_SOL,
  PRESALE_TOKENS, TOTAL_SUPPLY, allocationFor, claimableNow, fmtSol, fmtTokens,
  isRetail, penaltyRatePercent, penaltySplit, referralSplit, sol, tokens,
  vestedAmount, workedChecks,
} from './lib/math'
import { CAPSULES, CREWS, DEMO_CAMPAIGNS, PACKAGES, guideAnswer } from './lib/data'
import type { Campaign, Crew } from './lib/data'

type Tab = 'pool' | 'capsules' | 'vault' | 'earn' | 'pirates' | 'studio' | 'contract' | 'guide'
const TABS: { id: Tab; label: string }[] = [
  { id: 'pool', label: 'Pool' },
  { id: 'capsules', label: 'Capsules' },
  { id: 'vault', label: 'Vault' },
  { id: 'earn', label: 'Earn' },
  { id: 'pirates', label: 'Pirates' },
  { id: 'studio', label: 'Studio' },
  { id: 'contract', label: 'Contract' },
  { id: 'guide', label: 'AI Guide' },
]
const MAP_STEPS: { n: number; title: string; text: string; tab: Tab }[] = [
  { n: 1, title: 'Capsules', text: 'Preview free, then choose retail or whale.', tab: 'capsules' },
  { n: 2, title: 'Vault', text: 'Deposit devnet SOL, see your position.', tab: 'vault' },
  { n: 3, title: 'Referrals 10 / 2 / 88', text: 'Direct 10%, upline 2%, pool 88%.', tab: 'earn' },
  { n: 4, title: 'Finalise / Launch', text: 'Authority closes the sale, then starts the 72h clock.', tab: 'vault' },
  { n: 5, title: 'Vest / Claim / Burn', text: 'Linear vesting, banded penalty, 80% burned.', tab: 'vault' },
  { n: 6, title: 'Pirates + Studio', text: 'Crews for fun, campaigns for studios.', tab: 'pirates' },
]

interface Deposit { id: number; amount: number; direct: number; upline: number; vault: number; referrer: string }

function fakeAddress() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `Sim${s}…${s.slice(0, 4)}`
}

export default function App() {
  const [tab, setTab] = useState<Tab>('pool')
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [hasReferrer, setHasReferrer] = useState(true)
  const [referrer, setReferrer] = useState('Ben')
  const [amountSol, setAmountSol] = useState('1')
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [finalized, setFinalized] = useState(false)
  const [launched, setLaunched] = useState(false)
  const [elapsedHours, setElapsedHours] = useState(0)
  const [claimedGross, setClaimedGross] = useState(0) // base units
  const [burned, setBurned] = useState(0)
  const [escrow, setEscrow] = useState(0)
  const [opens, setOpens] = useState<Record<string, number>>({})
  const [lastOpen, setLastOpen] = useState('')
  const [crews, setCrews] = useState<Crew[]>(CREWS)
  const [joined, setJoined] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS)
  const [newStudio, setNewStudio] = useState('')
  const [newCampaign, setNewCampaign] = useState('')
  const [newPkg, setNewPkg] = useState('Devnet Pilot')
  const [calcSol, setCalcSol] = useState('10')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('Ask me about tiers, referrals, vesting, penalties, claims, the airdrop, devnet, packages or refunds. I answer only from the approved Nexus facts — and I say “unknown” when the answer is not in them.')
  const [notice, setNotice] = useState('')

  const totalGross = useMemo(() => deposits.reduce((a, d) => a + d.amount, 0), [deposits])
  const totalReferral = useMemo(() => deposits.reduce((a, d) => a + d.direct + d.upline, 0), [deposits])
  const retail = isRetail(totalGross)
  const allocation = finalized ? allocationFor(totalGross, totalGross) : 0
  // In this single-wallet simulation the wallet is the only contributor, so its
  // allocation is the full presale pool once finalised. With more wallets it
  // would be gross/total × 400,000,000 — the formula is shown on the page.
  const elapsedSeconds = elapsedHours * 3600
  const vested = launched ? vestedAmount(allocation, elapsedSeconds) : 0
  const claimable = claimableNow(vested, claimedGross)
  const rate = penaltyRatePercent(elapsedSeconds)
  const preview = penaltySplit(claimable, elapsedSeconds)
  const checks = useMemo(() => workedChecks(), [])
  const passed = checks.filter((c) => c.pass).length

  const amountLamports = Math.round((parseFloat(amountSol) || 0) * LAMPORTS_PER_SOL)
  const split = referralSplit(amountLamports, hasReferrer, hasReferrer)

  function connect() {
    setAddress(fakeAddress())
    setConnected(true)
    setNotice('Simulated wallet connected. This is a demo address — no real wallet, no real SOL.')
  }
  function deposit() {
    if (!connected) { setNotice('Connect the simulated wallet first.'); return }
    if (finalized) { setNotice('Sale is finalised — deposits are closed.'); return }
    if (amountLamports <= 0) { setNotice('Enter an amount above 0 SOL.'); return }
    if (totalGross + amountLamports > HARD_CAP_SOL * LAMPORTS_PER_SOL) { setNotice('That would exceed the 15,000 SOL hard cap.'); return }
    setDeposits((d) => [...d, { id: Date.now(), amount: amountLamports, direct: split.direct, upline: split.upline, vault: split.vault, referrer: hasReferrer ? referrer : '—' }])
    setNotice(`Deposit recorded (simulated): ${fmtSol(amountLamports)} SOL — direct ${fmtSol(split.direct)}, upline ${fmtSol(split.upline)}, pool ${fmtSol(split.vault)}.`)
  }
  function claim() {
    if (!launched || claimable <= 0) return
    const p = penaltySplit(claimable, elapsedSeconds)
    setClaimedGross((c) => c + claimable)
    setBurned((b) => b + p.burned)
    setEscrow((e) => e + p.escrow)
    setNotice(`Claimed ${fmtTokens(claimable)} gross → net ${fmtTokens(p.net)} NEXUS. Penalty ${fmtTokens(p.penalty)} (${p.rate}%): ${fmtTokens(p.burned)} burned, ${fmtTokens(p.escrow)} to rewards escrow.`)
  }
  function createCampaign() {
    if (!newStudio.trim() || !newCampaign.trim()) { setNotice('Enter a studio name and a campaign name.'); return }
    setCampaigns((c) => [...c, { id: `c${Date.now()}`, studio: newStudio.trim(), name: newCampaign.trim(), pkg: newPkg, sessions: 0, wallets: 0, contributors: 0, testSol: 0, status: 'Draft — simulated, not live' }])
    setNewStudio(''); setNewCampaign('')
    setNotice('Campaign created in the simulated dashboard. No invoice, no payment — packages are sold by written scope only.')
  }

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="logo"><span className="logo-mark">⬡</span> NEXUS</div>
          <span className="devnet-pill">Devnet only · Test SOL</span>
          <span className="spacer" />
          <span className="small muted"><span className="live-dot" />Simulated · no real money</span>
          {connected
            ? <span className="tag ok">Wallet {address}</span>
            : <button className="btn" onClick={connect}>Connect simulated wallet</button>}
        </div>
      </header>

      <main className="wrap">
        <section className="hero fade-up">
          <div className="hero-art" aria-hidden="true"><span className="capsule">🎁</span><span className="capsule">💎</span><span className="capsule">🐋</span></div>
          <h1>Open a capsule. <em>Join a launch.</em> Prove it happened.</h1>
          <p>Nexus is a Solana devnet-first capsule and token launch for players — and a campaign service for small game studios that need verified participation, not inflated clicks. Every number below is simulated test data until Gates 1–3 pass.</p>
          <div className="row">
            <button className="btn" onClick={() => setTab('capsules')}>Explore capsules</button>
            <button className="btn ghost" onClick={() => setTab('studio')}>Run a studio campaign</button>
          </div>
          <div className="progress" style={{ marginTop: 22 }}><div style={{ width: `${Math.min(100, (sol(totalGross) / HARD_CAP_SOL) * 100)}%` }} /></div>
          <p className="small muted">{fmtSol(totalGross)} / 15,000 SOL hard cap · {deposits.length} simulated deposit{deposits.length === 1 ? '' : 's'} · {retail ? 'Retail tier (≤ 2 SOL)' : 'Whale tier (> 2 SOL)'}</p>
        </section>

        <section className="card fade-up d1" style={{ marginTop: 16 }}>
          <h2>The entire system — how it connects</h2>
          <p className="muted small">Tap a step to jump to it. Capsule previews never move money; deposits, vesting and claims are the only money-moving steps, and each needs a wallet approval in the real system.</p>
          <div className="map-steps">
            {MAP_STEPS.map((s) => (
              <button key={s.n} className="map-step" onClick={() => setTab(s.tab)}>
                <span className="num">{s.n}</span><br /><strong>{s.title}</strong><br /><span className="small muted">{s.text}</span>
              </button>
            ))}
          </div>
        </section>

        {notice && <div className="notice info fade-up" style={{ marginTop: 16 }} role="status">{notice}</div>}

        <nav className="tabs" aria-label="Nexus sections">
          {TABS.map((t) => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>

        {tab === 'pool' && (
          <section className="tab-panel">
            <div className="grid cols-4">
              <div className="card fade-up"><div className="stat-label">Total supply (cap)</div><div className="stat-num">1,000,000,000</div><p className="small muted">6 decimals. Supply can only fall, via verified burns.</p></div>
              <div className="card fade-up d1"><div className="stat-label">Presale pool</div><div className="stat-num">400M <span className="small muted">40%</span></div><p className="small muted">Proportional allocation at sale close.</p></div>
              <div className="card fade-up d2"><div className="stat-label">Airdrop pool</div><div className="stat-num">100M <span className="small muted">10%</span></div><p className="small muted">Merkle list only. No approved list exists yet.</p></div>
              <div className="card fade-up d3"><div className="stat-label">Simulated deposits</div><div className="stat-num">{fmtSol(totalGross)} SOL</div><p className="small muted">Referrals paid in simulation: {fmtSol(totalReferral)} SOL.</p></div>
            </div>
            <div className="card fade-up d2" style={{ marginTop: 16 }}>
              <h2>Where the other 500M tokens go — recommended, not approved</h2>
              <p className="muted">This split is a v2.0 <strong>recommendation</strong>. It needs founder approval, a published locking/vesting schedule, and disclosure before launch — or the launch does not proceed.</p>
              <div className="table-wrap"><table>
                <thead><tr><th>Bucket</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td>Liquidity</td><td>150M (15%)</td><td><span className="tag warn">Recommended</span></td></tr>
                  <tr><td>Ecosystem</td><td>100M (10%)</td><td><span className="tag warn">Recommended</span></td></tr>
                  <tr><td>Team</td><td>100M (10%)</td><td><span className="tag warn">Recommended</span></td></tr>
                  <tr><td>Treasury</td><td>100M (10%)</td><td><span className="tag warn">Recommended</span></td></tr>
                  <tr><td>Marketing</td><td>50M (5%)</td><td><span className="tag warn">Recommended</span></td></tr>
                  <tr><td><strong>Total accounted</strong></td><td><strong>1,000M (100%)</strong></td><td><span className="tag ok">Buckets sum to 1B</span></td></tr>
                </tbody>
              </table></div>
              <div className="grid cols-3" style={{ marginTop: 16 }}>
                <div><div className="stat-label">Burned in simulation</div><div className="stat-num">{fmtTokens(burned)}</div></div>
                <div><div className="stat-label">Rewards escrow</div><div className="stat-num">{fmtTokens(escrow)}</div></div>
                <div><div className="stat-label">Hard cap</div><div className="stat-num">15,000 SOL</div></div>
              </div>
              <p className="small muted">Source for both halves of the project lives in this repository — the web app in <code>web/</code> and the Anchor contract in <code>contracts/</code>. No push has been made from this page; publish it to GitHub to run it from there.</p>
            </div>
          </section>
        )}

        {tab === 'capsules' && (
          <section className="tab-panel">
            <p className="muted">Opening a capsule is a visual preview. It never moves money, never awards tokens, and never proves a transaction happened. No verified reward odds are published — the guide says “unknown” if you ask.</p>
            <div className="grid cols-3">
              {CAPSULES.map((c, i) => (
                <article key={c.id} className={`card fade-up d${i + 1}`}>
                  <div style={{ fontSize: '2.4rem' }}>{c.emoji}</div>
                  <h3>{c.name}</h3>
                  <p className="small muted">{c.tier} · {c.cost}</p>
                  <p>{c.blurb}</p>
                  <span className="tag">{c.status}</span>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn" onClick={() => { setOpens((o) => ({ ...o, [c.id]: (o[c.id] || 0) + 1 })); setLastOpen(c.id) }}>
                      Open preview
                    </button>
                    <span className="small muted">Opened {opens[c.id] || 0}× in this session</span>
                  </div>
                  {lastOpen === c.id && <p key={opens[c.id]} className="pop" style={{ marginTop: 10 }}>✨ Preview only — the capsule opened, nothing was paid, nothing was awarded.</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'vault' && (
          <section className="tab-panel">
            <div className="grid cols-2">
              <div className="card fade-up">
                <h2>Deposit (simulated devnet SOL)</h2>
                {!connected && <p className="muted">Connect the simulated wallet in the header first. In the real system every deposit needs a separate wallet approval — Nexus never holds your keys.</p>}
                <div className="field"><label>Amount (SOL)</label><input type="number" min="0" step="0.1" value={amountSol} onChange={(e) => setAmountSol(e.target.value)} /></div>
                <div className="field"><label>Referrer</label>
                  <select value={hasReferrer ? referrer : 'none'} onChange={(e) => { if (e.target.value === 'none') setHasReferrer(false); else { setHasReferrer(true); setReferrer(e.target.value) } }}>
                    <option value="Ben">Ben (direct) — upline Caro</option>
                    <option value="Ada">Ada (direct) — no upline</option>
                    <option value="none">No referrer</option>
                  </select>
                </div>
                <div className="kv"><span>Direct referrer (10%)</span><b>{fmtSol(split.direct)} SOL</b></div>
                <div className="kv"><span>Upline (2%)</span><b>{fmtSol(split.upline)} SOL</b></div>
                <div className="kv"><span>Protocol pool (remainder)</span><b>{fmtSol(split.vault)} SOL</b></div>
                <p className="small muted">Missing shares go to the pool. Integer rounding remainder stays with the pool.</p>
                <button className="btn" onClick={deposit} disabled={!connected || finalized}>Deposit {fmtSol(amountLamports)} SOL (simulated)</button>
                {finalized && <p className="small muted">Sale finalised — deposits are closed.</p>}
                <h3 style={{ marginTop: 20 }}>Your position</h3>
                <div className="kv"><span>Total contributed</span><b>{fmtSol(totalGross)} SOL</b></div>
                <div className="kv"><span>Tier (cumulative)</span><b>{retail ? 'Retail — ≤ 2 SOL' : 'Whale — > 2 SOL'}</b></div>
                <div className="kv"><span>Allocation {finalized ? '(fixed at close)' : '(not fixed until finalise)'}</span><b>{finalized ? `${fmtTokens(allocation)} NEXUS` : '—'}</b></div>
                <p className="small muted">Allocation = your gross ÷ total gross × 400,000,000. In this single-wallet simulation you are the only contributor, so the full pool is shown — with more wallets your share falls proportionally.</p>
              </div>
              <div className="card fade-up d1">
                <h2>Finalise · Launch · Claim</h2>
                <p className="muted small">Simulated authority controls. In the real system these need the authority wallet <code>BHxkjg3…8LmTB</code> — a public address only, never a private key.</p>
                <div className="row">
                  <button className="btn ghost" onClick={() => { setFinalized(true); setNotice('Sale finalised (simulated). Allocations are now fixed.') }} disabled={finalized || deposits.length === 0}>Finalise sale</button>
                  <button className="btn ghost" onClick={() => { setLaunched(true); setNotice('Launch activated (simulated). The 72-hour vesting clock has started.') }} disabled={!finalized || launched}>Activate launch</button>
                </div>
                <h3 style={{ marginTop: 18 }}>Vesting clock (simulated)</h3>
                <p>Elapsed: <strong>{elapsedHours}h</strong> of 72h · penalty rate now: <strong>{rate}%</strong></p>
                <div className="progress"><div style={{ width: `${Math.min(100, (elapsedHours / 72) * 100)}%` }} /></div>
                <div className="row">
                  <button className="btn ghost" onClick={() => setElapsedHours((h) => Math.min(72, h + 1))} disabled={!launched}>+1h</button>
                  <button className="btn ghost" onClick={() => setElapsedHours((h) => Math.min(72, h + 12))} disabled={!launched}>+12h</button>
                  <button className="btn ghost" onClick={() => setElapsedHours((h) => Math.min(72, h + 24))} disabled={!launched}>+24h</button>
                  <button className="btn ghost" onClick={() => { setElapsedHours(0); setClaimedGross(0); setBurned(0); setEscrow(0) }}>Reset demo</button>
                </div>
                <div className="kv"><span>Vested</span><b>{fmtTokens(vested)} NEXUS</b></div>
                <div className="kv"><span>Already gross-claimed</span><b>{fmtTokens(claimedGross)} NEXUS</b></div>
                <div className="kv"><span>Claimable now</span><b>{fmtTokens(claimable)} NEXUS</b></div>
                <div className="kv"><span>If claimed now — net</span><b>{fmtTokens(preview.net)} NEXUS</b></div>
                <div className="kv"><span>Penalty ({preview.rate}%) — burned / escrow</span><b>{fmtTokens(preview.burned)} / {fmtTokens(preview.escrow)}</b></div>
                <p className="small muted">Corrected example: a 1,000,000-token whale vests <strong>166,667</strong> at hour 12, not 500,000. 500,000 is hour 36.</p>
                <button className="btn" onClick={claim} disabled={!launched || claimable <= 0}>Claim {fmtTokens(claimable)} gross (simulated)</button>
                {!launched && <p className="small muted">Launch first — claims need finalisation + launch activation.</p>}
                {deposits.length > 0 && <><h3 style={{ marginTop: 18 }}>Deposits</h3>{deposits.map((d) => (
                  <div key={d.id} className="kv"><span>#{d.id.toString().slice(-4)} via {d.referrer}</span><b>{fmtSol(d.amount)} SOL → pool {fmtSol(d.vault)}</b></div>
                ))}</>}
              </div>
            </div>
          </section>
        )}

        {tab === 'earn' && (
          <section className="tab-panel">
            <div className="grid cols-2">
              <div className="card fade-up">
                <h2>Your referral link (simulated)</h2>
                <p>Share it and the contract pays 10% to you and 2% to your inviter, in the same transaction as the deposit. Two levels only — not a pyramid, and never a promise of passive or guaranteed earnings.</p>
                <p><code>https://nexus.example/r/{connected ? address.slice(0, 10) : 'connect-first'}</code></p>
                <div className="kv"><span>Referral earnings in simulation</span><b>{fmtSol(totalReferral)} SOL</b></div>
                <div className="kv"><span>Deposits via your link</span><b>{deposits.filter((d) => d.direct > 0).length}</b></div>
                <h3 style={{ marginTop: 16 }}>Referral ledger</h3>
                {deposits.length === 0 ? <p className="muted">No deposits yet — make one in the Vault.</p> : deposits.map((d) => (
                  <div key={d.id} className="kv"><span>{fmtSol(d.amount)} SOL deposit</span><b>direct {fmtSol(d.direct)} · upline {fmtSol(d.upline)}</b></div>
                ))}
              </div>
              <div className="card fade-up d1">
                <h2>Split calculator</h2>
                <div className="field"><label>Contribution (SOL)</label><input type="number" min="0" step="0.1" value={calcSol} onChange={(e) => setCalcSol(e.target.value)} /></div>
                {(() => { const a = Math.round((parseFloat(calcSol) || 0) * LAMPORTS_PER_SOL); const s = referralSplit(a, true, true); const n = referralSplit(a, false, false); return (<>
                  <div className="kv"><span>With referrers — direct / upline / pool</span><b>{fmtSol(s.direct)} / {fmtSol(s.upline)} / {fmtSol(s.vault)} SOL</b></div>
                  <div className="kv"><span>Without referrers — pool receives</span><b>{fmtSol(n.vault)} SOL</b></div>
                </>) })()}
                <p className="small muted">Example: 10 SOL → 1.00 / 0.20 / 8.80. 1 SOL with no referrers → the pool receives 1.00 SOL in total.</p>
              </div>
            </div>
          </section>
        )}

        {tab === 'pirates' && (
          <section className="tab-panel">
            <div className="notice">Pirates points are <strong>local game points only</strong> — not NEXUS tokens, not money, and not a promise of either. They can be cleared or lost; they never change a token allocation.</div>
            <div className="grid cols-3" style={{ marginTop: 16 }}>
              {crews.map((c, i) => (
                <article key={c.id} className={`card fade-up d${i + 1}`}>
                  <h3>🏴‍☠️ {c.name}</h3>
                  <p className="small muted">{c.members} members · {c.points.toLocaleString()} crew points</p>
                  <p>{c.challenge}</p>
                  <div className="row">
                    <button className="btn ghost" onClick={() => setJoined((j) => j.includes(c.id) ? j : [...j, c.id])}>{joined.includes(c.id) ? 'Joined ✓' : 'Join crew'}</button>
                    <button className="btn" onClick={() => setCrews((cs) => cs.map((x) => x.id === c.id ? { ...x, points: x.points + 50 } : x))} disabled={!joined.includes(c.id)}>Complete challenge +50</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'studio' && (
          <section className="tab-panel">
            <div className="grid cols-3">
              {PACKAGES.map((p, i) => (
                <article key={p.name} className={`card fade-up d${i + 1}`}>
                  <h3>{p.name}</h3>
                  <div className="stat-num">{p.price}</div>
                  <p className="small muted">{p.days} · USDC on Solana, by invoice only — no checkout.</p>
                  <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                  <span className={`tag ${p.tag === 'GATED' ? 'gated' : 'ok'}`}>{p.tag}</span>
                </article>
              ))}
            </div>
            <div className="grid cols-2" style={{ marginTop: 16 }}>
              <div className="card fade-up">
                <h2>Create a campaign (simulated)</h2>
                <div className="field"><label>Studio name</label><input value={newStudio} onChange={(e) => setNewStudio(e.target.value)} placeholder="e.g. Reef Games" /></div>
                <div className="field"><label>Campaign name</label><input value={newCampaign} onChange={(e) => setNewCampaign(e.target.value)} placeholder="e.g. Tutorial test" /></div>
                <div className="field"><label>Package</label><select value={newPkg} onChange={(e) => setNewPkg(e.target.value)}>{PACKAGES.map((p) => <option key={p.name}>{p.name}</option>)}</select></div>
                <button className="btn" onClick={createCampaign}>Create campaign</button>
                <p className="small muted">Refund policy: full refund before start, 50% within the first 3 days, none after day 3 unless Nexus fails to deliver. Unused reward budgets are always returned. It does not refund protocol contributions.</p>
              </div>
              <div className="card fade-up d1">
                <h2>Campaign dashboard — evidence classes kept separate</h2>
                <p className="small muted">Sessions and wallets are <em>not</em> people. Only verified contributors count as verified — and test SOL is never sales or revenue.</p>
                <div className="table-wrap"><table>
                  <thead><tr><th>Campaign</th><th>Sessions</th><th>Wallets</th><th>Verified</th><th>Test SOL</th></tr></thead>
                  <tbody>{campaigns.map((c) => (
                    <tr key={c.id}><td><strong>{c.name}</strong><br /><span className="small muted">{c.studio} · {c.pkg} · {c.status}</span></td><td>{c.sessions}</td><td>{c.wallets}</td><td>{c.contributors}</td><td>{c.testSol}</td></tr>
                  ))}</tbody>
                </table></div>
              </div>
            </div>
          </section>
        )}

        {tab === 'contract' && (
          <section className="tab-panel">
            <div className="card fade-up">
              <h2>Contract — 14 worked-example checks</h2>
              <p className="muted">Computed live from the same maths in <code>src/lib/math.ts</code>, which mirrors <code>contracts/crates/nexus-math</code>. <strong>{passed}/14 checks pass.</strong></p>
              <div className="table-wrap"><table>
                <thead><tr><th>#</th><th>Check</th><th>Expected</th><th>Actual</th><th>Result</th></tr></thead>
                <tbody>{checks.map((c) => (
                  <tr key={c.id}><td>{c.id}</td><td>{c.label}</td><td>{c.expected}</td><td>{c.actual}</td><td className={c.pass ? 'check-pass' : 'check-fail'}>{c.pass ? 'PASS' : 'FAIL'}</td></tr>
                ))}</tbody>
              </table></div>
            </div>
            <div className="grid cols-2" style={{ marginTop: 16 }}>
              <div className="card fade-up">
                <h2>Penalty table</h2>
                <div className="table-wrap"><table><thead><tr><th>Claim time</th><th>Rate</th><th>On 1,000 gross: net / burned / escrow</th></tr></thead><tbody>
                  <tr><td>0 to &lt;24h</td><td>25%</td><td>750 / 200 / 50</td></tr>
                  <tr><td>24h to &lt;48h (at exactly 24h: 15%)</td><td>15%</td><td>850 / 120 / 30</td></tr>
                  <tr><td>48h to &lt;72h</td><td>5%</td><td>950 / 40 / 10</td></tr>
                  <tr><td>72h and later</td><td>0%</td><td>1,000 / 0 / 0</td></tr>
                </tbody></table></div>
                <p className="small muted">Burn means the SPL Token burn instruction — supply visibly shrinks. Sending tokens to a dead address is not a burn.</p>
              </div>
              <div className="card fade-up d1">
                <h2>Launch Gates 1–5 — still open</h2>
                <ol>
                  <li><strong>Gate 1:</strong> reviewed source + tests — <span className="tag warn">Open</span> — <code>anchor test</code> not yet run.</li>
                  <li><strong>Gate 2:</strong> devnet configuration — <span className="tag warn">Open</span> — no funded deployment signer.</li>
                  <li><strong>Gate 3:</strong> complete devnet execution — <span className="tag warn">Open</span> — deposit → claim not verified on-chain.</li>
                  <li><strong>Gate 4:</strong> 5 unpaid devnet pilots — <span className="tag gated">Not started</span></li>
                  <li><strong>Gate 5:</strong> commercial readiness + mainnet decision — <span className="tag gated">Not started</span> — needs independent security + legal review.</li>
                </ol>
                <p className="small muted">Deliberately absent from the contract: no SOL withdrawal / liquidity-migration instruction and no contribution-refund instruction. Do not accept production funds expecting one.</p>
                <p className="small muted">Program id is a placeholder: <code>3py1rKZt6n5CicNQELDRFWrAZx9zBXurX6wYAZxG2B8i</code>. Never present it as deployed.</p>
              </div>
            </div>
          </section>
        )}

        {tab === 'guide' && (
          <section className="tab-panel">
            <div className="card fade-up">
              <h2>AI capsule guide</h2>
              <p className="muted">This guide answers only from the approved Nexus facts. It is not a wallet, an oracle, or investment advice — and it says “unknown” rather than inventing odds or prices. Never paste a private key or seed phrase into it.</p>
              <div className="row" style={{ marginBottom: 12 }}>
                {['What happens if I put in 2 SOL?', 'How do referrals pay?', 'What are the odds of winning?', 'What is the token worth?', 'How does vesting work?', 'Can I get a refund?'].map((q) => (
                  <button key={q} className="btn ghost" onClick={() => { setQuestion(q); setAnswer(guideAnswer(q)) }}>{q}</button>
                ))}
              </div>
              <div className="field"><label>Ask a question</label><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setAnswer(guideAnswer(question)) }} placeholder="e.g. What happens if I claim at hour 12?" /></div>
              <button className="btn" onClick={() => setAnswer(guideAnswer(question))}>Ask the guide</button>
              <div className="notice info" style={{ marginTop: 16 }}>{answer}</div>
            </div>
          </section>
        )}

        <footer>
          Nexus v2.0 — Founder &amp; CEO: Abasiofon Joseph Bassey. Simulated devnet prototype only: no real wallet, no real SOL, no deployed program, no mainnet. Test SOL is not revenue. The contract source is in <code>contracts/</code>; the web source is in <code>web/</code>. This is not investment, legal, tax or security advice.
        </footer>
      </main>
    </div>
  )
}
