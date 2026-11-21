import { useState, type ReactNode } from 'react'
import { bookingTotalPiasters, formatMoney, type Stage } from '@shared/domain'
import { call } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBookings, type ClientBooking } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { usePrograms } from '../lib/programs'
import { useRemoval } from '../components/confirm'
import { AccountingTable, BookingTable, stageKey } from '../components/ui'

const stageForRole = {
  reception: 'reception',
  accountant: 'accounting',
  auditor: 'audit',
  operations: 'execution',
} as const

const OPEN_STAGES = ['reception', 'accounting', 'audit', 'execution'] as const

export function QueuePage() {
  const { profile } = useAuth()
  const { bookings, ready } = useBookings()
  const { t } = useI18n()
  const removal = useRemoval()
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  if (!profile) return null
  const removeFile = profile.role === 'admin'
    ? (booking: { id: string }) => removal.ask(t('removeFile'), t('confirmRemoveFile'), () => call('deleteBooking', { id: booking.id }))
    : undefined
  if (profile.role === 'admin') {
    const open = bookings.filter((booking) => booking.stage !== 'completed' && booking.bookingStatus !== 'withdrawn')
    const rows = stageFilter === 'all' ? open : open.filter((booking) => booking.stage === stageFilter)
    const accounting = stageFilter === 'accounting'
    return (
      <QueueFrame title={accounting ? t('stageAccounting') : t('openFiles')} count={ready ? rows.length : null} countLabel={t('fileCount')}>
        <div className="flex gap-2 overflow-x-auto border-b border-gold/30 bg-paper px-4 py-3">
          <StageChip active={stageFilter === 'all'} label={t('allStages')} onClick={() => setStageFilter('all')} />
          {OPEN_STAGES.map((stage) => (
            <StageChip key={stage} active={stageFilter === stage} label={t(stageKey(stage))} onClick={() => setStageFilter(stage)} />
          ))}
        </div>
        {accounting && <AccountingSummary rows={rows} />}
        {ready ? accounting ? <AccountingTable bookings={rows} empty={t('noBookings')} onRemove={removeFile} /> : <BookingTable bookings={rows} empty={t('noBookings')} onRemove={removeFile} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
        {removal.dialog}
      </QueueFrame>
    )
  }
  const stage: Stage = stageForRole[profile.role]
  const rows = bookings.filter((booking) => booking.stage === stage && booking.bookingStatus !== 'withdrawn')
  if (stage === 'accounting') {
    return (
      <QueueFrame title={t('stageAccounting')} count={ready ? rows.length : null} countLabel={t('fileCount')}>
        <AccountingSummary rows={rows} />
        {ready ? <AccountingTable bookings={rows} empty={t('noBookings')} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
      </QueueFrame>
    )
  }

  return (
    <QueueFrame title={t(stageKey(stage))} count={ready ? rows.length : null} countLabel={t('fileCount')}>
      {ready ? <BookingTable bookings={rows} empty={t('noBookings')} /> : <p className="px-4 py-10 text-center text-muted">{t('loading')}</p>}
    </QueueFrame>
  )
}

function StageChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${active ? 'bg-gold text-deep' : 'bg-white text-deep'}`} onClick={onClick}>
      {label}
    </button>
  )
}

function AccountingSummary({ rows }: { rows: ClientBooking[] }) {
  const { t, language } = useI18n()
  const { programs } = usePrograms()
  let total = 0
  let paid = 0
  let remaining = 0
  let missing = 0
  for (const booking of rows) {
    const quote = bookingTotalPiasters(booking, programs)
    paid += booking.paidPiasters
    if (quote == null) {
      missing += 1
      continue
    }
    total += quote
    remaining += quote - booking.paidPiasters
  }
  const figures = [
    { label: t('total'), value: formatMoney(total, language) },
    { label: t('amountPaid'), value: formatMoney(paid, language) },
    { label: t('remaining'), value: formatMoney(remaining, language) },
    { label: t('needsTotal'), value: String(missing) },
  ]
  return (
    <div className="border-b border-gold/30">
      <p className="bg-paper px-5 py-3 text-sm text-muted">{t('accountingLead')}</p>
      <dl className="grid grid-cols-2 sm:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} className="border-e border-gold/20 px-4 py-3">
            <dt className="text-xs text-muted">{figure.label}</dt>
            <dd className="num mt-1 text-lg font-semibold text-deep">{figure.value}</dd>
          </div>
        ))}
      </dl>
    </div>
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
