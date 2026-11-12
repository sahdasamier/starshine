import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

export function useTripDates() {
  const [extras, setExtras] = useState<string[]>([])

  useEffect(() => {
    return onSnapshot(
      doc(db, 'meta', 'tripDates'),
      (snap) => {
        const extras = snap.data()?.extras
        setExtras(Array.isArray(extras) ? extras.filter((item): item is string => typeof item === 'string') : [])
      },
      () => setExtras([]),
    )
  }, [])

  return extras
}
