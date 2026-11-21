import type { ReactNode } from 'react'
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
    const rows = bookings.filter((booking) => booking.stage !== 'completed' && booking.bookingStatus !== 'withdrawn')
    return (
      <QueueFrame title={t('openFiles')} count={ready ? rows.length : null} countLabel={t('fileCount')}>
        {ready ? <BookingTable bookings={rows} empty={t('noBookings')} onRemove={removeFile} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
        {removal.dialog}
      </QueueFrame>
    )
  }
  const stage: Stage = stageForRole[profile.role]
  const rows = bookings.filter((booking) => booking.stage === stage && booking.bookingStatus !== 'withdrawn')

  return (
    <QueueFrame title={t(stageKey(stage))} count={ready ? rows.length : null} countLabel={t('fileCount')}>
      {ready ? <BookingTable bookings={rows} empty={t('noBookings')} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
    </QueueFrame>
  )
}

function QueueFrame({ title, count, countLabel, children }: { title: string; count: number | null; countLabel: string; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <section className="overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-sm">
      <header className="bg-deep px-5 py-5 text-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gold">{t('queue')}</p>
            <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
          </div>
          {count != null && (
            <p className="rounded-full bg-gold px-3 py-1 text-sm font-semibold text-deep">
              {countLabel} <span className="num">{count}</span>
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  )
}
