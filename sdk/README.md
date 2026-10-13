# larp-protocol: the LARP SDK

**LARP, the Linked Avatar Registry Protocol, by the IMD6900 frens. Who is this fren?** One file, no dependencies, for any website, game, bot or agent. It reads
[LARP](https://github.com/magic0xfrens/imd6900-larp) (the Linked Avatar Registry Protocol, by the IMD6900 frens) and IMD6900's Worker Frens straight
from Ethereum: a wallet's **name.imd**, its **IMD agents** (identity.md), their **avatars** and **items**, their
**rank** and **crew**, the **Worker Frens** it holds, and the **ERC-8004** agent ids IMD gives its agents. Read-only: it
never asks for a wallet.

## Use it

```html
<script type="module">
  import { whois } from "https://cdn.jsdelivr.net/npm/larp-protocol@0.2.0/larp.js";
  const fren = await whois("kek.imd");      // or a wallet "0x…", an agent's number whois(15), or an ERC-8004 agent "agent:51347"
  console.log(fren.name, fren.avatar, fren.isFren, fren.rank?.title);
</script>

<!-- or just a badge: avatar, name.imd, rank -->
<script type="module" src="https://cdn.jsdelivr.net/npm/larp-protocol@0.2.0/larp.js"></script>
<larp-fren who="0x…"></larp-fren>
```

```sh
npm i larp-protocol        # Node 18+, Bun, Deno, any bundler
```

```js
import { whois, isFren, resolve, nameOf, avatarOf } from "larp-protocol";
if (await isFren(player.wallet)) unlockFrenSkin();   // a game: frens get the fren skin
```

Pin a version (`@0.2.0`) and, on a page, add the file's SRI hash (`integrity="sha384-…"`, jsDelivr shows it) so the
code you load is the code you read.

## What you get

| call | returns |
|---|---|
| `whois(who)` | `{ address, name, imdId, agentId, avatar, agents, workerFrens, isFren, rank: { title, level }, crew, items }` |
| `isFren(wallet)` | `true` if it holds a Worker Fren or an IMD agent |
| `holdings(wallet)` | `{ workerFrens, agents }` counts |
| `resolve("kek.imd")` | `{ name, owner, imdId, linked }`, or `null` if nobody holds it |
| `nameOf(wallet \| imdId)` | a wallet's primary name.imd, or an agent's name, or `""` |
| `avatarOf(imdId)` | the agent's avatar image URL (its LARP face, or its own identity.md art) |
| `itemsOf(imdId)` | its 8 item slots: `{ slot, collection, tokenId, kind, image }` or `null` |
| `card(imdId)` | its LARP card: holder, name, face, crew, captain, frens, level, jeet points, title |
| `agentsOf(wallet)` | the identity.md ids it holds |
| `agentIdOf(imdId)` | the agent's ERC-8004 id (as IMD's agent card lists it, checked on-chain), or `null` |
| `bindingOf(agentId)` | an ERC-8004 agent → the NFT it's bound to: `{ agentId, agentRegistry, standard, collection, tokenId, imdId, holder }` |
| `agentCard(imdId)` | the agent's ERC-8004 registration file, dressed by LARP: its name.imd and avatar as `name` and `image` |
| `live()` | whether LARP is on this chain yet |
| `configure({ rpc, ipfs, addresses })` | your own RPC (defaults to a public one) or other addresses |

## The name.imd standard

- **A name** is 1-32 of `a-z`, `0-9` and `-` (not at either end), written `label.imd`. It is an ERC-721 in IMD Names,
  `tokenId = uint256(bytes32(label))` (the label left-aligned, zero-padded).
- **A name shows on one IMD agent** (identity.md) while its owner holds both: `resolve(label)` gives the owner and that
  agent; `nameOf(imdId)` the other way.
- **A wallet's name** is the one it picked (`setPrimary`): `primaryOf(wallet)`. Show it only while `live`.
- **An agent's avatar** is its LARP face (any ERC-721 its holder owns, ENSIP-12: `avatarOf`); items sit in 8 slots.
- **Prices and the IMD6900 share are the IMD swarm's**: anyone proposes, a panel of IMD agents judges, anyone executes.
  Every fee is burned: a swarm-voted share (6.9% to start) buys IMD6900 and burns it, the rest goes to IMD's burn.

## ERC-8004: IMD agents are ERC-8004 agents

Every identity.md is also an agent in [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)'s IdentityRegistry, through
IMD's adapter, which binds the agent to the NFT (ERC-8217): **the agent follows the NFT, and its holder controls it.**
identity.md #1122 is ERC-8004 agent 51347, written `eip155:1:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:51347`.

```js
await agentIdOf(1122);              // "51347"
await bindingOf("agent:51347");     // { standard: "ERC721", collection: identity.md, tokenId: "1122", imdId: 1122, holder }
await whois("agent:51347");         // the agent's name.imd, avatar, rank, crew, holder…
await agentCard(1122);              // its ERC-8004 card, with its name.imd and LARP avatar
```

- `bindingOf` trusts a binding only when IMD's adapter holds the agent in the registry; otherwise nothing vouches for it.
- An NFT can be given more than one agent, so `agentIdOf` takes the one IMD's card lists, and checks it on-chain.
- **Any NFT can get its own ERC-8004 agent the same way**, a Worker Fren or a name.imd included: its holder calls the
  adapter's `register(standard, collection, tokenId, agentURI)` (0 = ERC-721, 1 = ERC-1155, 2 = ERC-6909). The agent
  moves with the NFT when it's sold. `bindingOf` and `whois("agent:…")` read those too (`imdId` is then `null`).

```sh
cast send 0xde152AfB7db5373F34876E1499fbD893A82dD336 "register(uint8,address,uint256,string)" \
  0 0x6900d042460d6bdbe68CE994F4dE36706797CCd4 <frenId> "https://…/agent.json"   # your Worker Fren, as an ERC-8004 agent
```

## Where

| contract | address |
|---|---|
| LARP (avatars, items, agent keys) | `0x69000A4A9FA561Dd6b313741bf1F79F4aDE4adAF` |
| IMD Names (name.imd) | `0x690084D1331F7a6509EeD32e7d34ffAcB377d807` |
| LARP Links (frens, crews, rank) | `0x69005EdeC64B8586EC8d5E32f757a818b5d493C0` |
| LARP burner | `0x69006faEc2D2094e375cAFA5e3C87C5cB2847bef` |
| identity.md (IMD agents) | `0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D` |
| Worker Frens | `0x6900d042460d6bdbe68CE994F4dE36706797CCd4` |
| ERC-8004 IdentityRegistry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| IMD's ERC-8004 adapter (binder) | `0xde152AfB7db5373F34876E1499fbD893A82dD336` |

Live on Ethereum since 2026-10-12: the IMD swarm deployed all four in launch #1436. MIT.
