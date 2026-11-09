import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  PLANS,
  TIERS,
  backStage,
  canAct,
  displayPhone,
  formatDate,
  formatMoney,
  formatPounds,
  formatStamp,
  meetsHalfPaid,
  meetsPaymentRule,
  paidPercent,
  parsePoundsToPiasters,
  passportsComplete,
  readyToComplete,
  stageOwner,
  type TripLevel,
} from '@shared/domain'
import { call, errorCode } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { usePricing } from '../lib/pricing'
import { Banner, Marks, planKey, programKey, roleKey, stageKey, tierKey } from '../components/ui'

export function BookingPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { bookings, ready } = useBookings()
  const { t, language } = useI18n()
  const booking = bookings.find((item) => item.id === id)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [total, setTotal] = useState('')
  const [plan, setPlan] = useState<'cash' | 'installments'>('installments')
  const [paid, setPaid] = useState('0.00')
  const [tier, setTier] = useState<TripLevel>('standard')
  const [hotel, setHotel] = useState('')
  const { pricing } = usePricing()

  useEffect(() => {
    if (!booking) return
    const fallback = booking.totalPiasters == null && booking.tripLevel ? pricing[booking.tripLevel] : null
    setTotal(booking.totalPiasters == null ? (fallback == null ? '' : formatPounds(fallback)) : formatPounds(booking.totalPiasters))
    setPlan(booking.paymentPlan)
    setPaid(formatPounds(booking.paidPiasters))
    setTier(booking.tripLevel ?? 'standard')
    setHotel(booking.hotelName)
  }, [booking, pricing])

  if (!profile) return null
  if (!ready) return <p className="text-muted">{t('loading')}</p>
  if (!booking) return <p className="text-muted">{t('err.notFound')}</p>

  const percent = paidPercent(booking.totalPiasters, booking.paidPiasters)
  const remaining = booking.totalPiasters == null ? null : booking.totalPiasters - booking.paidPiasters
  const openFile = profile.role === 'admin'
  const canEditDetails = openFile || (canAct(profile.role, 'reception') && booking.stage === 'reception')
  const canEditPrice = openFile || (profile.role === 'accountant' && booking.stage === 'accounting') || (profile.role === 'auditor' && booking.stage === 'audit')
  const canEditHotel = profile.role === 'admin' || (profile.role === 'auditor' && booking.stage === 'audit')
  const canEditPlan = canAct(profile.role, 'accountant') && (openFile || booking.stage === 'accounting')
  const canEditPaid = canAct(profile.role, 'accountant') && booking.totalPiasters != null && (openFile || booking.stage !== 'reception')
  const canTogglePassport = openFile || (canAct(profile.role, 'reception') && booking.stage === 'reception')
  const canToggleTravel = openFile || (canAct(profile.role, 'operations') && booking.stage === 'execution')
  const halfPaid = meetsHalfPaid(booking)
  const owner = stageOwner(booking.stage)
  const canReturn = owner != null && canAct(profile.role, owner) && backStage(booking.stage) != null
  const previous = backStage(booking.stage)

  async function run(action: string, data: Record<string, unknown> = {}) {
    setPending(true)
    setError(null)
    try {
      await call(action, { id: booking!.id, ...data })
      setReason('')
      setConfirming(false)
    } catch (caught) {
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  async function toggleFlag(pilgrimId: string, field: 'passportReceived' | 'visaIssued' | 'ticketIssued') {
    const flags = booking!.pilgrims.map((pilgrim) => ({
      id: pilgrim.id,
      passportReceived: pilgrim.id === pilgrimId && field === 'passportReceived' ? !pilgrim.passportReceived : pilgrim.passportReceived,
      visaIssued: pilgrim.id === pilgrimId && field === 'visaIssued' ? !pilgrim.visaIssued : pilgrim.visaIssued,
      ticketIssued: pilgrim.id === pilgrimId && field === 'ticketIssued' ? !pilgrim.ticketIssued : pilgrim.ticketIssued,
    }))
    await run('updateFlags', { flags })
  }

  async function togglePassport(pilgrimId: string) {
    if (openFile) {
      await toggleFlag(pilgrimId, 'passportReceived')
      return
    }
    await run('updateReception', {
      contactName: booking!.contactName,
      phone: displayPhone(booking!.phone),
      departureDate: booking!.departureDate,
      programType: booking!.programType,
      paymentPlan: booking!.paymentPlan,
      tripLevel: booking!.tripLevel ?? 'standard',
      hotelName: booking!.hotelName,
      pilgrims: booking!.pilgrims.map((pilgrim) => ({
        id: pilgrim.id,
        name: pilgrim.name,
        passportReceived: pilgrim.id === pilgrimId ? !pilgrim.passportReceived : pilgrim.passportReceived,
      })),
    })
  }

  return (
    <article className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gold">{t('file')}</p>
          <h1 className="num text-4xl font-semibold text-deep">{booking.fileNumber}</h1>
          <p className="mt-1 text-sm font-semibold">{t(stageKey(booking.stage))}</p>
        </div>
        <Marks booking={booking} />
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-semibold text-deep">{booking.contactName}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('phone')}</dt>
              <dd className="num">{displayPhone(booking.phone)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('departureDate')}</dt>
              <dd className="num">{formatDate(booking.departureDate)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('programType')}</dt>
              <dd>{t(programKey(booking.programType))}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('tripLevel')}</dt>
              <dd>{booking.tripLevel ? t(tierKey(booking.tripLevel)) : t('emptyMoney')}</dd>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              {canEditHotel ? (
                <label className="min-w-0 flex-1 text-sm font-medium">
                  {t('hotelName')}
                  <span className="mt-1 flex gap-2">
                    <input className="w-full rounded-md border border-line px-3 py-2" value={hotel} onChange={(event) => setHotel(event.target.value)} />
                    <button type="button" disabled={pending} className="rounded-md border border-line px-3 py-2 text-sm font-semibold disabled:opacity-50" onClick={() => void run('setHotel', { hotelName: hotel })}>
                      {t('save')}
                    </button>
                  </span>
                </label>
              ) : (
                <>
                  <dt className="text-muted">{t('hotelName')}</dt>
                  <dd>{booking.hotelName || t('emptyMoney')}</dd>
                </>
              )}
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('paymentPlan')}</dt>
              <dd>{t(planKey(booking.paymentPlan))}</dd>
            </div>
          </dl>
          {canEditDetails && (
            <Link to={`/bookings/${booking.id}/edit`} className="mt-4 inline-block font-semibold text-blue">
              {t('edit')}
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-semibold text-deep">{t('paidPercent')}</h2>
          <p className="num mt-2 text-3xl font-semibold">{percent == null ? t('emptyMoney') : `${percent}%`}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('total')}</dt>
              <dd className="num">{booking.totalPiasters == null ? t('emptyMoney') : formatMoney(booking.totalPiasters, language)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('amountPaid')}</dt>
              <dd className="num">{formatMoney(booking.paidPiasters, language)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('remaining')}</dt>
              <dd className="num">{remaining == null ? t('emptyMoney') : formatMoney(remaining, language)}</dd>
            </div>
          </dl>
          {(canEditPrice || canEditPaid) && (
            <div className="mt-4 space-y-3 border-t border-line pt-4">
              {canEditPrice && (
                <>
                  <label className="block text-sm font-medium">
                    {t('tripLevel')}
                    <select
                      className="mt-1 w-full rounded-md border border-line px-3 py-2"
                      value={tier}
                      onChange={(event) => {
                        const next = event.target.value as TripLevel
                        const previousDefault = pricing[tier]
                        const nextDefault = pricing[next]
                        setTier(next)
                        if (booking.totalPiasters != null || nextDefault == null) return
                        let current: number | null = null
                        try {
                          current = parsePoundsToPiasters(total)
                        } catch {
                          current = null
                        }
                        if (total.trim() === '' || current === previousDefault) setTotal(formatPounds(nextDefault))
                      }}
                    >
                      {TIERS.map((item) => (
                        <option key={item} value={item}>
                          {t(tierKey(item))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    {t('total')}
                    <input dir="ltr" className="mt-1 w-full rounded-md border border-line px-3 py-2" value={total} onChange={(event) => setTotal(event.target.value)} />
                  </label>
                  {booking.totalPiasters == null && booking.tripLevel && pricing[booking.tripLevel] != null && (
                    <p className="text-xs text-muted">{t('priceHint')}</p>
                  )}
                  <label className="block text-sm font-medium">
                    {t('paymentPlan')}
                    <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={plan} disabled={!canEditPlan} onChange={(event) => setPlan(event.target.value as 'cash' | 'installments')}>
                      {PLANS.map((item) => (
                        <option key={item} value={item}>
                          {t(planKey(item))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" disabled={pending} className="rounded-md border border-line px-3 py-2 text-sm font-semibold" onClick={() => void run('updateAccounting', { total, paymentPlan: plan, tripLevel: tier, hotelName: hotel })}>
                    {t('save')}
                  </button>
                </>
              )}
              {canEditPaid && (
                <label className="block text-sm font-medium">
                  {t('amountPaid')}
                  <span className="mt-1 flex gap-2">
                    <input dir="ltr" className="w-full rounded-md border border-line px-3 py-2" value={paid} onChange={(event) => setPaid(event.target.value)} />
                    <button type="button" disabled={pending} className="rounded-md border border-line px-3 py-2 text-sm font-semibold" onClick={() => void run('setAmountPaid', { amountPaid: paid })}>
                      {t('save')}
                    </button>
                  </span>
                </label>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-semibold text-deep">{t('pilgrims')}</h2>
        <ul className="mt-3 divide-y divide-line">
          {booking.pilgrims.map((pilgrim) => (
            <li key={pilgrim.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="font-medium">{pilgrim.name}</span>
              <span className="flex flex-wrap gap-4 text-sm">
                {canTogglePassport ? (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={pilgrim.passportReceived} disabled={pending} onChange={() => void togglePassport(pilgrim.id)} />
                    {t('passportReceived')}
                  </label>
                ) : (
                  <span>{pilgrim.passportReceived ? '✓' : '–'} {t('passportReceived')}</span>
                )}
                {canToggleTravel ? (
                  <>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={pilgrim.visaIssued} disabled={pending || !halfPaid} onChange={() => void toggleFlag(pilgrim.id, 'visaIssued')} />
                      {t('visaIssued')}
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={pilgrim.ticketIssued} disabled={pending || !halfPaid} onChange={() => void toggleFlag(pilgrim.id, 'ticketIssued')} />
                      {t('ticketIssued')}
                    </label>
                  </>
                ) : (
                  <>
                    <span>{pilgrim.visaIssued ? '✓' : '–'} {t('visaIssued')}</span>
                    <span>{pilgrim.ticketIssued ? '✓' : '–'} {t('ticketIssued')}</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        {canToggleTravel && !halfPaid && <p className="mt-3 text-sm text-muted">{t('executionLocked')}</p>}
      </section>

      <section className="space-y-3">
        <Banner code={error} />
        <div className="flex flex-wrap gap-2">
          {canAct(profile.role, 'reception') && booking.stage === 'reception' && (
            <button type="button" disabled={pending} className="rounded-md bg-gold px-4 py-2 font-semibold text-white disabled:opacity-50" onClick={() => void run('submitReception')}>
              {t('sendAccounting')}
            </button>
          )}
          {canAct(profile.role, 'accountant') && booking.stage === 'accounting' && (
            <button
              type="button"
              disabled={pending || total.trim() === ''}
              className="rounded-md bg-deep px-4 py-2 font-semibold text-white disabled:opacity-50"
              onClick={() =>
                void (async () => {
                  setPending(true)
                  setError(null)
                  try {
                    await call('updateAccounting', { id: booking.id, total, paymentPlan: plan, tripLevel: tier, hotelName: hotel })
                    await call('handoff', { id: booking.id })
                  } catch (caught) {
                    setError(errorCode(caught))
                  } finally {
                    setPending(false)
                  }
                })()
              }
            >
              {t('handoff')}
            </button>
          )}
          {canAct(profile.role, 'auditor') && booking.stage === 'audit' && (
            <button
              type="button"
              disabled={pending || !passportsComplete(booking) || !meetsPaymentRule(booking)}
              className="rounded-md bg-deep px-4 py-2 font-semibold text-white disabled:opacity-50"
              onClick={() => void run('approve')}
            >
              {t('approve')}
            </button>
          )}
          {canAct(profile.role, 'operations') && booking.stage === 'execution' && (
            <button type="button" disabled={pending || !halfPaid || !readyToComplete(booking)} className="rounded-md bg-ok px-4 py-2 font-semibold text-white disabled:opacity-50" onClick={() => setConfirming(true)}>
              {t('complete')}
            </button>
          )}
        </div>
        {canAct(profile.role, 'accountant') && booking.stage === 'accounting' && (booking.totalPiasters == null || booking.totalPiasters <= 0) && (
          <p className="text-sm text-muted">{t('handoffHint')}</p>
        )}
        {canAct(profile.role, 'auditor') && booking.stage === 'audit' && (!passportsComplete(booking) || !meetsPaymentRule(booking)) && (
          <p className="text-sm text-muted">{t('approveHint')}</p>
        )}
        {canReturn && previous && (
          <div className="rounded-2xl border border-line bg-card p-4">
            <label className="block text-sm font-medium">
              {t('reason')}
              <textarea className="mt-1 w-full rounded-md border border-line px-3 py-2" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button
              type="button"
              disabled={pending || reason.trim() === ''}
              className="mt-3 rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:opacity-50"
              onClick={() => void run('returnBooking', { reason })}
            >
              {t('returnAction')} — {t(stageKey(previous))}
            </button>
          </div>
        )}
      </section>

      {booking.returns.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-semibold text-deep">{t('history')}</h2>
          <ol className="mt-3 space-y-3">
            {booking.returns.map((note, index) => (
              <li key={`${note.at}-${index}`} className="border-s-2 border-gold ps-3 text-sm">
                <p className="font-medium">{note.reason}</p>
                <p className="mt-1 text-muted">
                  {note.byName} · {t(roleKey(note.byRole))} · <span className="num">{formatStamp(note.at)}</span>
                </p>
                <p className="text-muted">
                  {t('fromStage')} {t(stageKey(note.from))} · {t('toStage')} {t(stageKey(note.to))}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-deep/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">{t('complete')}</h2>
            <p className="mt-2 text-sm text-muted">{t('confirmComplete')}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => setConfirming(false)}>
                {t('cancel')}
              </button>
              <button type="button" disabled={pending} className="rounded-md bg-ok px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void run('complete')}>
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
