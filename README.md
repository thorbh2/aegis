# Aegis V2

A GenLayer parametric insurance protocol.

This is a parametric coverage workflow: policies, triggers and public evidence are converted into a GenLayer-readable decision path.

## Aegis Brief

Aegis V2 (# v0.2.16), 44462 bytes, 22 write + 20 view.

The important files are:

- `contracts/aegis_v2.py` - GenLayer contract source
- `deployment.json` - Studionet address, deploy transaction and smoke transaction hashes
- `index.html` and `app.js` - static frontend
- `README.md` - this operator and reviewer guide

## Contract Receipt

- Network: studionet (61999)
- Contract: [0xa072Ad70Fa91BBF9f89ac87707e960139FAB8973](https://explorer-studio.genlayer.com/contracts/0xa072Ad70Fa91BBF9f89ac87707e960139FAB8973)
- Deploy tx: [0x5d0dcb04...fb3db7](https://explorer-studio.genlayer.com/tx/0x5d0dcb0416009ff50089296af560474486f9383886805eff9e81d678ddfb3db7)
- Deployed at: 2026-06-23T22:12:46.145Z
- Smoke writes recorded: 19

## Coverage Mechanics

Typical flow: `open_policy` -> `submit_challenge` -> `open_review` -> `resolve_challenge_with_genlayer` -> `open_challenge_window` -> `submit_appeal` -> `add_claim` -> `archive_policy`

Useful reads: `get_policy_count`, `get_rubric`, `get_reserve`, `get_policy`, `get_item_count`, `get_item`, `get_policy_record`, `get_recent_policies`

- Primary source: `contracts/aegis_v2.py` (44,462 bytes)
- Public write/action methods: 26
- Read methods: 22
- GenLayer features: live web rendering, LLM adjudication, validator-comparative consensus, indexed storage, append-only collections

## Smoke Trail

- set_standard: [0xa4cc191c...b07921](https://explorer-studio.genlayer.com/tx/0xa4cc191cd8106c2c8ffba99cb324bcf58c8419243d0dd4e921ba45982eb07921)
- draft_policy: [0x064de6a2...84cbc8](https://explorer-studio.genlayer.com/tx/0x064de6a2a4fe3cc65ef9705fee601f397ca5cbb44bd9aab58a9aa8c26384cbc8)
- reserve_item: [0x6bbbdfd9...d58f99](https://explorer-studio.genlayer.com/tx/0x6bbbdfd92a7dac4540a2ca8eed54440e595d6fb71b62d9318bf52aca63d58f99)
- add_claim: [0x198625c9...1ffd01](https://explorer-studio.genlayer.com/tx/0x198625c9f33ef4989f02d32064091917f5213f1460c190ba547ae58b751ffd01)
- add_evidence_web: [0x081f8684...6f52a0](https://explorer-studio.genlayer.com/tx/0x081f868483f3c15fe01e9d8a7968489bb5771b67288314018d5e33652b6f52a0)
- add_evidence_security: [0x7c4e19db...85e523](https://explorer-studio.genlayer.com/tx/0x7c4e19dbbc937118d96f89c79cae034de9db1348642612c7ae8c48f2bc85e523)
- open_review: [0xba785397...1955ae](https://explorer-studio.genlayer.com/tx/0xba7853979d978f55e101ba62500424465ce2d3ae768769c015a2cdadbb1955ae)
- review: [0xf907d3fa...707178](https://explorer-studio.genlayer.com/tx/0xf907d3fa606bf166136b79d236db5becc1d7316245e6454f0910fdf922707178)

## Local Review Path

```powershell
cd C:\Users\aspronim\Desktop\design-skills
npm run preview:start
npm run preview:project -- 03-aegis
```

Open http://localhost:8080/03-aegis/.

## GitHub And Vercel

```powershell
cd C:\Users\aspronim\Desktop\design-skills
npm run publish:project -- -Project 03-aegis -Repo https://github.com/aspro45/<repo-name>.git
```

## Secret Handling

- This repository should contain no decrypted wallet material.
- The Studionet deployer private key stays in the local encrypted vault.
- Vercel deployment should use the project folder only.

- QA notes: Upgraded from a compact parametric-insurance MVP into Aegis V2. Smoke: set_aegis_standard / draft_policy / reserve_item / add_claim / two add_evidence calls / open_review / review_policy_with_genlayer / open_challenge_window / submit_challenge / resolve_cha...
