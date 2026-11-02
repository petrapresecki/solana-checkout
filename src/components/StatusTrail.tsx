import type { Step } from '../lib/usePayment'

const STEPS: { id: Step; label: string }[] = [
  { id: 'waiting', label: 'Waiting' },
  { id: 'seen', label: 'Seen' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'final', label: 'Final' },
]

/** A dotted line the payment travels along, as light, from one state to the next */
export default function StatusTrail({ step, stopped }: { step: Step; stopped?: boolean }) {
  const at = STEPS.findIndex(item => item.id === step)
  return (
    <ol className="trail" style={{ '--at': at } as React.CSSProperties} data-stopped={stopped || undefined}>
      <span className="trail-orb" aria-hidden />
      {STEPS.map((item, index) => (
        <li key={item.id} data-reached={index <= at || undefined} aria-current={index === at ? 'step' : undefined}>
          {item.label}
        </li>
      ))}
    </ol>
  )
}
