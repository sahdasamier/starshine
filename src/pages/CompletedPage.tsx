import { call } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { useRemoval } from '../components/confirm'
import { BookingTable } from '../components/ui'

export function CompletedPage() {
  const { profile } = useAuth()
  const { bookings, ready } = useBookings()
  const { t } = useI18n()
  const removal = useRemoval()
  const removeFile = profile?.role === 'admin'
    ? (booking: { id: string }) => removal.ask(t('removeFile'), t('confirmRemoveFile'), () => call('deleteBooking', { id: booking.id }))
    : undefined
  const rows = bookings.filter((booking) => booking.stage === 'completed' && booking.bookingStatus !== 'withdrawn')
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line px-4 py-4">
        <h1 className="text-2xl font-semibold text-deep">{t('completed')}</h1>
      </header>
      {ready ? <BookingTable bookings={rows} empty={t('noCompleted')} onRemove={removeFile} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
      {removal.dialog}
    </section>
  )
}
