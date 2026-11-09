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
    <>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((booking) => {
          const percent = paidPercent(booking.totalPiasters, booking.paidPiasters)
          return (
            <li key={booking.id} className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="num text-lg font-semibold text-deep">{booking.fileNumber}</p>
                  <p className="truncate font-medium">{booking.contactName}</p>
                </div>
                <Link to={`/bookings/${booking.id}`} className="shrink-0 font-semibold text-blue">
                  {t('open')}
                </Link>
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
                  <dd className="num">{formatDate(booking.departureDate)}</dd>
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
    </>
  )
}

export function PassengerTable({ bookings, empty }: { bookings: ClientBooking[]; empty: string }) {
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
                <p className="num text-sm text-muted">{booking.fileNumber}</p>
              </div>
              <Link to={`/bookings/${booking.id}`} className="shrink-0 font-semibold text-blue">
                {t('open')}
              </Link>
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
    </>
  )
}

export function FieldError({ message }: { message?: string }) {
  const { t } = useI18n()
  if (!message) return null
  return <span className="text-xs text-danger">{t(`err.${message}` as MessageKey)}</span>
}
