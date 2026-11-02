import { WalletReadyState } from '@solana/wallet-adapter-base'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

import { explorerUrl } from '../lib/config'
import { fromAtomic, toAtomic, toPhantomUrl, toSolanaPayUrl, type PaymentRequest } from '../lib/link'
import { buildPayment, NotEnoughUsdc } from '../lib/pay'
import { usePayment, type Payment } from '../lib/usePayment'
import Light from './Light'
import StatusTrail from './StatusTrail'
import WalletButton from './WalletButton'

function useCountdown(until: number) {
  const [left, setLeft] = useState(() => until - Date.now())
  useEffect(() => {
    const timer = setInterval(() => setLeft(until - Date.now()), 1000)
    return () => clearInterval(timer)
  }, [until])
  const seconds = Math.max(0, Math.ceil(left / 1000))
  return { expired: left <= 0, text: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }
}

/** What to tell the buyer, in plain words, for each state of the payment */
function describe({ step, outcome, received, late }: Payment, amount: string) {
  const got = received === undefined ? '' : fromAtomic(received)
  const owed = fromAtomic(toAtomic(amount))
  if (outcome === 'failed') return { title: 'Payment failed', body: 'The network rejected it, so no money moved. You can try again.' }
  if (outcome === 'underpaid') return { title: 'Paid too little', body: `We received ${got} of ${owed} USDC. The shop needs to ask for the rest.` }
  if (outcome === 'overpaid') return { title: 'Paid too much', body: `We received ${got} USDC for a ${owed} USDC order. The shop can refund the difference.` }
  if (outcome === 'wrong-token') return { title: 'Wrong token', body: 'A payment came in, but no USDC reached the shop. The shop will need to sort this out.' }
  if (late && step !== 'waiting') return { title: 'Paid after the link expired', body: 'The money arrived, but the shop will need to check the order is still open.' }
  if (step === 'seen') return { title: 'Payment on its way', body: 'The network has your payment and is checking it.' }
  if (step === 'confirmed') return { title: 'Payment received', body: 'Most of the network agrees. Waiting for it to become final.' }
  if (step === 'final') return { title: 'Paid', body: 'This is final and can’t be reversed. A refund would be a new payment back to you.' }
  return { title: 'Ready to pay', body: 'Use a Solana wallet set to devnet. This page updates by itself.' }
}

export default function Checkout({ request }: { request: PaymentRequest }) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction, wallets } = useWallet()
  const { payment, markSeen } = usePayment(request)
  const { expired, text } = useCountdown(request.expiresAt)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const { step, signature, outcome, unreachable } = payment
  const waiting = step === 'waiting'
  const closed = waiting && expired
  const stopped = !!outcome && outcome !== 'paid'

  // a phone can't scan its own screen. Phantom's built-in browser has the wallet right there, any other needs to open it
  const phone = window.matchMedia('(pointer: coarse)').matches
  const hasWallet = wallets.some(({ readyState }) => readyState === WalletReadyState.Installed)
  const { title, body } = closed
    ? { title: 'This link expired', body: 'Nothing was charged. Ask the shop for a new link.' }
    : describe(payment, request.amount)

  async function pay() {
    if (!publicKey) return
    setError('')
    setSending(true)
    try {
      const transaction = await buildPayment(connection, publicKey, request)
      markSeen(await sendTransaction(transaction, connection))
    } catch (cause) {
      if (cause instanceof NotEnoughUsdc) setError(`Not enough USDC. This wallet has ${cause.balance}. You can get test USDC at faucet.circle.com.`)
      else if (/reject/i.test(String(cause))) setError('You cancelled in your wallet, so nothing was sent.')
      else setError('That didn’t go through, and nothing was sent. Check the wallet has a little devnet SOL for the fee.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="page">
      <Light step={outcome && outcome !== 'paid' ? 'waiting' : step} />
      <header className="bar">
        <span className="cap">{request.label}</span>
        <span className="tag">Devnet · test money</span>
      </header>

      <div className="checkout">
        <section className="order">
          <p className="cap">Total</p>
          <p className="amount">
            {request.amount}
            <span>USDC</span>
          </p>
          {request.message && <p className="order-for">{request.message}</p>}

          <div className="status" aria-live="polite">
            <h1 className="statement">{title}</h1>
            <p className="note">{body}</p>
            {signature && (
              <a className="text-button" href={explorerUrl(signature)} target="_blank" rel="noreferrer">
                See it on the blockchain
              </a>
            )}
          </div>
        </section>

        {waiting && !closed && (
          <section className="pay">
            {!phone && (
              <div className="qr">
                <QRCodeSVG value={toSolanaPayUrl(request)} size={232} bgColor="transparent" fgColor="#151514" />
              </div>
            )}
            <p className="cap">Expires in {text}</p>
            {phone && !hasWallet ? (
              <a className="button" href={toPhantomUrl(window.location.href)}>Open in Phantom</a>
            ) : (
              <div className="actions">
                {publicKey && (
                  <button type="button" className="button" disabled={sending} onClick={pay}>
                    {sending ? 'Check your wallet…' : `Pay ${request.amount} USDC`}
                  </button>
                )}
                <WalletButton label="Pay with a connected wallet" />
              </div>
            )}
            {error && <p className="problem" role="alert">{error}</p>}
          </section>
        )}
      </div>

      {unreachable && <p className="problem" role="status">Can’t reach Solana right now. Still trying.</p>}
      <StatusTrail step={step} stopped={stopped} />
    </main>
  )
}
