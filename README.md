# Aegis

Aegis is a GenLayer policy and claim protocol for trigger review, claim evidence, payout decisions, appeals and reputation.

This repository is a public proof package: it includes the product UI, the deployed GenLayer Studionet contract source, deployment metadata, finalized smoke transactions, and test evidence. Local wallet secrets are not included.

## Live System

| Surface | Link |
| --- | --- |
| App | https://aegis-lovat-xi.vercel.app |
| GitHub | https://github.com/thorbh2/aegis |
| Contract | https://explorer-studio.genlayer.com/contracts/0xa072Ad70Fa91BBF9f89ac87707e960139FAB8973 |
| Deploy tx | https://explorer-studio.genlayer.com/tx/0x5d0dcb0416009ff50089296af560474486f9383886805eff9e81d678ddfb3db7 |
| Vercel inspect | https://vercel.com/aspros-projects-07dbbeb8/aegis/9YQX35URVn7uag9saanS1Peae8jK |

## Why Aegis Exists

A GenLayer parametric insurance protocol. Underwriters list funded policies, holders activate cover, claimants file evidence, and validator-agreed web/LLM review decides whether the trigger pays out, with challenge, appeal, archive, reputation and audit trails.

The frontend keeps the original product experience, while the contract adds a reviewable on-chain lifecycle: source records, GenLayer reasoning, challenge and appeal paths, indexed reads, and an audit trail that can be inspected after deployment.

## Contract Architecture

| Area | Detail |
| --- | --- |
| Contract | `contracts/aegis_v2.py` |
| Size | 44462 bytes |
| Network | GenLayer Studionet, chain id `61999` |
| Write methods | 22 |
| Read methods | 20 |
| GenLayer features | live web rendering, LLM execution, validator-comparative consensus |
| Deployment wallet | 0x41686dD78AC126811d8c11643F5041a95916984f |
| Contract address | 0xa072Ad70Fa91BBF9f89ac87707e960139FAB8973 |

Architecture note:

> Aegis V2 (# v0.2.16), 44462 bytes, 22 write + 20 view. Objects: Policy, Claim, Evidence, Review, Challenge, Appeal, Reputation/Profile + AuditEntry. Lifecycle OPEN->ACTIVE->REVIEWING->REVIEWED->CHALLENGE_WINDOW->APPEALED->PAID/EXPIRED->ARCHIVED. GenLayer nondet (web.render + exec_prompt inside eq_principle.prompt_comparative) for trigger review, challenge rulings, appeal rulings and legacy file_claim; strict JSON normalization, confidence/payout bps, URL validation and prompt-injection guardrails. Backward-compatible payable offer_policy(title, trigger, data_url, premium_wei), buy_policy(policy_id), file_claim(policy_id), get_policy/get_policy_count keep the static insurance app intact; richer draft_policy/add_claim/add_evidence/review views power dashboard-grade reporting.

Core smoke flow:

```text
set_standard
  -> draft_policy
  -> reserve_item
  -> add_claim
  -> add_evidence_web
  -> add_evidence_security
  -> open_review
  -> review
  -> open_challenge_window
  -> submit_challenge
  -> resolve_challenge
  -> submit_appeal
  -> resolve_appeal
```

## Verification Trail

| Step | Transaction |
| --- | --- |
| Set Standard | https://explorer-studio.genlayer.com/tx/0xa4cc191cd8106c2c8ffba99cb324bcf58c8419243d0dd4e921ba45982eb07921 |
| Draft Policy | https://explorer-studio.genlayer.com/tx/0x064de6a2a4fe3cc65ef9705fee601f397ca5cbb44bd9aab58a9aa8c26384cbc8 |
| Reserve Item | https://explorer-studio.genlayer.com/tx/0x6bbbdfd92a7dac4540a2ca8eed54440e595d6fb71b62d9318bf52aca63d58f99 |
| Add Claim | https://explorer-studio.genlayer.com/tx/0x198625c9f33ef4989f02d32064091917f5213f1460c190ba547ae58b751ffd01 |
| Add Evidence Web | https://explorer-studio.genlayer.com/tx/0x081f868483f3c15fe01e9d8a7968489bb5771b67288314018d5e33652b6f52a0 |
| Add Evidence Security | https://explorer-studio.genlayer.com/tx/0x7c4e19dbbc937118d96f89c79cae034de9db1348642612c7ae8c48f2bc85e523 |
| Open Review | https://explorer-studio.genlayer.com/tx/0xba7853979d978f55e101ba62500424465ce2d3ae768769c015a2cdadbb1955ae |
| Review | https://explorer-studio.genlayer.com/tx/0xf907d3fa606bf166136b79d236db5becc1d7316245e6454f0910fdf922707178 |
| Open Challenge Window | https://explorer-studio.genlayer.com/tx/0xe91a1214227b4bf29a3bc45cd161cd75b6627bfe5a91a86e3400b2e8731d379f |
| Submit Challenge | https://explorer-studio.genlayer.com/tx/0xed9f452264f4accda57c672af00098361ab2eb72411427daf4365018956f6ca5 |
| Resolve Challenge | https://explorer-studio.genlayer.com/tx/0xc75e715753487f4f9d4bdeb97dd5069bd6346a3b0fc02faa750b40e2dbec827e |
| Submit Appeal | https://explorer-studio.genlayer.com/tx/0x1dafdfcd07497d2123b94b87db35646a07901f5ac18b9fae7d212e37e327f507 |
| Resolve Appeal | https://explorer-studio.genlayer.com/tx/0xcbbeb04e728865dc28906424f12e042c868dba2d4902fd2c0e1d13a1b76ba442 |
| Settle | https://explorer-studio.genlayer.com/tx/0x567ccd3428f8034b0e506cce478e7c6ee7b67103c082668631495a0dfa8139af |

Test result:

```text
Schema valid
19 smoke writes finalized
38/38
Static frontend bundled for standalone Vercel deployment
```

## Frontend

Aegis ships as a standalone static app:

- wallet connection through the bundled browser client
- GenLayer reads through `genlayer-js`
- writes routed through the connected EVM wallet
- local `shared/` client files included so Vercel does not depend on the private workspace router
- deployed contract address pinned in `app.js` and `deployment.json`

## Run Locally

From the private workspace:

```powershell
cd <private-workspace-root>
npm run preview:start
npm run preview:project -- 03-aegis
```

Open:

```text
http://localhost:8080/03-aegis/
```

## Publish / Redeploy

```powershell
cd <private-workspace-root>
npm run publish:project -- -Project 03-aegis -Repo https://github.com/thorbh2/aegis.git
```

Vercel production redeploy from a clean project folder:

```powershell
npx --yes vercel@latest --prod --yes
```

## Repository Safety

This public repository intentionally excludes local secrets:

- no private keys
- no vault files
- no `.env` files
- no `.vercel` project state
- no local dashboard data

Public files include frontend code, contract source, deployment metadata, tests, and non-sensitive proof links.
