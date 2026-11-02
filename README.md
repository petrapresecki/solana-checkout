# Solana Checkout

A payment link for USDC on Solana, built only in the browser. It runs on devnet, so the money is fake.

## Run it

```bash
pnpm install
pnpm dev
```

Optional: copy `.env.example` to `.env` and add a free [Helius](https://helius.dev) RPC URL.

## Get test money

1. In Phantom, go to Settings → Developer Settings and turn on Testnet Mode, then pick Solana Devnet.
2. Get test SOL (for fees) at [faucet.solana.com](https://faucet.solana.com).
3. Get test USDC at [faucet.circle.com](https://faucet.circle.com). Choose Solana Devnet.

## How it works

- `src/lib/link.ts` builds and reads payment links. Everything lives in the URL.
- `src/lib/pay.ts` builds the USDC transfer for a connected wallet.
- `src/lib/usePayment.ts` watches the chain for the payment's reference.
- `src/lib/verify.ts` checks what really arrived, using the shop's balance before and after.

With no server, someone could edit the amount in a link. A real shop would keep its orders on a server and compare.
