import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

export function useReferralTypes() {
  const [extras, setExtras] = useState<string[]>([])

  useEffect(() => {
    return onSnapshot(
      collection(db, 'referralTypes'),
      (snap) => {
        setExtras(snap.docs.map((item) => item.data().label).filter((label): label is string => typeof label === 'string'))
      },
      () => setExtras([]),
    )
  }, [])

  return extras
}
