import './polyfill'
import './index.css'

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { RPC_URL } from './lib/config'

// No wallet list: Phantom and other modern wallets announce themselves to the page
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={[]} autoConnect>
        <App />
      </WalletProvider>
    </ConnectionProvider>
  </StrictMode>,
)
