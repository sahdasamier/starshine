import { useState } from 'react'
import { compareBookingsRecent } from '@shared/domain'
import { call } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { useRemoval } from '../components/confirm'
import { tripChoices } from '@shared/domain'
import { useTripDates } from '../lib/trip-dates'
import { FileSheet, departureLabel } from '../components/ui'

export function HistoryPage() {
  const { profile } = useAuth()
  const { bookings, ready } = useBookings()
  const { t } = useI18n()
  const extras = useTripDates()
  const removal = useRemoval()
  const removeFile = profile?.role === 'admin'
    ? (booking: { id: string }) => removal.ask(t('removeFile'), t('confirmRemoveFile'), () => call('deleteBooking', { id: booking.id }))
    : undefined
  const [date, setDate] = useState('')
  const rows = date ? bookings.filter((booking) => booking.departureDate === date) : bookings

  return (
    <section className="overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-sm">
      <header className="bg-deep px-5 py-5 text-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gold">{t('archive')}</p>
            <h1 className="mt-1 text-3xl font-semibold">{t('allFiles')}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">{t('archiveLead')}</p>
          </div>
          <p className="rounded-full bg-gold px-3 py-1 text-sm font-semibold">
            {t('fileCount')} <span className="num">{rows.length}</span>
          </p>
        </div>
      </header>
      <div className="border-b border-gold/30 bg-paper px-4 py-3">
        <label className="block w-full text-sm font-medium sm:max-w-xs">
          {t('departureDate')}
          <select className="mt-1 block w-full rounded-md border border-gold/40 bg-card px-3 py-2" value={date} onChange={(event) => setDate(event.target.value)}>
            <option value="">{t('allDates')}</option>
            {tripChoices(extras, bookings.map((booking) => booking.departureDate)).map((choice) => (
              <option key={choice} value={choice}>
                {departureLabel(choice, t)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {ready ? <FileSheet bookings={rows} empty={t('noResults')} compare={compareBookingsRecent} onRemove={removeFile} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
      {removal.dialog}
    </section>
  )
}
