# Nexus contracts

See [`../README.md`](../README.md) — it is the full readme for this
contract build: what the program does, what actually ran in the build
VM (Rust maths 14/14, Python mirror 10/10, `cargo check` passes,
`anchor test` **not run** — no Anchor/Solana CLI here), how to build
and test, the Gate 1–5 deployment runbook, and what is still blocked.

Quick start (no Solana needed):

```bash
cargo test -p nexus-math
python3 -m unittest discover -s tests -p 'test_math.py' -v
cargo check -p nexus
```

Full on-chain suite (needs Anchor CLI + Solana CLI + local validator):

```bash
anchor test
```

**Devnet only. Not mainnet-ready. No private keys anywhere.**
