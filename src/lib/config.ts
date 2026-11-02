import { PublicKey } from '@solana/web3.js'

export const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://api.devnet.solana.com'
export const USDC_MINT = new PublicKey(import.meta.env.VITE_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
export const USDC_DECIMALS = 6
export const LINK_MINUTES = 15

export const explorerUrl = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`
