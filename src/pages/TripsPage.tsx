import { useMemo, useState } from 'react'
import { cairoToday, groupByDeparture, isCalendarDate, isUpcomingDate, tripChoices, type TripWhen } from '@shared/domain'
import { call } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBookings, type ClientBooking } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { useRemoval } from '../components/confirm'
import { useTripDates } from '../lib/trip-dates'
import { ScheduleSheet, departureLabel } from '../components/ui'

export function TripsPage() {
  const { profile } = useAuth()
  const { bookings, ready } = useBookings()
  const { t } = useI18n()
  const extras = useTripDates()
  const removal = useRemoval()
  const removePerson = profile?.role === 'admin'
    ? (booking: ClientBooking, pilgrimId: string) => removal.ask(t('removePerson'), t('confirmRemovePerson'), () => call('removePilgrim', { id: booking.id, pilgrimId }))
    : undefined
  const today = cairoToday()
  const [when, setWhen] = useState<TripWhen>('upcoming')
  const [picked, setPicked] = useState('')
  const groups = useMemo(() => groupByDeparture(bookings, when, today), [bookings, when, today])
  const selected = picked && isUpcomingDate(picked, today) === (when === 'upcoming') ? picked : (groups[0]?.date ?? '')
  const manifest = bookings.filter((booking) => booking.departureDate === selected && booking.bookingStatus !== 'withdrawn')
  const people = manifest.reduce((count, booking) => count + booking.pilgrims.length, 0)

  function chooseDate(value: string) {
    setPicked(value)
    if (isCalendarDate(value) || value) setWhen(isUpcomingDate(value, today) ? 'upcoming' : 'past')
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-deep">{t('trips')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t('tripsLead')}</p>
        </div>
        <label className="w-full text-sm font-medium sm:w-auto">
          {t('tripDate')}
          <select className="mt-1 block w-full rounded-md border border-line bg-card px-3 py-2" value={selected} onChange={(event) => chooseDate(event.target.value)}>
            <option value="">{t('departureDate')}</option>
            {tripChoices(extras, bookings.map((booking) => booking.departureDate)).map((choice) => (
              <option key={choice} value={choice}>
                {departureLabel(choice, t)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        {(['upcoming', 'past'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`min-h-11 rounded-md px-4 py-2 text-sm font-semibold ${when === item ? 'bg-deep text-white' : 'border border-line bg-card text-deep'}`}
            onClick={() => {
              setWhen(item)
              setPicked('')
            }}
          >
            {t(item === 'upcoming' ? 'upcomingTrips' : 'pastTrips')}
          </button>
        ))}
      </div>
      {!ready ? (
        <p className="text-muted">{t('loading')}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <div className="rounded-2xl border border-line bg-card p-2">
            {groups.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted">{t('noTrips')}</p>
            ) : (
              <ul className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">
                {groups.map((group) => (
                  <li key={group.date} className="shrink-0 lg:w-full">
                    <button
                      type="button"
                      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap lg:whitespace-normal ${selected === group.date ? 'bg-deep text-white shadow-sm ring-2 ring-gold' : 'hover:bg-paper'}`}
                      onClick={() => setPicked(group.date)}
                    >
                      <span className="num font-semibold">{departureLabel(group.date, t)}</span>
                      <span className={`num rounded-full px-2 py-0.5 text-xs font-semibold ${selected === group.date ? 'bg-gold text-white' : 'bg-gold/15 text-deep'}`}>{group.people}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-card">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-gold">{t('manifest')}</p>
                <h2 className="num text-2xl font-semibold text-deep">{selected ? departureLabel(selected, t) : '—'}</h2>
              </div>
              <p className="text-sm text-muted">
                {t('peopleCount')} <span className="num font-semibold text-deep">{selected ? people : 0}</span>
                <span className="mx-2">·</span>
                {t('fileCount')} <span className="num font-semibold text-deep">{selected ? manifest.length : 0}</span>
              </p>
            </header>
            <ScheduleSheet bookings={manifest} empty={t('noPassengers')} onRemove={removePerson} />
            {removal.dialog}
          </div>
        </div>
      )}
    </section>
  )
}
