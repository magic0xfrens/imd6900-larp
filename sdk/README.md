# imd-frens

**Who is this fren?** One file, no dependencies, for any website, game, bot or agent. It reads
[LARP](../README.md) (the Linked Avatar Registry Protocol, by the IMD6900 frens) and IMD6900's Worker Frens straight
from Ethereum: a wallet's **name.imd**, its **IMD agents** (identity.md), their **avatars** and **items**, their
**rank** and **crew**, and the **Worker Frens** it holds. Read-only: it never asks for a wallet.

## Use it

```html
<script type="module">
  import { whois } from "https://cdn.jsdelivr.net/npm/imd-frens@0.1.0/imd-frens.js";
  const fren = await whois("kek.imd");      // or a wallet "0x…", or an agent's number: whois(15)
  console.log(fren.name, fren.avatar, fren.isFren, fren.rank?.title);
</script>

<!-- or just a badge: avatar, name.imd, rank -->
<script type="module" src="https://cdn.jsdelivr.net/npm/imd-frens@0.1.0/imd-frens.js"></script>
<imd-fren who="0x…"></imd-fren>
```

```sh
npm i imd-frens        # Node 18+, Bun, Deno, any bundler
```

```js
import { whois, isFren, resolve, nameOf, avatarOf } from "imd-frens";
if (await isFren(player.wallet)) unlockFrenSkin();   // a game: frens get the fren skin
```

Pin a version (`@0.1.0`) and, on a page, add the file's SRI hash (`integrity="sha384-…"`, jsDelivr shows it) so the
code you load is the code you read.

## What you get

| call | returns |
|---|---|
| `whois(who)` | `{ address, name, imdId, avatar, agents, workerFrens, isFren, rank: { title, level }, crew, items }` |
| `isFren(wallet)` | `true` if it holds a Worker Fren or an IMD agent |
| `holdings(wallet)` | `{ workerFrens, agents }` counts |
| `resolve("kek.imd")` | `{ name, owner, imdId, linked }`, or `null` if nobody holds it |
| `nameOf(wallet \| imdId)` | a wallet's primary name.imd, or an agent's name, or `""` |
| `avatarOf(imdId)` | the agent's avatar image URL (its LARP face, or its own identity.md art) |
| `itemsOf(imdId)` | its 8 item slots: `{ slot, collection, tokenId, kind, image }` or `null` |
| `card(imdId)` | its LARP card: holder, name, face, crew, captain, frens, level, jeet points, title |
| `agentsOf(wallet)` | the identity.md ids it holds |
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

## Where

| contract | address |
|---|---|
| LARP (avatars, items, agent keys) | `0x69000A4A9FA561Dd6b313741bf1F79F4aDE4adAF` |
| IMD Names (name.imd) | `0x690084D1331F7a6509EeD32e7d34ffAcB377d807` |
| LARP Links (frens, crews, rank) | `0x69005EdeC64B8586EC8d5E32f757a818b5d493C0` |
| LARP burner | `0x69006faEc2D2094e375cAFA5e3C87C5cB2847bef` |
| identity.md (IMD agents) | `0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D` |
| Worker Frens | `0x6900d042460d6bdbe68CE994F4dE36706797CCd4` |

LARP's four land at these addresses when the IMD swarm's launch deploys them (`live()` says when). MIT.
