/**
 * Nexus — Solana devnet integration layer.
 *
 * DEVNET ONLY. Never mainnet. All SOL here is devnet SOL (no real value).
 *
 * Program: AzTeCHRx16YzPVM3uobj3vLEirqVm5PJGyXpPw3QYD1P
 * Mint:    36UWkC2JSZrwvtGToGbVZLeoBrwxzVsNbRU42WpmJvY6 (1B, 6 decimals,
 *          mint + freeze authorities revoked)
 * Pool:    BxQWRaMGuUwhGXgczqxncQkDiFF587m5ZUumvHSeVkx6 (seeds ["pool"])
 *
 * Live on-chain state (27 Nov 2026, Gate 2 done): sale FINALIZED, migration
 * PROPOSED with a 72h timelock expiring Mon 30 Nov 11:31 WAT, launch NOT
 * activated. Deposits are rejected on-chain. Claims only open after Gate 3
 * launches on 30 Nov.
 *
 * Field names below come from the Anchor IDL
 * (contracts/target/idl/nexus.json, copied to ./idl.json). One runtime
 * quirk, verified live against devnet: Anchor 0.31's coder returns
 * decoded account fields in camelCase (e.g. `totalGross`), even though
 * the IDL spells them snake_case (`total_gross`). The reads below use
 * the camelCase names Anchor actually returns. Nothing is invented:
 * where the program stores no dedicated flag, the value is DERIVED
 * from stored fields and the derivation is stated in the comment.
 */

import {
  AnchorProvider,
  BN,
  Program,
  type Idl,
} from '@coral-xyz/anchor';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import idlJson from './idl.json';

export { LAMPORTS_PER_SOL };

export const DEVNET_RPC = 'https://api.devnet.solana.com';

export const PROGRAM_ID = new PublicKey(
  'AzTeCHRx16YzPVM3uobj3vLEirqVm5PJGyXpPw3QYD1P',
);
export const MINT = new PublicKey(
  '36UWkC2JSZrwvtGToGbVZLeoBrwxzVsNbRU42WpmJvY6',
);
export const POOL_PDA = new PublicKey(
  'BxQWRaMGuUwhGXgczqxncQkDiFF587m5ZUumvHSeVkx6',
);

/** SPL Token program (all NEXUS token accounts live under it). */
export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
/** SPL Associated Token Account program. */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

/** NEXUS has 6 decimals, same as the mint. */
export const TOKEN_DECIMALS = 6;
const TOKEN_UNITS = 10 ** TOKEN_DECIMALS;

/** The IDL as shipped by Anchor 0.31.1. Its `address` field is the program ID. */
const IDL = idlJson as unknown as Idl;

/* ------------------------------------------------------------------ */
/* Explorer links (devnet)                                             */
/* ------------------------------------------------------------------ */

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAccount(pubkey: PublicKey | string): string {
  const key = typeof pubkey === 'string' ? pubkey : pubkey.toBase58();
  return `https://explorer.solana.com/address/${key}?cluster=devnet`;
}

/* ------------------------------------------------------------------ */
/* PDA derivation (seeds per the IDL / program source)                 */
/* ------------------------------------------------------------------ */

/** seeds: ["position", contributor] */
export function derivePositionPda(wallet: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('position'), wallet.toBuffer()],
    PROGRAM_ID,
  );
  return pda;
}

/** seeds: ["airdrop", wallet] */
export function deriveAirdropPda(wallet: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('airdrop'), wallet.toBuffer()],
    PROGRAM_ID,
  );
  return pda;
}

/** seeds: ["token_lock", beneficiary, lock_id as u64 little-endian] */
export function deriveTokenLockPda(
  beneficiary: PublicKey,
  lockId: number,
): PublicKey {
  const lockIdLe = Buffer.alloc(8);
  lockIdLe.writeBigUInt64LE(BigInt(lockId));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_lock'), beneficiary.toBuffer(), lockIdLe],
    PROGRAM_ID,
  );
  return pda;
}

/**
 * The wallet's Associated Token Account for the NEXUS mint.
 *
 * Derived per the SPL Associated Token Account rule, seeds
 * [owner, TOKEN_PROGRAM_ID, mint] under the Associated Token program —
 * no @solana/spl-token dependency needed for the derivation itself.
 */
export function deriveTokenAccount(
  owner: PublicKey,
  mint: PublicKey = MINT,
): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

/** The "create associated token account" instruction (empty data). */
function createTokenAccountIx(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey = MINT,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

/* ------------------------------------------------------------------ */
/* State shapes                                                        */
/* ------------------------------------------------------------------ */

/**
 * Pool state, decoded from the on-chain Pool account.
 *
 * Stored on-chain (IDL `Pool` type, snake_case in the IDL, camelCase
 * as decoded by Anchor 0.31 — see the file header): `totalGross` (u64
 * lamports), `saleFinalized` (bool), `launchActivated` (bool),
 * `launchTs` (i64), `migrationProposedAt` (i64),
 * `migrationExecuteAfter` (i64), `migrationExecuted` (bool).
 *
 * DERIVED (no dedicated on-chain flag exists):
 * - `migrationProposed` = migration_proposed_at > 0 AND NOT
 *   migration_executed. A cancelled proposal also leaves
 *   migration_proposed_at at 0 (cancel clears it), so this is exact.
 */
export interface PoolState {
  totalRaisedSol: number;
  totalRaisedLamports: number;
  finalized: boolean;
  launchActivated: boolean;
  migrationProposed: boolean;
  migrationExecuteAfter: number | null;
  raw: any;
}

/**
 * Position state, decoded from the on-chain Position account.
 *
 * Stored on-chain (IDL `Position` type, camelCase as decoded):
 * `grossContribution` (u64 lamports), `grossClaimed` (u64 NEXUS base
 * units), `vaultContribution` (u64 lamports), `refunded` (bool). NOTE:
 * there is no stored `allocation` — allocation is computed at claim
 * time as gross / pool.total_gross * 400,000,000 tokens (see the
 * program docs).
 *
 * `claimedSol` keeps the interface name the UI codes against, but its
 * value is claimed NEXUS tokens (gross_claimed / 1e6), NOT SOL — the
 * program stores presale claims in token base units.
 */
export interface PositionState {
  grossSol: number;
  grossLamports: number;
  claimedSol?: number;
  raw: any;
}

/**
 * Airdrop state, decoded from the on-chain AirdropAccount.
 *
 * Stored on-chain (IDL `AirdropAccount` type): `wallet` (pubkey),
 * `allocation` (u64 NEXUS base units), `gross_claimed` (u64 NEXUS base
 * units), `bump` (u8). There is NO stored `registered` flag — a wallet
 * counts as registered exactly when its AirdropAccount exists, so
 * `registered` is true whenever this object was successfully fetched.
 */
export interface AirdropState {
  registered: boolean;
  allocationTokens?: number;
  claimedTokens?: number;
  raw: any;
}

/* ------------------------------------------------------------------ */
/* Program + account reads                                             */
/* ------------------------------------------------------------------ */

/** Read-only Anchor provider: no wallet, no signing. Reads only. */
function readOnlyProvider(connection: Connection): AnchorProvider {
  const dummyWallet = {
    publicKey: PROGRAM_ID,
    signTransaction: async <T>(tx: T): Promise<T> => tx,
    signAllTransactions: async <T>(txs: T[]): Promise<T[]> => txs,
  };
  return new AnchorProvider(connection, dummyWallet as any, {
    commitment: 'confirmed',
  });
}

/**
 * Anchor Program built from the copied idl.json. The IDL's `address`
 * field is the program ID, so no separate programId argument is needed.
 * Typed as Program<any>: the IDL is loaded from JSON at build time, so
 * the generated account/method namespaces are not statically typed.
 */
export function getProgram(connection: Connection): Program<any> {
  return new Program(
    IDL,
    readOnlyProvider(connection),
  ) as unknown as Program<any>;
}

/** Null if the Pool account does not exist or the fetch fails. Never throws. */
export async function fetchPoolState(
  connection: Connection,
): Promise<PoolState | null> {
  try {
    const program = getProgram(connection);
    const pool: any = await (program.account as any).pool.fetch(POOL_PDA);
    // Anchor 0.31 decodes IDL fields to camelCase (verified live).
    const totalLamports = (pool.totalGross as BN).toNumber();
    const proposedAt = (pool.migrationProposedAt as BN).toNumber();
    const executeAfter = (pool.migrationExecuteAfter as BN).toNumber();
    return {
      totalRaisedSol: totalLamports / LAMPORTS_PER_SOL,
      totalRaisedLamports: totalLamports,
      finalized: pool.saleFinalized as boolean,
      launchActivated: pool.launchActivated as boolean,
      // DERIVED: no `migration_proposed` bool is stored on-chain.
      migrationProposed: proposedAt > 0 && !pool.migrationExecuted,
      migrationExecuteAfter: executeAfter > 0 ? executeAfter : null,
      raw: pool,
    };
  } catch {
    return null;
  }
}

/** Null if the wallet has no Position account or the fetch fails. Never throws. */
export async function fetchPosition(
  connection: Connection,
  wallet: PublicKey,
): Promise<PositionState | null> {
  try {
    const program = getProgram(connection);
    const position: any = await (program.account as any).position.fetch(
      derivePositionPda(wallet),
    );
    const grossLamports = (position.grossContribution as BN).toNumber();
    return {
      grossSol: grossLamports / LAMPORTS_PER_SOL,
      grossLamports,
      // grossClaimed is NEXUS base units (6 decimals), not SOL.
      claimedSol: (position.grossClaimed as BN).toNumber() / TOKEN_UNITS,
      raw: position,
    };
  } catch {
    return null;
  }
}

/**
 * Null if the wallet has no AirdropAccount (i.e. not registered) or the
 * fetch fails. Never throws. `registered` is true exactly when an account
 * was found — there is no stored boolean for it on-chain.
 */
export async function fetchAirdropAccount(
  connection: Connection,
  wallet: PublicKey,
): Promise<AirdropState | null> {
  try {
    const program = getProgram(connection);
    const airdrop: any = await (program.account as any).airdropAccount.fetch(
      deriveAirdropPda(wallet),
    );
    return {
      registered: true,
      allocationTokens: (airdrop.allocation as BN).toNumber() / TOKEN_UNITS,
      claimedTokens: (airdrop.grossClaimed as BN).toNumber() / TOKEN_UNITS,
      raw: airdrop,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

/**
 * Build an unsigned `register_airdrop` transaction for `wallet`.
 *
 * Accounts (exactly as the IDL lists them): pool, airdrop (PDA),
 * wallet (signer), system_program. Args: allocation_base_units (u64),
 * proof (Vec<[u8; 32]>).
 *
 * !!! TEST MERKLE LIST ONLY !!!
 * `proof` MUST come from the TEST Merkle list used at Gate 2
 * (initialize). There is NO approved production airdrop list yet, and
 * the on-chain `merkle_root` is immutable — a proof against any other
 * list will fail on-chain. Do not ship a production proof path until
 * the approved list and its root exist.
 *
 * NOTE ON THE SIGNATURE: the IDL's `register_airdrop` also takes
 * `allocation_base_units` — the allocation from that wallet's TEST
 * Merkle list entry (in NEXUS base units, 6 decimals). It cannot be
 * derived from the proof alone (the proof proves the leaf, it does not
 * contain the allocation), so it is an optional 4th argument here.
 * Callers MUST pass the allocation from the TEST list entry; omitting
 * it throws rather than building a transaction with a guessed value.
 */
export async function buildRegisterAirdropTx(
  program: Program<any>,
  wallet: PublicKey,
  proof: number[][] | Buffer[],
  allocationBaseUnits?: number | BN,
): Promise<Transaction> {
  if (allocationBaseUnits === undefined || allocationBaseUnits === null) {
    throw new Error(
      'buildRegisterAirdropTx: allocation_base_units is required — pass ' +
        'the allocation (NEXUS base units) from this wallet\'s entry in ' +
        'the TEST Merkle list. It cannot be derived from the proof alone, ' +
        'and there is NO approved production list yet.',
    );
  }
  const proofArrays: number[][] = proof.map((p) =>
    Buffer.isBuffer(p) ? Array.from(p) : p,
  );
  // Anchor 0.31 exposes instruction methods in camelCase
  // (register_airdrop -> registerAirdrop) and account names likewise
  // (system_program -> systemProgram). Verified live.
  const tx = await (program as any).methods
    .registerAirdrop(new BN(allocationBaseUnits.toString()), proofArrays)
    .accounts({
      pool: POOL_PDA,
      airdrop: deriveAirdropPda(wallet),
      wallet,
      systemProgram: SystemProgram.programId,
    })
    .transaction();
  return tx as Transaction;
}

/**
 * Build an unsigned `claim_presale` transaction for `wallet`.
 *
 * Accounts (exactly as the IDL lists them): pool, position (PDA),
 * contributor (signer), token_escrow, rewards_escrow, mint,
 * contributor_token_account (the wallet's ATA for the NEXUS mint),
 * token_program. No args. The escrow addresses are read from the live
 * Pool account, never hard-coded.
 *
 * The program itself enforces the vesting/penalty rules on-chain
 * (72h linear release from launch, 25/15/5/0% early-take cost on the
 * newly claimed amount, 80% of the cost burned / 20% to the rewards
 * pot) — this builder only assembles the instruction. If the wallet
 * has no NEXUS token account yet, a create-ATA instruction is put
 * first in the same transaction so the claim can land.
 *
 * CONSTRUCTION-VERIFIED ONLY (scripts/verify-claims.mjs): no claim
 * has been sent on-chain — claims cannot execute until Gate 3 runs
 * `activate_launch` (Mon 30 Nov). Calling this before launch builds
 * a valid transaction that the program will reject on-chain.
 */
export async function buildClaimPresaleTx(
  program: Program<any>,
  wallet: PublicKey,
): Promise<Transaction> {
  const pool: any = await (program.account as any).pool.fetch(POOL_PDA);
  const ata = deriveTokenAccount(wallet);
  const ix = await (program as any).methods
    .claimPresale()
    .accounts({
      pool: POOL_PDA,
      position: derivePositionPda(wallet),
      contributor: wallet,
      tokenEscrow: pool.tokenEscrow as PublicKey,
      rewardsEscrow: pool.rewardsEscrow as PublicKey,
      mint: MINT,
      contributorTokenAccount: ata,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
  const tx = new Transaction();
  const connection = (program.provider as AnchorProvider).connection;
  const ataInfo = await connection.getAccountInfo(ata);
  if (!ataInfo) tx.add(createTokenAccountIx(wallet, ata, wallet));
  tx.add(ix as any);
  return tx;
}

/**
 * Build an unsigned `claim_airdrop` transaction for `wallet`.
 *
 * Accounts (exactly as the IDL lists them): pool, airdrop (PDA),
 * wallet (signer), token_escrow, contributor_token_account (the
 * wallet's ATA for the NEXUS mint), token_program. No args. The
 * escrow address is read from the live Pool account. Same ATA
 * handling and same Gate 3 caveat as `buildClaimPresaleTx`: the
 * airdrop vests over 72h from launch with no early-take cost, and
 * nothing here can execute before `activate_launch`.
 */
export async function buildClaimAirdropTx(
  program: Program<any>,
  wallet: PublicKey,
): Promise<Transaction> {
  const pool: any = await (program.account as any).pool.fetch(POOL_PDA);
  const ata = deriveTokenAccount(wallet);
  const ix = await (program as any).methods
    .claimAirdrop()
    .accounts({
      pool: POOL_PDA,
      airdrop: deriveAirdropPda(wallet),
      wallet,
      tokenEscrow: pool.tokenEscrow as PublicKey,
      contributorTokenAccount: ata,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
  const tx = new Transaction();
  const connection = (program.provider as AnchorProvider).connection;
  const ataInfo = await connection.getAccountInfo(ata);
  if (!ataInfo) tx.add(createTokenAccountIx(wallet, ata, wallet));
  tx.add(ix as any);
  return tx;
}

/* ------------------------------------------------------------------ */
/* UI helpers                                                          */
/* ------------------------------------------------------------------ */

/** Claims open only once `activate_launch` has run on-chain. */
export function isClaimOpen(pool: PoolState | null): boolean {
  return pool !== null && pool.launchActivated;
}

/** Plain-words countdown to the migration timelock expiring. */
export function migrationCountdownText(
  pool: PoolState | null,
  nowMs: number = Date.now(),
): string {
  if (!pool) return 'Migration status unknown — could not read the Pool.';
  if (!pool.migrationProposed) return 'No migration proposed yet.';
  if (pool.migrationExecuteAfter === null) {
    return 'Migration proposed, but no execution time is set.';
  }
  const remainingMs = pool.migrationExecuteAfter * 1000 - nowMs;
  if (remainingMs <= 0) return 'Migration can be executed now.';
  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days >= 2) return `about ${days} days left`;
  if (days === 1) {
    return hours > 0 ? `about 1 day and ${hours} hours left` : 'about 1 day left';
  }
  if (hours >= 1) {
    return minutes > 0
      ? `about ${hours} hours and ${minutes} minutes left`
      : `about ${hours} hours left`;
  }
  return `about ${minutes} minutes left`;
}
