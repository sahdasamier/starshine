import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BOOKING_STATUSES, CATEGORIES, GENDERS, PLANS, PROGRAMS, REFERRAL_OTHER, TIERS, TRIP_OTHER, displayPhone, formatMoney, normalizePhone, packageById, packageQuotePiasters, referralChoices, tripChoices, type PaymentPlan } from '@shared/domain'
import { call, errorCode } from '../lib/api'
import type { Role } from '@shared/domain'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { useI18n } from '../lib/i18n'
import { useReferralTypes } from '../lib/referral-types'
import { usePrograms } from '../lib/programs'
import { useTripDates } from '../lib/trip-dates'
import { TrashButton } from '../components/icons'
import { Banner, FieldError, categoryKey, departureLabel, planKey, programKey, referralLabel, roleKey, statusKey } from '../components/ui'
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
  departureDate: z.string().min(1, 'departureDate'),
  otherDeparture: z.string(),
  programType: z.enum(PROGRAMS),
  paymentPlan: z.enum(PLANS),
  tripLevel: z.enum(TIERS),
  packageId: z.string().min(1, 'package'),
  referralType: z.string().min(1, 'referralType'),
  otherReferral: z.string(),
  referrerName: z.string().trim().min(1, 'referrer'),
  bookingStatus: z.enum(BOOKING_STATUSES),
  customerNotes: z.string().max(2000, 'notes'),
  internalNotes: z.string().max(2000, 'notes'),
  enteredById: z.string().min(1, 'enteredBy'),
  pilgrims: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1, 'pilgrimName'),
        category: z.enum(CATEGORIES),
        gender: z.enum(['', ...GENDERS]),
        militaryCompleted: z.enum(['', 'yes', 'no']),
        papersConfirmed: z.boolean(),
        guardianName: z.string(),
        passportReceived: z.boolean(),
      }),
    )
    .min(1, 'pilgrims'),
}).superRefine((values, context) => {
  values.pilgrims.forEach((pilgrim, index) => {
    if (pilgrim.category === 'adult') {
      if (pilgrim.gender !== 'man' && pilgrim.gender !== 'woman') context.addIssue({ code: 'custom', path: ['pilgrims', index, 'gender'], message: 'gender' })
      if (pilgrim.gender === 'man' && pilgrim.militaryCompleted !== 'yes' && pilgrim.militaryCompleted !== 'no') {
        context.addIssue({ code: 'custom', path: ['pilgrims', index, 'militaryCompleted'], message: 'military' })
      }
      return
    }
    if (!pilgrim.guardianName.trim()) context.addIssue({ code: 'custom', path: ['pilgrims', index, 'guardianName'], message: 'guardian' })
  })
  if (values.referralType === REFERRAL_OTHER) {
    const label = values.otherReferral.trim()
    if (!label || label.length > 80 || label.includes('/')) context.addIssue({ code: 'custom', path: ['otherReferral'], message: 'referralType' })
  }
  if (values.departureDate !== TRIP_OTHER) return
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.otherDeparture)) context.addIssue({ code: 'custom', path: ['otherDeparture'], message: 'departureDate' })
})

type FormValues = z.infer<typeof schema>

function blankPilgrim() {
  return { id: crypto.randomUUID(), name: '', category: 'adult' as const, gender: '' as const, militaryCompleted: '' as const, papersConfirmed: false, guardianName: '', passportReceived: false }
}

export function BookingFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { bookings, ready } = useBookings()
  const { t, language } = useI18n()
  const extras = useTripDates()
  const { programs } = usePrograms()
  const referralExtras = useReferralTypes()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [staff, setStaff] = useState<{ uid: string; displayName: string; role: Role }[]>([])
  const existing = bookings.find((booking) => booking.id === id)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactName: '',
      phone: '',
      departureDate: '',
      otherDeparture: '',
      programType: 'quad',
      paymentPlan: 'installments',
      tripLevel: 'farBus',
      packageId: '',
      referralType: '',
      otherReferral: '',
      referrerName: '',
      bookingStatus: 'confirmed',
      customerNotes: '',
      internalNotes: '',
      enteredById: '',
      pilgrims: [blankPilgrim()],
    },
  })
  const pilgrims = useFieldArray({ control: form.control, name: 'pilgrims' })
  const pilgrimRows = form.watch('pilgrims')
  const departureDate = form.watch('departureDate')
  const otherDeparture = form.watch('otherDeparture')
  const referralType = form.watch('referralType')
  const packageId = form.watch('packageId')
  const programType = form.watch('programType')
  const packagePrice = packageQuotePiasters(packageId, programType, programs)
  const selectedPackage = packageById(packageId, programs)
  const chosenDeparture = (departureDate === TRIP_OTHER ? otherDeparture : departureDate).trim()
  const sameDay = chosenDeparture
    ? bookings.filter((booking) => booking.departureDate === chosenDeparture && booking.id !== existing?.id && booking.bookingStatus !== 'withdrawn')
    : []
  const sameDayPeople = sameDay.reduce((count, booking) => count + booking.pilgrims.length, 0)

  useEffect(() => {
    let gone = false
    call<{ staff: { uid: string; displayName: string; role: Role }[] }>('listStaff')
      .then((result) => {
        if (!gone) setStaff(result.staff)
      })
      .catch((caught) => {
        if (!gone) setError(errorCode(caught))
      })
    return () => {
      gone = true
    }
  }, [])

  useEffect(() => {
    if (!existing) return
    form.reset({
      contactName: existing.contactName,
      phone: displayPhone(existing.phone),
      departureDate: existing.departureDate,
      otherDeparture: '',
      programType: existing.programType,
      paymentPlan: existing.paymentPlan,
      tripLevel: existing.tripLevel ?? 'farBus',
      packageId: existing.packageId,
      referralType: existing.referralType,
      otherReferral: '',
      referrerName: existing.referrerName,
      bookingStatus: existing.bookingStatus ?? 'confirmed',
      customerNotes: existing.customerNotes,
      internalNotes: existing.internalNotes,
      enteredById: existing.enteredById,
      pilgrims: existing.pilgrims.map((pilgrim) => ({
        id: pilgrim.id,
        name: pilgrim.name,
        category: pilgrim.category ?? 'adult',
        gender: pilgrim.gender === 'man' || pilgrim.gender === 'woman' ? pilgrim.gender : '',
        militaryCompleted: pilgrim.militaryCompleted === true ? 'yes' : pilgrim.militaryCompleted === false ? 'no' : '',
        papersConfirmed: pilgrim.papersConfirmed === true,
        guardianName: pilgrim.guardianName ?? '',
        passportReceived: pilgrim.passportReceived,
      })),
    })
  }, [existing?.id])

  if (!profile) return null
  const canOpenForm = profile.role === 'admin' || profile.role === 'reception' || profile.role === 'auditor'
  if (!canOpenForm) return <Navigate to="/" replace />
  if (id && ready && !existing) return <p className="text-muted">{t('err.notFound')}</p>
  if (existing && profile.role === 'reception' && existing.stage !== 'reception') return <Navigate to={`/bookings/${existing.id}`} replace />

  async function onSubmit(values: FormValues) {
    setPending(true)
    setError(null)
    try {
      const payload = {
        ...values,
        departureDate: values.departureDate === TRIP_OTHER ? values.otherDeparture.trim() : values.departureDate,
        referralType: values.referralType === REFERRAL_OTHER ? values.otherReferral.trim() : values.referralType,
        pilgrims: values.pilgrims.map((pilgrim) => ({
          id: pilgrim.id,
          name: pilgrim.name,
          category: pilgrim.category,
          passportReceived: pilgrim.passportReceived,
          gender: pilgrim.category === 'adult' ? pilgrim.gender : '',
          militaryCompleted: pilgrim.category === 'adult' && pilgrim.gender === 'man' ? pilgrim.militaryCompleted === 'yes' : null,
          papersConfirmed: pilgrim.category !== 'adult' && pilgrim.papersConfirmed,
          guardianName: pilgrim.category === 'adult' ? '' : pilgrim.guardianName,
        })),
      }
      if (existing) {
        await call('updateReception', { id: existing.id, ...payload })
        navigate(`/bookings/${existing.id}`)
      } else {
        const result = await call<{ id: string }>('createBooking', payload)
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
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('departureDate')}>
            <option value="">{t('departureDate')}</option>
            {tripChoices(extras, existing?.departureDate).map((choice) => (
              <option key={choice} value={choice}>
                {departureLabel(choice, t)}
              </option>
            ))}
            <option value={TRIP_OTHER}>{t('tripOther')}</option>
          </select>
          <FieldError message={form.formState.errors.departureDate?.message} />
          {departureDate === TRIP_OTHER && (
            <>
              <input dir="ltr" type="date" className="mt-2 w-full rounded-md border border-line px-3 py-2" {...form.register('otherDeparture')} />
              <span className="mt-1 block text-xs text-muted">{t('otherDeparture')}</span>
              <FieldError message={form.formState.errors.otherDeparture?.message} />
            </>
          )}
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
        <label className="text-sm font-medium md:col-span-2">
          {t('umrahProgram')}
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('packageId')}>
            <option value="">{t('umrahProgram')}</option>
            {programs.map((item) => (
              <option key={item.id} value={item.id}>
                {language === 'ar' ? item.nameAr : item.nameEn}
              </option>
            ))}
          </select>
          <FieldError message={form.formState.errors.packageId?.message} />
          {selectedPackage && (
            <span className="mt-2 block text-sm text-muted">
              {t('makkahHotel')}: {language === 'ar' ? selectedPackage.makkahAr : selectedPackage.makkahEn}
              <span className="mx-2">·</span>
              {t('madinahHotel')}: {language === 'ar' ? selectedPackage.madinahAr : selectedPackage.madinahEn}
            </span>
          )}
          <span className="mt-3 block text-sm font-medium">
            {t('total')}
            <span className={`mt-1 block ${packagePrice == null ? 'text-sm font-normal text-muted' : 'num text-base font-semibold text-deep'}`}>
              {!packageId || packagePrice == null ? (packageId ? t('noPackagePrice') : t('emptyMoney')) : formatMoney(packagePrice, language)}
            </span>
          </span>
        </label>
        <label className="text-sm font-medium">
          {t('referralType')}
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('referralType')}>
            <option value="">{t('referralType')}</option>
            {referralChoices(referralExtras, existing?.referralType).map((choice) => (
              <option key={choice} value={choice}>
                {referralLabel(choice, t)}
              </option>
            ))}
            <option value={REFERRAL_OTHER}>{t('referralOther')}</option>
          </select>
          <FieldError message={form.formState.errors.referralType?.message} />
          {referralType === REFERRAL_OTHER && (
            <>
              <input className="mt-2 w-full rounded-md border border-line px-3 py-2" {...form.register('otherReferral')} placeholder={t('otherReferral')} />
              <FieldError message={form.formState.errors.otherReferral?.message} />
            </>
          )}
        </label>
        <label className="text-sm font-medium">
          {t('referrerName')}
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('referrerName')} />
          <FieldError message={form.formState.errors.referrerName?.message} />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          {t('createdBy')}
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('enteredById')}>
            <option value="">{t('createdBy')}</option>
            {staff.map((person) => (
              <option key={person.uid} value={person.uid}>
                {person.displayName} — {t(roleKey(person.role))}
              </option>
            ))}
            {existing?.enteredById && !staff.some((person) => person.uid === existing.enteredById) && (
              <option value={existing.enteredById}>{existing.createdByName}</option>
            )}
          </select>
          <span className="mt-1 block text-xs text-muted">{t('enteredByLead')}</span>
          <FieldError message={form.formState.errors.enteredById?.message} />
        </label>
        <label className="text-sm font-medium">
          {t('bookingStatus')}
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('bookingStatus')}>
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(statusKey(status))}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t('paymentPlan')}
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" disabled={Boolean(existing) && profile.role !== 'admin' && profile.role !== 'auditor'} {...form.register('paymentPlan')}>
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {t(planKey(plan as PaymentPlan))}
              </option>
            ))}
          </select>
          {existing && profile.role !== 'admin' && profile.role !== 'auditor' && <span className="mt-1 block text-xs text-muted">{t('planLocked')}</span>}
        </label>
      </div>
      {chosenDeparture && (
        <section className="rounded-xl border border-gold/40 bg-paper p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-semibold text-deep">{t('sameDay')}</h2>
            <p className="text-sm text-muted">
              <span className="num">{departureLabel(chosenDeparture, t)}</span>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-sm font-medium">
                {t('pilgrimName')}
                <input className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register(`pilgrims.${index}.name`)} />
                <FieldError message={form.formState.errors.pilgrims?.[index]?.name?.message} />
              </label>
              <label className="min-w-0 flex-1 text-sm font-medium sm:max-w-48">
                {t('category')}
                <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register(`pilgrims.${index}.category`)}>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(categoryKey(category))}
                    </option>
                  ))}
                </select>
              </label>
              <TrashButton label={t('remove')} disabled={pilgrims.fields.length === 1} onClick={() => pilgrims.remove(index)} />
            </div>
            {pilgrimRows[index]?.category === 'adult' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  {t('gender')}
                  <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register(`pilgrims.${index}.gender`)}>
                    <option value="">{t('gender')}</option>
                    {GENDERS.map((gender) => (
                      <option key={gender} value={gender}>{t(gender === 'man' ? 'genderMan' : 'genderWoman')}</option>
                    ))}
                  </select>
                  <FieldError message={form.formState.errors.pilgrims?.[index]?.gender?.message} />
                </label>
                {pilgrimRows[index]?.gender === 'man' && (
                  <label className="text-sm font-medium">
                    {t('military')}
                    <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register(`pilgrims.${index}.militaryCompleted`)}>
                      <option value="">{t('military')}</option>
                      <option value="yes">{t('militaryDone')}</option>
                      <option value="no">{t('militaryNotDone')}</option>
                    </select>
                    <FieldError message={form.formState.errors.pilgrims?.[index]?.militaryCompleted?.message} />
                  </label>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
                  <span className="text-sm font-semibold text-deep">{t('papersConfirmed')}</span>
                  <input type="checkbox" className="size-5 shrink-0 accent-blue" {...form.register(`pilgrims.${index}.papersConfirmed`)} />
                </label>
                <label className="block text-sm font-medium">
                  {t('guardian')}
                  <input className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register(`pilgrims.${index}.guardianName`)} />
                  <FieldError message={form.formState.errors.pilgrims?.[index]?.guardianName?.message} />
                </label>
              </div>
            )}
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
      <label className="block text-sm font-medium">
        {t('customerNotes')}
        <textarea rows={3} className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('customerNotes')} />
        <FieldError message={form.formState.errors.customerNotes?.message} />
      </label>
      <label className="block text-sm font-medium">
        {t('internalNotes')}
        <textarea rows={3} className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('internalNotes')} />
        <FieldError message={form.formState.errors.internalNotes?.message} />
      </label>
      <Banner code={error} />
      <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-gold px-4 py-2 font-semibold text-white disabled:opacity-50 sm:w-auto">
        {existing ? t('save') : t('submitBooking')}
      </button>
    </form>
  )
}
