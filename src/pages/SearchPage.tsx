import { useMemo, useState } from 'react'
import { matchesQuery } from '@shared/domain'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { BookingTable } from '../components/ui'

export function SearchPage() {
  const { bookings } = useBookings()
  const { t } = useI18n()
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
          className="w-full rounded-md border border-line px-3 py-2"
        />
      </header>
      {!query.trim() ? null : <BookingTable bookings={results} empty={t('noResults')} />}
    </section>
  )
}
