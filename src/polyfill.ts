import { Buffer } from 'buffer'

// Solana's libraries expect Node's Buffer, which browsers don't have
globalThis.Buffer = Buffer
