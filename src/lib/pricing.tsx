import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { emptyPricing, type Pricing } from '@shared/domain'
import { db } from './firebase'

function readPrice(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

export function usePricing() {
  const [pricing, setPricing] = useState<Pricing>(emptyPricing())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    return onSnapshot(
      doc(db, 'meta', 'pricing'),
      (snap) => {
        const data = snap.data() ?? {}
        setPricing({
          standard: readPrice(data.standard),
          premium: readPrice(data.premium),
          vip: readPrice(data.vip),
        })
        setReady(true)
      },
      () => setReady(true),
    )
  }, [])

  return { pricing, ready }
}
