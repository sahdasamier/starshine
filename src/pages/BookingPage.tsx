import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  PLANS,
  backStage,
  canAct,
  displayPhone,
  formatMoney,
  formatPounds,
  formatStamp,
  meetsHalfPaid,
  bookingTotalPiasters,
  packageById,
  packageQuotePiasters,
  meetsPaymentRule,
  paidPercent,
  passportsComplete,
  readyToComplete,
  stageOwner,
} from '@shared/domain'
import { call, errorCode } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { usePricing } from '../lib/pricing'
import { usePrograms } from '../lib/programs'
import { useRemoval } from '../components/confirm'
import { TrashButton } from '../components/icons'
import { Banner, Marks, categoryKey, departureLabel, pilgrimFacts, planKey, programKey, referralLabel, roleKey, stageKey, statusKey } from '../components/ui'

export function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const removal = useRemoval()
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
  const [customerNotes, setCustomerNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const { pricing } = usePricing()
  const { programs } = usePrograms()

  useEffect(() => {
    if (!booking) return
    const packageQuote = packageQuotePiasters(booking.packageId, booking.programType, programs)
    const fallback = booking.totalPiasters == null ? (packageQuote ?? (booking.tripLevel ? pricing[booking.tripLevel] : null)) : null
    setTotal(booking.totalPiasters == null ? (fallback == null ? '' : formatPounds(fallback)) : formatPounds(booking.totalPiasters))
    setPlan(booking.paymentPlan)
    setPaid(formatPounds(booking.paidPiasters))
    setCustomerNotes(booking.customerNotes)
    setInternalNotes(booking.internalNotes)
  }, [booking, pricing, programs])

  if (!profile) return null
  if (!ready) return <p className="text-muted">{t('loading')}</p>
  if (!booking) return <p className="text-muted">{t('err.notFound')}</p>

  const program = packageById(booking.packageId, programs)
  const shownTotal = bookingTotalPiasters(booking, programs)
  const percent = paidPercent(shownTotal, booking.paidPiasters)
  const remaining = shownTotal == null ? null : shownTotal - booking.paidPiasters
  const openFile = profile.role === 'admin'
  const reviewer = profile.role === 'auditor'
  const canEditDetails = openFile || reviewer || (profile.role === 'reception' && booking.stage === 'reception')
  const canEditPrice = openFile || reviewer || (profile.role === 'accountant' && booking.stage === 'accounting')
  const canEditPlan = openFile || reviewer || (profile.role === 'accountant' && booking.stage === 'accounting')
  const canEditPaid = (openFile || reviewer || (profile.role === 'accountant' && booking.stage !== 'reception')) && booking.totalPiasters != null
  const canTogglePassport = openFile || reviewer || (profile.role === 'reception' && booking.stage === 'reception')
  const canToggleTravel = openFile || reviewer || (profile.role === 'operations' && booking.stage === 'execution')
  const halfPaid = meetsHalfPaid(booking)
  const owner = stageOwner(booking.stage)
  const canReturn = booking.bookingStatus !== 'withdrawn' && owner != null && canAct(profile.role, owner) && backStage(booking.stage) != null
  const moving = booking.bookingStatus !== 'withdrawn'
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
    if ((field === 'visaIssued' || field === 'ticketIssued') && !meetsHalfPaid(booking!)) return
    const flags = booking!.pilgrims.map((pilgrim) => ({
      id: pilgrim.id,
      passportReceived: pilgrim.id === pilgrimId && field === 'passportReceived' ? !pilgrim.passportReceived : pilgrim.passportReceived,
      visaIssued: pilgrim.id === pilgrimId && field === 'visaIssued' ? !pilgrim.visaIssued : pilgrim.visaIssued,
      ticketIssued: pilgrim.id === pilgrimId && field === 'ticketIssued' ? !pilgrim.ticketIssued : pilgrim.ticketIssued,
    }))
    await run('updateFlags', { flags })
  }

  async function togglePassport(pilgrimId: string) {
    if (openFile || reviewer) {
      await toggleFlag(pilgrimId, 'passportReceived')
      return
    }
    await run('updateReception', {
      contactName: booking!.contactName,
      phone: displayPhone(booking!.phone),
      departureDate: booking!.departureDate,
      programType: booking!.programType,
      paymentPlan: booking!.paymentPlan,
      tripLevel: booking!.tripLevel ?? 'farBus',
      hotelName: booking!.hotelName,
      customerNotes: booking!.customerNotes,
      internalNotes: booking!.internalNotes,
      pilgrims: booking!.pilgrims.map((pilgrim) => ({
        id: pilgrim.id,
        name: pilgrim.name,
        category: pilgrim.category,
        gender: pilgrim.gender,
        militaryCompleted: pilgrim.militaryCompleted,
        papersConfirmed: pilgrim.papersConfirmed,
        guardianName: pilgrim.guardianName,
        passportReceived: pilgrim.id === pilgrimId ? !pilgrim.passportReceived : pilgrim.passportReceived,
      })),
    })
  }

  return (
    <article className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-gold/40 bg-deep text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gold">{t('file')}</p>
            <h1 className="mt-1 text-4xl font-semibold"><span className="num">{booking.fileNumber}</span></h1>
            <p className="mt-2 text-xl font-semibold">{booking.contactName}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-deep">{t(stageKey(booking.stage))}</span>
              {booking.bookingStatus === 'withdrawn' && <span className="rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white">{t(statusKey('withdrawn'))}</span>}
              {booking.createdByName && <span className="text-white/80">{t('createdBy')}: {booking.createdByName}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Marks booking={booking} />
            {profile.role === 'admin' && (
              <TrashButton
                label={t('removeFile')}
                className="bg-white"
                onClick={() => removal.ask(t('removeFile'), t('confirmRemoveFile'), async () => {
                  await call('deleteBooking', { id: booking.id })
                  navigate('/queue')
                })}
              />
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gold/30 bg-paper px-4 py-3">
            <h2 className="font-semibold text-deep">{booking.contactName}</h2>
            {canEditDetails && (
              <Link to={`/bookings/${booking.id}/edit`} className="inline-flex min-h-11 items-center font-semibold text-gold">
                {t('edit')}
              </Link>
            )}
          </div>
          <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">{t('phone')}</dt>
              <dd className="mt-0.5 font-medium"><span className="num">{displayPhone(booking.phone)}</span></dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('departureDate')}</dt>
              <dd className="mt-0.5 font-medium"><span className="num">{departureLabel(booking.departureDate, t)}</span></dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('programType')}</dt>
              <dd className="mt-0.5 font-medium">{t(programKey(booking.programType))}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('paymentPlan')}</dt>
              <dd className="mt-0.5 font-medium">{t(planKey(booking.paymentPlan))}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">{t('umrahProgram')}</dt>
              <dd className="mt-0.5 font-medium">{booking.packageId ? (language === 'ar' ? packageById(booking.packageId, programs)?.nameAr : packageById(booking.packageId, programs)?.nameEn) : t('emptyMoney')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('makkahHotel')}</dt>
              <dd className="mt-0.5 font-medium">{booking.packageId ? (language === 'ar' ? packageById(booking.packageId, programs)?.makkahAr : packageById(booking.packageId, programs)?.makkahEn) : t('emptyMoney')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('madinahHotel')}</dt>
              <dd className="mt-0.5 font-medium">{booking.packageId ? (language === 'ar' ? packageById(booking.packageId, programs)?.madinahAr : packageById(booking.packageId, programs)?.madinahEn) : t('emptyMoney')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('referralType')}</dt>
              <dd className="mt-0.5 font-medium">{booking.referralType ? referralLabel(booking.referralType, t) : t('emptyMoney')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('referrerName')}</dt>
              <dd className="mt-0.5 font-medium">{booking.referrerName || t('emptyMoney')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('bookingStatus')}</dt>
              <dd className={`mt-0.5 font-medium ${booking.bookingStatus === 'withdrawn' ? 'text-danger' : ''}`}>{t(statusKey(booking.bookingStatus ?? 'confirmed'))}</dd>
            </div>
          </dl>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-sm">
          <div className="bg-deep px-4 py-4 text-white">
            <p className="text-xs font-semibold tracking-wide text-gold">{t('paidPercent')}</p>
            <p className="mt-1 text-4xl font-semibold"><span className="num">{percent == null ? t('emptyMoney') : `${percent}%`}</span></p>
          </div>
          <dl className="grid grid-cols-2 gap-3 bg-paper px-4 py-3 text-sm sm:grid-cols-3">
            <div className={shownTotal == null && program ? 'col-span-2 sm:col-span-3' : ''}>
              <dt className="text-xs text-muted">{t('total')}</dt>
              <dd className="mt-1 text-base font-semibold text-deep">
                {shownTotal == null ? (
                  program ? (
                    <span className="flex flex-col gap-1 text-sm font-normal text-muted">
                      <span>{t('emptyMoney')}</span>
                      {(['quad', 'triple', 'double', 'quint'] as const).map((room) =>
                        program.prices[room] == null ? null : (
                          <span key={room}>
                            {t(programKey(room))} · <span className="num">{formatMoney(program.prices[room] * 100, language)}</span>
                          </span>
                        ),
                      )}
                    </span>
                  ) : (
                    t('emptyMoney')
                  )
                ) : (
                  <span className="num">{formatMoney(shownTotal, language)}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('amountPaid')}</dt>
              <dd className="mt-1 text-base font-semibold text-deep"><span className="num">{formatMoney(booking.paidPiasters, language)}</span></dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('remaining')}</dt>
              <dd className="mt-1 text-base font-semibold text-deep"><span className="num">{remaining == null ? t('emptyMoney') : formatMoney(remaining, language)}</span></dd>
            </div>
          </dl>
          {(canEditPrice || canEditPaid) && (
            <div className="space-y-3 border-t border-gold/30 px-4 py-4">
              {canEditPrice && (
                <>
                  <label className="block text-sm font-medium">
                    {t('total')}
                    <input dir="ltr" className="mt-1 w-full rounded-md border border-line px-3 py-2" value={total} onChange={(event) => setTotal(event.target.value)} />
                  </label>
                  {packageQuotePiasters(booking.packageId, booking.programType, programs) != null ? (
                    <p className="text-xs text-muted">{t('packagePriceHint')}</p>
                  ) : program ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted">{t('noPackagePrice')}</p>
                      <div className="flex flex-wrap gap-2">
                        {(['quad', 'triple', 'double', 'quint'] as const).map((room) => {
                          const pounds = program.prices[room]
                          if (pounds == null) return null
                          return (
                            <button
                              key={room}
                              type="button"
                              className="min-h-11 rounded-md border border-line px-3 py-2 text-sm font-semibold"
                              onClick={() => setTotal(formatPounds(pounds * 100))}
                            >
                              {t(programKey(room))} · {formatMoney(pounds * 100, language)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : booking.totalPiasters == null && booking.tripLevel && pricing[booking.tripLevel] != null ? (
                    <p className="text-xs text-muted">{t('priceHint')}</p>
                  ) : null}
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
                  <button type="button" disabled={pending} className="min-h-11 w-full rounded-md border border-line px-3 py-2 text-sm font-semibold sm:w-auto" onClick={() => void run('updateAccounting', { total, paymentPlan: plan, tripLevel: booking.tripLevel ?? 'farBus', hotelName: booking.hotelName })}>
                    {t('save')}
                  </button>
                </>
              )}
              {canEditPaid && (
                <label className="block text-sm font-medium">
                  {t('amountPaid')}
                  <span className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <input dir="ltr" className="w-full rounded-md border border-line px-3 py-2" value={paid} onChange={(event) => setPaid(event.target.value)} />
                    <button type="button" disabled={pending} className="min-h-11 w-full shrink-0 rounded-md border border-line px-3 py-2 text-sm font-semibold sm:w-auto" onClick={() => void run('setAmountPaid', { amountPaid: paid })}>
                      {t('save')}
                    </button>
                  </span>
                </label>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-sm">
        <h2 className="border-b border-gold/30 bg-paper px-4 py-3 font-semibold text-deep">{t('pilgrims')}</h2>
        <ul className="divide-y divide-gold/20">
          {booking.pilgrims.map((pilgrim) => (
            <li key={pilgrim.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <span className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{pilgrim.name}</span>
                <span className="rounded-full bg-paper px-2 py-1 text-xs font-semibold text-deep">{t(categoryKey(pilgrim.category ?? 'adult'))}</span>
                {pilgrimFacts(pilgrim, t).map((fact) => (
                  <span key={fact} className="rounded-full bg-paper px-2 py-1 text-xs text-deep">{fact}</span>
                ))}
                {profile.role === 'admin' && (
                  <TrashButton
                    label={t('removePerson')}
                    className="bg-paper"
                    onClick={() => removal.ask(t('removePerson'), t('confirmRemovePerson'), async () => {
                      const result = await call<{ deleted: boolean }>('removePilgrim', { id: booking.id, pilgrimId: pilgrim.id })
                      if (result.deleted) navigate('/queue')
                    })}
                  />
                )}
              </span>
              <span className="grid w-full gap-2 text-sm sm:flex sm:w-auto sm:flex-wrap sm:gap-4">
                {canTogglePassport ? (
                  <label className="flex min-h-11 items-center gap-2">
                    <input type="checkbox" className="size-5 shrink-0" checked={pilgrim.passportReceived} disabled={pending} onChange={() => void togglePassport(pilgrim.id)} />
                    {t('passportReceived')}
                  </label>
                ) : (
                  <span>{pilgrim.passportReceived ? '✓' : '–'} {t('passportReceived')}</span>
                )}
                {canToggleTravel && halfPaid ? (
                  <>
                    <label className="flex min-h-11 items-center gap-2">
                      <input type="checkbox" className="size-5 shrink-0" checked={pilgrim.visaIssued} disabled={pending} onChange={() => void toggleFlag(pilgrim.id, 'visaIssued')} />
                      {t('visaIssued')}
                    </label>
                    <label className="flex min-h-11 items-center gap-2">
                      <input type="checkbox" className="size-5 shrink-0" checked={pilgrim.ticketIssued} disabled={pending} onChange={() => void toggleFlag(pilgrim.id, 'ticketIssued')} />
                      {t('ticketIssued')}
                    </label>
                  </>
                ) : (
                  <>
                    <span className={halfPaid ? '' : 'text-muted'}>{pilgrim.visaIssued ? '✓' : '–'} {t('visaIssued')}</span>
                    <span className={halfPaid ? '' : 'text-muted'}>{pilgrim.ticketIssued ? '✓' : '–'} {t('ticketIssued')}</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        {!halfPaid && <p className="mt-3 text-sm text-muted">{t('executionLocked')}</p>}
      </section>

      <section className="space-y-3">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block overflow-hidden rounded-2xl border border-gold/40 bg-card text-sm font-medium shadow-sm">
            <span className="block border-b border-gold/30 bg-paper px-4 py-3">{t('customerNotes')}</span>
            <textarea rows={4} className="w-full px-4 py-3 font-normal" value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} />
          </label>
          <label className="block overflow-hidden rounded-2xl border border-gold/40 bg-card text-sm font-medium shadow-sm">
            <span className="block border-b border-gold/30 bg-paper px-4 py-3">{t('internalNotes')}</span>
            <textarea rows={4} className="w-full px-4 py-3 font-normal" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
          </label>
        </div>
        <button type="button" disabled={pending} className="min-h-11 w-full rounded-full bg-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto" onClick={() => void run('setNotes', { customerNotes, internalNotes })}>
          {t('save')}
        </button>
      </section>

      <section className="space-y-3">
        <Banner code={error} />
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          {moving && canAct(profile.role, 'reception') && booking.stage === 'reception' && (
            <button type="button" disabled={pending} className="min-h-11 rounded-md bg-gold px-4 py-2 font-semibold text-white disabled:opacity-50" onClick={() => void run('submitReception')}>
              {t('sendAccounting')}
            </button>
          )}
          {moving && canAct(profile.role, 'accountant') && booking.stage === 'accounting' && (
            <button
              type="button"
              disabled={pending || total.trim() === ''}
              className="min-h-11 rounded-md bg-deep px-4 py-2 font-semibold text-white disabled:opacity-50"
              onClick={() =>
                void (async () => {
                  setPending(true)
                  setError(null)
                  try {
                    await call('updateAccounting', { id: booking.id, total, paymentPlan: plan, tripLevel: booking.tripLevel ?? 'farBus', hotelName: booking.hotelName })
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
          {moving && canAct(profile.role, 'auditor') && booking.stage === 'audit' && (
            <button
              type="button"
              disabled={pending || !passportsComplete(booking) || !meetsPaymentRule(booking)}
              className="min-h-11 rounded-md bg-deep px-4 py-2 font-semibold text-white disabled:opacity-50"
              onClick={() => void run('approve')}
            >
              {t('approve')}
            </button>
          )}
          {moving && canAct(profile.role, 'operations') && booking.stage === 'execution' && (
            <button type="button" disabled={pending || !halfPaid || !readyToComplete(booking)} className="min-h-11 rounded-md bg-ok px-4 py-2 font-semibold text-white disabled:opacity-50" onClick={() => setConfirming(true)}>
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
          <div className="rounded-2xl border border-gold/40 bg-card p-4 shadow-sm">
            <label className="block text-sm font-medium">
              {t('reason')}
              <textarea className="mt-1 w-full rounded-md border border-line px-3 py-2" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button
              type="button"
              disabled={pending || reason.trim() === ''}
              className="mt-3 min-h-11 w-full rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:opacity-50 sm:w-auto"
              onClick={() => void run('returnBooking', { reason })}
            >
              {t('returnAction')} — {t(stageKey(previous))}
            </button>
          </div>
        )}
      </section>

      {booking.returns.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-sm">
          <h2 className="border-b border-gold/30 bg-paper px-4 py-3 font-semibold text-deep">{t('history')}</h2>
          <div className="p-4">
          <ol className="space-y-3">
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
          </div>
        </section>
      )}

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-deep/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">{t('complete')}</h2>
            <p className="mt-2 text-sm text-muted">{t('confirmComplete')}</p>
            <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
              <button type="button" className="min-h-11 rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => setConfirming(false)}>
                {t('cancel')}
              </button>
              <button type="button" disabled={pending} className="min-h-11 rounded-md bg-ok px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void run('complete')}>
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {removal.dialog}
    </article>
  )
}
