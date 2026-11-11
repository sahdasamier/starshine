import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PLANS, PROGRAMS, TIERS, canAct, displayPhone, formatDate, normalizePhone, type PaymentPlan } from '@shared/domain'
import { call, errorCode } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { TrashButton } from '../components/icons'
import { Banner, FieldError, planKey, programKey, tierKey } from '../components/ui'
import { useState } from 'react'

const schema = z.object({
  contactName: z.string().trim().min(1, 'contactName'),
  phone: z.string().refine((value) => {
    try {
      normalizePhone(value)
      return true
    } catch {
      return false
    }
  }, 'phone'),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'departureDate'),
  programType: z.enum(PROGRAMS),
  paymentPlan: z.enum(PLANS),
  tripLevel: z.enum(TIERS),
  pilgrims: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1, 'pilgrimName'),
        passportReceived: z.boolean(),
      }),
    )
    .min(1, 'pilgrims'),
})

type FormValues = z.infer<typeof schema>

function blankPilgrim() {
  return { id: crypto.randomUUID(), name: '', passportReceived: false }
}

export function BookingFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { bookings, ready } = useBookings()
  const { t } = useI18n()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const existing = bookings.find((booking) => booking.id === id)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactName: '',
      phone: '',
      departureDate: '',
      programType: 'quad',
      paymentPlan: 'installments',
      tripLevel: 'standard',
      pilgrims: [blankPilgrim()],
    },
  })
  const pilgrims = useFieldArray({ control: form.control, name: 'pilgrims' })
  const departureDate = form.watch('departureDate')
  const sameDay = /^\d{4}-\d{2}-\d{2}$/.test(departureDate)
    ? bookings.filter((booking) => booking.departureDate === departureDate && booking.id !== existing?.id)
    : []
  const sameDayPeople = sameDay.reduce((count, booking) => count + booking.pilgrims.length, 0)

  useEffect(() => {
    if (!existing) return
    form.reset({
      contactName: existing.contactName,
      phone: displayPhone(existing.phone),
      departureDate: existing.departureDate,
      programType: existing.programType,
      paymentPlan: existing.paymentPlan,
      tripLevel: existing.tripLevel ?? 'standard',
      pilgrims: existing.pilgrims.map((pilgrim) => ({
        id: pilgrim.id,
        name: pilgrim.name,
        passportReceived: pilgrim.passportReceived,
      })),
    })
  }, [existing?.id])

  if (!profile) return null
  if (!canAct(profile.role, 'reception')) return <Navigate to="/" replace />
  if (id && ready && !existing) return <p className="text-muted">{t('err.notFound')}</p>
  if (existing && existing.stage !== 'reception' && profile.role !== 'admin') return <Navigate to={`/bookings/${existing.id}`} replace />

  async function onSubmit(values: FormValues) {
    setPending(true)
    setError(null)
    try {
      if (existing) {
        await call('updateReception', { id: existing.id, ...values })
        navigate(`/bookings/${existing.id}`)
      } else {
        const result = await call<{ id: string }>('createBooking', values)
        navigate(`/bookings/${result.id}`)
      }
    } catch (caught) {
      setError(errorCode(caught))
      setPending(false)
    }
  }

  return (
    <form className="space-y-5 rounded-2xl border border-line bg-card p-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <h1 className="text-2xl font-semibold text-deep">{existing ? t('edit') : t('newBooking')}</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          {t('contactName')}
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('contactName')} />
          <FieldError message={form.formState.errors.contactName?.message} />
        </label>
        <label className="text-sm font-medium">
          {t('phone')}
          <input dir="ltr" className="mt-1 w-full rounded-md border border-line px-3 py-2" placeholder="01012345678" {...form.register('phone')} />
          <FieldError message={form.formState.errors.phone?.message} />
        </label>
        <label className="text-sm font-medium">
          {t('departureDate')}
          <input dir="ltr" type="date" className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('departureDate')} />
          <FieldError message={form.formState.errors.departureDate?.message} />
        </label>
        <label className="text-sm font-medium">
          {t('programType')}
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('programType')}>
            {PROGRAMS.map((program) => (
              <option key={program} value={program}>
                {t(programKey(program))}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t('tripLevel')}
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('tripLevel')}>
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {t(tierKey(tier))}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.tripLevel?.message} />
        </label>
        <label className="text-sm font-medium">
          {t('paymentPlan')}
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" disabled={Boolean(existing) && profile.role !== 'admin'} {...form.register('paymentPlan')}>
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {t(planKey(plan as PaymentPlan))}
              </option>
            ))}
          </select>
          {existing && profile.role !== 'admin' && <span className="mt-1 block text-xs text-muted">{t('planLocked')}</span>}
        </label>
      </div>
      {/^\d{4}-\d{2}-\d{2}$/.test(departureDate) && (
        <section className="rounded-xl border border-gold/40 bg-paper p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-semibold text-deep">{t('sameDay')}</h2>
            <p className="text-sm text-muted">
              <span className="num">{formatDate(departureDate)}</span>
              <span className="mx-2">·</span>
              {t('peopleCount')} <span className="num font-semibold text-deep">{sameDayPeople}</span>
            </p>
          </div>
          {sameDayPeople === 0 ? (
            <p className="mt-2 text-sm text-muted">{t('noOneYet')}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line text-sm">
              {sameDay.flatMap((booking) =>
                booking.pilgrims.map((pilgrim) => (
                  <li key={`${booking.id}-${pilgrim.id}`} className="flex items-center justify-between gap-3 py-2">
                    <span className="font-medium">{pilgrim.name}</span>
                    <span className="num text-muted">{booking.fileNumber}</span>
                  </li>
                )),
              )}
            </ul>
          )}
        </section>
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t('pilgrims')}</h2>
          <button type="button" className="text-sm font-semibold text-blue" onClick={() => pilgrims.append(blankPilgrim())}>
            {t('addPilgrim')}
          </button>
        </div>
        {pilgrims.fields.map((field, index) => (
          <div key={field.id} className="space-y-3 rounded-xl border border-line p-3">
            <div className="flex items-end gap-3">
              <label className="min-w-0 flex-1 text-sm font-medium">
                {t('pilgrimName')}
                <input className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register(`pilgrims.${index}.name`)} />
                <FieldError message={form.formState.errors.pilgrims?.[index]?.name?.message} />
              </label>
              <TrashButton label={t('remove')} disabled={pilgrims.fields.length === 1} onClick={() => pilgrims.remove(index)} />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-gold/40 bg-paper px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-deep">{t('passportReceived')}</span>
                <span className="mt-1 block text-xs text-muted">{t('passportCustody')}</span>
              </span>
              <input type="checkbox" className="size-5 shrink-0 accent-blue" {...form.register(`pilgrims.${index}.passportReceived`)} />
            </label>
          </div>
        ))}
      </div>
      <Banner code={error} />
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-gold px-4 py-2 font-semibold text-white disabled:opacity-50 sm:w-auto">
        {existing ? t('save') : t('submitBooking')}
      </button>
    </form>
  )
}
