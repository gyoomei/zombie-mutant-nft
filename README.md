# 🧟 Zombie Mutant NFT

Turn your Farcaster profile picture into a zombie mutant NFT — powered by AI.

## How it works

1. **Auto-fetch pfp** — Opens your Farcaster profile picture automatically
2. **AI Transform** — Uses Fal.ai img2img to turn your pfp into zombie mutant art
3. **Preview** — See your original vs mutant side-by-side
4. **Mint NFT** — (Coming soon) Mint your mutant on Base via Thirdweb
5. **Share** — Post your mutant to Farcaster

## Tech Stack

- **Frontend**: Vite + Vanilla JS
- **Farcaster**: `@farcaster/miniapp-sdk` v0.3.0
- **AI**: Fal.ai (img2img model)
- **NFT**: Thirdweb (coming soon)
- **Chain**: Base

## Setup

```bash
# Install dependencies
npm install

# Set your Fal.ai API key in src/app.js
# FAL_API_KEY = 'your-key-here'

# Run dev server
npm run dev

# Build for production
npm run build
```

## Deploy

```bash
npm run build
# Deploy dist/ to Vercel / Cloudflare Pages
```

## TODO

- [ ] Set up Fal.ai API key
- [ ] Integrate Thirdweb for NFT minting
- [ ] Add IPFS upload for generated images
- [ ] Create hero/icon images
- [ ] Configure Vercel domain
- [ ] Update farcaster.json with real domain + account association
