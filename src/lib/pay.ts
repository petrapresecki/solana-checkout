import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'

import { USDC_DECIMALS, USDC_MINT } from './config'
import { fromAtomic, toAtomic, type PaymentRequest } from './link'

export class NotEnoughUsdc extends Error {
  constructor(public balance: string) {
    super('Not enough USDC')
  }
}

/** The same payment a wallet builds when it scans the QR code, for paying with a connected wallet */
export async function buildPayment(connection: Connection, payer: PublicKey, request: PaymentRequest) {
  const recipient = new PublicKey(request.recipient)
  const from = getAssociatedTokenAddressSync(USDC_MINT, payer)
  const to = getAssociatedTokenAddressSync(USDC_MINT, recipient)
  const amount = toAtomic(request.amount)

  const balance = await connection.getTokenAccountBalance(from).then(
    ({ value }) => BigInt(value.amount),
    () => 0n, // no token account yet means they've never held USDC
  )
  if (balance < amount) throw new NotEnoughUsdc(fromAtomic(balance))

  const transfer = createTransferCheckedInstruction(from, USDC_MINT, to, payer, amount, USDC_DECIMALS)
  // listing the reference on the transfer is what makes this payment findable afterwards
  transfer.keys.push({ pubkey: new PublicKey(request.reference), isSigner: false, isWritable: false })

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  return new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight }).add(
    // a wallet holds each token in its own account, and the shop may not have a USDC one yet
    createAssociatedTokenAccountIdempotentInstruction(payer, to, recipient, USDC_MINT),
    transfer,
  )
}
