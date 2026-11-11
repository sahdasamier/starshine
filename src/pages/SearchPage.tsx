import { useMemo, useState } from 'react'
import { matchesQuery } from '@shared/domain'
import { call } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { useRemoval } from '../components/confirm'
import { BookingTable } from '../components/ui'

export function SearchPage() {
  const { profile } = useAuth()
  const { bookings } = useBookings()
  const { t } = useI18n()
  const removal = useRemoval()
  const removeFile = profile?.role === 'admin'
    ? (booking: { id: string }) => removal.ask(t('removeFile'), t('confirmRemoveFile'), () => call('deleteBooking', { id: booking.id }))
    : undefined
  const [query, setQuery] = useState('')
  const results = useMemo(() => (query.trim() ? bookings.filter((booking) => matchesQuery(booking, query)) : []), [bookings, query])

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="space-y-3 border-b border-line px-4 py-4">
        <h1 className="text-2xl font-semibold text-deep">{t('search')}</h1>
        <p className="text-sm text-muted">{t('searchLead')}</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-md border border-line px-3 py-2 text-base"
        />
      </header>
      {!query.trim() ? null : <BookingTable bookings={results} empty={t('noResults')} onRemove={removeFile} />}
      {removal.dialog}
    </section>
  )
}
