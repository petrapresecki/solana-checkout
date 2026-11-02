import type { Step } from '../lib/usePayment'

/** The page's light. It sits quietly while waiting and gathers as the payment becomes final */
export default function Light({ step = 'waiting' }: { step?: Step }) {
  return (
    <div className="light" data-step={step} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </div>
  )
}
