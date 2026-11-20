"""Nexus maths — independent Python mirror of crates/nexus-math.

Run:  python3 -m unittest discover -s contracts/tests -p 'test_math.py' -v
  or: python3 contracts/tests/test_math.py

This mirrors the Rust functions exactly (integer arithmetic only,
no floats for money). If this suite and `cargo test -p nexus-math`
ever disagree, that is a bug — stop and investigate, do not ship.

Source of truth: Nexus v2.0, pp. 7-9.
"""
import unittest

LAMPORTS_PER_SOL = 1_000_000_000
RETAIL_MAX = 2 * LAMPORTS_PER_SOL
HARD_CAP = 15_000 * LAMPORTS_PER_SOL
BASE_PER_TOKEN = 1_000_000
PRESALE = 400_000_000 * BASE_PER_TOKEN
AIRDROP = 100_000_000 * BASE_PER_TOKEN
TOTAL_SUPPLY = 1_000_000_000 * BASE_PER_TOKEN
VESTING_SECONDS = 259_200


def referral_split(amount, direct_valid, upline_valid):
    assert amount > 0
    direct = amount * 10 // 100 if direct_valid else 0
    upline = amount * 2 // 100 if upline_valid else 0
    vault = amount - direct - upline
    return direct, upline, vault


def allocation_for(gross, total):
    assert total > 0
    return gross * PRESALE // total


def vested_amount(allocation, elapsed_seconds):
    elapsed = max(0, min(elapsed_seconds, VESTING_SECONDS))
    if elapsed >= VESTING_SECONDS:
        return allocation
    return allocation * elapsed // VESTING_SECONDS


def penalty_rate_percent(elapsed_seconds):
    if elapsed_seconds < 24 * 3600:
        return 25
    if elapsed_seconds < 48 * 3600:
        return 15
    if elapsed_seconds < 72 * 3600:
        return 5
    return 0


def penalty_split(gross, rate_percent):
    penalty = gross * rate_percent // 100
    burned = penalty * 80 // 100
    rewards = penalty - burned
    net = gross - penalty
    return penalty, burned, rewards, net


def is_retail(cumulative_gross):
    return cumulative_gross <= RETAIL_MAX


class TestNexusMath(unittest.TestCase):
    def test_referral_10_sol(self):
        self.assertEqual(
            referral_split(10 * LAMPORTS_PER_SOL, True, True),
            (1 * LAMPORTS_PER_SOL, 200_000_000, 8_800_000_000),
        )

    def test_referral_1_sol_no_referrers(self):
        # Corrected v1 C.3: pool receives 1.00 SOL in total.
        self.assertEqual(
            referral_split(1 * LAMPORTS_PER_SOL, False, False),
            (0, 0, 1 * LAMPORTS_PER_SOL),
        )

    def test_allocation_1_of_100_sol(self):
        self.assertEqual(
            allocation_for(1 * LAMPORTS_PER_SOL, 100 * LAMPORTS_PER_SOL),
            4_000_000 * BASE_PER_TOKEN,
        )

    def test_tier_boundary(self):
        self.assertTrue(is_retail(2 * LAMPORTS_PER_SOL))
        self.assertFalse(is_retail(2 * LAMPORTS_PER_SOL + 1))

    def test_vesting_7200(self):
        alloc = 7_200 * BASE_PER_TOKEN
        self.assertEqual(vested_amount(alloc, 12 * 3600), 1_200 * BASE_PER_TOKEN)
        self.assertEqual(vested_amount(alloc, 24 * 3600), 2_400 * BASE_PER_TOKEN)
        self.assertEqual(vested_amount(alloc, 48 * 3600), 4_800 * BASE_PER_TOKEN)
        self.assertEqual(vested_amount(alloc, 72 * 3600), 7_200 * BASE_PER_TOKEN)

    def test_v1_c6_error_corrected(self):
        # v1 claimed 500,000 of 1,000,000 vested at hour 12. Wrong.
        alloc = 1_000_000 * BASE_PER_TOKEN
        at_12h = vested_amount(alloc, 12 * 3600)
        self.assertEqual(at_12h, 166_666 * BASE_PER_TOKEN + 666_666)  # 166,666.666666 tokens
        self.assertNotEqual(at_12h, 500_000 * BASE_PER_TOKEN)
        self.assertEqual(vested_amount(alloc, 36 * 3600), 500_000 * BASE_PER_TOKEN)
        penalty, burned, rewards, net = penalty_split(at_12h, 25)
        self.assertEqual(penalty, 41_666_666_666)
        self.assertEqual(burned, 33_333_333_332)
        self.assertEqual(rewards, 8_333_333_334)
        self.assertEqual(net, 125_000_000_000)
        self.assertEqual(burned + rewards + net, at_12h)

    def test_penalty_1000_tokens(self):
        penalty, burned, rewards, net = penalty_split(1_000 * BASE_PER_TOKEN, 25)
        self.assertEqual((penalty, burned, rewards, net),
                         (250 * BASE_PER_TOKEN, 200 * BASE_PER_TOKEN,
                          50 * BASE_PER_TOKEN, 750 * BASE_PER_TOKEN))
        _, burned, rewards, net = penalty_split(1_000 * BASE_PER_TOKEN, 15)
        self.assertEqual((burned, rewards, net),
                         (120 * BASE_PER_TOKEN, 30 * BASE_PER_TOKEN, 850 * BASE_PER_TOKEN))

    def test_penalty_rate_boundaries(self):
        self.assertEqual(penalty_rate_percent(24 * 3600 - 1), 25)
        self.assertEqual(penalty_rate_percent(24 * 3600), 15)
        self.assertEqual(penalty_rate_percent(48 * 3600), 5)
        self.assertEqual(penalty_rate_percent(72 * 3600), 0)

    def test_supply_sums_to_1b(self):
        recommended = (150_000_000 + 100_000_000 + 100_000_000
                       + 100_000_000 + 50_000_000) * BASE_PER_TOKEN
        self.assertEqual(PRESALE + AIRDROP + recommended, TOTAL_SUPPLY)

    def test_cap_valuation_example(self):
        # v2.0 illustrative baseline only: 15,000 SOL * 65.12 USD,
        # NOT a live price. Implied: $976,800 raise, $0.002442/token.
        self.assertAlmostEqual(15_000 * 65.12, 976_800.0)
        self.assertAlmostEqual(976_800 / 400_000_000, 0.002442)


if __name__ == "__main__":
    unittest.main(verbosity=2)
