// Nexus live devnet layer — React hook over src/lib/solana.ts.
//
// Live mode ONLY when a real wallet is connected on devnet. Everything here
// reads from chain; nothing here invents a figure. Practice mode (no wallet)
// never touches this hook's data — the simulated state in App.tsx stays
// the only source there.
//
// Airdrop proof source: the TEST Merkle fixture used by Gate 2
// (contracts/tests/bankrun-airdrop-merkle.json). It has exactly two wallets
// (ada / ben). Any other wallet has no valid proof, so the UI must say so
// instead of offering a transaction that would fail on-chain. There is no
// approved production list yet.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  MINT, POOL_PDA, PROGRAM_ID,
  buildClaimAirdropTx, buildClaimPresaleTx, buildRegisterAirdropTx, explorerAccount, explorerTx,
  fetchAirdropAccount, fetchPoolState, fetchPosition, getProgram,
  isClaimOpen, migrationCountdownText,
  type AirdropState, type PoolState, type PositionState,
} from './solana'

export { MINT, POOL_PDA, PROGRAM_ID, explorerAccount, explorerTx, isClaimOpen, migrationCountdownText }
export type { AirdropState, PoolState, PositionState }

/** Short form of an address: first 4 … last 4. Accepts a base58 string or a PublicKey. */
export const shortAddr = (addr: string | { toBase58: () => string }) => {
  const s = typeof addr === 'string' ? addr : addr.toBase58()
  return s.length > 9 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s
}

/** Absolute time the migration timelock expires, in WAT: "Mon 30 Nov 11:31 WAT". */
export function migrationExecuteText(pool: PoolState | null): string | null {
  if (!pool || !pool.migrationProposed || pool.migrationExecuteAfter === null) return null
  const d = new Date(pool.migrationExecuteAfter * 1000)
  const fmt = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Lagos',
  })
  return `${fmt.format(d).replace(/,/g, '')} WAT`
}

/** One plain-words line for the "Money moves" row: absolute time + countdown. */
export function migrationLine(pool: PoolState | null): string {
  if (!pool) return 'Migration status unknown — could not read the Pool.'
  if (!pool.migrationProposed) return 'No migration proposed yet.'
  if (pool.migrationExecuteAfter === null) return 'Migration proposed, but no execution time is set.'
  const rel = migrationCountdownText(pool)
  if (rel === 'Migration can be executed now.') return rel
  const when = migrationExecuteText(pool)
  return when ? `after ${when} (${rel})` : rel
}

/** TEST Merkle fixture (Gate 2) — the only wallets with a valid proof. */
export interface TestAirdropEntry {
  wallet: string
  name: string
  allocationBaseUnits: number
  allocationTokens: number
  proof: string[]
}
export const TEST_AIRDROP: TestAirdropEntry[] = [
  {
    wallet: '6UqNUXJEqqFptsZtVKz58kYKgrx5DGMZavioFs1HqM1A',
    name: 'ada',
    allocationBaseUnits: 1_000_000_000,
    allocationTokens: 1000,
    proof: ['b06667244a03805621be390896ac406d4dfe3d26d8fc596c5f63d3ddc197a65d'],
  },
  {
    wallet: 'Fz4myfLeCrBvyUpbUuuD2hovSMmujNDszD8UNwxP4vC1',
    name: 'ben',
    allocationBaseUnits: 2_000_000_000,
    allocationTokens: 2000,
    proof: ['1446ad2885d77988e5f9aad027831174c3667c910f0b6e681e542adb10d02a3b'],
  },
]
export const findTestAirdrop = (pubkey: string): TestAirdropEntry | null =>
  TEST_AIRDROP.find((e) => e.wallet === pubkey) ?? null

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Hex string → byte array (the proof format buildRegisterAirdropTx wants). */
const hexToBytes = (hex: string): number[] => {
  const out: number[] = []
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16))
  return out
}
export type RegisterStatus = 'idle' | 'sending' | 'confirming' | 'done' | 'error'

/** Plain-words version of a send/confirm failure. Never shows a raw stack. */
export function plainSendError(e: unknown, what: 'register' | 'claim' = 'register'): string {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  const done = what === 'register' ? 'registered' : 'collected'
  if (/user rejected|rejected the request|user denied/i.test(msg))
    return 'You said no in your wallet — nothing was sent. You can try again any time.'
  if (/6015|InvalidMerkleProof|invalid.*merkle/i.test(msg))
    return 'The list does not include this wallet, so the proof does not match. Nothing was registered.'
  if (/6014|AlreadyRegistered|already.*registered|AccountAlreadyInitialized/i.test(msg))
    return 'You are already on the list — nothing more to do.'
  if (/insufficient|not enough.*sol|0x1\b/i.test(msg))
    return 'Not enough devnet SOL in this wallet to pay the small network fee. Get devnet SOL first, then try again.'
  if (/fetch|network|timeout|failed to fetch|connection/i.test(msg))
    return 'Could not reach devnet just now. Check your connection and try again — nothing was sent.'
  return `That did not go through. Nothing was ${done} — try again, or check the explorer link if one appeared.`
}

export interface LiveNexus {
  /** True only when a real wallet is connected (live mode). */
  liveMode: boolean
  liveAddress: string
  pool: PoolState | null
  poolStatus: LoadStatus
  poolError: string
  position: PositionState | null
  positionStatus: LoadStatus
  airdrop: AirdropState | null
  airdropStatus: LoadStatus
  /** Re-read Pool + (when connected) Position + Airdrop. Manual refresh only. */
  refresh: () => Promise<void>
  /** The TEST-list entry for the connected wallet, if it has one. */
  testEntry: TestAirdropEntry | null
  registerStatus: RegisterStatus
  registerSig: string | null
  registerError: string
  registerAirdrop: () => Promise<void>
  /** Presale + airdrop claims. Only usable once the launch is activated (Gate 3, Mon 30 Nov) — the builders throw nothing, the program rejects early claims on-chain. */
  claimStatus: RegisterStatus
  claimSig: string | null
  claimError: string
  claimPresale: () => Promise<void>
  claimAirdrop: () => Promise<void>
}

export function useLiveNexus(): LiveNexus {
  const { connection } = useConnection()
  const { publicKey, connected, sendTransaction } = useWallet()
  const liveMode = connected && !!publicKey
  const liveAddress = publicKey ? publicKey.toBase58() : ''

  const [pool, setPool] = useState<PoolState | null>(null)
  const [poolStatus, setPoolStatus] = useState<LoadStatus>('idle')
  const [poolError, setPoolError] = useState('')
  const [position, setPosition] = useState<PositionState | null>(null)
  const [positionStatus, setPositionStatus] = useState<LoadStatus>('idle')
  const [airdrop, setAirdrop] = useState<AirdropState | null>(null)
  const [airdropStatus, setAirdropStatus] = useState<LoadStatus>('idle')
  const [registerStatus, setRegisterStatus] = useState<RegisterStatus>('idle')
  const [registerSig, setRegisterSig] = useState<string | null>(null)
  const [registerError, setRegisterError] = useState('')
  const [claimStatus, setClaimStatus] = useState<RegisterStatus>('idle')
  const [claimSig, setClaimSig] = useState<string | null>(null)
  const [claimError, setClaimError] = useState('')
  const reqId = useRef(0)

  const loadPool = useCallback(async () => {
    const id = ++reqId.current
    setPoolStatus('loading')
    setPoolError('')
    try {
      const p = await fetchPoolState(connection)
      if (id !== reqId.current) return
      if (!p) {
        setPool(null)
        setPoolStatus('error')
        setPoolError('The live sale could not be read from devnet.')
        return
      }
      setPool(p)
      setPoolStatus('ready')
    } catch {
      if (id !== reqId.current) return
      setPool(null)
      setPoolStatus('error')
      setPoolError('The live sale could not be read from devnet.')
    }
  }, [connection])

  const loadWalletState = useCallback(async (key: typeof publicKey) => {
    if (!key) {
      setPosition(null)
      setPositionStatus('idle')
      setAirdrop(null)
      setAirdropStatus('idle')
      return
    }
    const id = reqId.current
    setPositionStatus('loading')
    setAirdropStatus('loading')
    try {
      const [pos, air] = await Promise.all([
        fetchPosition(connection, key),
        fetchAirdropAccount(connection, key),
      ])
      if (id !== reqId.current) return
      setPosition(pos)
      setPositionStatus('ready')
      setAirdrop(air)
      setAirdropStatus('ready')
    } catch {
      if (id !== reqId.current) return
      setPosition(null)
      setPositionStatus('error')
      setAirdrop(null)
      setAirdropStatus('error')
    }
  }, [connection])

  const refresh = useCallback(async () => {
    await loadPool()
    await loadWalletState(publicKey)
  }, [loadPool, loadWalletState, publicKey])

  // Pool on load. Wallet state on connect / wallet change.
  useEffect(() => { void loadPool() }, [loadPool])
  useEffect(() => { void loadWalletState(publicKey) }, [loadWalletState, publicKey])

  const testEntry = liveMode ? findTestAirdrop(liveAddress) : null

  const registerAirdrop = useCallback(async () => {
    if (!publicKey || !testEntry) return
    setRegisterStatus('sending')
    setRegisterError('')
    setRegisterSig(null)
    try {
      const program = getProgram(connection)
      // Proof as byte arrays + the allocation from this wallet's TEST-list
      // entry (the instruction needs both; the allocation is NOT in the proof).
      const tx = await buildRegisterAirdropTx(
        program,
        publicKey,
        testEntry.proof.map(hexToBytes),
        testEntry.allocationBaseUnits,
      )
      // Make sure the transaction can be sent: fee payer + fresh blockhash.
      const maybeTx = tx as unknown as {
        recentBlockhash?: string | null
        feePayer?: unknown
        setRecentBlockhash?: (h: string) => void
      }
      if (!maybeTx.recentBlockhash) {
        const { blockhash } = await connection.getLatestBlockhash()
        if (typeof maybeTx.setRecentBlockhash === 'function') maybeTx.setRecentBlockhash(blockhash)
        else maybeTx.recentBlockhash = blockhash
      }
      if (!maybeTx.feePayer) maybeTx.feePayer = publicKey
      const sig = await sendTransaction(
        tx as unknown as import('@solana/web3.js').Transaction,
        connection,
      )
      setRegisterSig(sig)
      setRegisterStatus('confirming')
      await connection.confirmTransaction(sig, 'confirmed')
      setRegisterStatus('done')
      // Re-read: the Airdrop account should now exist on-chain.
      await loadWalletState(publicKey)
    } catch (e) {
      setRegisterStatus('error')
      setRegisterError(plainSendError(e))
    }
  }, [connection, publicKey, sendTransaction, testEntry, loadWalletState])

  /** Send a built live transaction: fee payer + fresh blockhash, then confirm. Shared by the claim sends. */
  const submitTx = useCallback(async (tx: import('@solana/web3.js').Transaction): Promise<string> => {
    const maybeTx = tx as unknown as {
      recentBlockhash?: string | null
      feePayer?: unknown
      setRecentBlockhash?: (h: string) => void
    }
    if (!maybeTx.recentBlockhash) {
      const { blockhash } = await connection.getLatestBlockhash()
      if (typeof maybeTx.setRecentBlockhash === 'function') maybeTx.setRecentBlockhash(blockhash)
      else maybeTx.recentBlockhash = blockhash
    }
    if (!maybeTx.feePayer) maybeTx.feePayer = publicKey
    const sig = await sendTransaction(tx, connection)
    await connection.confirmTransaction(sig, 'confirmed')
    return sig
  }, [connection, publicKey, sendTransaction])

  /** Take the presale share. Guarded by the launch: no-op until the launch is activated. */
  const claimPresale = useCallback(async () => {
    if (!publicKey || !pool || !isClaimOpen(pool)) return
    setClaimStatus('sending')
    setClaimError('')
    setClaimSig(null)
    try {
      const program = getProgram(connection)
      const tx = await buildClaimPresaleTx(program, publicKey)
      setClaimStatus('confirming')
      const sig = await submitTx(tx)
      setClaimSig(sig)
      setClaimStatus('done')
      await loadWalletState(publicKey)
    } catch (e) {
      setClaimStatus('error')
      setClaimError(plainSendError(e, 'claim'))
    }
  }, [connection, publicKey, pool, submitTx, loadWalletState])

  /** Take the airdrop share. Same launch guard as claimPresale. */
  const claimAirdrop = useCallback(async () => {
    if (!publicKey || !pool || !isClaimOpen(pool)) return
    setClaimStatus('sending')
    setClaimError('')
    setClaimSig(null)
    try {
      const program = getProgram(connection)
      const tx = await buildClaimAirdropTx(program, publicKey)
      setClaimStatus('confirming')
      const sig = await submitTx(tx)
      setClaimSig(sig)
      setClaimStatus('done')
      await loadWalletState(publicKey)
    } catch (e) {
      setClaimStatus('error')
      setClaimError(plainSendError(e, 'claim'))
    }
  }, [connection, publicKey, pool, submitTx, loadWalletState])

  return {
    liveMode, liveAddress,
    pool, poolStatus, poolError,
    position, positionStatus,
    airdrop, airdropStatus,
    refresh,
    testEntry,
    registerStatus, registerSig, registerError, registerAirdrop,
    claimStatus, claimSig, claimError, claimPresale, claimAirdrop,
  }
}
