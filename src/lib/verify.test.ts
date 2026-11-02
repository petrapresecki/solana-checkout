import { describe, expect, it } from 'vitest'

import { fromAtomic, isAmount, readCheckoutUrl, toAtomic, toCheckoutUrl, toSolanaPayUrl, type PaymentRequest } from './link'
import { amountReceived, checkPayment } from './verify'

const SHOP = 'FoXn4iWbfbmSYDxLDGsTbAUvaBzEZZhbGgWvGQ1oXeRr'
const USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
const balance = (owner: string, mint: string, amount: string) => ({ owner, mint, uiTokenAmount: { amount } })

const request: PaymentRequest = {
  recipient: SHOP,
  amount: '12.50',
  label: 'Corner Café',
  message: 'Two coffees & a cake',
  reference: '11111111111111111111111111111112',
  expiresAt: 1_900_000_000_000,
}

describe('money', () => {
  it('keeps amounts exact', () => {
    expect(toAtomic('12.5')).toBe(12_500_000n)
    expect(toAtomic('0.000001')).toBe(1n)
    expect(fromAtomic(12_500_000n)).toBe('12.50')
    expect(fromAtomic(1n)).toBe('0.000001')
  })

  it('refuses amounts a token can not hold', () => {
    expect(isAmount('0')).toBe(false)
    expect(isAmount('1.0000001')).toBe(false)
    expect(isAmount('-1')).toBe(false)
    expect(isAmount('1.5')).toBe(true)
  })
})

describe('links', () => {
  it('survive a round trip through the URL', () => {
    const url = new URL(toCheckoutUrl(request, 'https://pay.test'))
    expect(readCheckoutUrl(url.search)).toEqual(request)
  })

  it('reject a tampered address', () => {
    expect(readCheckoutUrl('?to=nope&amount=1&ref=nope&exp=1')).toBeNull()
  })

  it('follow the Solana Pay format', () => {
    const url = toSolanaPayUrl(request)
    expect(url.startsWith(`solana:${SHOP}?amount=12.50&spl-token=`)).toBe(true)
    expect(url).toContain('message=Two%20coffees%20%26%20a%20cake')
  })
})

describe('checking a payment', () => {
  it('counts only what the shop gained in this token', () => {
    const changes = {
      preTokenBalances: [balance(SHOP, USDC, '1000000'), balance('buyer', USDC, '20000000')],
      postTokenBalances: [balance(SHOP, USDC, '13500000'), balance('buyer', USDC, '7500000')],
    }
    expect(amountReceived(changes, SHOP, USDC)).toBe(12_500_000n)
  })

  it('handles a shop receiving this token for the first time', () => {
    const changes = { preTokenBalances: [], postTokenBalances: [balance(SHOP, USDC, '12500000')] }
    expect(amountReceived(changes, SHOP, USDC)).toBe(12_500_000n)
  })

  it('names what went wrong', () => {
    expect(checkPayment(5n, 5n)).toBe('paid')
    expect(checkPayment(4n, 5n)).toBe('underpaid')
    expect(checkPayment(6n, 5n)).toBe('overpaid')
    expect(checkPayment(0n, 5n)).toBe('wrong-token')
  })
})
