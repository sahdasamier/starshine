import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { normalizeBooking, type Booking } from '@shared/domain'
import { db } from './firebase'

export type ClientBooking = Booking & { id: string }

const BookingsContext = createContext<{ bookings: ClientBooking[]; ready: boolean } | null>(null)

export function BookingsProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<ClientBooking[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'bookings'), (snap) => {
      setBookings(
        snap.docs.map((item) => {
          const data = normalizeBooking(item.data() as Booking)
          return { id: item.id, ...data }
        }),
      )
      setReady(true)
    })
  }, [])

  return <BookingsContext.Provider value={{ bookings, ready }}>{children}</BookingsContext.Provider>
}

export function useBookings() {
  const value = useContext(BookingsContext)
  if (!value) throw new Error('bookings')
  return value
}
