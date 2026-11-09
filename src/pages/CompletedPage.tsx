import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { BookingTable } from '../components/ui'

export function CompletedPage() {
  const { bookings, ready } = useBookings()
  const { t } = useI18n()
  const rows = bookings.filter((booking) => booking.stage === 'completed')
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line px-4 py-4">
        <h1 className="text-2xl font-semibold text-deep">{t('completed')}</h1>
      </header>
      {ready ? <BookingTable bookings={rows} empty={t('noCompleted')} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
    </section>
  )
}
