import { PublicKey } from '@solana/web3.js'

import { USDC_DECIMALS, USDC_MINT } from './config'

/** Everything a checkout needs lives in its URL: there's no server to look an order up on */
export type PaymentRequest = {
  recipient: string
  amount: string
  label: string
  message: string
  /** A throwaway address added to the payment so we can find it on the chain, like an order ID */
  reference: string
  expiresAt: number
}

const AMOUNT = new RegExp(`^\\d+(\\.\\d{1,${USDC_DECIMALS}})?$`)

function isAddress(value: string | null): value is string {
  if (!value) return false
  try {
    new PublicKey(value)
    return true
  } catch {
    return false
  }
}

export function isAmount(value: string | null): value is string {
  return !!value && AMOUNT.test(value) && toAtomic(value) > 0n
}

/** 1.50 USDC is 1500000 of its smallest unit. Money stays in whole numbers so nothing is lost to rounding */
export function toAtomic(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole + fraction.padEnd(USDC_DECIMALS, '0'))
}

export function fromAtomic(atomic: bigint): string {
  const text = atomic.toString().padStart(USDC_DECIMALS + 1, '0')
  const whole = text.slice(0, -USDC_DECIMALS)
  const fraction = text.slice(-USDC_DECIMALS).replace(/0+$/, '').padEnd(2, '0')
  return `${whole}.${fraction}`
}

export function toCheckoutUrl(request: PaymentRequest, page = window.location.origin + window.location.pathname) {
  const params = new URLSearchParams({
    to: request.recipient,
    amount: request.amount,
    label: request.label,
    message: request.message,
    ref: request.reference,
    exp: String(request.expiresAt),
  })
  return `${page}?${params}`
}

export function readCheckoutUrl(search: string): PaymentRequest | null {
  const params = new URLSearchParams(search)
  const recipient = params.get('to')
  const amount = params.get('amount')
  const reference = params.get('ref')
  const expiresAt = Number(params.get('exp'))
  if (!isAddress(recipient) || !isAddress(reference) || !isAmount(amount) || !expiresAt) return null
  return {
    recipient,
    amount,
    reference,
    expiresAt,
    label: params.get('label') || 'Shop',
    message: params.get('message') || '',
  }
}

/** The link a wallet reads from the QR code, in the Solana Pay format */
export function toSolanaPayUrl(request: PaymentRequest) {
  const params = [
    ['amount', request.amount],
    ['spl-token', USDC_MINT.toBase58()],
    ['reference', request.reference],
    ['label', request.label],
    ...(request.message ? [['message', request.message]] : []),
  ]
  const query = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
  return `solana:${request.recipient}?${query}`
}

/** Opens this page inside Phantom's own browser, where the wallet can connect */
export function toPhantomUrl(url: string) {
  return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}`
}
