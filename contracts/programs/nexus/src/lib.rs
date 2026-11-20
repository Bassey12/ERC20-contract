//! Nexus Anchor program — devnet-first capsule / token launch.
//!
//! Source of truth: Nexus v2.0
//! (`workspace/your_files/nexus-v2-perfected/nexus-v2-perfected.pdf`).
//!
//! ## What this program does
//! * `initialize` — create the Pool, gated by the authority signer.
//! * `deposit` — accept a SOL contribution, split 10% direct referrer /
//!   2% upline / 88% vault (missing shares + rounding remainder to vault).
//! * `finalize` — close the sale; total gross is frozen, which fixes every
//!   wallet's proportional allocation (gross / total * 400,000,000).
//! * `activate_launch` — start the 72-hour (259,200 s) vesting clock.
//! * `claim_presale` — retail claims in full; whale claims vest linearly
//!   with a 25% / 15% / 5% / 0% early-claim penalty (80% burned via the
//!   real SPL burn instruction, 20% to the marketing rewards escrow).
//! * `register_airdrop` / `claim_airdrop` — Merkle-proven airdrop
//!   (100M inventory, linear 72h vesting, no penalty).
//!
//! ## What this program deliberately does NOT do
//! There is NO SOL withdrawal instruction and NO liquidity-migration
//! instruction in this phase. Do not accept production funds expecting
//! an undocumented escape path, and do not add one casually — it is a
//! Gate 2/5 blocker (see `workspace/nexus/README.md`). Likewise there
//! is NO contribution-refund instruction: the campaign refund policy
//! in v2.0 covers hosting fees only, never protocol contributions.
//!
//! ## Status
//! DEVNET ONLY. Not mainnet-ready, not audited, not deployed.
//! No private key is used or requested anywhere in this codebase.
//! The production authority is a public address only:
//! BHxkjg3MvcWitw6i2MQDNrCWmC6vqB5U98C3JUk8LmTB
//!
//! Program id below is a PLACEHOLDER — replace it with the real id
//! from `anchor keys list` after the first local build.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer as SystemTransfer};
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer as TokenTransfer};
use nexus_math as math;

pub mod errors;
pub mod merkle;
pub mod state;

use errors::NexusError;
use state::{AirdropAccount, Pool, Position};

declare_id!("3py1rKZt6n5CicNQELDRFWrAZx9zBXurX6wYAZxG2B8i");

fn map_math<T>(r: std::result::Result<T, math::MathError>) -> Result<T> {
    r.map_err(|_| NexusError::ArithmeticError.into())
}

#[program]
pub mod nexus {
    use super::*;

    /// Create the Pool. Authority-gated: the signer becomes
    /// `pool.authority` and must approve every later authority action.
    ///
    /// Gates enforced here (v2.0 Gate 2):
    /// * mint has 6 decimals, exactly 1,000,000,000 tokens minted, and
    ///   mint + freeze authority revoked;
    /// * token escrow (owned by the Pool PDA) holds >= 500,000,000
    ///   tokens (400M presale + 100M airdrop).
    /// The remaining 500M tokens are NOT minted into this escrow. Their
    /// RECOMMENDED allocation (150M liquidity / 100M ecosystem /
    /// 100M team / 100M treasury / 50M marketing, v2.0 p. 7) requires
    /// founder approval and a locking/vesting mechanism that does not
    /// yet exist — it is not created, claimed, or promised here.
    pub fn initialize(
        ctx: Context<Initialize>,
        merkle_root: [u8; 32],
    ) -> Result<()> {
        let mint = &ctx.accounts.mint;
        require!(
            mint.decimals == math::TOKEN_DECIMALS
                && mint.supply == math::TOTAL_SUPPLY_BASE_UNITS
                && mint.mint_authority.is_none()
                && mint.freeze_authority.is_none(),
            NexusError::InvalidMint
        );
        require!(
            ctx.accounts.token_escrow.amount
                >= math::PRESALE_BASE_UNITS + math::AIRDROP_BASE_UNITS,
            NexusError::EscrowUnderfunded
        );
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.mint = mint.key();
        pool.token_escrow = ctx.accounts.token_escrow.key();
        pool.rewards_escrow = ctx.accounts.rewards_escrow.key();
        pool.total_gross = 0;
        pool.sale_finalized = false;
        pool.launch_activated = false;
        pool.launch_ts = 0;
        pool.merkle_root = merkle_root;
        pool.airdrop_registered_total = 0;
        pool.airdrop_claimed_total = 0;
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    /// Accept one SOL contribution.
    ///
    /// `direct_referrer` / `upline` are accounts, not bare pubkeys:
    /// they receive lamports, so they must be passed as mutable
    /// accounts. Pass the pool authority account for both when there
    /// is no referrer — the authority address is the no-referral
    /// sentinel (routing, not an earned founder commission).
    ///
    /// `referrer_position` is optional: pass the direct referrer's
    /// Position account when it exists, so the program can verify the
    /// upline is the referrer's referrer. Omit it (null) only when the
    /// referrer has never deposited — then `upline` must be the sentinel.
    pub fn deposit(ctx: Context<Deposit>, amount_lamports: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(!pool.sale_finalized, NexusError::SaleFinalized);
        require!(amount_lamports > 0, NexusError::ZeroAmount);

        let contributor = ctx.accounts.contributor.key();
        let direct_key = ctx.accounts.direct_referrer.key();
        let upline_key = ctx.accounts.upline.key();
        let authority_key = pool.authority;

        // No self-referral, in either tier.
        require!(direct_key != contributor, NexusError::SelfReferral);
        require!(upline_key != contributor, NexusError::SelfReferral);
        require!(direct_key != upline_key || direct_key == authority_key, NexusError::ReferralCycle);

        // Ancestry: a valid parent must predate the child.
        let direct_valid = direct_key != authority_key;
        let upline_valid = upline_key != authority_key;
        if direct_valid {
            match &ctx.accounts.referrer_position {
                Some(ref_pos) => {
                    // The referrer's Position must be the PDA for the
                    // direct referrer, and its referrer IS the upline.
                    let (expected, _) = Pubkey::find_program_address(
                        &[b"position", direct_key.as_ref()],
                        ctx.program_id,
                    );
                    require!(ref_pos.key() == expected, NexusError::ReferralCycle);
                    require!(ref_pos.referrer == upline_key, NexusError::ReferralCycle);
                }
                None => {
                    // Referrer has never deposited, so no upline is known.
                    require!(!upline_valid, NexusError::ReferralCycle);
                }
            }
        } else {
            // No direct referrer implies no upline.
            require!(!upline_valid, NexusError::ReferralCycle);
        }

        // Hard cap, checked.
        let new_total = map_math(
            pool.total_gross
                .checked_add(amount_lamports)
                .ok_or(math::MathError::Overflow),
        )?;
        require!(new_total <= math::HARD_CAP_LAMPORTS, NexusError::CapExceeded);

        // Split: 10 / 2 / 88, missing shares + remainder to the vault.
        let (direct_amt, upline_amt, vault_amt) =
            map_math(math::referral_split(amount_lamports, direct_valid, upline_valid))?;

        // Move SOL: contributor -> referrers -> Pool PDA (the vault).
        // The contributor signs, so these are plain system transfers.
        let system_program = ctx.accounts.system_program.to_account_info();
        let contributor_info = ctx.accounts.contributor.to_account_info();
        if direct_amt > 0 {
            transfer(
                CpiContext::new(
                    system_program.clone(),
                    SystemTransfer {
                        from: contributor_info.clone(),
                        to: ctx.accounts.direct_referrer.to_account_info(),
                    },
                ),
                direct_amt,
            )?;
        }
        if upline_amt > 0 {
            transfer(
                CpiContext::new(
                    system_program.clone(),
                    SystemTransfer {
                        from: contributor_info.clone(),
                        to: ctx.accounts.upline.to_account_info(),
                    },
                ),
                upline_amt,
            )?;
        }
        if vault_amt > 0 {
            transfer(
                CpiContext::new(
                    system_program,
                    SystemTransfer {
                        from: contributor_info,
                        to: pool.to_account_info(),
                    },
                ),
                vault_amt,
            )?;
        }

        // Bind referral ancestry on first deposit; enforce it after.
        let position = &mut ctx.accounts.position;
        let is_new = position.contributor == Pubkey::default();
        if is_new {
            position.contributor = contributor;
            position.referrer = direct_key;
            position.upline = upline_key;
            position.gross_claimed = 0;
            position.bump = ctx.bumps.position;
        } else {
            require!(position.contributor == contributor, NexusError::Unauthorized);
            require!(position.referrer == direct_key, NexusError::ReferrerAlreadyBound);
            require!(position.upline == upline_key, NexusError::ReferrerAlreadyBound);
        }
        position.gross_contribution = map_math(
            position
                .gross_contribution
                .checked_add(amount_lamports)
                .ok_or(math::MathError::Overflow),
        )?;
        pool.total_gross = new_total;
        Ok(())
    }

    /// Close the sale. Authority only. Freezes `total_gross`, which
    /// fixes every wallet's proportional allocation. Requires the
    /// token escrow to still hold >= 500M tokens.
    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(!pool.sale_finalized, NexusError::SaleFinalized);
        require!(pool.total_gross > 0, NexusError::ZeroTotalGross);
        require!(
            ctx.accounts.token_escrow.amount
                >= math::PRESALE_BASE_UNITS + math::AIRDROP_BASE_UNITS,
            NexusError::EscrowUnderfunded
        );
        pool.sale_finalized = true;
        Ok(())
    }

    /// Start the 72-hour vesting clock. Authority only.
    /// Requires finalisation; can only run once.
    pub fn activate_launch(ctx: Context<ActivateLaunch>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(pool.sale_finalized, NexusError::SaleNotFinalized);
        require!(!pool.launch_activated, NexusError::LaunchAlreadyActivated);
        pool.launch_activated = true;
        pool.launch_ts = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Claim presale tokens that have vested.
    ///
    /// * Retail (cumulative gross <= 2 SOL): fully claimable after
    ///   finalisation + launch activation.
    /// * Whale (cumulative gross > 2 SOL): linear vesting over
    ///   259,200 s from `launch_ts`; early claims pay a penalty on
    ///   the newly claimed amount only: 25% <24h, 15% 24–48h,
    ///   5% 48–72h, 0% after. 80% of the penalty is burned with the
    ///   real SPL burn instruction; 20% goes to the rewards escrow.
    /// * `gross_claimed` is updated by the full gross claim, so the
    ///   same tokens can never be claimed twice.
    pub fn claim_presale(ctx: Context<ClaimPresale>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        require!(pool.sale_finalized, NexusError::SaleNotFinalized);
        require!(pool.launch_activated, NexusError::LaunchNotActivated);

        let position = &mut ctx.accounts.position;
        let allocation = map_math(math::allocation_for(
            position.gross_contribution,
            pool.total_gross,
        ))?;
        let now = Clock::get()?.unix_timestamp;
        let elapsed = now.saturating_sub(pool.launch_ts);
        let vested = if math::is_retail(position.gross_contribution) {
            allocation
        } else {
            map_math(math::vested_amount(allocation, elapsed))?
        };
        let claimable = math::claimable_now(vested, position.gross_claimed);
        require!(claimable > 0, NexusError::NothingClaimable);

        let rate = if math::is_retail(position.gross_contribution) {
            0
        } else {
            math::penalty_rate_percent(elapsed)
        };
        let (_penalty, burned, rewards, net) = map_math(math::penalty_split(claimable, rate))?;

        let pool_bump = pool.bump;
        let signer_seeds: &[&[u8]] = &[b"pool", &[pool_bump]];
        let signer = &[signer_seeds];

        // Net tokens to the claimant.
        if net > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TokenTransfer {
                        from: ctx.accounts.token_escrow.to_account_info(),
                        to: ctx.accounts.contributor_token_account.to_account_info(),
                        authority: pool.to_account_info(),
                    },
                    signer,
                ),
                net,
            )?;
        }
        // 80% of the penalty is really burned (mint supply falls).
        if burned > 0 {
            token::burn(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Burn {
                        mint: ctx.accounts.mint.to_account_info(),
                        from: ctx.accounts.token_escrow.to_account_info(),
                        authority: pool.to_account_info(),
                    },
                    signer,
                ),
                burned,
            )?;
        }
        // 20% of the penalty to the marketing rewards escrow.
        if rewards > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TokenTransfer {
                        from: ctx.accounts.token_escrow.to_account_info(),
                        to: ctx.accounts.rewards_escrow.to_account_info(),
                        authority: pool.to_account_info(),
                    },
                    signer,
                ),
                rewards,
            )?;
        }

        position.gross_claimed = map_math(
            position
                .gross_claimed
                .checked_add(claimable)
                .ok_or(math::MathError::Overflow),
        )?;
        Ok(())
    }

    /// Register an airdrop allocation with a Merkle proof.
    /// Replay-protected: the Airdrop PDA can only be initialised once.
    /// The root is immutable in this phase — the approved list must be
    /// right before `initialize` sets it.
    pub fn register_airdrop(
        ctx: Context<RegisterAirdrop>,
        allocation_base_units: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(allocation_base_units > 0, NexusError::ZeroAmount);
        let new_total = map_math(
            pool.airdrop_registered_total
                .checked_add(allocation_base_units)
                .ok_or(math::MathError::Overflow),
        )?;
        require!(
            new_total <= math::AIRDROP_BASE_UNITS,
            NexusError::AirdropCapExceeded
        );
        let wallet = ctx.accounts.wallet.key();
        let leaf = merkle::leaf_hash(&pool.key(), &wallet, allocation_base_units);
        require!(
            merkle::verify_proof(&pool.merkle_root, leaf, &proof),
            NexusError::InvalidMerkleProof
        );
        let airdrop = &mut ctx.accounts.airdrop;
        airdrop.wallet = wallet;
        airdrop.allocation = allocation_base_units;
        airdrop.gross_claimed = 0;
        airdrop.bump = ctx.bumps.airdrop;
        pool.airdrop_registered_total = new_total;
        Ok(())
    }

    /// Claim airdrop tokens that have vested. Linear 72h vesting from
    /// launch activation, NO early-claim penalty. Registration time
    /// does not restart the clock.
    pub fn claim_airdrop(ctx: Context<ClaimAirdrop>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(pool.sale_finalized, NexusError::SaleNotFinalized);
        require!(pool.launch_activated, NexusError::LaunchNotActivated);

        let airdrop = &mut ctx.accounts.airdrop;
        let now = Clock::get()?.unix_timestamp;
        let elapsed = now.saturating_sub(pool.launch_ts);
        let vested = map_math(math::vested_amount(airdrop.allocation, elapsed))?;
        let claimable = math::claimable_now(vested, airdrop.gross_claimed);
        require!(claimable > 0, NexusError::NothingClaimable);

        let pool_bump = pool.bump;
        let signer_seeds: &[&[u8]] = &[b"pool", &[pool_bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TokenTransfer {
                    from: ctx.accounts.token_escrow.to_account_info(),
                    to: ctx.accounts.contributor_token_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                &[signer_seeds],
            ),
            claimable,
        )?;

        airdrop.gross_claimed = map_math(
            airdrop
                .gross_claimed
                .checked_add(claimable)
                .ok_or(math::MathError::Overflow),
        )?;
        let pool = &mut ctx.accounts.pool;
        pool.airdrop_claimed_total = map_math(
            pool.airdrop_claimed_total
                .checked_add(claimable)
                .ok_or(math::MathError::Overflow),
        )?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Account contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Pool::LEN,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = token_escrow.mint == mint.key(),
        constraint = token_escrow.owner == pool.key()
    )]
    pub token_escrow: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = rewards_escrow.mint == mint.key(),
        constraint = rewards_escrow.owner == pool.key()
    )]
    pub rewards_escrow: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(
        init_if_needed,
        payer = contributor,
        space = 8 + Position::LEN,
        seeds = [b"position", contributor.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    #[account(mut)]
    pub contributor: Signer<'info>,
    /// CHECK: direct referrer; pass the pool authority account when
    /// there is no referrer (sentinel). Receives lamports if valid.
    #[account(mut)]
    pub direct_referrer: UncheckedAccount<'info>,
    /// CHECK: upline; pass the pool authority account when there is
    /// no upline (sentinel). Receives lamports if valid.
    #[account(mut)]
    pub upline: UncheckedAccount<'info>,
    /// The direct referrer's Position, when it exists. Verified
    /// manually in the handler (PDA + referrer == upline). Pass null
    /// when the referrer has never deposited.
    pub referrer_position: Option<Account<'info, Position>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Finalize<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump, has_one = authority)]
    pub pool: Account<'info, Pool>,
    pub authority: Signer<'info>,
    #[account(
        mut,
        constraint = token_escrow.mint == pool.mint,
        constraint = token_escrow.owner == pool.key()
    )]
    pub token_escrow: Account<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct ActivateLaunch<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump, has_one = authority)]
    pub pool: Account<'info, Pool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimPresale<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [b"position", contributor.key().as_ref()],
        bump = position.bump,
        constraint = position.contributor == contributor.key()
    )]
    pub position: Account<'info, Position>,
    #[account(mut)]
    pub contributor: Signer<'info>,
    #[account(
        mut,
        constraint = token_escrow.mint == pool.mint,
        constraint = token_escrow.owner == pool.key()
    )]
    pub token_escrow: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = rewards_escrow.mint == pool.mint,
        constraint = rewards_escrow.owner == pool.key()
    )]
    pub rewards_escrow: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = contributor_token_account.mint == pool.mint,
        constraint = contributor_token_account.owner == contributor.key()
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterAirdrop<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(
        init,
        payer = wallet,
        space = 8 + AirdropAccount::LEN,
        seeds = [b"airdrop", wallet.key().as_ref()],
        bump
    )]
    pub airdrop: Account<'info, AirdropAccount>,
    #[account(mut)]
    pub wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimAirdrop<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [b"airdrop", wallet.key().as_ref()],
        bump = airdrop.bump,
        constraint = airdrop.wallet == wallet.key()
    )]
    pub airdrop: Account<'info, AirdropAccount>,
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(
        mut,
        constraint = token_escrow.mint == pool.mint,
        constraint = token_escrow.owner == pool.key()
    )]
    pub token_escrow: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = contributor_token_account.mint == pool.mint,
        constraint = contributor_token_account.owner == wallet.key()
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
