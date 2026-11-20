#!/usr/bin/env node
/**
 * Generate a Nexus airdrop Merkle root + proofs.
 *
 * MUST match the on-chain leaf construction exactly
 * (programs/nexus/src/merkle.rs):
 *   leaf = SHA256("NEXUS-AIRDROP-V1" || pool_pubkey_bytes
 *                 || wallet_pubkey_bytes || allocation_le_bytes_u64)
 * Internal nodes combine lexicographically sorted child hashes.
 *
 * Usage:
 *   node scripts/generate_merkle.js allocations.json [out.json]
 *
 * allocations.json: [{ "wallet": "<base58>", "allocation": <base units, integer> }]
 *   allocation is in BASE UNITS (1 NEXUS = 1,000,000). Example: 1,000 NEXUS
 *   = 1,000,000,000.
 *
 * Output: { "root": "<hex>", "total": <base units>, "entries": [
 *   { "wallet", "allocation", "proof": ["<hex>", ...] } ] }
 *
 * Process (v2.0, p. 9): define rules BEFORE participation, document the
 * window, review duplicates/disputes, calculate exactly, publish this
 * reproducible file, obtain authority approval, archive the version.
 * The root is immutable once `initialize` sets it — a mistake cannot
 * be casually fixed. Never invent eligibility.
 *
 * No dependencies: uses Node's built-in crypto and a minimal base58
 * decoder (no npm install needed).
 */
const fs = require("fs");
const crypto = require("crypto");

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Decode(s) {
  let n = 0n;
  for (const c of s) {
    const i = B58.indexOf(c);
    if (i < 0) throw new Error(`invalid base58 character: ${c}`);
    n = n * 58n + BigInt(i);
  }
  // n == 0 contributes no bytes (e.g. "111...1" is all zero bytes);
  // otherwise convert the integer to big-endian bytes.
  let bytes = Buffer.alloc(0);
  if (n > 0n) {
    let hex = n.toString(16);
    if (hex.length % 2) hex = "0" + hex;
    bytes = Buffer.from(hex, "hex");
  }
  // Leading '1's are leading zero bytes.
  let leading = 0;
  for (const c of s) { if (c === "1") leading++; else break; }
  return Buffer.concat([Buffer.alloc(leading), bytes]);
}

function sha256(...parts) {
  return crypto.createHash("sha256").update(Buffer.concat(parts)).digest();
}

function leafHash(poolBytes, walletBytes, allocation) {
  const alloc = Buffer.alloc(8);
  alloc.writeBigUInt64LE(BigInt(allocation));
  return sha256(Buffer.from("NEXUS-AIRDROP-V1"), poolBytes, walletBytes, alloc);
}

function main() {
  const [,, inFile, outFile] = process.argv;
  if (!inFile) {
    console.error("Usage: node scripts/generate_merkle.js allocations.json [out.json]");
    process.exit(1);
  }
  const poolB58 = process.env.NEXUS_POOL;
  if (!poolB58) {
    console.error("Set NEXUS_POOL to the Pool PDA base58 address.");
    process.exit(1);
  }
  const poolBytes = base58Decode(poolB58);
  if (poolBytes.length !== 32) throw new Error("NEXUS_POOL must decode to 32 bytes");

  const entries = JSON.parse(fs.readFileSync(inFile, "utf8"));
  if (!Array.isArray(entries) || entries.length === 0) throw new Error("allocations.json must be a non-empty array");
  const seen = new Set();
  let total = 0n;
  const leaves = entries.map((e) => {
    if (seen.has(e.wallet)) throw new Error(`duplicate wallet: ${e.wallet}`);
    seen.add(e.wallet);
    const alloc = BigInt(e.allocation);
    if (alloc <= 0n) throw new Error(`allocation must be > 0 for ${e.wallet}`);
    total += alloc;
    return { wallet: e.wallet, allocation: e.allocation, leaf: leafHash(poolBytes, base58Decode(e.wallet), alloc) };
  });
  if (total > 100_000_000n * 1_000_000n) {
    throw new Error(`total ${total} exceeds 100,000,000-token airdrop inventory`);
  }

  // Build layers; odd leaf is duplicated (standard Merkle padding).
  const layers = [leaves.map((l) => l.leaf)];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i];
      const right = prev[i + 1] ?? prev[i];
      const [a, b] = Buffer.compare(left, right) <= 0 ? [left, right] : [right, left];
      next.push(sha256(a, b));
    }
    layers.push(next);
  }
  const root = layers[layers.length - 1][0];

  const out = {
    root: root.toString("hex"),
    total: total.toString(),
    entries: leaves.map((l, idx) => {
      const proof = [];
      let pos = idx;
      for (let level = 0; level < layers.length - 1; level++) {
        const layer = layers[level];
        const sibling = pos % 2 === 0 ? pos + 1 : pos - 1;
        if (sibling < layer.length) proof.push(layer[sibling].toString("hex"));
        pos = Math.floor(pos / 2);
      }
      return { wallet: l.wallet, allocation: l.allocation, proof };
    }),
  };
  const text = JSON.stringify(out, null, 2);
  if (outFile) fs.writeFileSync(outFile, text);
  console.log(text);
  console.error(`\nRoot: ${out.root}\nTotal base units: ${total} (max 100,000,000,000,000)`);
}

main();
