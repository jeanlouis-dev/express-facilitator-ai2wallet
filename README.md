# x402 Express Facilitator Example

Express.js facilitator service on top of `ai2wallet-sdk` that verifies and settles payments on-chain for the x402 protocol.

## Prerequisites

- Node.js v20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- STELLAR private key for transaction

## Setup

1. Copy `.env-local` to `.env`:

```bash
cp .env-local .env
```

and fill required environment variables:

- `STELLAR_PRIVATE_KEY` - Stellar private key
- `PORT` - Server port (optional, defaults to 4022)

2. Install and build all packages from the typescript examples root:

```bash
cd express-facilitator-ai2wallet
npm install
```

3. Run the server:

```bash
npm run dev
```
## Create Facilitator Client

```typescript
import {  createX402Facilitator } from "ai2wallet-sdk/facilitator";
/**
 * POST /verify
 * POST /settle
 */
  let facilitator: x402Facilitator = createX402Facilitator(
    [paymentRequirements.network],
    facilitatorSigners
  );
```

## Register supported networks

```typescript
import {  createX402Facilitator } from "ai2wallet-sdk/facilitator";
/**
 * GET /supported
 * Get supported payment kinds and extensions
 */
app.get("/supported", async (req, res) => {
  let facilitator: x402Facilitator = createX402Facilitator([
    "stellar:testnet"
    ], facilitatorSigners);
});
```

## Network Identifiers

Networks use [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md) format:

- `stellar:testnet` — Stellar Testnet
- `stellar:pubnet` — Stellar Mainnet
