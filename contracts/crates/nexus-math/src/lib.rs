//! Nexus pure maths — no Solana / Anchor dependencies.
//!
//! Every money and token rule in the Nexus Anchor program lives here as a
//! pure function, so it can be unit-tested with plain `cargo test -p nexus-math`
//! without a Solana validator, Anchor CLI, or BPF toolchain.
//!
//! The Anchor program (`programs/nexus`) calls exactly these functions.
//! The Python mirror in `contracts/tests/test_math.py` implements the same
//! formulas independently, so a discrepancy between the two test suites
//! would be caught.
//!
//! All amounts are integer units — no floats anywhere:
//! * SOL amounts are lamports (1 SOL = 1_000_000_000 lamports).
//! * NEXUS amounts are base units (1 NEXUS = 1_000_000 base units, 6 decimals).
//!
//! Source of truth: Nexus v2.0 (workspace/your_files/nexus-v2-perfected/nexus-v2-perfected.pdf),
//! pp. 7–9. Corrected maths from v1 Part C.6 is pinned by a test below:
//! for a 1,000,000-token allocation, 166,667 tokens vest at hour 12 —
//! NOT 500,000. 500,000 vests at hour 36.

/// Lamports in 1 SOL.
pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
/// Retail / whale boundary, cumulative per wallet, in lamports.
/// Exactly 2 SOL is retail; 2.000000001 SOL is whale.
pub const RETAIL_MAX_LAMPORTS: u64 = 2 * LAMPORTS_PER_SOL;
/// Gross contribution hard cap, in lamports (15,000 SOL).
pub const HARD_CAP_LAMPORTS: u64 = 15_000 * LAMPORTS_PER_SOL;
/// Token decimals.
pub const TOKEN_DECIMALS: u8 = 6;
/// Base units in 1 NEXUS token.
pub const BASE_UNITS_PER_TOKEN: u64 = 1_000_000;
/// Total supply cap, in base units (1,000,000,000 tokens).
pub const TOTAL_SUPPLY_BASE_UNITS: u64 = 1_000_000_000 * BASE_UNITS_PER_TOKEN;
/// Presale inventory, in base units (400,000,000 tokens).
pub const PRESALE_BASE_UNITS: u64 = 400_000_000 * BASE_UNITS_PER_TOKEN;
/// Airdrop inventory, in base units (100,000,000 tokens).
pub const AIRDROP_BASE_UNITS: u64 = 100_000_000 * BASE_UNITS_PER_TOKEN;
/// Vesting duration, in seconds (72 hours).
pub const VESTING_SECONDS: i64 = 259_200;

/// RECOMMENDED (v2.0, p. 7) allocation of the remaining 500,000,000 tokens.
/// NOT founder-approved. Requires approval + a locking/vesting mechanism
/// that does not yet exist before any launch. Values in base units.
pub const RECOMMENDED_LIQUIDITY_BASE_UNITS: u64 = 150_000_000 * BASE_UNITS_PER_TOKEN;
pub const RECOMMENDED_ECOSYSTEM_BASE_UNITS: u64 = 100_000_000 * BASE_UNITS_PER_TOKEN;
pub const RECOMMENDED_TEAM_BASE_UNITS: u64 = 100_000_000 * BASE_UNITS_PER_TOKEN;
pub const RECOMMENDED_TREASURY_BASE_UNITS: u64 = 100_000_000 * BASE_UNITS_PER_TOKEN;
pub const RECOMMENDED_MARKETING_BASE_UNITS: u64 = 50_000_000 * BASE_UNITS_PER_TOKEN;

/// Referral percentages (v2.0, p. 9).
pub const DIRECT_BPS: u64 = 10; // 10%
pub const UPLINE_BPS: u64 = 2; // 2%

/// Errors returned by the pure maths functions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MathError {
    Overflow,
    DivisionByZero,
    ZeroAmount,
    CapExceeded,
}

/// Is a wallet retail, from its *cumulative* gross contribution?
/// Splitting payments does not preserve retail status.
pub fn is_retail(cumulative_gross_lamports: u64) -> bool {
    cumulative_gross_lamports <= RETAIL_MAX_LAMPORTS
}

/// Referral split for one deposit.
///
/// Returns `(direct, upline, vault)` in lamports.
/// * `direct_valid` / `upline_valid` are false when there is no eligible
///   referrer (the pool authority address is used as the no-referral
///   sentinel — that is routing, not a founder commission).
/// * Missing shares go to the vault. Integer rounding remainder stays
///   with the vault. The three parts always sum to `amount`.
pub fn referral_split(
    amount_lamports: u64,
    direct_valid: bool,
    upline_valid: bool,
) -> Result<(u64, u64, u64), MathError> {
    if amount_lamports == 0 {
        return Err(MathError::ZeroAmount);
    }
    let direct = if direct_valid {
        amount_lamports
            .checked_mul(DIRECT_BPS)
            .ok_or(MathError::Overflow)?
            / 100
    } else {
        0
    };
    let upline = if upline_valid {
        amount_lamports
            .checked_mul(UPLINE_BPS)
            .ok_or(MathError::Overflow)?
            / 100
    } else {
        0
    };
    let vault = amount_lamports
        .checked_sub(direct)
        .and_then(|v| v.checked_sub(upline))
        .ok_or(MathError::Overflow)?;
    Ok((direct, upline, vault))
}

/// Proportional presale allocation, in base units (v2.0, p. 7).
///
/// allocation = gross / total_gross * 400,000,000 tokens.
/// Referral payouts do not change the gross denominator.
/// Computed with a u128 intermediate so `gross * PRESALE` cannot
/// overflow u64 (max ~6e27, far below u128::MAX).
pub fn allocation_for(gross_lamports: u64, total_gross_lamports: u64) -> Result<u64, MathError> {
    if total_gross_lamports == 0 {
        return Err(MathError::DivisionByZero);
    }
    let result = (gross_lamports as u128)
        .checked_mul(PRESALE_BASE_UNITS as u128)
        .ok_or(MathError::Overflow)?
        / (total_gross_lamports as u128);
    u64::try_from(result).map_err(|_| MathError::Overflow)
}

/// Linear vesting: how much of `allocation` has vested after
/// `elapsed_seconds` since launch activation, capped at the full
/// allocation. `elapsed_seconds` is clamped to [0, VESTING_SECONDS].
pub fn vested_amount(allocation_base_units: u64, elapsed_seconds: i64) -> Result<u64, MathError> {
    let elapsed = elapsed_seconds.clamp(0, VESTING_SECONDS);
    if elapsed >= VESTING_SECONDS {
        return Ok(allocation_base_units);
    }
    let result = (allocation_base_units as u128)
        .checked_mul(elapsed as u128)
        .ok_or(MathError::Overflow)?
        / (VESTING_SECONDS as u128);
    u64::try_from(result).map_err(|_| MathError::Overflow)
}

/// Whale early-claim penalty rate (percent) for a claim made
/// `elapsed_seconds` after launch activation.
/// Boundaries are exact: at precisely 24h the rate is 15%, not 25%;
/// at precisely 48h it is 5%; at 72h it is 0%.
pub fn penalty_rate_percent(elapsed_seconds: i64) -> u64 {
    if elapsed_seconds < 24 * 3_600 {
        25
    } else if elapsed_seconds < 48 * 3_600 {
        15
    } else if elapsed_seconds < 72 * 3_600 {
        5
    } else {
        0
    }
}

/// Split a newly-claimed gross amount under a penalty rate.
///
/// Returns `(penalty, burned, rewards, net)` in base units.
/// * penalty applies to the newly claimed amount only, never to the
///   whole allocation and never twice to the same tokens.
/// * 80% of the penalty is burned, 20% goes to the marketing rewards
///   escrow. The rewards share is `penalty - burned`, so rounding dust
///   goes to rewards and `burned + rewards + net == gross` exactly.
pub fn penalty_split(
    gross_claim_base_units: u64,
    rate_percent: u64,
) -> Result<(u64, u64, u64, u64), MathError> {
    let penalty = gross_claim_base_units
        .checked_mul(rate_percent)
        .ok_or(MathError::Overflow)?
        / 100;
    let burned = penalty
        .checked_mul(80)
        .ok_or(MathError::Overflow)?
        / 100;
    let rewards = penalty.checked_sub(burned).ok_or(MathError::Overflow)?;
    let net = gross_claim_base_units
        .checked_sub(penalty)
        .ok_or(MathError::Overflow)?;
    Ok((penalty, burned, rewards, net))
}

/// Claimable now = vested − already gross-claimed, never below zero.
pub fn claimable_now(vested_base_units: u64, already_gross_claimed: u64) -> u64 {
    vested_base_units.saturating_sub(already_gross_claimed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn referral_split_ten_sol_with_both_referrers() {
        // v2.0 p. 9: 10 SOL -> 1.00 / 0.20 / 8.80
        let (d, u, v) = referral_split(10 * LAMPORTS_PER_SOL, true, true).unwrap();
        assert_eq!(d, 1 * LAMPORTS_PER_SOL);
        assert_eq!(u, 200_000_000);
        assert_eq!(v, 8_800_000_000);
        assert_eq!(d + u + v, 10 * LAMPORTS_PER_SOL);
    }

    #[test]
    fn referral_split_one_sol_no_referrers_goes_to_pool() {
        // v2.0 p. 9, corrected v1 C.3: pool receives 1.00 SOL in total.
        let (d, u, v) = referral_split(1 * LAMPORTS_PER_SOL, false, false).unwrap();
        assert_eq!((d, u, v), (0, 0, 1 * LAMPORTS_PER_SOL));
    }

    #[test]
    fn referral_split_one_sol_only_direct() {
        let (d, u, v) = referral_split(1 * LAMPORTS_PER_SOL, true, false).unwrap();
        assert_eq!(d, 100_000_000);
        assert_eq!(u, 0);
        assert_eq!(v, 900_000_000);
    }

    #[test]
    fn allocation_one_sol_of_one_hundred_sol() {
        // v2.0 p. 7: 1 SOL of 100 SOL total = 1% = 4,000,000 tokens.
        let alloc = allocation_for(1 * LAMPORTS_PER_SOL, 100 * LAMPORTS_PER_SOL).unwrap();
        assert_eq!(alloc, 4_000_000 * BASE_UNITS_PER_TOKEN);
    }

    #[test]
    fn allocation_halves_when_total_doubles() {
        let a = allocation_for(1 * LAMPORTS_PER_SOL, 100 * LAMPORTS_PER_SOL).unwrap();
        let b = allocation_for(1 * LAMPORTS_PER_SOL, 200 * LAMPORTS_PER_SOL).unwrap();
        assert_eq!(b, a / 2);
        assert_eq!(b, 2_000_000 * BASE_UNITS_PER_TOKEN);
    }

    #[test]
    fn tier_boundary_exactly_two_sol_is_retail() {
        assert!(is_retail(2 * LAMPORTS_PER_SOL));
        assert!(!is_retail(2 * LAMPORTS_PER_SOL + 1));
        assert!(is_retail(0));
    }

    #[test]
    fn vesting_7200_tokens_unlocks_100_per_hour() {
        // v2.0 p. 8: 7,200 tokens -> 100/hr; 1,200 at 12h; 2,400 at 24h;
        // 4,800 at 48h; 7,200 at 72h.
        let alloc = 7_200 * BASE_UNITS_PER_TOKEN;
        assert_eq!(vested_amount(alloc, 12 * 3_600).unwrap(), 1_200 * BASE_UNITS_PER_TOKEN);
        assert_eq!(vested_amount(alloc, 24 * 3_600).unwrap(), 2_400 * BASE_UNITS_PER_TOKEN);
        assert_eq!(vested_amount(alloc, 48 * 3_600).unwrap(), 4_800 * BASE_UNITS_PER_TOKEN);
        assert_eq!(vested_amount(alloc, 72 * 3_600).unwrap(), 7_200 * BASE_UNITS_PER_TOKEN);
        assert_eq!(vested_amount(alloc, 999 * 3_600).unwrap(), 7_200 * BASE_UNITS_PER_TOKEN);
        assert_eq!(vested_amount(alloc, 0).unwrap(), 0);
    }

    #[test]
    fn vesting_corrected_v1_c6_error_hour_12_is_166667_not_500000() {
        // THE v1 error: Part C.6 claimed 500,000 of 1,000,000 tokens
        // vested at hour 12. Linear vesting says 12/72 = 1/6.
        let alloc = 1_000_000 * BASE_UNITS_PER_TOKEN;
        let at_12h = vested_amount(alloc, 12 * 3_600).unwrap();
        // 166,666.666666 tokens = 166,666,666,666 base units.
        assert_eq!(at_12h, 166_666_666_666);
        // 166,666 tokens + base-unit rounding: the exact fraction is
        // 166,666.666... tokens, so integer division floors to 166,666.
        assert_ne!(at_12h, 500_000 * BASE_UNITS_PER_TOKEN);
        // 500,000 is the 36-hour figure.
        assert_eq!(vested_amount(alloc, 36 * 3_600).unwrap(), 500_000 * BASE_UNITS_PER_TOKEN);
        // Corrected claim at hour 12 (v2.0 p. 8): the doc rounds to whole
        // tokens for display — gross 166,667, penalty 41,667, net 125,000,
        // burned 33,334, rewards 8,333. The exact integer arithmetic
        // floors at the base-unit level: gross is 166,666.666666 tokens
        // (166,666,666,666 base units), so the exact values below are
        // the floored base-unit equivalents of the doc's rounded figures.
        let gross = vested_amount(alloc, 12 * 3_600).unwrap();
        let (penalty, burned, rewards, net) = penalty_split(gross, 25).unwrap();
        // gross = 166,666,666,666 base units; 25% = 41,666,666,666 (floored)
        assert_eq!(penalty, 41_666_666_666);
        assert_eq!(burned, 33_333_333_332); // 80% of penalty, floored
        assert_eq!(rewards, 8_333_333_334); // penalty - burned
        assert_eq!(net, 125_000_000_000);
        assert_eq!(burned + rewards + net, gross);
    }

    #[test]
    fn penalty_1000_tokens_at_25_percent() {
        // v2.0 p. 8: 1,000 gross -> 750 net / 200 burn / 50 rewards.
        let (p, b, r, n) = penalty_split(1_000 * BASE_UNITS_PER_TOKEN, 25).unwrap();
        assert_eq!(p, 250 * BASE_UNITS_PER_TOKEN);
        assert_eq!(b, 200 * BASE_UNITS_PER_TOKEN);
        assert_eq!(r, 50 * BASE_UNITS_PER_TOKEN);
        assert_eq!(n, 750 * BASE_UNITS_PER_TOKEN);
    }

    #[test]
    fn penalty_1000_tokens_at_15_and_5_percent() {
        let (_, b, r, n) = penalty_split(1_000 * BASE_UNITS_PER_TOKEN, 15).unwrap();
        assert_eq!((b, r, n), (120 * BASE_UNITS_PER_TOKEN, 30 * BASE_UNITS_PER_TOKEN, 850 * BASE_UNITS_PER_TOKEN));
        let (_, b, r, n) = penalty_split(1_000 * BASE_UNITS_PER_TOKEN, 5).unwrap();
        assert_eq!((b, r, n), (40 * BASE_UNITS_PER_TOKEN, 10 * BASE_UNITS_PER_TOKEN, 950 * BASE_UNITS_PER_TOKEN));
        let (_, b, r, n) = penalty_split(1_000 * BASE_UNITS_PER_TOKEN, 0).unwrap();
        assert_eq!((b, r, n), (0, 0, 1_000 * BASE_UNITS_PER_TOKEN));
    }

    #[test]
    fn penalty_rate_boundaries_are_exact() {
        assert_eq!(penalty_rate_percent(0), 25);
        assert_eq!(penalty_rate_percent(24 * 3_600 - 1), 25);
        assert_eq!(penalty_rate_percent(24 * 3_600), 15); // exactly 24h -> 15%
        assert_eq!(penalty_rate_percent(48 * 3_600 - 1), 15);
        assert_eq!(penalty_rate_percent(48 * 3_600), 5); // exactly 48h -> 5%
        assert_eq!(penalty_rate_percent(72 * 3_600), 0);
        assert_eq!(penalty_rate_percent(1_000_000), 0);
    }

    #[test]
    fn claimable_never_below_zero_and_prevents_double_claim() {
        assert_eq!(claimable_now(1_200, 1_200), 0);
        assert_eq!(claimable_now(1_200, 2_000), 0); // saturating
        assert_eq!(claimable_now(2_400, 1_200), 1_200);
    }

    #[test]
    fn supply_buckets_sum_to_one_billion() {
        assert_eq!(
            PRESALE_BASE_UNITS + AIRDROP_BASE_UNITS
                + RECOMMENDED_LIQUIDITY_BASE_UNITS
                + RECOMMENDED_ECOSYSTEM_BASE_UNITS
                + RECOMMENDED_TEAM_BASE_UNITS
                + RECOMMENDED_TREASURY_BASE_UNITS
                + RECOMMENDED_MARKETING_BASE_UNITS,
            TOTAL_SUPPLY_BASE_UNITS
        );
        assert_eq!(HARD_CAP_LAMPORTS, 15_000 * LAMPORTS_PER_SOL);
    }

    #[test]
    fn referral_split_rejects_zero_and_conserves() {
        assert_eq!(referral_split(0, true, true), Err(MathError::ZeroAmount));
        // Conservation for an awkward amount (rounding remainder to vault).
        let amt = 999_999_999u64;
        let (d, u, v) = referral_split(amt, true, true).unwrap();
        assert_eq!(d + u + v, amt);
    }
}
