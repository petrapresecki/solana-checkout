import { WalletReadyState } from '@solana/wallet-adapter-base'
import { useWallet } from '@solana/wallet-adapter-react'

const short = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`

/** Connects the first wallet in the browser, or points to Phantom if there isn't one */
export default function WalletButton({ label = 'Connect wallet' }: { label?: string }) {
  const { wallets, select, publicKey, disconnect, connecting } = useWallet()
  const installed = wallets.find(({ readyState }) => readyState === WalletReadyState.Installed)

  if (publicKey) {
    return (
      <button type="button" className="text-button" onClick={() => disconnect()}>
        {short(publicKey.toBase58())} · Disconnect
      </button>
    )
  }
  if (!installed) {
    return (
      <a className="button" href="https://phantom.com/download" target="_blank" rel="noreferrer">
        Install Phantom
      </a>
    )
  }
  return (
    <button type="button" className="button" disabled={connecting} onClick={() => select(installed.adapter.name)}>
      {connecting ? 'Connecting…' : label}
    </button>
  )
}
