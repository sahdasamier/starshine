import { useState } from 'react'
import { compareBookingsRecent } from '@shared/domain'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { BookingTable } from '../components/ui'

export function HistoryPage() {
  const { bookings, ready } = useBookings()
  const { t } = useI18n()
  const [date, setDate] = useState('')
  const rows = date ? bookings.filter((booking) => booking.departureDate === date) : bookings

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-gold">{t('archive')}</p>
          <h1 className="text-2xl font-semibold text-deep">{t('allFiles')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t('archiveLead')}</p>
        </div>
        <label className="w-full text-sm font-medium sm:w-auto">
          {t('departureDate')}
          <input dir="ltr" type="date" className="mt-1 block w-full rounded-md border border-line bg-card px-3 py-2" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </header>
      {ready ? <BookingTable bookings={rows} empty={t('noResults')} compare={compareBookingsRecent} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
    </section>
  )
}
