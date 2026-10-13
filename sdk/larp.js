// larp-protocol: the SDK of LARP, the Linked Avatar Registry Protocol, by the IMD6900 frens. Who is this fren? One file,
// no dependencies, for any website, game, bot or agent. Reads LARP and IMD6900's Worker Frens straight from
// Ethereum: a wallet's name.imd, its IMD agents (identity.md), their avatars and items, their rank and crew, and the
// Worker Frens it holds, and the ERC-8004 agent ids IMD gives its agents. Read-only: it never asks for a wallet.
//
//   import { whois } from "https://cdn.jsdelivr.net/npm/larp-protocol@0.2.0/larp.js";   // or: npm i larp-protocol
//   const fren = await whois("0x…" | "kek.imd" | 15 | "agent:51347");
//   fren.name, fren.avatar, fren.agentId, fren.agents, fren.workerFrens, fren.rank, fren.isFren
//
// Or drop <larp-fren who="kek.imd"></larp-fren> in a page after `import "…/larp.js"`.
// MIT. Source and docs: https://github.com/magic0xfrens/imd6900-larp/tree/main/sdk

/** Where everything is on Ethereum. LARP's four sit at the IMD swarm's planned 0x6900 addresses (src/place/LARPPlan.sol). */
export const ADDRESSES = {
  larp: "0x69000A4A9FA561Dd6b313741bf1F79F4aDE4adAF", // the avatar registry: faces, items, agents
  names: "0x690084D1331F7a6509EeD32e7d34ffAcB377d807", // IMD Names: name.imd, an ERC-721
  links: "0x69005EdeC64B8586EC8d5E32f757a818b5d493C0", // frens, crews, the jeet rank
  burner: "0x69006faEc2D2094e375cAFA5e3C87C5cB2847bef", // where every LARP fee is burned
  identity: "0x0000eC93127BAA929E58E97dd0095A2BFb38ec1D", // identity.md: the 2,000 IMD agents
  workerFrens: "0x6900d042460d6bdbe68CE994F4dE36706797CCd4", // Worker Frens, IMD6900's NFTs
  multicall: "0xcA11bde05977b3631167028862bE2a173976CA11", // Multicall3
  agentRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", // ERC-8004's IdentityRegistry: agents, as ERC-721s
  agentBinder: "0xde152AfB7db5373F34876E1499fbD893A82dD336", // IMD's ERC-8004 adapter: binds an agent to an NFT
};
const cfg = { rpc: "https://ethereum-rpc.publicnode.com", ipfs: "https://ipfs.io/ipfs/", agentArt: "https://api.imd.fun/agents/by-token/" };

/** Point it elsewhere: configure({ rpc: "https://your-node", addresses: { … } }) */
export function configure({ rpc, ipfs, addresses } = {}) {
  if (rpc) cfg.rpc = rpc;
  if (ipfs) cfg.ipfs = ipfs;
  if (addresses) Object.assign(ADDRESSES, addresses);
}

/* ── the wire: JSON-RPC, ABI words ─────────────────────────────── */

let id = 0;
async function rpc(method, params) {
  const r = await fetch(cfg.rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) }).then((x) => x.json());
  if (r.error) throw new Error(r.error.message);
  return r.result;
}
const word = (v) => BigInt.asUintN(256, BigInt(v)).toString(16).padStart(64, "0");
const addr = (a) => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
const hx = (h) => (h || "0x").slice(2);
const W = (h, i) => BigInt("0x" + (hx(h).slice(i * 64, i * 64 + 64) || "0"));
const A = (h, i) => "0x" + hx(h).slice(i * 64 + 24, i * 64 + 64);
const utf8 = (hex) => new TextDecoder().decode(new Uint8Array((hex.match(/../g) || []).map((x) => parseInt(x, 16))));
const strAt = (h, off) => { const b = hx(h), n = Number(BigInt("0x" + (b.slice(off * 2, off * 2 + 64) || "0"))); return utf8(b.slice(off * 2 + 64, off * 2 + 64 + n * 2)); };
const str = (h) => (h && hx(h).length >= 128 ? strAt(h, Number(W(h, 0))) : "");
const isAddress = (a) => /^0x[0-9a-fA-F]{40}$/.test(String(a));
const label32 = (l) => [...new TextEncoder().encode(l)].map((b) => b.toString(16).padStart(2, "0")).join("").padEnd(64, "0");

const S = { // selectors
  primaryOf: "0x64143788", resolve: "0x5c23bdf5", nameOf: "0x051a2664", cardOf: "0xc22b8d82", faceOf: "0x962144d2", itemOf: "0xcc5723f2",
  ownerOf: "0x6352211e", balanceOf: "0x70a08231", tokenURI: "0xc87b56dd", uri: "0x0e89341c", aggregate3: "0x82ad56cb",
  bindingOf: "0x4d69ebc2",
};

/** Many calls in one (Multicall3 aggregate3, each allowed to fail): return data or null each */
async function many(calls) {
  const out = [];
  for (let i = 0; i < calls.length; i += 400) {
    const part = calls.slice(i, i + 400);
    const tuples = part.map(([to, d]) => { const b = d.slice(2); return addr(to) + word(1) + word(96) + word(b.length / 2) + b.padEnd(Math.ceil(b.length / 64) * 64, "0"); });
    let at = part.length * 32, heads = "";
    for (const t of tuples) { heads += word(at); at += t.length / 2; }
    const h = hx(await rpc("eth_call", [{ to: ADDRESSES.multicall, data: S.aggregate3 + word(32) + word(part.length) + heads + tuples.join("") }, "latest"]));
    const w = (j) => Number(BigInt("0x" + h.slice(j * 64, j * 64 + 64)));
    const arr = w(0) / 32, n = w(arr), base = arr + 1;
    for (let k = 0; k < n; k++) {
      const t = base + w(base + k) / 32, b = t + w(t + 1) / 32, len = w(b);
      out.push(w(t) === 1 ? "0x" + h.slice((b + 1) * 64, (b + 1) * 64 + len * 2) : null);
    }
  }
  return out;
}
const call = (to, data) => rpc("eth_call", [{ to, data }, "latest"]);

/* ── LARP ──────────────────────────────────────────────────────── */

/** Whether LARP is on this chain yet (its registry has code) */
export const live = async () => { const c = await rpc("eth_getCode", [ADDRESSES.larp, "latest"]).catch(() => "0x"); return !!c && c !== "0x"; };

/** "kek.imd" (or "kek") → { name, owner, imdId, linked }, or null when nobody holds it */
export async function resolve(name) {
  const l = String(name).trim().toLowerCase().replace(/\.imd$/, "");
  if (!/^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(l)) return null;
  const r = await call(ADDRESSES.names, S.resolve + label32(l)).catch(() => null);
  if (!r || W(r, 0) !== 1n) return null;
  return { name: `${l}.imd`, owner: A(r, 1), imdId: W(r, 3) === 1n ? Number(W(r, 2)) : null, linked: W(r, 3) === 1n };
}

/** A wallet's primary name.imd (its own pick), or an agent's (an identity.md id), or "" */
export async function nameOf(who) {
  if (isAddress(who)) {
    const p = await call(ADDRESSES.names, S.primaryOf + addr(who)).catch(() => null);
    return p && W(p, 2) === 1n ? strAt(p, Number(W(p, 1))) : "";
  }
  return str(await call(ADDRESSES.names, S.nameOf + word(who)).catch(() => "0x"));
}

const TIERS = ["Lurker", "Diamond Hands", "Holder", "Paper Hands", "Jeet", "Jeet Lord"];
/** An agent's card: { holder, name, face: { collection, tokenId }|null, crew, captain, frens, level, jeetPoints, title } */
export async function card(imdId) {
  return decodeCard(await call(ADDRESSES.links, S.cardOf + word(imdId)));
}
function decodeCard(h) {
  if (!h || hx(h).length < 64) return null;
  const t = Number(W(h, 0)), w = (i) => W("0x" + hx(h).slice(t * 2), i), a = (i) => A("0x" + hx(h).slice(t * 2), i);
  const crew = hx(h).slice(t * 2 + 6 * 64, t * 2 + 7 * 64).replace(/(00)+$/, "");
  return {
    holder: a(0), name: strAt(h, t + Number(w(1))), face: w(4) === 1n ? { collection: a(2), tokenId: w(3).toString() } : null,
    crew: crew ? utf8(crew) : "", captain: w(7) === 1n, frens: Number(w(8)), level: Number(w(9)), jeetPoints: w(10).toString(),
    title: strAt(h, t + Number(w(12))) || TIERS[Number(w(11))] || "",
  };
}

/** An agent's avatar image: its LARP face's art, or the agent's own identity.md art */
export async function avatarOf(imdId) {
  const f = await call(ADDRESSES.larp, S.faceOf + word(imdId)).catch(() => null);
  if (f && W(f, 3) === 1n) { const u = await artOf(A(f, 1), W(f, 2)); if (u) return u; }
  return cfg.agentArt + imdId + ".svg";
}

/** An agent's eight item slots: { slot, collection, tokenId, kind: "ERC721"|"ERC1155", image } or null each */
export async function itemsOf(imdId) {
  const r = await many(Array.from({ length: 8 }, (_, s) => [ADDRESSES.larp, S.itemOf + word(imdId) + word(s + 1)]));
  return Promise.all(r.map(async (h, s) => {
    if (!h || W(h, 4) !== 1n) return null;
    const kind = Number(W(h, 3)) === 1 ? "ERC1155" : "ERC721";
    return { slot: s + 1, collection: A(h, 1), tokenId: W(h, 2).toString(), kind, image: await artOf(A(h, 1), W(h, 2), kind) };
  }));
}

/* ── ERC-8004: IMD agents are ERC-8004 agents ──────────────────── */
// IMD registers every identity.md in ERC-8004's IdentityRegistry through its adapter, which binds the agent to the NFT
// (ERC-8217): the agent follows the NFT, its holder controls it. Any ERC-721, 1155 or 6909 holder can bind one the
// same way, a Worker Fren or a name.imd included.

const STANDARDS = ["ERC721", "ERC1155", "ERC6909"];
const registryId = () => `eip155:1:${ADDRESSES.agentRegistry.toLowerCase()}`;
/** 51347, "51347", "agent:51347" or "eip155:1:0x8004a169…:51347" → 51347n; null if it isn't one, or another registry's */
function agentIdFrom(ref) {
  const s = String(ref).trim().toLowerCase(), m = s.match(/^eip155:(\d+):(0x[0-9a-f]{40}):(\d+)$/);
  if (m) return `eip155:${m[1]}:${m[2]}` === registryId() ? BigInt(m[3]) : null;
  const n = s.replace(/^agent:/, "");
  return /^\d+$/.test(n) ? BigInt(n) : null;
}

/**
 * An ERC-8004 agent → the NFT it is bound to: { agentId, agentRegistry, standard, collection, tokenId, imdId, holder }.
 * imdId: the identity.md id when the NFT is an IMD agent, else null. holder: the NFT's holder (ERC-721), who controls
 * the agent. null when IMD's adapter doesn't hold the agent (then nothing vouches for a binding).
 */
export async function bindingOf(agent) {
  const id = agentIdFrom(agent);
  if (id == null) return null;
  const [o, b] = await many([[ADDRESSES.agentRegistry, S.ownerOf + word(id)], [ADDRESSES.agentBinder, S.bindingOf + word(id)]]);
  if (!o || !b || A(o, 0).toLowerCase() !== ADDRESSES.agentBinder.toLowerCase()) return null;
  const collection = A(b, 1), tokenId = W(b, 2), standard = STANDARDS[Number(W(b, 0))] || String(W(b, 0));
  let holder = "";
  if (standard === "ERC721") { const h = await call(collection, S.ownerOf + word(tokenId)).catch(() => null); holder = h ? A(h, 0) : ""; }
  return {
    agentId: id.toString(), agentRegistry: registryId(), standard, collection, tokenId: tokenId.toString(),
    imdId: collection.toLowerCase() === ADDRESSES.identity.toLowerCase() ? Number(tokenId) : null, holder,
  };
}

/** An identity.md id → its ERC-8004 agentId (as IMD's agent card lists it, checked on-chain), or null */
export async function agentIdOf(imdId) {
  const c = await fetch(`${cfg.agentArt}${Number(imdId)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  for (const r of Array.isArray(c?.registrations) ? c.registrations : []) {
    if (String(r?.agentRegistry).toLowerCase() !== registryId()) continue;
    const b = await bindingOf(r.agentId).catch(() => null); // the card says so: the chain has to agree
    if (b?.imdId === Number(imdId)) return b.agentId;
  }
  return null;
}

/**
 * An IMD agent's ERC-8004 registration file (IMD's card), dressed by LARP: its name.imd as `name` and its LARP avatar
 * as `image` when it has them, and a `larp` entry with both. What an ERC-8004 explorer would show if it read LARP.
 */
export async function agentCard(imdId) {
  const [c, name, f] = await Promise.all([
    fetch(`${cfg.agentArt}${Number(imdId)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    nameOf(Number(imdId)).catch(() => ""),
    call(ADDRESSES.larp, S.faceOf + word(imdId)).catch(() => null),
  ]);
  if (!c) return null;
  const face = f && W(f, 3) === 1n ? await artOf(A(f, 1), W(f, 2)) : "";
  return { ...c, name: name || c.name, image: face || c.image, larp: { name: name || null, avatar: face || null, imdId: Number(imdId) } };
}

/* ── NFT art: tokenURI / uri → metadata → image, any host ──────── */
const gate = (u) => String(u || "").replace(/^ipfs:\/\/(ipfs\/)?/, cfg.ipfs).replace(/^ar:\/\//, "https://arweave.net/");
async function artOf(collection, tokenId, kind = "ERC721") {
  try {
    let uri = str(await call(collection, (kind === "ERC1155" ? S.uri : S.tokenURI) + word(tokenId)));
    if (kind === "ERC1155") uri = uri.replace(/\{id\}/g, word(tokenId));
    if (!uri) return "";
    let meta;
    if (uri.startsWith("data:application/json")) {
      const body = uri.slice(uri.indexOf(",") + 1);
      meta = JSON.parse(/;base64,/.test(uri.slice(0, uri.indexOf(",") + 1)) ? new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0))) : decodeURIComponent(body));
    } else meta = await fetch(gate(uri)).then((r) => r.json());
    return gate(meta?.image || meta?.image_url || (meta?.image_data ? `data:image/svg+xml;utf8,${encodeURIComponent(meta.image_data)}` : ""));
  } catch {
    return "";
  }
}

/* ── frens and agents a wallet holds ───────────────────────────── */

/** How many Worker Frens and IMD agents (identity.md) a wallet holds */
export async function holdings(wallet) {
  const [f, i] = await many([[ADDRESSES.workerFrens, S.balanceOf + addr(wallet)], [ADDRESSES.identity, S.balanceOf + addr(wallet)]]);
  return { workerFrens: f ? Number(W(f, 0)) : 0, agents: i ? Number(W(i, 0)) : 0 };
}

/** The identity.md ids (IMD agents) a wallet holds: ownerOf over all 2,000 (identity.md can't list them) */
export async function agentsOf(wallet) {
  const r = await many(Array.from({ length: 2000 }, (_, k) => [ADDRESSES.identity, S.ownerOf + word(k)]));
  const me = wallet.toLowerCase();
  return r.map((h, k) => (h && A(h, 0).toLowerCase() === me ? k : -1)).filter((k) => k >= 0);
}

/** Whether a wallet is a fren: it holds a Worker Fren or an IMD agent */
export async function isFren(wallet) {
  const h = await holdings(wallet);
  return h.workerFrens > 0 || h.agents > 0;
}

/* ── whois: everything at once ─────────────────────────────────── */

/**
 * Who is this? `who` is a wallet (0x…), a name ("kek.imd"), an IMD agent's number (identity.md id), or an ERC-8004
 * agent ("agent:51347" or "eip155:1:0x8004a169…:51347").
 * → { address, name, imdId, agentId, avatar, agents, workerFrens, isFren, rank: { title, level }, crew, items }
 *   name: the name.imd (a wallet's primary, or the agent's); imdId: the agent it speaks for (a wallet: its primary's);
 *   agentId: that agent's ERC-8004 id; avatar: an image URL; agents: how many IMD agents the wallet holds; items: the
 *   agent's eight slots.
 */
export async function whois(who) {
  let address = "", imdId = null, name = "", agentId = null;
  if (/^(agent:\d+|eip155:\d+:0x[0-9a-f]{40}:\d+)$/i.test(String(who).trim())) {
    const b = await bindingOf(who);
    if (!b) return null;
    agentId = b.agentId; address = b.holder; imdId = b.imdId;
    if (imdId == null) return { ...EMPTY, address, agentId, binding: b, ...(address ? await holdings(address).then(fren) : {}) };
  } else if (typeof who === "number" || /^\d+$/.test(String(who))) {
    imdId = Number(who);
    const o = await call(ADDRESSES.identity, S.ownerOf + word(imdId)).catch(() => null);
    address = o ? A(o, 0) : "";
  } else if (isAddress(who)) {
    address = who;
    const p = await call(ADDRESSES.names, S.primaryOf + addr(who)).catch(() => null);
    if (p && W(p, 2) === 1n) { imdId = Number(W(p, 0)); name = strAt(p, Number(W(p, 1))); }
  } else {
    const r = await resolve(who);
    if (!r) return null;
    address = r.owner; name = r.name; imdId = r.imdId;
  }
  const [c, h, avatar, items, aid] = await Promise.all([
    imdId != null ? card(imdId).catch(() => null) : null,
    address ? holdings(address) : { workerFrens: 0, agents: 0 },
    imdId != null ? avatarOf(imdId) : "",
    imdId != null ? itemsOf(imdId).catch(() => []) : [],
    agentId == null && imdId != null ? agentIdOf(imdId).catch(() => null) : agentId,
  ]);
  return {
    address, imdId, agentId: aid, name: name || c?.name || "", avatar, ...fren(h),
    rank: c ? { title: c.title, level: c.level } : null, crew: c?.crew || "", items: items || [],
  };
}
const fren = (h) => ({ agents: h.agents, workerFrens: h.workerFrens, isFren: h.workerFrens > 0 || h.agents > 0 });
const EMPTY = { address: "", imdId: null, agentId: null, name: "", avatar: "", agents: 0, workerFrens: 0, isFren: false, rank: null, crew: "", items: [] };

/* ── <larp-fren who="kek.imd"></larp-fren>: a badge for any page ─ */

if (typeof customElements !== "undefined" && !customElements.get("larp-fren")) {
  customElements.define("larp-fren", class extends HTMLElement {
    static observedAttributes = ["who"];
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    async render() {
      const root = this.shadowRoot || this.attachShadow({ mode: "open" });
      const who = this.getAttribute("who") || "";
      root.innerHTML = `<style>:host{display:inline-flex;align-items:center;gap:8px;font:600 13px ui-monospace,Menlo,monospace;color:inherit}img{width:28px;height:28px;border-radius:6px;object-fit:cover;image-rendering:pixelated;background:#0b3b23}small{opacity:.65;font-weight:400}</style><span>…</span>`;
      const f = await whois(who).catch(() => null);
      if (!f) { root.querySelector("span").textContent = who; return; }
      const label = f.name || (f.address ? `${f.address.slice(0, 6)}…${f.address.slice(-4)}` : who);
      const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
      root.innerHTML = root.innerHTML.replace("<span>…</span>", `${f.avatar ? `<img src="${esc(f.avatar)}" alt="">` : ""}<span>${esc(label)}${f.rank?.title ? ` <small>${esc(f.rank.title)}</small>` : ""}</span>`);
      this.dataset.fren = f.isFren ? "yes" : "no";
    }
  });
}
