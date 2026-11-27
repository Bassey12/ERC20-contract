// Verify the claim builders in src/lib/solana.ts construct valid
// claim_presale / claim_airdrop instructions — WITHOUT sending anything.
//
// Replicates exactly what buildClaimPresaleTx / buildClaimAirdropTx do
// (same Anchor methods calls, same account lists from the IDL, same ATA
// derivation) and checks the result against the IDL: program id,
// 8-byte discriminator, and the account list in IDL order.
//
// Claims cannot execute until Gate 3 runs activate_launch (Mon 30 Nov),
// so this script builds only. Run: node scripts/verify-claims.mjs
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import idl from '../src/lib/idl.json' with { type: 'json' };

const PROGRAM_ID = new PublicKey('AzTeCHRx16YzPVM3uobj3vLEirqVm5PJGyXpPw3QYD1P');
const MINT = new PublicKey('36UWkC2JSZrwvtGToGbVZLeoBrwxzVsNbRU42WpmJvY6');
const POOL_PDA = new PublicKey('BxQWRaMGuUwhGXgczqxncQkDiFF587m5ZUumvHSeVkx6');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

// ada — a real Gate 2 contributor (3 SOL position). Building only.
const WALLET = new PublicKey('6UqNUXJEqqFptsZtVKz58kYKgrx5DGMZavioFs1HqM1A');

function pda(seeds, programId) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}
function ata(owner, mint) {
  return pda(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}
function idlIx(name) {
  return idl.instructions.find((i) => i.name === name);
}
function check(name, ix, expectedAccounts) {
  const want = idlIx(name);
  const disc = Array.from(ix.data.subarray(0, 8));
  const discOk = JSON.stringify(disc) === JSON.stringify(want.discriminator);
  const progOk = ix.programId.equals(PROGRAM_ID);
  const keysOk =
    ix.keys.length === expectedAccounts.length &&
    ix.keys.every((k, i) => k.pubkey.equals(expectedAccounts[i]));
  console.log(`\n${name}:`);
  console.log(`  program:      ${ix.programId.toBase58()} ${progOk ? 'OK' : 'MISMATCH'}`);
  console.log(`  discriminator: [${disc}] ${discOk ? 'OK — matches IDL' : 'MISMATCH, IDL says [' + want.discriminator + ']'}`);
  console.log(`  accounts:      ${ix.keys.length} (IDL lists ${want.accounts.length})`);
  ix.keys.forEach((k, i) =>
    console.log(`    [${i}] ${want.accounts[i]?.name ?? '?'}: ${k.pubkey.toBase58()}${k.isSigner ? ' signer' : ''}${k.isWritable ? ' writable' : ''}`),
  );
  console.log(`  account list matches IDL order: ${keysOk ? 'OK' : 'MISMATCH'}`);
  if (!discOk || !progOk || !keysOk) process.exitCode = 1;
}

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const provider = new AnchorProvider(
  connection,
  { publicKey: PROGRAM_ID, signTransaction: async (t) => t, signAllTransactions: async (t) => t },
  { commitment: 'confirmed' },
);
const program = new Program(idl, provider);

const pool = await program.account.pool.fetch(POOL_PDA);
console.log('live Pool: total_gross =', pool.totalGross.toString(), 'lamports; launch_activated =', pool.launchActivated);
console.log('token_escrow   =', pool.tokenEscrow.toBase58());
console.log('rewards_escrow =', pool.rewardsEscrow.toBase58());

const positionPda = pda([Buffer.from('position'), WALLET.toBuffer()], PROGRAM_ID);
const airdropPda = pda([Buffer.from('airdrop'), WALLET.toBuffer()], PROGRAM_ID);
const tokenAccount = ata(WALLET, MINT);
console.log('\nwallet (ada):', WALLET.toBase58());
console.log('position PDA: ', positionPda.toBase58());
console.log('airdrop PDA:  ', airdropPda.toBase58());
console.log('NEXUS ATA:    ', tokenAccount.toBase58());
const ataInfo = await connection.getAccountInfo(tokenAccount);
console.log('ATA exists on-chain:', ataInfo !== null, '(no account yet is expected — the builder puts a create-ATA instruction first)');

const presaleIx = await program.methods
  .claimPresale()
  .accounts({
    pool: POOL_PDA,
    position: positionPda,
    contributor: WALLET,
    tokenEscrow: pool.tokenEscrow,
    rewardsEscrow: pool.rewardsEscrow,
    mint: MINT,
    contributorTokenAccount: tokenAccount,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .instruction();
check('claim_presale', presaleIx, [
  POOL_PDA, positionPda, WALLET, pool.tokenEscrow, pool.rewardsEscrow,
  MINT, tokenAccount, TOKEN_PROGRAM_ID,
]);

const airdropIx = await program.methods
  .claimAirdrop()
  .accounts({
    pool: POOL_PDA,
    airdrop: airdropPda,
    wallet: WALLET,
    tokenEscrow: pool.tokenEscrow,
    contributorTokenAccount: tokenAccount,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .instruction();
check('claim_airdrop', airdropIx, [
  POOL_PDA, airdropPda, WALLET, pool.tokenEscrow, tokenAccount, TOKEN_PROGRAM_ID,
]);

console.log('\nDone. Nothing was sent — both instructions are construction-only.');
console.log('On-chain they will fail until activate_launch runs (Gate 3, Mon 30 Nov).');
