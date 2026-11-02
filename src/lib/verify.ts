type TokenBalance = {
  mint: string
  owner?: string
  uiTokenAmount: { amount: string }
}

export type BalanceChanges = {
  preTokenBalances?: TokenBalance[] | null
  postTokenBalances?: TokenBalance[] | null
}

export type Outcome = 'paid' | 'underpaid' | 'overpaid' | 'wrong-token'

function total(balances: TokenBalance[] | null | undefined, owner: string, mint: string) {
  return (balances ?? [])
    .filter(balance => balance.owner === owner && balance.mint === mint)
    .reduce((sum, balance) => sum + BigInt(balance.uiTokenAmount.amount), 0n)
}

/** How much of this token the shop gained in a transaction: the balance after, minus the balance before */
export function amountReceived(changes: BalanceChanges, owner: string, mint: string) {
  return total(changes.postTokenBalances, owner, mint) - total(changes.preTokenBalances, owner, mint)
}

/** There are no callbacks or auth codes here, so the balances are the only proof of what was really paid */
export function checkPayment(received: bigint, expected: bigint): Outcome {
  if (received <= 0n) return 'wrong-token'
  if (received < expected) return 'underpaid'
  if (received > expected) return 'overpaid'
  return 'paid'
}
