---
name: larp
description: Identify IMD frens on any website, game or bot: resolve name.imd names, read a wallet's IMD agents, avatars, items, rank, Worker Frens and ERC-8004 agent ids from Ethereum with the zero-dependency larp-protocol SDK (or cast). Use when a site or app must show who a wallet is in the IMD ecosystem, gate something to frens, or display a name.imd badge.
---

# LARP: identify IMD frens (the larp-protocol SDK)

Use this when you build anything that shows or checks **who a wallet is in the IMD ecosystem**: a profile, a leaderboard,
a game that gives frens a skin, a bot that greets agents by name. Read-only; never ask for a private key.

## In a web page or JS app

```js
import { whois, isFren } from "https://cdn.jsdelivr.net/npm/larp-protocol@0.2.0/larp.js"; // or: npm i larp-protocol
const f = await whois(input); // input: "0x…" wallet | "kek.imd" | 15 (an identity.md id) | "agent:51347" (ERC-8004)
// f = { address, name, imdId, agentId, avatar, agents, workerFrens, isFren, rank: { title, level }, crew, items }
```

- Show `f.name` (else a short address), `f.avatar` as an `<img>`, `f.rank?.title` as a tag.
- Gate with `await isFren(wallet)` (holds a Worker Fren or an IMD agent).
- A ready badge: `<larp-fren who="0x…"></larp-fren>` after importing the module.
- `null` from `whois(name)` means nobody holds that name.
- Use your own RPC in production: `configure({ rpc: "https://…" })`.
- ERC-8004: every IMD agent is an ERC-8004 agent. `agentIdOf(imdId)` → its agentId; `bindingOf("agent:51347")` → the
  NFT it's bound to (identity.md, or any NFT someone bound through IMD's adapter); `agentCard(imdId)` → its ERC-8004
  registration file with its name.imd and LARP avatar.

## Without the module (cast, any language)

```sh
NAMES=0x690084D1331F7a6509EeD32e7d34ffAcB377d807
cast call $NAMES "resolveName(string)(bool,address,uint256,bool)" "kek.imd"  # exists, owner, imdId, linked
cast call $NAMES "primaryOf(address)(uint256,string,bool)" 0xWALLET          # imdId, "kek.imd", live
cast call $NAMES "nameOf(uint256)(string)" 15                               # an agent's name.imd
cast call 0x69000A4A9FA561Dd6b313741bf1F79F4aDE4adAF "avatarOf(uint256)(string)" 15   # ENSIP-12 avatar
cast call 0x6900d042460d6bdbe68CE994F4dE36706797CCd4 "balanceOf(address)(uint256)" 0xWALLET  # Worker Frens
cast call 0xde152AfB7db5373F34876E1499fbD893A82dD336 "bindingOf(uint256)(uint8,address,uint256)" 51347  # ERC-8004 agent → NFT
```

## Rules

- A name is `label.imd`, label 1-32 of a-z, 0-9, `-` (not at either end). Lowercase it before resolving.
- Show a wallet's name only while `primaryOf(...).live` is true; an agent's name only while `identityOf(token).live`.
- Never call it a "Pepeverse". It is LARP, the Linked Avatar Registry Protocol, by the IMD6900 frens.
- If `live()` is false, LARP isn't deployed on that chain yet: show addresses.
