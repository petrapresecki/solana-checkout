import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // served from petrapresecki.github.io/solana-checkout/
  base: '/solana-checkout/',
  plugins: [react()],
})
