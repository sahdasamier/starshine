import { Link } from 'react-router-dom'
import {
  compareBookings,
  displayPhone,
  formatDate,
  formatMoney,
  formatStamp,
  isCalendarDate,
  packageById,
  paidPercent,
  showMissingPassport,
  showUnderpaid,
  type AgeCategory,
  type PaymentPlan,
  type ProgramType,
  type Pilgrim,
  type Role,
  type UmrahProgram,
  type Stage,
  type TripLevel,
} from '@shared/domain'
import type { ClientBooking } from '../lib/bookings'
import { useI18n, type MessageKey } from '../lib/i18n'
import { usePrograms } from '../lib/programs'
import { TrashButton } from './icons'

export function Banner({ code }: { code: string | null }) {
  const { t } = useI18n()
  if (!code) return null
  const key = `err.${code}` as MessageKey
  return (
    <p className="rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
      {t(key)}
    </p>
  )
}

export function Marks({ booking }: { booking: ClientBooking }) {
  const { t } = useI18n()
  const marks = [
    showUnderpaid(booking) ? t('underpaid') : null,
    showMissingPassport(booking) ? t('missingPassport') : null,
  ].filter(Boolean)
  if (marks.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1">
      {marks.map((mark) => (
        <span key={mark} className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-deep">
          {mark}
        </span>
      ))}
    </span>
  )
}

export function stageKey(stage: Stage): MessageKey {
  if (stage === 'reception') return 'stageReception'
  if (stage === 'accounting') return 'stageAccounting'
  if (stage === 'audit') return 'stageAudit'
  if (stage === 'execution') return 'stageExecution'
  return 'stageCompleted'
}

export function roleKey(role: Role): MessageKey {
  if (role === 'admin') return 'roleAdmin'
  if (role === 'reception') return 'roleReception'
  if (role === 'accountant') return 'roleAccountant'
  if (role === 'auditor') return 'roleAuditor'
  return 'roleOperations'
}

export function categoryKey(category: AgeCategory): MessageKey {
  if (category === 'infant') return 'categoryInfant'
  if (category === 'child') return 'categoryChild'
  if (category === 'minor') return 'categoryMinor'
  return 'categoryAdult'
}

export function pilgrimFacts(pilgrim: { category: AgeCategory; gender: '' | 'man' | 'woman'; militaryCompleted: boolean | null; papersConfirmed: boolean; guardianName: string }, t: (key: MessageKey) => string) {
  if (pilgrim.category === 'adult') {
    const facts: string[] = []
    if (pilgrim.gender === 'man') facts.push(t('genderMan'))
    if (pilgrim.gender === 'woman') facts.push(t('genderWoman'))
    if (pilgrim.gender === 'man' && pilgrim.militaryCompleted === true) facts.push(t('militaryDone'))
    if (pilgrim.gender === 'man' && pilgrim.militaryCompleted === false) facts.push(t('militaryNotDone'))
    return facts
  }
  if (!pilgrim.guardianName && !pilgrim.papersConfirmed) return []
  return [pilgrim.papersConfirmed ? t('papersConfirmed') : t('papersMissing'), pilgrim.guardianName ? `${t('guardian')}: ${pilgrim.guardianName}` : ''].filter(Boolean)
}

export function departureLabel(value: string, t: (key: MessageKey) => string): string {
  if (value === 'shaban') return t('seasonShaban')
  if (value === 'ramadan') return t('seasonRamadan')
  if (value === 'last10') return t('seasonLast10')
  if (isCalendarDate(value)) return formatDate(value)
  return value
}

export function programKey(program: ProgramType): MessageKey {
  if (program === 'double') return 'programDouble'
  if (program === 'triple') return 'programTriple'
  if (program === 'quad') return 'programQuad'
  return 'programQuint'
}

export function planKey(plan: PaymentPlan): MessageKey {
  return plan === 'cash' ? 'planCash' : 'planInstallments'
}

export function tierKey(tier: TripLevel): MessageKey {
  if (tier === 'farBus') return 'tierFarBus'
  if (tier === 'close') return 'tierClose'
  return 'tierCloseVip'
}

export function referralLabel(value: string, t: (key: MessageKey) => string): string {
  if (value === 'marketer') return t('referralMarketer')
  if (value === 'office') return t('referralOffice')
  return value
}

export function statusKey(status: 'confirmed' | 'withdrawn'): MessageKey {
  return status === 'withdrawn' ? 'statusWithdrawn' : 'statusConfirmed'
}

function Fact({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`whitespace-pre-wrap ${numeric ? 'num' : ''}`}>{value}</dd>
    </div>
  )
}

function flagText(on: boolean, label: string) {
  return `${on ? '✓' : '–'} ${label}`
}

function PilgrimLines({ booking }: { booking: ClientBooking }) {
  const { t } = useI18n()
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {booking.pilgrims.map((pilgrim) => (
        <li key={pilgrim.id} className="space-y-2 px-3 py-3 text-sm">
          <p className="font-medium">
            {pilgrim.name}
            <span className="ms-2 text-xs text-muted">{[t(categoryKey(pilgrim.category ?? 'adult')), ...pilgrimFacts(pilgrim, t)].join(' · ')}</span>
          </p>
          <p className="text-muted">
            {flagText(pilgrim.passportReceived, t('passportReceived'))}
            <span className="mx-2">·</span>
            {flagText(pilgrim.visaIssued, t('visaIssued'))}
            <span className="mx-2">·</span>
            {flagText(pilgrim.ticketIssued, t('ticketIssued'))}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function FileFacts({ booking, people = true }: { booking: ClientBooking; people?: boolean }) {
  const { t, language } = useI18n()
  const { programs } = usePrograms()
  const percent = paidPercent(booking.totalPiasters, booking.paidPiasters)
  const remaining = booking.totalPiasters == null ? null : booking.totalPiasters - booking.paidPiasters
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm lg:grid-cols-4">
        <Fact label={t('stageColumn')} value={t(stageKey(booking.stage))} />
        <Fact label={t('bookingStatus')} value={t(statusKey(booking.bookingStatus ?? 'confirmed'))} />
        <Fact label={t('phone')} value={displayPhone(booking.phone)} numeric />
        <Fact label={t('departureDate')} value={departureLabel(booking.departureDate, t)} numeric />
        <Fact label={t('programType')} value={t(programKey(booking.programType))} />
        <Fact label={t('umrahProgram')} value={booking.packageId ? (language === 'ar' ? packageById(booking.packageId, programs)?.nameAr : packageById(booking.packageId, programs)?.nameEn) ?? t('emptyMoney') : t('emptyMoney')} />
        <Fact label={t('makkahHotel')} value={booking.packageId ? (language === 'ar' ? packageById(booking.packageId, programs)?.makkahAr : packageById(booking.packageId, programs)?.makkahEn) ?? t('emptyMoney') : t('emptyMoney')} />
        <Fact label={t('madinahHotel')} value={booking.packageId ? (language === 'ar' ? packageById(booking.packageId, programs)?.madinahAr : packageById(booking.packageId, programs)?.madinahEn) ?? t('emptyMoney') : t('emptyMoney')} />
        <Fact label={t('referralType')} value={booking.referralType ? referralLabel(booking.referralType, t) : t('emptyMoney')} />
        <Fact label={t('referrerName')} value={booking.referrerName || t('emptyMoney')} />
        <Fact label={t('paymentPlan')} value={t(planKey(booking.paymentPlan))} />
        <Fact label={t('total')} value={booking.totalPiasters == null ? t('emptyMoney') : formatMoney(booking.totalPiasters, language)} numeric />
        <Fact label={t('amountPaid')} value={formatMoney(booking.paidPiasters, language)} numeric />
        <Fact label={t('remaining')} value={remaining == null ? t('emptyMoney') : formatMoney(remaining, language)} numeric />
        <Fact label={t('paidPercent')} value={percent == null ? t('emptyMoney') : `${percent}%`} numeric />
        <Fact label={t('createdBy')} value={booking.createdByName || t('emptyMoney')} />
      </dl>
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <p className="text-xs text-muted">{t('customerNotes')}</p>
          <p className="whitespace-pre-wrap">{booking.customerNotes || t('noNotes')}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{t('internalNotes')}</p>
          <p className="whitespace-pre-wrap">{booking.internalNotes || t('noNotes')}</p>
        </div>
      </div>
      {people && <PilgrimLines booking={booking} />}
    </div>
  )
}

function packageName(booking: ClientBooking, language: 'ar' | 'en', programs: readonly UmrahProgram[]) {
  const program = packageById(booking.packageId, programs)
  if (!program) return ''
  return language === 'ar' ? program.nameAr : program.nameEn
}

function hotelLine(booking: ClientBooking, language: 'ar' | 'en', which: 'makkah' | 'madinah', programs: readonly UmrahProgram[]) {
  const program = packageById(booking.packageId, programs)
  if (!program) return ''
  if (which === 'makkah') return language === 'ar' ? program.makkahAr : program.makkahEn
  return language === 'ar' ? program.madinahAr : program.madinahEn
}

function peopleText(booking: ClientBooking, value: (pilgrim: Pilgrim) => string) {
  return booking.pilgrims
    .map((pilgrim) => (booking.pilgrims.length > 1 ? `${pilgrim.name}: ${value(pilgrim)}` : value(pilgrim)))
    .join('\n')
}

export function FileSheet({
  bookings,
  empty,
  compare = compareBookings,
  onRemove,
}: {
  bookings: ClientBooking[]
  empty: string
  compare?: (left: ClientBooking, right: ClientBooking) => number
  onRemove?: (booking: ClientBooking) => void
}) {
  const { t, language } = useI18n()
  const { programs } = usePrograms()
  const rows = [...bookings].sort(compare)
  if (rows.length === 0) return <p className="px-4 py-10 text-center text-muted">{empty}</p>
  const blank = '—'
  const yesNo = (value: boolean) => (value ? t('yes') : t('no'))
  const head = 'sticky top-0 z-20 border-b-2 border-e border-gold bg-deep px-3 py-2 text-start text-xs font-semibold whitespace-nowrap text-white'
  const pinHead = `${head} z-30`
  const pinId = language === 'ar' ? 'right-0' : 'left-0'
  const pinName = language === 'ar' ? 'right-16' : 'left-16'
  return (
    <div className="max-h-[calc(100dvh-13rem)] overflow-auto">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className={`${pinHead} ${pinId} w-16 min-w-16 border-s`}>{t('file')}</th>
            <th className={`${pinHead} ${pinName} min-w-44`}>{t('contactName')}</th>
            {[
              t('phone'),
              t('departureDate'),
              t('umrahProgram'),
              t('programType'),
              t('category'),
              t('paymentPlan'),
              t('total'),
              t('amountPaid'),
              t('remaining'),
              t('stageColumn'),
              t('bookingStatus'),
              t('referralType'),
              t('passportReceived'),
              t('createdBy'),
              t('customerNotes'),
              t('internalNotes'),
              t('pilgrimName'),
              t('makkahHotel'),
              t('madinahHotel'),
              t('paidPercent'),
              t('gender'),
              t('military'),
              t('papersConfirmed'),
              t('guardian'),
              t('visaIssued'),
              t('ticketIssued'),
              t('history'),
              t('open'),
            ].map((heading) => (
              <th key={heading} className={head}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((booking, index) => {
            const withdrawn = booking.bookingStatus === 'withdrawn'
            const stripe = withdrawn ? 'bg-red-50' : index % 2 === 1 ? 'bg-paper' : 'bg-white'
            const base = `border-b border-e border-gold/30 px-3 py-2 align-top ${stripe}`
            const cell = `${base} whitespace-nowrap`
            const wrap = `${base} max-w-64 whitespace-pre-line`
            const remaining = booking.totalPiasters == null ? null : booking.totalPiasters - booking.paidPiasters
            const percent = paidPercent(booking.totalPiasters, booking.paidPiasters)
            const strike = withdrawn ? 'text-danger line-through' : ''
            return (
              <tr key={booking.id}>
                <td className={`${cell} sticky ${pinId} z-10 w-16 min-w-16 border-s num font-semibold text-deep ${strike}`}>{booking.fileNumber}</td>
                <td className={`${cell} sticky ${pinName} z-10 min-w-44 font-semibold text-deep ${strike}`}>{booking.contactName}</td>
                <td className={`${cell} num`}>{displayPhone(booking.phone)}</td>
                <td className={`${cell} num`}>{departureLabel(booking.departureDate, t)}</td>
                <td className={cell}>{packageName(booking, language, programs) || blank}</td>
                <td className={cell}>{t(programKey(booking.programType))}</td>
                <td className={wrap}>{peopleText(booking, (pilgrim) => t(categoryKey(pilgrim.category ?? 'adult')))}</td>
                <td className={cell}>{t(planKey(booking.paymentPlan))}</td>
                <td className={`${cell} num`}>{booking.totalPiasters == null ? blank : formatMoney(booking.totalPiasters, language)}</td>
                <td className={`${cell} num`}>{formatMoney(booking.paidPiasters, language)}</td>
                <td className={`${cell} num`}>{remaining == null ? blank : formatMoney(remaining, language)}</td>
                <td className={cell}>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${booking.stage === 'completed' ? 'bg-ok/15 text-ok' : 'bg-deep/10 text-deep'}`}>{t(stageKey(booking.stage))}</span>
                </td>
                <td className={`${cell} ${withdrawn ? 'font-semibold text-danger' : ''}`}>{t(statusKey(booking.bookingStatus ?? 'confirmed'))}</td>
                <td className={cell}>{[booking.referralType ? referralLabel(booking.referralType, t) : '', booking.referrerName].filter(Boolean).join(' — ') || blank}</td>
                <td className={wrap}>{peopleText(booking, (pilgrim) => yesNo(pilgrim.passportReceived))}</td>
                <td className={cell}>{booking.createdByName || blank}</td>
                <td className={`${wrap} max-w-72`}>{booking.customerNotes || blank}</td>
                <td className={`${wrap} max-w-72`}>{booking.internalNotes || blank}</td>
                <td className={wrap}>{booking.pilgrims.map((pilgrim) => pilgrim.name).join('\n')}</td>
                <td className={cell}>{hotelLine(booking, language, 'makkah', programs) || blank}</td>
                <td className={cell}>{hotelLine(booking, language, 'madinah', programs) || blank}</td>
                <td className={`${cell} num`}>{percent == null ? blank : `${percent}%`}</td>
                <td className={wrap}>{peopleText(booking, (pilgrim) => (pilgrim.gender === 'man' ? t('genderMan') : pilgrim.gender === 'woman' ? t('genderWoman') : blank))}</td>
                <td className={wrap}>{peopleText(booking, (pilgrim) => (pilgrim.gender === 'man' ? yesNo(pilgrim.militaryCompleted === true) : blank))}</td>
                <td className={wrap}>{peopleText(booking, (pilgrim) => (pilgrim.category === 'adult' ? blank : yesNo(pilgrim.papersConfirmed)))}</td>
                <td className={wrap}>{peopleText(booking, (pilgrim) => (pilgrim.category === 'adult' ? blank : pilgrim.guardianName || blank))}</td>
                <td className={wrap}>{peopleText(booking, (pilgrim) => yesNo(pilgrim.visaIssued))}</td>
                <td className={wrap}>{peopleText(booking, (pilgrim) => yesNo(pilgrim.ticketIssued))}</td>
                <td className={wrap}>
                  {booking.returns.length === 0
                    ? blank
                    : booking.returns
                        .map((note) => `${note.byName} · ${formatStamp(note.at)} · ${t(stageKey(note.from))} → ${t(stageKey(note.to))}: ${note.reason}`)
                        .join('\n')}
                </td>
                <td className={cell}>
                  <span className="inline-flex items-center gap-2">
                    {onRemove && <TrashButton label={t('removeFile')} onClick={() => onRemove(booking)} />}
                    <Link to={`/bookings/${booking.id}`} className="font-semibold text-gold">
                      {t('open')}
                    </Link>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function BookingTable({
  bookings,
  empty,
  compare = compareBookings,
  onRemove,
}: {
  bookings: ClientBooking[]
  empty: string
  compare?: (left: ClientBooking, right: ClientBooking) => number
  onRemove?: (booking: ClientBooking) => void
}) {
  const { t, language } = useI18n()
  const rows = [...bookings].sort(compare)
  if (rows.length === 0) return <p className="px-4 py-10 text-center text-muted">{empty}</p>
  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((booking) => {
          const percent = paidPercent(booking.totalPiasters, booking.paidPiasters)
          return (
            <li key={booking.id} className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`num text-lg font-semibold text-deep ${booking.bookingStatus === 'withdrawn' ? 'line-through' : ''}`}>{booking.fileNumber}</p>
                  <p className={`truncate font-medium ${booking.bookingStatus === 'withdrawn' ? 'text-danger line-through' : ''}`}>{booking.contactName}</p>
                  {booking.bookingStatus === 'withdrawn' && <p className="mt-1 w-fit rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">{t('statusWithdrawn')}</p>}
                </div>
                <span className="flex shrink-0 items-center gap-3">
                  {onRemove && <TrashButton label={t('removeFile')} onClick={() => onRemove(booking)} />}
                  <Link to={`/bookings/${booking.id}`} className="font-semibold text-blue">
                    {t('open')}
                  </Link>
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">{t('stageColumn')}</dt>
                  <dd>{t(stageKey(booking.stage))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t('phone')}</dt>
                  <dd className="num">{displayPhone(booking.phone)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t('departureDate')}</dt>
                  <dd className="num">{departureLabel(booking.departureDate, t)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t('paidPercent')}</dt>
                  <dd className="num">{percent == null ? t('emptyMoney') : `${percent}%`}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t('programType')}</dt>
                  <dd>{t(programKey(booking.programType))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t('paymentPlan')}</dt>
                  <dd>{t(planKey(booking.paymentPlan))}</dd>
                </div>
              </dl>
              <Marks booking={booking} />
            </li>
          )
        })}
      </ul>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-paper text-start text-muted">
          <tr>
            {[t('file'), t('stageColumn'), t('contactName'), t('phone'), t('departureDate'), t('programType'), t('paymentPlan'), t('paidPercent'), ''].map((heading) => (
              <th key={heading || 'open'} className="px-3 py-2 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((booking) => {
            const percent = paidPercent(booking.totalPiasters, booking.paidPiasters)
            return (
              <tr key={booking.id} className="border-t border-line">
                <td className={`num px-3 py-3 font-semibold text-deep ${booking.bookingStatus === 'withdrawn' ? 'line-through' : ''}`}>{booking.fileNumber}</td>
                <td className="px-3 py-3">
                  <div>{t(stageKey(booking.stage))}</div>
                  {booking.bookingStatus === 'withdrawn' && <div className="mt-1 w-fit rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">{t('statusWithdrawn')}</div>}
                </td>
                <td className={`px-3 py-3 ${booking.bookingStatus === 'withdrawn' ? 'text-danger line-through' : ''}`}>{booking.contactName}</td>
                <td className="num px-3 py-3">{displayPhone(booking.phone)}</td>
                <td className="num px-3 py-3">{departureLabel(booking.departureDate, t)}</td>
                <td className="px-3 py-3">{t(programKey(booking.programType))}</td>
                <td className="px-3 py-3">{t(planKey(booking.paymentPlan))}</td>
                <td className="num px-3 py-3">
                  <div>{percent == null ? t('emptyMoney') : `${percent}%`}</div>
                  <div className="text-xs text-muted">
                    {booking.totalPiasters == null ? '' : formatMoney(booking.paidPiasters, language)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Marks booking={booking} />
                    {onRemove && <TrashButton label={t('removeFile')} onClick={() => onRemove(booking)} />}
                    <Link to={`/bookings/${booking.id}`} className="font-semibold text-blue">
                      {t('open')}
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </>
  )
}

export function ScheduleSheet({
  bookings,
  empty,
  onRemove,
}: {
  bookings: ClientBooking[]
  empty: string
  onRemove?: (booking: ClientBooking, pilgrimId: string) => void
}) {
  const { t, language } = useI18n()
  const { programs } = usePrograms()
  const rows = [...bookings].sort(compareBookings).flatMap((booking) => booking.pilgrims.map((pilgrim) => ({ booking, pilgrim })))
  if (rows.length === 0) return <p className="px-4 py-10 text-center text-muted">{empty}</p>
  const blank = '—'
  const yesNo = (value: boolean) => (value ? t('yes') : t('no'))
  const pinName = language === 'ar' ? 'right-0' : 'left-0'
  const pinFile = language === 'ar' ? 'right-44' : 'left-44'
  const head = 'sticky top-0 z-20 border-b-2 border-gold bg-deep px-3 py-2 text-start text-xs font-semibold whitespace-nowrap text-white'
  return (
    <div className="max-h-[calc(100dvh-16rem)] overflow-auto">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className={`${head} z-30 ${pinName} w-44 min-w-44`}>{t('pilgrimName')}</th>
            <th className={`${head} z-30 ${pinFile} w-16 min-w-16`}>{t('file')}</th>
            {[
              t('contactName'),
              t('phone'),
              t('umrahProgram'),
              t('programType'),
              t('category'),
              t('gender'),
              t('military'),
              t('papersConfirmed'),
              t('guardian'),
              t('passportReceived'),
              t('visaIssued'),
              t('ticketIssued'),
              t('paymentPlan'),
              t('total'),
              t('amountPaid'),
              t('remaining'),
              t('stageColumn'),
              t('bookingStatus'),
              t('referralType'),
              t('createdBy'),
              t('customerNotes'),
              t('internalNotes'),
              t('makkahHotel'),
              t('madinahHotel'),
              t('paidPercent'),
              t('open'),
            ].map((heading) => (
              <th key={heading} className={head}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ booking, pilgrim }, index) => {
            const stripe = index % 2 === 1 ? 'bg-paper' : 'bg-white'
            const cell = `border-b border-e border-gold/30 px-3 py-2 align-top whitespace-nowrap ${stripe}`
            const wrap = `border-b border-e border-gold/30 px-3 py-2 align-top whitespace-pre-line max-w-64 ${stripe}`
            const remaining = booking.totalPiasters == null ? null : booking.totalPiasters - booking.paidPiasters
            const percent = paidPercent(booking.totalPiasters, booking.paidPiasters)
            const adult = (pilgrim.category ?? 'adult') === 'adult'
            return (
              <tr key={`${booking.id}-${pilgrim.id}`}>
                <td className={`${cell} sticky z-10 ${pinName} w-44 min-w-44 max-w-44 truncate font-semibold text-deep`} title={pilgrim.name}>{pilgrim.name}</td>
                <td className={`${cell} sticky z-10 ${pinFile} num w-16 min-w-16 font-semibold text-deep`}>{booking.fileNumber}</td>
                <td className={cell}>{booking.contactName}</td>
                <td className={`${cell} num`}>{displayPhone(booking.phone)}</td>
                <td className={cell}>{packageName(booking, language, programs) || blank}</td>
                <td className={cell}>{t(programKey(booking.programType))}</td>
                <td className={cell}>{t(categoryKey(pilgrim.category ?? 'adult'))}</td>
                <td className={cell}>{pilgrim.gender === 'man' ? t('genderMan') : pilgrim.gender === 'woman' ? t('genderWoman') : blank}</td>
                <td className={cell}>{pilgrim.gender === 'man' ? yesNo(pilgrim.militaryCompleted === true) : blank}</td>
                <td className={cell}>{adult ? blank : yesNo(pilgrim.papersConfirmed)}</td>
                <td className={cell}>{adult ? blank : pilgrim.guardianName || blank}</td>
                <td className={cell}>{yesNo(pilgrim.passportReceived)}</td>
                <td className={cell}>{yesNo(pilgrim.visaIssued)}</td>
                <td className={cell}>{yesNo(pilgrim.ticketIssued)}</td>
                <td className={cell}>{t(planKey(booking.paymentPlan))}</td>
                <td className={`${cell} num`}>{booking.totalPiasters == null ? blank : formatMoney(booking.totalPiasters, language)}</td>
                <td className={`${cell} num`}>{formatMoney(booking.paidPiasters, language)}</td>
                <td className={`${cell} num`}>{remaining == null ? blank : formatMoney(remaining, language)}</td>
                <td className={cell}>{t(stageKey(booking.stage))}</td>
                <td className={cell}>{t(statusKey(booking.bookingStatus ?? 'confirmed'))}</td>
                <td className={cell}>{[booking.referralType ? referralLabel(booking.referralType, t) : '', booking.referrerName].filter(Boolean).join(' — ') || blank}</td>
                <td className={cell}>{booking.createdByName || blank}</td>
                <td className={wrap}>{booking.customerNotes || blank}</td>
                <td className={wrap}>{booking.internalNotes || blank}</td>
                <td className={cell}>{hotelLine(booking, language, 'makkah', programs) || blank}</td>
                <td className={cell}>{hotelLine(booking, language, 'madinah', programs) || blank}</td>
                <td className={`${cell} num`}>{percent == null ? blank : `${percent}%`}</td>
                <td className={cell}>
                  <span className="inline-flex items-center gap-2">
                    {onRemove && <TrashButton label={t('removePerson')} onClick={() => onRemove(booking, pilgrim.id)} />}
                    <Link to={`/bookings/${booking.id}`} className="font-semibold text-gold">
                      {t('open')}
                    </Link>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function PassengerTable({
  bookings,
  empty,
  onRemove,
}: {
  bookings: ClientBooking[]
  empty: string
  onRemove?: (booking: ClientBooking, pilgrimId: string) => void
}) {
  const { t } = useI18n()
  const rows = [...bookings].sort(compareBookings).flatMap((booking) => booking.pilgrims.map((pilgrim) => ({ booking, pilgrim })))
  if (rows.length === 0) return <p className="px-4 py-8 text-center text-muted">{empty}</p>
  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {rows.map(({ booking, pilgrim }) => (
          <li key={`${booking.id}-${pilgrim.id}`} className="space-y-2 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{pilgrim.name}</p>
                <p className="text-xs text-muted">{[t(categoryKey(pilgrim.category ?? 'adult')), ...pilgrimFacts(pilgrim, t)].join(' · ')}</p>
                <p className="num text-sm text-muted">{booking.fileNumber}</p>
              </div>
              <span className="flex shrink-0 items-center gap-3">
                {onRemove && <TrashButton label={t('removePerson')} onClick={() => onRemove(booking, pilgrim.id)} />}
                <Link to={`/bookings/${booking.id}`} className="font-semibold text-blue">
                  {t('open')}
                </Link>
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted">{t('contactName')}</dt>
                <dd className="truncate">{booking.contactName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t('phone')}</dt>
                <dd className="num">{displayPhone(booking.phone)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t('programType')}</dt>
                <dd>{t(programKey(booking.programType))}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t('stageColumn')}</dt>
                <dd>{t(stageKey(booking.stage))}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-paper text-start text-muted">
          <tr>
            {[t('pilgrimName'), t('file'), t('contactName'), t('phone'), t('programType'), t('stageColumn'), ''].map((heading) => (
              <th key={heading || 'open'} className="px-3 py-2 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ booking, pilgrim }) => (
            <tr key={`${booking.id}-${pilgrim.id}`} className="border-t border-line">
              <td className="px-3 py-3 font-medium">
                {pilgrim.name}
                <span className="ms-2 text-xs text-muted">{[t(categoryKey(pilgrim.category ?? 'adult')), ...pilgrimFacts(pilgrim, t)].join(' · ')}</span>
              </td>
              <td className="num px-3 py-3 font-semibold text-deep">{booking.fileNumber}</td>
              <td className="px-3 py-3">{booking.contactName}</td>
              <td className="num px-3 py-3">{displayPhone(booking.phone)}</td>
              <td className="px-3 py-3">{t(programKey(booking.programType))}</td>
              <td className="px-3 py-3">{t(stageKey(booking.stage))}</td>
              <td className="px-3 py-3 text-end">
                <span className="inline-flex items-center gap-3">
                  {onRemove && <TrashButton label={t('removePerson')} onClick={() => onRemove(booking, pilgrim.id)} />}
                  <Link to={`/bookings/${booking.id}`} className="font-semibold text-blue">
                    {t('open')}
                  </Link>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  )
}

export function FieldError({ message }: { message?: string }) {
  const { t } = useI18n()
  if (!message) return null
  return <span className="text-xs text-danger">{t(`err.${message}` as MessageKey)}</span>
}
