import type { Stage } from '@shared/domain'
import { call } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { useRemoval } from '../components/confirm'
import { BookingTable, stageKey } from '../components/ui'

const stageForRole = {
  reception: 'reception',
  accountant: 'accounting',
  auditor: 'audit',
  operations: 'execution',
} as const

export function QueuePage() {
  const { profile } = useAuth()
  const { bookings, ready } = useBookings()
  const { t } = useI18n()
  const removal = useRemoval()
  if (!profile) return null
  const removeFile = profile.role === 'admin'
    ? (booking: { id: string }) => removal.ask(t('removeFile'), t('confirmRemoveFile'), () => call('deleteBooking', { id: booking.id }))
    : undefined
  if (profile.role === 'admin') {
    const rows = bookings.filter((booking) => booking.stage !== 'completed')
    return (
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gold">{t('queue')}</p>
            <h1 className="text-2xl font-semibold text-deep">{t('openFiles')}</h1>
          </div>
          <p className="num text-sm text-muted">{ready ? rows.length : ''}</p>
        </header>
        {ready ? <BookingTable bookings={rows} empty={t('noBookings')} onRemove={removeFile} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
        {removal.dialog}
      </section>
    )
  }
  const stage: Stage = stageForRole[profile.role]
  const rows = bookings.filter((booking) => booking.stage === stage)

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-gold">{t('queue')}</p>
          <h1 className="text-2xl font-semibold text-deep">{t(stageKey(stage))}</h1>
        </div>
        <p className="num text-sm text-muted">{ready ? rows.length : ''}</p>
      </header>
      {ready ? <BookingTable bookings={rows} empty={t('noBookings')} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
    </section>
  )
}
