use anchor_lang::prelude::*;

#[error_code]
pub enum NexusError {
    #[msg("Amount must be greater than zero.")]
    ZeroAmount,
    #[msg("Arithmetic overflow or underflow (checked arithmetic failed).")]
    ArithmeticError,
    #[msg("Sale is already finalised; deposits are closed.")]
    SaleFinalized,
    #[msg("Sale has not been finalised yet.")]
    SaleNotFinalized,
    #[msg("Launch has not been activated yet.")]
    LaunchNotActivated,
    #[msg("Launch is already activated.")]
    LaunchAlreadyActivated,
    #[msg("Deposit would exceed the 15,000 SOL hard cap.")]
    CapExceeded,
    #[msg("A wallet cannot refer itself.")]
    SelfReferral,
    #[msg("Referral ancestry is invalid: upline must be the direct referrer's referrer, or the authority sentinel when the referrer has no referrer.")]
    ReferralCycle,
    #[msg("A wallet's referrer is fixed on its first deposit and cannot be changed.")]
    ReferrerAlreadyBound,
    #[msg("Caller is not the pool authority.")]
    Unauthorized,
    #[msg("Mint must have 6 decimals, exactly 1,000,000,000 tokens minted, and no mint or freeze authority.")]
    InvalidMint,
    #[msg("Token escrow is underfunded: it must hold at least 500,000,000 tokens (400M presale + 100M airdrop) at finalisation.")]
    EscrowUnderfunded,
    #[msg("Nothing is claimable yet (vested amount minus already-claimed is zero).")]
    NothingClaimable,
    #[msg("This wallet has already registered its airdrop allocation (Merkle replay protection).")]
    AlreadyRegistered,
    #[msg("Merkle proof does not match the approved root for this wallet and allocation.")]
    InvalidMerkleProof,
    #[msg("Airdrop registrations would exceed the 100,000,000-token inventory.")]
    AirdropCapExceeded,
    #[msg("Total gross contributions are zero; allocation is undefined.")]
    ZeroTotalGross,
}
