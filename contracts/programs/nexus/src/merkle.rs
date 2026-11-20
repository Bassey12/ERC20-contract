use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hashv;

/// Merkle leaf construction — MUST match the off-chain generator
/// exactly (`contracts/scripts/generate_merkle.js`).
///
/// leaf = SHA256( "NEXUS-AIRDROP-V1" || pool_pubkey || wallet_pubkey
///                || allocation_base_units_le_bytes )
///
/// v2.0 describes the format as: version label, pool public-key bytes,
/// wallet bytes, allocation in little-endian base units. The label is
/// the literal ASCII string above; there is no length prefix.
pub fn leaf_hash(pool: &Pubkey, wallet: &Pubkey, allocation_base_units: u64) -> [u8; 32] {
    hashv(&[
        b"NEXUS-AIRDROP-V1",
        pool.as_ref(),
        wallet.as_ref(),
        &allocation_base_units.to_le_bytes(),
    ])
    .to_bytes()
}

/// Verify a Merkle proof against `root`.
///
/// Internal nodes combine lexicographically sorted child hashes
/// (the smaller hash is hashed first), matching the generator.
/// A proof proves list membership only — not that the list was fair.
pub fn verify_proof(root: &[u8; 32], leaf: [u8; 32], proof: &[[u8; 32]]) -> bool {
    let mut current = leaf;
    for sibling in proof {
        let (left, right) = if current <= *sibling {
            (current, *sibling)
        } else {
            (*sibling, current)
        };
        current = hashv(&[&left, &right]).to_bytes();
    }
    &current == root
}
