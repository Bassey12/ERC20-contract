use anchor_lang::prelude::*;

/// Global sale state. PDA seeds: ["pool"].
///
/// The Pool account itself holds the protocol SOL vault: deposits send
/// the vault share directly to this PDA, and there is deliberately NO
/// instruction in this phase that withdraws SOL from it or migrates it
/// to liquidity (see README.md — that absence is a documented blocker,
/// not an oversight to work around with a raw transfer).
#[account]
pub struct Pool {
    /// Authority that may initialise, finalise and activate the launch.
    /// Production value (public address only, from v2.0):
    /// BHxkjg3MvcWitw6i2MQDNrCWmC6vqB5U98C3JUk8LmTB
    /// The program never holds or asks for this key. It is stored at
    /// `initialize` from the signer, and verified off-chain.
    pub authority: Pubkey,
    /// The NEXUS SPL mint (6 decimals, 1B supply, authorities revoked).
    pub mint: Pubkey,
    /// Token account holding the 400M presale + 100M airdrop escrow.
    /// Owner must be this Pool PDA.
    pub token_escrow: Pubkey,
    /// Token account receiving the 20% rewards share of whale penalties.
    /// Owner must be this Pool PDA.
    pub rewards_escrow: Pubkey,
    /// Sum of all accepted gross contributions, in lamports.
    pub total_gross: u64,
    /// True once `finalize` has run. Deposits are rejected after this.
    pub sale_finalized: bool,
    /// True once `activate_launch` has run.
    pub launch_activated: bool,
    /// Unix timestamp set by `activate_launch`; the 72h vesting clock
    /// starts here. 0 until activation.
    pub launch_ts: i64,
    /// Merkle root of the approved airdrop list. Immutable in this phase:
    /// a mistake in the list cannot be casually fixed after `initialize`.
    pub merkle_root: [u8; 32],
    /// Sum of airdrop allocations registered so far, in base units.
    /// Capped at 100,000,000 tokens.
    pub airdrop_registered_total: u64,
    /// Sum of airdrop tokens gross-claimed so far, in base units.
    pub airdrop_claimed_total: u64,
    pub bump: u8,
}

impl Pool {
    // 32*4 pubkeys + 8 + 1 + 1 + 8 + 32 + 8 + 8 + 1
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 1 + 1 + 8 + 32 + 8 + 8 + 1;
}

/// One contributor's position. PDA seeds: ["position", contributor].
///
/// `gross_contribution` is cumulative: tier is decided by the total,
/// so splitting one big purchase into small payments does not preserve
/// retail status. `allocation` is NOT stored here — it is computed
/// deterministically at claim time as
/// `gross / pool.total_gross * 400,000,000 tokens` (see nexus-math),
/// which is exactly the allocation `finalize` fixes, because
/// `total_gross` is frozen by finalisation.
#[account]
pub struct Position {
    pub contributor: Pubkey,
    /// Cumulative accepted gross contribution, in lamports.
    pub gross_contribution: u64,
    /// Direct referrer, or the pool authority address as the
    /// no-referral sentinel. Bound on first deposit, never changed.
    pub referrer: Pubkey,
    /// Referrer's referrer, or the pool authority sentinel.
    pub upline: Pubkey,
    /// Gross tokens already claimed (presale), in base units.
    /// Prevents the same allocation being extracted twice.
    pub gross_claimed: u64,
    pub bump: u8,
}

impl Position {
    // 32*3 + 8 + 8 + 1
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 1;
}

/// One airdrop recipient's registration. PDA seeds: ["airdrop", wallet].
#[account]
pub struct AirdropAccount {
    pub wallet: Pubkey,
    /// Approved allocation, in base units (from the Merkle list).
    pub allocation: u64,
    /// Gross tokens already claimed, in base units.
    pub gross_claimed: u64,
    pub bump: u8,
}

impl AirdropAccount {
    // 32 + 8 + 8 + 1
    pub const LEN: usize = 32 + 8 + 8 + 1;
}
