#!/usr/bin/env node
/**
 * Read the live Nexus Pool account from Solana devnet and print its
 * decoded fields. Uses @solana/web3.js directly — no Anchor.
 *
 * Pool layout (IDL order, after the 8-byte discriminator):
 *   authority, sentinel, mint, token_escrow, rewards_escrow: pubkey
 *   total_gross: u64 lamports
 *   sale_finalized, launch_activated: bool
 *   launch_ts: i64
 *   merkle_root: [u8; 32]
 *   airdrop_registered_total, airdrop_claimed_total: u64 (base units)
 *   sale_cancelled, deposits_paused: bool
 *   locked_tokens_total: u64
 *   migration_proposed_at, migration_execute_after: i64
 *   migration_liquidity_dest, migration_treasury_dest,
 *   liquidity_token_escrow: pubkey
 *   migration_sol_liquidity, migration_sol_treasury: u64
 *   migration_executed: bool
 *   liquidity_pool_address: pubkey
 *   treasury_withdrawn_total: u64
 *   bump: u8
 *
 * Run: node scripts/read-pool.mjs
 */
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const POOL_PDA = new PublicKey('BxQWRaMGuUwhGXgczqxncQkDiFF587m5ZUumvHSeVkx6');

function readPubkey(buf, off) {
  return new PublicKey(buf.subarray(off, off + 32)).toBase58();
}

const connection = new Connection(DEVNET_RPC, 'confirmed');
const info = await connection.getAccountInfo(POOL_PDA);
if (!info) {
  console.log('Pool account NOT FOUND on devnet:', POOL_PDA.toBase58());
  process.exit(1);
}

const data = info.data;
console.log('Pool account found.');
console.log('  owner:        ', info.owner.toBase58());
console.log('  lamports:     ', info.lamports, `(${(info.lamports / LAMPORTS_PER_SOL).toFixed(9)} SOL)`);
console.log('  data length:  ', data.length, 'bytes (expected 414 per IDL layout)');
console.log('  discriminator:', Array.from(data.subarray(0, 8)).join(','));

let o = 8;
const authority = readPubkey(data, o); o += 32;
const sentinel = readPubkey(data, o); o += 32;
const mint = readPubkey(data, o); o += 32;
const tokenEscrow = readPubkey(data, o); o += 32;
const rewardsEscrow = readPubkey(data, o); o += 32;
const totalGross = data.readBigUInt64LE(o); o += 8;
const saleFinalized = data[o] !== 0; o += 1;
const launchActivated = data[o] !== 0; o += 1;
const launchTs = data.readBigInt64LE(o); o += 8;
const merkleRoot = Buffer.from(data.subarray(o, o + 32)).toString('hex'); o += 32;
const airdropRegistered = data.readBigUInt64LE(o); o += 8;
const airdropClaimed = data.readBigUInt64LE(o); o += 8;
const saleCancelled = data[o] !== 0; o += 1;
const depositsPaused = data[o] !== 0; o += 1;
const lockedTokensTotal = data.readBigUInt64LE(o); o += 8;
const migrationProposedAt = data.readBigInt64LE(o); o += 8;
const migrationExecuteAfter = data.readBigInt64LE(o); o += 8;
const liquidityDest = readPubkey(data, o); o += 32;
const treasuryDest = readPubkey(data, o); o += 32;
const liquidityTokenEscrow = readPubkey(data, o); o += 32;
const migrationSolLiquidity = data.readBigUInt64LE(o); o += 8;
const migrationSolTreasury = data.readBigUInt64LE(o); o += 8;
const migrationExecuted = data[o] !== 0; o += 1;
const liquidityPoolAddress = readPubkey(data, o); o += 32;
const treasuryWithdrawnTotal = data.readBigUInt64LE(o); o += 8;
const bump = data[o]; o += 1;

if (o !== data.length) {
  console.log(`  WARNING: decoded ${o} bytes but account holds ${data.length} — layout mismatch, fields above may be wrong.`);
}

console.log('--- decoded Pool ---');
console.log('  authority:                ', authority);
console.log('  sentinel:                 ', sentinel);
console.log('  mint:                     ', mint);
console.log('  token_escrow:             ', tokenEscrow);
console.log('  rewards_escrow:           ', rewardsEscrow);
console.log('  total_gross:              ', totalGross.toString(), 'lamports =', (Number(totalGross) / LAMPORTS_PER_SOL).toFixed(9), 'SOL');
console.log('  sale_finalized:           ', saleFinalized);
console.log('  launch_activated:         ', launchActivated);
console.log('  launch_ts:                ', launchTs.toString());
console.log('  merkle_root:              ', merkleRoot);
console.log('  airdrop_registered_total: ', airdropRegistered.toString(), 'base units =', (Number(airdropRegistered) / 1e6).toFixed(6), 'NEXUS');
console.log('  airdrop_claimed_total:    ', airdropClaimed.toString(), 'base units =', (Number(airdropClaimed) / 1e6).toFixed(6), 'NEXUS');
console.log('  sale_cancelled:           ', saleCancelled);
console.log('  deposits_paused:          ', depositsPaused);
console.log('  locked_tokens_total:      ', lockedTokensTotal.toString(), 'base units =', (Number(lockedTokensTotal) / 1e6).toFixed(6), 'NEXUS');
console.log('  migration_proposed_at:    ', migrationProposedAt.toString(), migrationProposedAt > 0n ? `(${new Date(Number(migrationProposedAt) * 1000).toISOString()})` : '');
console.log('  migration_execute_after:  ', migrationExecuteAfter.toString(), migrationExecuteAfter > 0n ? `(${new Date(Number(migrationExecuteAfter) * 1000).toISOString()})` : '');
console.log('  migration_liquidity_dest: ', liquidityDest);
console.log('  migration_treasury_dest:  ', treasuryDest);
console.log('  liquidity_token_escrow:   ', liquidityTokenEscrow);
console.log('  migration_sol_liquidity:  ', migrationSolLiquidity.toString(), 'lamports');
console.log('  migration_sol_treasury:   ', migrationSolTreasury.toString(), 'lamports');
console.log('  migration_executed:       ', migrationExecuted);
console.log('  liquidity_pool_address:   ', liquidityPoolAddress);
console.log('  treasury_withdrawn_total: ', treasuryWithdrawnTotal.toString(), 'lamports');
console.log('  bump:                     ', bump);

console.log('--- state summary ---');
console.log('  total raised:             ', (Number(totalGross) / LAMPORTS_PER_SOL).toFixed(9), 'SOL');
console.log('  sale:                     ', saleCancelled ? 'CANCELLED' : saleFinalized ? 'FINALIZED (deposits closed)' : 'OPEN');
console.log('  launch:                   ', launchActivated ? 'ACTIVATED' : 'NOT activated — claims closed');
const proposed = migrationProposedAt > 0n && !migrationExecuted;
console.log('  migration:                ', migrationExecuted ? 'EXECUTED' : proposed ? 'PROPOSED (timelocked)' : 'not proposed');
if (proposed && migrationExecuteAfter > 0n) {
  const msLeft = Number(migrationExecuteAfter) * 1000 - Date.now();
  console.log('  migration executes in:    ', msLeft > 0 ? `${(msLeft / 3600000).toFixed(2)} hours` : 'NOW (timelock expired)');
}
