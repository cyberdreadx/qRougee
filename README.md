# qRougee

A decentralized music platform built on [RougeChain](https://rougechain.io) — mint tracks as NFTs, create song tokens, trade on the DEX, and stream with token-gated access.

## Features

- **Mint Tracks** — Upload audio + cover art to IPFS (Pinata), mint a 1-of-1 Master Rights NFT, and create a fungible song token in a single wizard flow
- **Song Tokens** — Each track gets its own on-chain token with configurable supply, royalty splits, and play-gate thresholds
- **DEX Trading** — Buy and sell song tokens against XRGE on RougeChain's AMM DEX with live price charts and pool creation
- **Token-Gated Playback** — Free plays for discovery, unlimited streaming for token holders
- **Wallet** — Create, import (keystore or 24-word seed phrase), or connect via the RougeChain Wallet browser extension
- **Explorer** — Browse live on-chain transactions, NFT collections, and token listings
- **PWA** — Installable progressive web app with offline caching

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Routing | react-router-dom v7 |
| Blockchain | `@rougechain/sdk` (v2 signed endpoints, ML-DSA-65) |
| Crypto | `@noble/hashes`, `@scure/bip39` (BIP-39 mnemonics) |
| Storage | IPFS via Pinata |
| Animations | anime.js |

## Getting Started

```bash
# Clone
git clone https://github.com/cyberdreadx/qRougee.git
cd qRougee

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your Pinata JWT or API key/secret

# Start dev server
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_PINATA_JWT` | Pinata JWT for IPFS uploads |
| `VITE_PINATA_API_KEY` | Pinata API key (alternative to JWT) |
| `VITE_PINATA_API_SECRET` | Pinata API secret (alternative to JWT) |
| `VITE_PINATA_GATEWAY` | Pinata gateway URL (default: `https://gateway.pinata.cloud/ipfs`) |

## Architecture

All blockchain interactions go through `@rougechain/sdk`, which handles client-side ML-DSA-65 signing and communicates with the RougeChain testnet via v2 authenticated API endpoints. Private keys never leave the browser.

```
User → React UI → @rougechain/sdk → RougeChain Testnet (v2 signed API)
                → Pinata API → IPFS (audio, cover art, metadata)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Security

- All transactions are signed client-side with **ML-DSA-65** (CRYSTALS-Dilithium / FIPS 204)
- Wallet keys are stored in `sessionStorage` (auto-cleared on tab close)
- No private keys are transmitted to any server
- All write API calls use v2 signed request envelopes with timestamp and nonce validation

## License

MIT
