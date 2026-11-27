// Nexus v2.0 content — everything stated in the Perfected Edition
// (workspace/your_files/nexus-v2-perfected/nexus-v2-perfected.pdf, 18 pp).
// All of this is documentation shown in the app. Nothing here is live,
// approved, or a promise. Labels: CURRENT = supported by inspected
// source, GATED = built/designed, awaiting approval or a dependency,
// RECOMMENDED = proposed in v2.0, not yet approved, EXAMPLE = invented
// numbers to explain a calculation only.

export const DEVNET_FIRST =
  'READ THIS FIRST — DEVNET ONLY. Paid checkout, production reward custody, and mainnet launch are not active.'

export interface Gate {
  n: number
  title: string
  pass: string
  kill: string
  status: 'in-progress' | 'not-passed'
  statusText: string
}
export const GATES: Gate[] = [
  {
    n: 1,
    title: 'Reviewed source & tests',
    pass: 'Exact source version, compatible Anchor/Solana tooling, executable build; adversarial tests: referral conservation, repeated claims, account substitution, cap, Merkle replay, arithmetic boundaries.',
    kill: 'Any conservation or replay test fails.',
    status: 'in-progress',
    statusText: 'In progress — anchor test running (Phase 1 on-chain tests, separate run)',
  },
  {
    n: 2,
    title: 'Devnet configuration',
    pass: 'Approved + funded signer (key never in chat/docs/forms), deployed program, 6-decimal mint, 1B minted, authorities revoked, approved Merkle root, funded escrow, other 500M accounted for per the token table.',
    kill: 'Inventory unaccounted or placeholder program address used.',
    status: 'not-passed',
    statusText: 'Not passed — no funded deployment signer, no deployed program',
  },
  {
    n: 3,
    title: 'Complete execution',
    pass: 'Deposit → finalise → launch → retail claim, whale claim, airdrop register/claim, repeated-claim check — all verified: balances, claimed state, actual supply reduction on burns, activity reconciliation, finalised campaign attribution.',
    kill: 'Any step verified only by the browser.',
    status: 'not-passed',
    statusText: 'Not passed — no complete deposit-to-claim run verified on-chain',
  },
  {
    n: 4,
    title: 'Public pilots',
    pass: 'Signed-in create/readback verified, access controls tested, public HTTPS Actions tested in compatible wallets, honest reports delivered to 5 pilot studios.',
    kill: 'Fewer than 3 of 5 pilots state willingness to pay in writing — pivot the offer before selling.',
    status: 'not-passed',
    statusText: 'Not passed — pilots not started',
  },
  {
    n: 5,
    title: 'Commercial readiness',
    pass: 'Precise scopes + refund terms, reward custody, treasury controls (multisig RECOMMENDED), legal review, service capacity. Mainnet needs its own approval + independent security review.',
    kill: 'Legal or security review incomplete — no exceptions, no timeline overrides a gate.',
    status: 'not-passed',
    statusText: 'Not passed — no legal or security review',
  },
]

export const RISK_REGISTER: { group: string; risks: string[] }[] = [
  {
    group: 'Token & financial',
    risks: [
      'Token may have no liquid market or value. Burns do not guarantee price rises. Vesting limits access.',
      'The SOL vault has no withdrawal/migration instruction in this phase — never accept production funds expecting an undocumented escape path.',
      'USDC carries issuer, depeg, freeze, network, and custody risk — it is not risk-free cash.',
    ],
  },
  {
    group: 'Legal & user protection',
    risks: [
      'Before commercial launch, qualified advisers must assess seller identity/country, consumer terms, advertising, token-sale + referral rules, financial promotion, tax, sanctions, privacy, and chance-based mechanics.',
      'This document declares no compliance and invents no licence.',
    ],
  },
  {
    group: 'Operational & technical',
    risks: [
      'Wallet, RPC, hosting, AI, and network outages will happen. Contract defects or authority compromise can be serious.',
      'Testnet success is not production safety. Prepare incident response and user notices before value is exposed.',
    ],
  },
  {
    group: 'Data & fairness',
    risks: [
      'Minimise personal data, publish retention practices, control staff access. Wallet addresses are public; behavioural profiling is still sensitive.',
      'Wallet-age/balance value checks do not prove personhood. Publish eligibility + dispute procedures before distributing rewards.',
    ],
  },
]

export const TECH_CHECKLIST: string[] = [
  'Approved signer',
  'Reviewed build identity',
  'Verified devnet program',
  'Correct mint, authorities revoked',
  'Approved Merkle root',
  'Funded escrow',
  'Remaining 500M accounted + locked per the token table',
  'Full deposit-to-claim tests',
  'Burn supply evidence',
  'Activity reconciliation',
  'Finalised attribution',
]
export const COMM_CHECKLIST: string[] = [
  'Confirmed seller + sponsor',
  'Deliverable scope',
  'Dates/timezone',
  'Currency/network/recipient verified',
  'Features ready (not just described)',
  'Invoice + receipt',
  'Separate reward ledger',
  'Eligibility clear',
  'Precise cancellation terms',
  'Support owner named',
  'Honest metrics',
  'Close report',
  'Unused rewards returned',
  'Renewal feedback recorded',
]

export const SOPS: { title: string; steps: string[] }[] = [
  {
    title: 'Uncertain transaction',
    steps: [
      'Obtain the signature and the network first.',
      'Never re-pay on a browser error alone.',
      'Check the signature on an explorer before ever repeating a payment.',
    ],
  },
  {
    title: 'Refund request',
    steps: [
      'Check the day of the request against the refund policy (full before start, 50% within the first 3 days, none after day 3 unless Nexus fails to deliver).',
      'Unused rewards are always returned.',
      'Reconcile the refund separately from fees and from the reward ledger.',
    ],
  },
  {
    title: 'Campaign anomaly',
    steps: [
      'Monitor availability, suspicious activity, support, and evidence completeness.',
      'Explain anomalies; never manufacture numbers.',
      'Changes need documented approval + notice to participants.',
    ],
  },
  {
    title: 'Release request',
    steps: [
      'Check every gate item before any release step.',
      'Any unchecked item is a blocker.',
      'Authority steps and wallet approvals stay separate.',
    ],
  },
  {
    title: 'Service outage',
    steps: [
      'Tell users plainly what is down and what is safe.',
      'Publish corrected reports with version history — never silently replace missing data.',
    ],
  },
]

export const CANVAS: { block: string; text: string }[] = [
  { block: 'Customer Segments', text: 'Paying: small Solana game studios with a playable product + a specific testing objective. Participants (non-paying): players/testers. Later, unvalidated: broader dApps, ecosystem orgs.' },
  { block: 'Value Propositions', text: 'Studios: organised participation, memorable experience, useful feedback, honest evidence. Players: clear rules, fair proportional allocation, transparent sponsored opportunities.' },
  { block: 'Channels', text: 'Founder-led outreach, studio referrals, relevant communities, attributed links / Blinks. No partnership is claimed without an agreement.' },
  { block: 'Customer Relationships', text: 'Hands-on onboarding + post-campaign review first. Self-service only after repeated campaigns expose a stable workflow.' },
  { block: 'Revenue Streams', text: 'Fixed campaign hosting fees. Reward budgets are pass-through obligations, not revenue. Managed services / premium analytics: future options, demand unvalidated.' },
  { block: 'Key Resources', text: 'Software + protocol source, operational know-how, trustworthy community, evidence record.' },
  { block: 'Key Activities', text: 'Campaign setup, sponsor review, evidence verification, support, reconciliation, learning reviews.' },
  { block: 'Key Partners', text: 'Studios, wallets, network/RPC providers, specialist security/legal/accounting reviewers — potential, not contracted, unless evidenced.' },
  { block: 'Cost Structure', text: 'Delivery labour (dominant), infrastructure, AI, RPC/indexing, support, security + legal review, sales, refunds.' },
]
export const CANVAS_TEST =
  'Canvas discipline test: if Growth promises weekly calls, screening review, and priority placement, its 2,000 USDC price must cover that labour at the expected campaign volume — or the promise, the price, or the volume assumption changes. Reviewed monthly.'

export interface ScholarModel {
  n: number
  name: string
  scholars: string
  question: string
  application: string
  rule: string
  metric: string
}
export const MODELS: ScholarModel[] = [
  {
    n: 1,
    name: 'Business Model Canvas',
    scholars: 'Osterwalder & Pigneur (2010)',
    question: 'Does the whole business fit together?',
    application: 'The nine blocks on the Canvas page. The canvas is a set of testable assumptions, not a poster.',
    rule: 'No feature is sold until its Key Activity + Cost appear on the canvas and fit the price.',
    metric: 'Contribution margin per campaign, reviewed monthly.',
  },
  {
    n: 2,
    name: 'Lean Startup: Build–Measure–Learn',
    scholars: 'Ries (2011); Blank (2013)',
    question: 'What is the riskiest assumption, and what is the cheapest test that could prove it wrong?',
    application:
      "Nexus's riskiest assumption is not “can we build it?” but “will a studio pay, then renew, for verified participation?” Every pilot states hypothesis + threshold before launch (e.g. “3 of 5 pilot studios say they would pay at 750 USDC, in writing”). Interviews are interest; a signed paid scope is evidence; a renewal after measured delivery is stronger evidence.",
    rule: 'Persevere, pivot, or kill per gate — never drift.',
    metric: 'Pilot → paid conversion; paid → renewal rate.',
  },
  {
    n: 3,
    name: 'Two-Sided Platform Economics',
    scholars: 'Rochet & Tirole (2003); Parker, Van Alstyne & Choudary (2016)',
    question: 'How do the two sides create — or destroy — value for each other?',
    application:
      'Studios subsidise the player experience (fees + rewards) because verified players are the scarce side’s value; players pay nothing to explore because their participation is what studios buy. Cross-side effects run both ways: good games attract real players; reward abuse or poor sponsor content repels both sides. So Nexus must curate both sides — sponsor review on entry, abuse review on participation.',
    rule: 'Never optimise one side’s volume at the expense of the other side’s quality.',
    metric: 'Qualified feedback per campaign; verified contributors per studio; studio renewal — not raw visits.',
  },
  {
    n: 4,
    name: 'Porter + Blue Ocean: choose what not to do',
    scholars: 'Porter (1996/2008); Kim & Mauborgne (2005)',
    question: 'Where do we compete, and what do we refuse?',
    application:
      'Porter: strategy is a unique activity system + trade-offs. Nexus’s activity system — capsule experience, on-chain verification, evidence-class reporting, sponsor curation — fits together around trust. Its trade-offs: no price guarantees, no inflated counts, no chance-based paid mechanics without legal clearance, no mainnet before review. Copying Nexus’s interface without its refusals does not copy its strategy. Five Forces check: rivalry (reward platforms, agencies, community managers) is high; buyer power is high (studios can test free); substitutes are strong (ads, Discord quests, in-house community). That is precisely why differentiation must be proof, not features. Blue Ocean ERRC — Eliminate: vanity metrics and guaranteed-return language. Reduce: manual reporting via templates. Raise: evidence quality and sponsor support. Create: the verified-contributor standard for game testing.',
    rule: 'Refusals are the strategy: no price guarantees, no inflated counts, no chance-based paid mechanics without legal clearance, no mainnet before review.',
    metric: '% of prospects who cite “honest reporting” as the reason they chose Nexus.',
  },
  {
    n: 5,
    name: 'Jobs-to-be-Done + Traction + Flywheel',
    scholars: 'Christensen et al. (2016); Weinberg & Mares (2015); Collins (2001)',
    question: 'What progress is the customer hiring Nexus for, how do we find more of them, and what compounds?',
    application:
      'JTBD: interview for the job, not the feature — trigger (“launch is in 6 weeks”), struggle (“we cannot tell bots from testers”), success (“a report I can take to my team showing the top 3 onboarding barriers”). A feature request is weak evidence; a purchase decision is strong. Traction (Bullseye): test channels in focused sprints — founder outreach, studio referrals, ecosystem communities, attributed content — each with hypothesis, time + cost budget, and one qualified outcome. Kill channels that miss; double down on the one that hits. Flywheel (Collins): good delivery → credible evidence → renewal + case study (with permission) → similar studios → better operations → better delivery. A metaphor for disciplined consistency, not a promise of exponential growth.',
    rule: 'Test channels in focused sprints; kill channels that miss their qualified outcome; double down on the one that hits.',
    metric: 'Cost per qualified studio conversation by channel; renewal rate; case-study conversion.',
  },
]

export const PRICING_ROWS = [
  { pkg: 'Devnet Pilot', price: 'Free', duration: '7 days, first campaign only', includes: 'Campaign link + Blink, live session / player / verified-contributor numbers', tag: 'CURRENT' },
  { pkg: 'Studio', price: '750 USDC', duration: '14 days', includes: 'Pilot + exportable report + hands-on setup. Custom quests / Pirates raid — GATED, include only when the workflow is proven.', tag: 'GATED' },
  { pkg: 'Growth', price: '2,000 USDC', duration: '30 days', includes: 'Studio + weekly results call + priority placement. Fake-player screening — describe the manual review actually performed, never an automated guarantee.', tag: 'GATED' },
]
export const PREPAYMENT_BLOCKERS: string[] = [
  'Exact start timestamp + timezone',
  'Day-3 cutoff',
  'Refund processing time',
  'Fee and tax treatment',
]
export const SCENARIOS = [
  { name: 'Conservative', campaigns: '3', mix: '3 Studio', fees: '2,250 USDC', contribution: '1,800 USDC', proves: 'Demand exists; below 3,000 fixed-cost break-even' },
  { name: 'Base', campaigns: '6', mix: '5 Studio + 1 Growth', fees: '5,750 USDC', contribution: '4,500 USDC', proves: 'Covers illustrative overhead; renewal is the test' },
  { name: 'Stretch', campaigns: '10', mix: '7 Studio + 3 Growth', fees: '11,250 USDC', contribution: '8,700 USDC', proves: 'Capacity + quality become the constraint' },
]

export const EVIDENCE: { label: string; counts: string; never: string }[] = [
  { label: 'Recorded visitors / players', counts: 'Anonymous session identifiers', never: '“100 people”' },
  { label: 'Verified contributors', counts: 'Distinct wallets with qualifying finalised program deposits', never: '“Verified humans” / “paying customers” for test SOL' },
  { label: 'Test SOL', counts: 'Sum of verified devnet deposits, network labelled', never: 'Sales, revenue, or paid totals' },
]
export const TX_STATUSES = [
  { status: 'Awaiting approval', meaning: 'The wallet has not approved yet. Nothing has moved.' },
  { status: 'Submitted', meaning: 'A signature was returned. Submitted can still expire or fail.' },
  { status: 'Confirmed', meaning: 'The network has seen the transaction.' },
  { status: 'Finalised', meaning: 'The strongest settlement evidence — the standard for campaign counting.' },
  { status: 'Failed', meaning: 'Needs affirmative evidence. Do not assume failure from a browser error.' },
  { status: 'Unknown', meaning: 'Evidence is incomplete — it is not proof of loss or failure.' },
]

export const WALLET_SAFETY: { n: number; title: string; text: string }[] = [
  { n: 1, title: 'Network first', text: 'Check the network in the wallet itself: devnet vs mainnet. Spending stays unavailable on the wrong network.' },
  { n: 2, title: 'Amount and destination', text: 'Read the amount and the destination address in the wallet prompt — not in the app animation behind it.' },
  { n: 3, title: 'Referral recipients resolved', text: 'Check who the referral shares go to before signing. The authority address used as a no-referral sentinel is routing, not a founder commission.' },
  { n: 4, title: 'Fees + token-account creation', text: 'Read the fees and any token-account creation in the wallet prompt. They are part of what you are approving.' },
  { n: 5, title: 'Read the wallet prompt, not the animation', text: 'A pretty animation is not a payment. A button click is not a contribution. Only the wallet prompt shows what you are actually signing.' },
]

export const PIRATES_RULES: string[] = [
  'Crew interaction + device-local points only. Points are NOT NEXUS balances, transferable entitlements, or a verified ranking of unique people.',
  'Local records can be cleared or manipulated, so points must never determine financial rewards.',
  'Explain costs before commitment. Keep preview and payment separate.',
  'No fake scarcity, fabricated winners, disguised odds, spending pressure, or shaming non-payers.',
  'Make exit easy. Consider age restrictions and local law before any chance-based paid mechanic.',
  'Measure success by useful feedback and repeat participation — not clicks, time spent, or spend volume.',
  'Before a studio sponsors a Pirates quest for rewards, specify evidence, eligibility, anti-abuse review, moderation, disputes, and payout terms in writing.',
]

export const DELIVERY_CHECKLISTS: { phase: string; items: string[] }[] = [
  {
    phase: 'Before',
    items: [
      'Sponsor review, measurable objective, written scope, playable product check.',
      'Network + definitions + eligibility + refund terms set.',
      'Sponsor approves final content. Approval + scope version filed together.',
    ],
  },
  {
    phase: 'During',
    items: [
      'Monitor availability, suspicious activity, support, evidence completeness.',
      'Explain anomalies; never manufacture numbers.',
      'Changes need documented approval + notice to participants.',
    ],
  },
  {
    phase: 'Close',
    items: [
      'Cut off entries, verify eligible results, reconcile rewards.',
      'Issue a report with definitions + limitations, return unused rewards.',
      'Ask “would you run again — and why?”',
    ],
  },
]

export const TEAM: { fn: string; owns: string; signs: string }[] = [
  { fn: 'Product & Engineering', owns: 'App, contract integration, reliability, privacy', signs: 'Release evidence — cannot override financial gates alone' },
  { fn: 'Campaign Ops & Trust', owns: 'Sponsor review, delivery, moderation, support', signs: '“We can actually deliver what was sold”' },
  { fn: 'Partnerships & Sales', owns: 'Qualification, scopes, renewals', signs: 'Scope accuracy' },
  { fn: 'Finance & Specialist Review', owns: 'Invoicing, reconciliation, legal/accounting/security coordination', signs: 'Receipts, refunds, reward ledger' },
]

export const BULLSEYE: { experiment: string; hypothesis: string; outcome: string; budget: string }[] = [
  { experiment: 'Founder outreach to 20 studios', hypothesis: 'Personal, JTBD-led outreach beats broad traffic', outcome: '5 discovery calls; 5 pilot sign-ups target cohort', budget: 'Time-boxed sprint; log every reply' },
  { experiment: 'Studio referrals', hypothesis: 'A delivered pilot refers the next studio', outcome: '1 referred pilot per delivered pilot', budget: 'Ask only after the close report lands' },
  { experiment: 'Ecosystem communities + Blinks', hypothesis: 'Attributed content reaches players studios want', outcome: 'Verified contributors, not clicks', budget: 'Kill if sessions rise but verified contributors do not' },
]

export const FAQ: { q: string; a: string }[] = [
  { q: 'Is Nexus using real money now?', a: 'No — devnet only.' },
  { q: 'Can Nexus take money from my wallet?', a: 'No; you approve or decline every transaction.' },
  { q: 'Does the animation pay me?', a: 'No.' },
  { q: 'Does the slider unlock tokens?', a: 'No. The Vault slider is a calculator — the network clock governs.' },
  { q: 'Does a wallet prove a unique person?', a: 'No.' },
  { q: 'Is 65.12 USD/SOL a live price?', a: 'No. It is a fixed illustrative baseline from v1, not a live feed.' },
  { q: 'Are paid campaigns live because prices are listed?', a: 'No.' },
  { q: 'Can this guide guarantee price or legal compliance?', a: 'No.' },
  { q: 'Does a preview award tokens?', a: 'No. A preview never moves SOL, awards tokens, or proves a transaction.' },
  { q: 'Can practice coins I put in be taken back?', a: 'No. The contract has no contribution-refund instruction in this phase — the campaign refund policy covers hosting fees only.' },
]

export const GUIDE_TESTS: { q: string; a: string }[] = [
  { q: 'Does exactly 2 SOL make me retail?', a: 'Yes.' },
  { q: 'What is burned on a first-period 1,000-token whale claim?', a: '200 tokens.' },
]
