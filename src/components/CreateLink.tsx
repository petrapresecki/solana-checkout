import { useWallet } from '@solana/wallet-adapter-react'
import { Keypair, PublicKey } from '@solana/web3.js'
import { useState, type FormEvent } from 'react'

import { LINK_MINUTES } from '../lib/config'
import { isAmount, toCheckoutUrl } from '../lib/link'
import Light from './Light'
import WalletButton from './WalletButton'

function validAddress(value: string) {
  try {
    new PublicKey(value)
    return true
  } catch {
    return false
  }
}

export default function CreateLink({ brokenLink }: { brokenLink: boolean }) {
  const { publicKey } = useWallet()
  const [typedRecipient, setRecipient] = useState('')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(brokenLink ? 'That payment link is broken. Create a new one here.' : '')

  const recipient = typedRecipient || publicKey?.toBase58() || ''

  function create(event: FormEvent) {
    event.preventDefault()
    if (!validAddress(recipient)) return setError('That doesn’t look like a Solana wallet address.')
    if (!isAmount(amount)) return setError('Enter an amount above zero, with up to 6 decimals.')
    const reference = Keypair.generate().publicKey.toBase58()
    const expiresAt = Date.now() + LINK_MINUTES * 60_000
    window.location.assign(toCheckoutUrl({ recipient, amount, label: label || 'Shop', message, reference, expiresAt }))
  }

  return (
    <main className="page">
      <Light />
      <header className="bar">
        <span className="cap">Solana Checkout</span>
        <span className="tag">Devnet · test money</span>
      </header>

      <form className="create" onSubmit={create}>
        <h1 className="statement">Create a payment link</h1>

        <label className="field">
          <span className="cap">Amount in USDC</span>
          <input className="field-amount" inputMode="decimal" placeholder="12.50" value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
        <label className="field">
          <span className="cap">Shop name</span>
          <input placeholder="Corner Café" value={label} onChange={e => setLabel(e.target.value)} />
        </label>
        <label className="field">
          <span className="cap">What it’s for</span>
          <input placeholder="Two coffees" value={message} onChange={e => setMessage(e.target.value)} />
        </label>
        <label className="field">
          <span className="cap">Paid to this wallet</span>
          <input spellCheck={false} placeholder="Connect a wallet or paste an address" value={recipient} onChange={e => setRecipient(e.target.value)} />
        </label>

        {error && <p className="problem" role="alert">{error}</p>}

        <div className="actions">
          <button className="button" type="submit">Create link</button>
          <WalletButton label="Use my wallet" />
        </div>
        <p className="note">Links expire after {LINK_MINUTES} minutes, and each one is for a single payment.</p>
      </form>
    </main>
  )
}
