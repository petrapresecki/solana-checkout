import { useMemo } from 'react'

import Checkout from './components/Checkout'
import CreateLink from './components/CreateLink'
import { readCheckoutUrl } from './lib/link'

export default function App() {
  const hasLink = window.location.search.length > 1
  const request = useMemo(() => readCheckoutUrl(window.location.search), [])

  if (request) return <Checkout key={request.reference} request={request} />
  return <CreateLink brokenLink={hasLink} />
}
