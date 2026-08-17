# Royalty Splits — Implementation Spec

Status: **Draft — gating unknowns RESOLVED (docs updated Mar 2026)**
Owner: —
Depends on: RougeChain SDK ≥ 1.3.1, updated chain with settable `royaltyRecipient`

## 1. Goal

Let a creator mint a track/collection whose royalties are **split across multiple
collaborators** (e.g. artist 70%, producer 20%, featured 10%) instead of paying a single
recipient. Highest-differentiation item from the platform audit.

### User story
> As an artist minting a track with a producer and a featured vocalist, I want to set
> percentage splits at mint time so every royalty payment is divided among us and is
> transparent, with no manual accounting.

## 2. Protocol facts (CONFIRMED from docs.rougechain.io, updated Mar 2026)

- **`royaltyRecipient` is settable at collection creation** — optional param, **defaults to
  the creator**, and is **fixed at creation** (immutable after). Create-collection params:
  `symbol, name, maxSupply, royaltyBps, royaltyRecipient, image, description`.
- **Secondary royalties auto-pay**: on an `nft_transfer` with `salePrice > 0`, the chain
  pays `salePrice × royaltyBps / 10000` **in XRGE** to `royaltyRecipient`, deducted from the
  **sender** on top of the 1 XRGE transfer fee.
- **`salePrice` is self-declared** — there is **no on-chain marketplace escrow**. Royalties
  only fire if the app populates `salePrice` on the transfer. Plain transfers pay nothing.
- **⛔ `royaltyRecipient` must be a normal wallet — NEVER a contract address.** Docs:
  *"any royalty sent to a contract address is permanently lost."*
- **No native multi-recipient splits.** Docs: splitting *"must occur off-chain by the
  receiving app after royalties land in the single designated wallet."*
- WASM contracts exist (Rust→wasm32, wasmi) with storage + events, but **cannot be royalty
  recipients** (see above). They are still usable for **storage-only** (transparency)
  because a storage contract never receives royalties.

### Design consequence
The trustless "splitter contract as `royaltyRecipient`" design is **UNSAFE and abandoned** —
it would permanently burn royalties. The approach below is **app-orchestrated distribution**,
which is exactly what the docs recommend.

## 3. ~~Phase 0 verification spike~~ — RESOLVED by docs + code audit

The four original unknowns are answered above. **Action item A is now RESOLVED by a code
audit — and it surfaced a blocking prerequisite:**

> **qRougee has NO priced NFT transfer anywhere.** A grep of `src/` for
> `salePrice` / `nft.transfer` / `nftTransfer` finds **zero** hits. NFTs are only **minted**
> (`rc.nft.mint`) and **burned** — never transferred peer-to-peer with a price. The only
> `transfer` calls are plain XRGE payments (the Tip flow at `TrackDetail.tsx:193`, and the
> Wallet send). Since the chain pays royalties **only** on an `nft_transfer` with
> `salePrice > 0`, **no royalties are paid today at all** — `royaltyBps` on collections is
> currently inert/decorative.

### Prerequisite (PRE-0): a priced NFT sale / resale flow
Before splits — or even single-recipient royalties — matter, qRougee needs a flow that calls
`nft.transfer` (or `ext.nftTransfer`) with `salePrice > 0`. Options:
- A **"Buy" / secondary-market listing** on TrackDetail (owner lists price → buyer pays →
  ownership transfers with `salePrice`).
- Or route the existing "purchase/unlock" intent through a priced NFT transfer instead of a
  bare tip.
Once this exists, single-recipient royalties work immediately, and splits (§4+) layer on top.

## 4. Architecture (app-orchestrated split)

```
   at mint:  creator sets royaltyRecipient = fresh PAYOUT WALLET (P)
             + records split table [(addr,bps)] on-chain (storage contract, funds-free)

   on sale:  buyer/seller transfer sets salePrice > 0
             → chain auto-pays salePrice×bps/10000 XRGE to P   (accrues)

   settle:   "Distribute" action reads P's XRGE balance,
             signs N transfers fanning out pro-rata to each collaborator,
             emits/records the payout for transparency
```

Why a **dedicated payout wallet P per split-set** (not the creator's main wallet): P's entire
XRGE balance is attributable royalty income, so distribution math is trivial and auditable.
Trade-off: **someone must hold P's key to sign distributions.** Options, pick per product
call (see §8):
- **(a) Creator-held P** — creator's app generates P, creator signs "Distribute". Simple;
  fans/collaborators trust the creator to run distribution. Splits table on-chain keeps them
  honest/visible.
- **(b) Platform-held P** — app/back end holds P and auto-distributes on a schedule or per
  sale. Best UX, but custody risk lives with the platform.
- **(c) Multi-sig P** — docs expose `/advanced/multi-sig`; P is co-signed by collaborators.
  Most trustless, most work.

Recommended v1: **(a)** — no custody service to build, on-chain split table for transparency,
creator triggers payout. Revisit (c) later.

## 5. On-chain split-table contract (transparency only — holds NO funds)

A minimal WASM storage contract (safe: never a royalty recipient, so no fund-loss risk):
- `init(collectionId, payoutWallet, recipients: [(addr,bps)])` — Σbps == 10000, immutable.
- `view()` — read via `getContractState` for the UI to render the split + verify integrity.
Alternatively (lighter, no Rust): encode the split table as JSON in the **collection
`description`** or a token attribute. Less rigorous but zero contract work — acceptable for
v1. Decide in §8.

## 6. App integration

### 6.1 SDK typings (`src/rougechain-sdk.d.ts`)
- Add **`royaltyRecipient?: string`** to `createCollection` opts (currently missing — this is
  what previously blocked the feature; the chain now supports it).
- If using a storage contract, add `shielded.deployContract/callContract/getContractState`.
- Mirror in `extensionSigner.ts` for Qwalla creators.

### 6.2 Mint flow — split editor (`src/pages/Upload.tsx`)
- Optional "Royalty splits" section: rows `{recipient (address or @name), percent}`, live sum
  to 100%, add/remove, validate, resolve `@names` via `mail.resolveName`.
- On submit **with splits**:
  1. Generate payout wallet **P** (`Wallet.generate()`); persist P's keys to the creator's
     keystore (they own it).
  2. `createCollection({ ..., royaltyRecipient: P.publicKey })`.
  3. Record split table (storage contract or description JSON).
- **Without splits**: unchanged (recipient defaults to creator).

### 6.3 Ensure sales set `salePrice` (Action item A)
- Wherever qRougee sells/transfers a track NFT, populate `salePrice` so royalties actually
  fire. Without this, the whole feature is inert.

### 6.4 Distribute + transparency (`src/pages/RoyaltyDashboard.tsx`)
- For split collections: show recipients + bps, P's undistributed XRGE balance, payout
  history.
- **"Distribute"** button → read P balance → sign pro-rata `transfer()` to each recipient
  (floor division, track dust remainder to recipient[0]). Requires P's key (creator holds).
- Show split breakdown as a **trust badge** on TrackDetail / ArtistProfile.

## 7. Edge cases
- **Dust/rounding**: integer floor split; remainder to recipient[0] or carry to next round.
- **salePrice not set by counterparties**: royalties only fire on qRougee-mediated sales;
  external transfers won't pay. Document this honestly in the UI.
- **P key loss** = royalties stranded in P. Back up P in the keystore + surface a warning.
- **Recipient set is immutable** (royaltyRecipient fixed at creation) — so is the split if it
  lives in the storage contract's `init`. Splits can't be edited post-mint; state this.
- Self-declared salePrice can be under-declared to dodge royalties — inherent to the chain
  model, not fixable app-side.

## 8. Product decisions to lock before building
1. Payout-wallet custody: **(a) creator-held** [recommended] / (b) platform / (c) multi-sig.
2. Split-table storage: **storage contract** (rigorous) vs **description JSON** (zero contract
   work) — recommend JSON for v1, contract later.
3. Distribution trigger: manual "Distribute" button [recommended v1] vs auto-per-sale.

## 9. Milestones
1. **Action item A** — audit/confirm qRougee sets `salePrice` on sales; verify royalty
   payout on testnet (½ day). *If sales don't set salePrice, fix that first — it's a
   prerequisite and a standalone bug.*
2. SDK typings: add `royaltyRecipient` (+ contract methods if used) (½ day).
3. Mint split editor + payout-wallet generation + split-table record (1–1.5 d).
4. RoyaltyDashboard distribute UI + transparency badge (1 d).
5. E2E on testnet → mainnet smoke (½ day).

Estimate: **~3–4 days** for creator-held v1 with description-JSON split table. Storage
contract and/or multi-sig custody are follow-ups.
