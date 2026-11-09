import { Link } from 'react-router-dom'
import {
  compareBookings,
  displayPhone,
  formatDate,
  formatMoney,
  paidPercent,
  showMissingPassport,
  showUnderpaid,
  type PaymentPlan,
  type ProgramType,
  type Role,
  type Stage,
  type TripLevel,
} from '@shared/domain'
import type { ClientBooking } from '../lib/bookings'
import { useI18n, type MessageKey } from '../lib/i18n'

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
  if (tier === 'standard') return 'tierStandard'
  if (tier === 'premium') return 'tierPremium'
  return 'tierVip'
}

export function BookingTable({
  bookings,
  empty,
  compare = compareBookings,
}: {
  bookings: ClientBooking[]
  empty: string
  compare?: (left: ClientBooking, right: ClientBooking) => number
}) {
  const { t, language } = useI18n()
  const rows = [...bookings].sort(compare)
  if (rows.length === 0) return <p className="px-4 py-10 text-center text-muted">{empty}</p>
  return (
    <div className="overflow-x-auto">
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
                <td className="num px-3 py-3 font-semibold text-deep">{booking.fileNumber}</td>
                <td className="px-3 py-3">{t(stageKey(booking.stage))}</td>
                <td className="px-3 py-3">{booking.contactName}</td>
                <td className="num px-3 py-3">{displayPhone(booking.phone)}</td>
                <td className="num px-3 py-3">{formatDate(booking.departureDate)}</td>
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
  )
}

export function PassengerTable({ bookings, empty }: { bookings: ClientBooking[]; empty: string }) {
  const { t } = useI18n()
  const rows = [...bookings].sort(compareBookings).flatMap((booking) => booking.pilgrims.map((pilgrim) => ({ booking, pilgrim })))
  if (rows.length === 0) return <p className="px-4 py-8 text-center text-muted">{empty}</p>
  return (
    <div className="overflow-x-auto">
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
              <td className="px-3 py-3 font-medium">{pilgrim.name}</td>
              <td className="num px-3 py-3 font-semibold text-deep">{booking.fileNumber}</td>
              <td className="px-3 py-3">{booking.contactName}</td>
              <td className="num px-3 py-3">{displayPhone(booking.phone)}</td>
              <td className="px-3 py-3">{t(programKey(booking.programType))}</td>
              <td className="px-3 py-3">{t(stageKey(booking.stage))}</td>
              <td className="px-3 py-3 text-end">
                <Link to={`/bookings/${booking.id}`} className="font-semibold text-blue">
                  {t('open')}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  const { t } = useI18n()
  if (!message) return null
  return <span className="text-xs text-danger">{t(`err.${message}` as MessageKey)}</span>
}
