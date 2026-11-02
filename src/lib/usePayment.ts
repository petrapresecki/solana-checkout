import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useCallback, useEffect, useState } from 'react'

import { USDC_MINT } from './config'
import { toAtomic, type PaymentRequest } from './link'
import { amountReceived, checkPayment, type Outcome } from './verify'

/** Seen: the network has it. Confirmed: most validators agreed. Final: it can no longer be undone */
export type Step = 'waiting' | 'seen' | 'confirmed' | 'final'

export type Payment = {
  step: Step
  signature?: string
  outcome?: Outcome | 'failed'
  received?: bigint
  late?: boolean
  /** Solana can't be reached right now. We keep trying */
  unreachable?: boolean
}

const POLL_MS = 1500
const FAILURES_BEFORE_WARNING = 3

/** Watches the chain from the browser for the payment that carries this request's reference */
export function usePayment(request: PaymentRequest) {
  const { connection } = useConnection()
  const [payment, setPayment] = useState<Payment>({ step: 'waiting' })

  const markSeen = useCallback((signature: string) => {
    setPayment(now => (now.step === 'waiting' ? { ...now, step: 'seen', signature } : now))
  }, [])

  useEffect(() => {
    const reference = new PublicKey(request.reference)
    const expected = toAtomic(request.amount)
    let stopped = false
    let failures = 0
    let timer: ReturnType<typeof setTimeout>

    // the fastest signal there is, but a socket can drop, so the check below is what we rely on
    const subscription = connection.onLogs(
      reference,
      ({ err, signature }) => {
        if (!err) markSeen(signature)
      },
      'processed',
    )

    async function check(): Promise<Payment | null> {
      const found = await connection.getSignaturesForAddress(reference, { limit: 10 }, 'confirmed')
      if (!found.length) return null

      const success = found.find(entry => !entry.err)
      if (!success) return { step: 'confirmed', signature: found[0].signature, outcome: 'failed' }

      const transaction = await connection.getParsedTransaction(success.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })
      if (!transaction?.meta) return null

      const received = amountReceived(transaction.meta, request.recipient, USDC_MINT.toBase58())
      const { value } = await connection.getSignatureStatuses([success.signature])
      return {
        step: value[0]?.confirmationStatus === 'finalized' ? 'final' : 'confirmed',
        signature: success.signature,
        outcome: checkPayment(received, expected),
        received,
        late: !!success.blockTime && success.blockTime * 1000 > request.expiresAt,
      }
    }

    async function poll() {
      let done = false
      try {
        const result = await check()
        failures = 0
        if (stopped) return
        setPayment(now => (result ? result : { ...now, unreachable: false }))
        done = result?.step === 'final' || result?.outcome === 'failed'
      } catch {
        failures += 1
        if (!stopped && failures >= FAILURES_BEFORE_WARNING) setPayment(now => ({ ...now, unreachable: true }))
      }
      if (!stopped && !done) timer = setTimeout(poll, POLL_MS)
    }
    poll()

    return () => {
      stopped = true
      clearTimeout(timer)
      connection.removeOnLogsListener(subscription)
    }
  }, [connection, request, markSeen])

  return { payment, markSeen }
}
