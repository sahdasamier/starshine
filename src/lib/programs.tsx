import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { UMRAH_PROGRAMS, assertPrograms, type UmrahProgram } from '@shared/domain'
import { db } from './firebase'

function storedPrograms(value: unknown): UmrahProgram[] {
  if (value == null) return UMRAH_PROGRAMS.map((item) => ({ ...item, prices: { ...item.prices } }))
  try {
    return assertPrograms(value)
  } catch {
    return UMRAH_PROGRAMS.map((item) => ({ ...item, prices: { ...item.prices } }))
  }
}

export function usePrograms() {
  const [programs, setPrograms] = useState<UmrahProgram[]>(UMRAH_PROGRAMS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    return onSnapshot(
      doc(db, 'meta', 'programs'),
      (snap) => {
        setPrograms(storedPrograms(snap.exists() ? snap.data()?.programs : null))
        setReady(true)
      },
      () => setReady(true),
    )
  }, [])

  return { programs, ready }
}
