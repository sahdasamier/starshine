export const ROLES = ['admin', 'reception', 'accountant', 'auditor', 'operations'] as const
export const STAGES = ['reception', 'accounting', 'audit', 'execution', 'completed'] as const
export const PROGRAMS = ['double', 'triple', 'quad', 'quint'] as const
export const PLANS = ['cash', 'installments'] as const
export const TIERS = ['standard', 'premium', 'vip'] as const
export const LANGUAGES = ['ar', 'en'] as const

export type Role = (typeof ROLES)[number]
export type Stage = (typeof STAGES)[number]
export type ProgramType = (typeof PROGRAMS)[number]
export type PaymentPlan = (typeof PLANS)[number]
export type TripLevel = (typeof TIERS)[number]
export type Language = (typeof LANGUAGES)[number]

export interface Pricing {
  standard: number | null
  premium: number | null
  vip: number | null
}

export class DomainError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.code = code
    this.name = 'DomainError'
  }
}

export interface Pilgrim {
  id: string
  name: string
  passportReceived: boolean
  visaIssued: boolean
  ticketIssued: boolean
}

export interface ReturnNote {
  byName: string
  byRole: Role
  at: string
  from: Stage
  to: Stage
  reason: string
}

export interface Booking {
  fileNumber: number
  contactName: string
  phone: string
  departureDate: string
  programType: ProgramType
  paymentPlan: PaymentPlan
  tripLevel: TripLevel | null
  hotelName: string
  stage: Stage
  totalPiasters: number | null
  paidPiasters: number
  pilgrims: Pilgrim[]
  returns: ReturnNote[]
}

export interface ReceptionDraft {
  contactName: string
  phone: string
  departureDate: string
  programType: ProgramType
  paymentPlan: PaymentPlan
  tripLevel: TripLevel
  pilgrims: { id: string; name: string; passportReceived: boolean }[]
}

export interface EmployeeInput {
  displayName: string
  email: string
  password: string
  role: Role
}

const MAX_NAME = 120
const MAX_REASON = 1000
const MAX_PILGRIMS = 40

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value)
}

export function isProgram(value: string): value is ProgramType {
  return (PROGRAMS as readonly string[]).includes(value)
}

export function isPlan(value: string): value is PaymentPlan {
  return (PLANS as readonly string[]).includes(value)
}

export function isTier(value: string): value is TripLevel {
  return (TIERS as readonly string[]).includes(value)
}

export function emptyPricing(): Pricing {
  return { standard: null, premium: null, vip: null }
}

export function assertHotelName(value: string) {
  const hotelName = value.trim()
  if (hotelName.length > MAX_NAME) throw new DomainError('hotelName')
  return hotelName
}

export function assertPricing(input: Pricing): Pricing {
  const price = (value: number | null) => {
    if (value == null) return null
    if (!Number.isInteger(value) || value <= 0 || value > 100_000_000_00) throw new DomainError('total')
    return value
  }
  return { standard: price(input.standard), premium: price(input.premium), vip: price(input.vip) }
}

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value)
}

export function normalizePhone(input: string): string {
  const compact = input.trim().replace(/[\s-]/g, '')
  const digits = compact.replace(/^\+/, '')
  if (!/^\d+$/.test(digits)) throw new DomainError('phone')
  if (digits.startsWith('20') && digits.length === 12 && digits[2] === '1') return `+${digits}`
  if (digits.startsWith('01') && digits.length === 11) return `+20${digits.slice(1)}`
  throw new DomainError('phone')
}

export function displayPhone(stored: string): string {
  const digits = stored.replace(/\D/g, '')
  if (digits.startsWith('20') && digits.length === 12) return `0${digits.slice(2)}`
  return stored
}

export function assertPersonName(value: string, code: string) {
  const name = value.trim()
  if (!name || name.length > MAX_NAME) throw new DomainError(code)
  return name
}

export function assertEmail(value: string) {
  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new DomainError('email')
  return email
}

export function assertPassword(value: string) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 100) throw new DomainError('password')
  return value
}

export function assertDepartureDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new DomainError('departureDate')
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new DomainError('departureDate')
  }
  return value
}

export function assertReceptionDraft(draft: ReceptionDraft): ReceptionDraft {
  const contactName = assertPersonName(draft.contactName, 'contactName')
  const phone = normalizePhone(draft.phone)
  const departureDate = assertDepartureDate(draft.departureDate)
  if (!isProgram(draft.programType)) throw new DomainError('programType')
  if (!isPlan(draft.paymentPlan)) throw new DomainError('paymentPlan')
  if (!isTier(draft.tripLevel)) throw new DomainError('tripLevel')
  if (!Array.isArray(draft.pilgrims) || draft.pilgrims.length < 1 || draft.pilgrims.length > MAX_PILGRIMS) {
    throw new DomainError('pilgrims')
  }
  const ids = new Set<string>()
  const pilgrims = draft.pilgrims.map((pilgrim) => {
    const id = pilgrim.id.trim()
    if (!id || id.length > 80 || ids.has(id)) throw new DomainError('pilgrimId')
    ids.add(id)
    return {
      id,
      name: assertPersonName(pilgrim.name, 'pilgrimName'),
      passportReceived: pilgrim.passportReceived === true,
    }
  })
  return { contactName, phone, departureDate, programType: draft.programType, paymentPlan: draft.paymentPlan, tripLevel: draft.tripLevel, pilgrims }
}

export function emptyBooking(fileNumber: number, draft: ReceptionDraft): Booking {
  const clean = assertReceptionDraft(draft)
  return {
    fileNumber,
    contactName: clean.contactName,
    phone: clean.phone,
    departureDate: clean.departureDate,
    programType: clean.programType,
    paymentPlan: clean.paymentPlan,
    tripLevel: clean.tripLevel,
    hotelName: '',
    stage: 'accounting',
    totalPiasters: null,
    paidPiasters: 0,
    pilgrims: clean.pilgrims.map((pilgrim) => ({
      ...pilgrim,
      visaIssued: false,
      ticketIssued: false,
    })),
    returns: [],
  }
}

export function applyReceptionEdit(booking: Booking, draft: ReceptionDraft, options?: { anyStage?: boolean; allowOpen?: boolean }): Booking {
  const stageOk = booking.stage === 'reception' || (options?.allowOpen && booking.stage !== 'completed')
  if (!options?.anyStage && !stageOk) throw new DomainError('stage')
  const clean = assertReceptionDraft({ ...draft, paymentPlan: options?.anyStage ? draft.paymentPlan : booking.paymentPlan })
  const previous = new Map(booking.pilgrims.map((pilgrim) => [pilgrim.id, pilgrim]))
  return {
    ...booking,
    contactName: clean.contactName,
    phone: clean.phone,
    departureDate: clean.departureDate,
    programType: clean.programType,
    paymentPlan: clean.paymentPlan,
    tripLevel: clean.tripLevel,
    pilgrims: clean.pilgrims.map((pilgrim) => {
      const existing = previous.get(pilgrim.id)
      return {
        id: pilgrim.id,
        name: pilgrim.name,
        passportReceived: pilgrim.passportReceived,
        visaIssued: existing?.visaIssued ?? false,
        ticketIssued: existing?.ticketIssued ?? false,
      }
    }),
  }
}

export function parsePoundsToPiasters(input: string): number {
  const text = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new DomainError('money')
  const [whole, frac = ''] = text.split('.')
  const piasters = Number(whole) * 100 + Number((frac + '00').slice(0, 2))
  if (!Number.isSafeInteger(piasters)) throw new DomainError('money')
  return piasters
}

export function formatPounds(piasters: number): string {
  const abs = Math.abs(piasters)
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return `${piasters < 0 ? '-' : ''}${whole}.${frac}`
}

export function formatMoney(piasters: number, language: Language): string {
  const unit = language === 'ar' ? 'ج.م' : 'EGP'
  return `${formatPounds(piasters)} ${unit}`
}

export function paidPercent(total: number | null, paid: number): number | null {
  if (total == null || total <= 0) return null
  return Math.round((paid * 100) / total)
}

export function meetsHalfPaid(booking: Pick<Booking, 'totalPiasters' | 'paidPiasters'>): boolean {
  const total = booking.totalPiasters
  if (total == null || total <= 0) return false
  return booking.paidPiasters * 2 >= total
}

export function meetsPaymentRule(booking: Pick<Booking, 'paymentPlan' | 'totalPiasters' | 'paidPiasters'>): boolean {
  return meetsHalfPaid(booking)
}

export function passportsComplete(booking: Booking): boolean {
  return booking.pilgrims.length > 0 && booking.pilgrims.every((pilgrim) => pilgrim.passportReceived)
}

export function readyToComplete(booking: Booking): boolean {
  return booking.pilgrims.length > 0 && booking.pilgrims.every((pilgrim) => pilgrim.visaIssued && pilgrim.ticketIssued)
}

export function showUnderpaid(booking: Booking): boolean {
  return (
    (booking.stage === 'audit' || booking.stage === 'execution' || booking.stage === 'completed') &&
    !meetsPaymentRule(booking)
  )
}

export function showMissingPassport(booking: Booking): boolean {
  return (booking.stage === 'accounting' || booking.stage === 'audit') && booking.pilgrims.some((pilgrim) => !pilgrim.passportReceived)
}

export function backStage(stage: Stage): Stage | null {
  if (stage === 'accounting') return 'reception'
  if (stage === 'audit') return 'accounting'
  if (stage === 'execution') return 'audit'
  return null
}

export function stageOwner(stage: Stage): Role | null {
  if (stage === 'reception') return 'reception'
  if (stage === 'accounting') return 'accountant'
  if (stage === 'audit') return 'auditor'
  if (stage === 'execution') return 'operations'
  return null
}

export function canAct(role: Role, required: Role): boolean {
  return role === 'admin' || role === required
}

export function assertTotal(totalPiasters: number, paidPiasters: number) {
  if (!Number.isInteger(totalPiasters) || totalPiasters <= 0 || totalPiasters > 100_000_000_00) {
    throw new DomainError('total')
  }
  if (totalPiasters < paidPiasters) throw new DomainError('totalBelowPaid')
}

export function assertPaid(paidPiasters: number, totalPiasters: number | null) {
  if (totalPiasters == null) throw new DomainError('totalMissing')
  if (!Number.isInteger(paidPiasters) || paidPiasters < 0 || paidPiasters > totalPiasters) {
    throw new DomainError('amountPaid')
  }
}

export function applyAccounting(
  booking: Booking,
  totalPiasters: number,
  paymentPlan: PaymentPlan,
  details: { tripLevel: TripLevel; hotelName?: string },
  options?: { anyStage?: boolean; allowAudit?: boolean },
): Booking {
  const stageOk = booking.stage === 'accounting' || (options?.allowAudit && booking.stage === 'audit')
  if (!options?.anyStage && !stageOk) throw new DomainError('stage')
  if (!isPlan(paymentPlan)) throw new DomainError('paymentPlan')
  if (!isTier(details.tripLevel)) throw new DomainError('tripLevel')
  assertTotal(totalPiasters, booking.paidPiasters)
  const hotelName = booking.stage === 'audit' && (options?.allowAudit || options?.anyStage)
    ? assertHotelName(details.hotelName ?? '')
    : booking.hotelName
  return { ...booking, totalPiasters, paymentPlan, tripLevel: details.tripLevel, hotelName }
}

export function applyHotel(booking: Booking, hotelName: string, options?: { anyStage?: boolean }): Booking {
  if (!options?.anyStage && booking.stage !== 'audit') throw new DomainError('stage')
  return { ...booking, hotelName: assertHotelName(hotelName) }
}

export function normalizeBooking(booking: Booking): Booking {
  return {
    ...booking,
    hotelName: typeof booking.hotelName === 'string' ? booking.hotelName : '',
    tripLevel: booking.tripLevel && isTier(booking.tripLevel) ? booking.tripLevel : null,
  }
}

export function applyPaid(booking: Booking, paidPiasters: number, options?: { anyStage?: boolean }): Booking {
  if (!options?.anyStage && booking.stage === 'reception') throw new DomainError('stage')
  assertPaid(paidPiasters, booking.totalPiasters)
  return { ...booking, paidPiasters }
}

export function applyHandoff(booking: Booking): Booking {
  if (booking.stage !== 'accounting') throw new DomainError('stage')
  if (booking.totalPiasters == null || booking.totalPiasters <= 0) throw new DomainError('total')
  return { ...booking, stage: 'audit' }
}

export function applySubmitReception(booking: Booking): Booking {
  if (booking.stage !== 'reception') throw new DomainError('stage')
  assertReceptionDraft({
    contactName: booking.contactName,
    phone: booking.phone,
    departureDate: booking.departureDate,
    programType: booking.programType,
    paymentPlan: booking.paymentPlan,
    tripLevel: booking.tripLevel ?? 'standard',
    pilgrims: booking.pilgrims,
  })
  return { ...booking, stage: 'accounting' }
}

export function applyApprove(booking: Booking): Booking {
  if (booking.stage !== 'audit') throw new DomainError('stage')
  if (!passportsComplete(booking)) throw new DomainError('passports')
  if (!meetsPaymentRule(booking)) throw new DomainError('paymentRule')
  return { ...booking, stage: 'execution' }
}

export function applyReturn(booking: Booking, actor: { displayName: string; role: Role }, reason: string, at: string): Booking {
  const next = backStage(booking.stage)
  const owner = stageOwner(booking.stage)
  if (!next || !owner || !canAct(actor.role, owner)) throw new DomainError('stage')
  const text = reason.trim()
  if (!text || text.length > MAX_REASON) throw new DomainError('reason')
  const note: ReturnNote = {
    byName: actor.displayName,
    byRole: actor.role,
    at,
    from: booking.stage,
    to: next,
    reason: text,
  }
  return { ...booking, stage: next, returns: [...booking.returns, note] }
}

export function applyFlags(
  booking: Booking,
  flags: { id: string; visaIssued: boolean; ticketIssued: boolean; passportReceived?: boolean }[],
  options?: { anyStage?: boolean },
): Booking {
  if (!options?.anyStage && booking.stage !== 'execution') throw new DomainError('stage')
  if (flags.length !== booking.pilgrims.length) throw new DomainError('flags')
  const byId = new Map(flags.map((flag) => [flag.id, flag]))
  if (byId.size !== flags.length) throw new DomainError('flags')
  const changesTravel = booking.pilgrims.some((pilgrim) => {
    const flag = byId.get(pilgrim.id)
    return flag != null && (flag.visaIssued !== pilgrim.visaIssued || flag.ticketIssued !== pilgrim.ticketIssued)
  })
  if (changesTravel && !meetsHalfPaid(booking)) throw new DomainError('halfPaid')
  return {
    ...booking,
    pilgrims: booking.pilgrims.map((pilgrim) => {
      const flag = byId.get(pilgrim.id)
      if (!flag) throw new DomainError('flags')
      return {
        ...pilgrim,
        passportReceived: options?.anyStage && typeof flag.passportReceived === 'boolean' ? flag.passportReceived : pilgrim.passportReceived,
        visaIssued: flag.visaIssued === true,
        ticketIssued: flag.ticketIssued === true,
      }
    }),
  }
}

export function withoutPilgrim(booking: Booking, pilgrimId: string): Booking | null {
  if (!booking.pilgrims.some((pilgrim) => pilgrim.id === pilgrimId)) throw new DomainError('notFound')
  const pilgrims = booking.pilgrims.filter((pilgrim) => pilgrim.id !== pilgrimId)
  if (pilgrims.length === 0) return null
  return { ...booking, pilgrims }
}

export function applyComplete(booking: Booking): Booking {
  if (booking.stage !== 'execution') throw new DomainError('stage')
  if (!meetsHalfPaid(booking)) throw new DomainError('halfPaid')
  if (!readyToComplete(booking)) throw new DomainError('flags')
  return { ...booking, stage: 'completed' }
}

export function assertEmployee(input: EmployeeInput): EmployeeInput {
  return {
    displayName: assertPersonName(input.displayName, 'displayName'),
    email: assertEmail(input.email),
    password: assertPassword(input.password),
    role: isRole(input.role) ? input.role : (() => { throw new DomainError('role') })(),
  }
}

export function assertEmployeeUpdate(input: {
  displayName: string
  email: string
  password: string
  role: Role
  disabled: boolean
  actorUid: string
  targetUid: string
  targetRole: Role
}) {
  const displayName = assertPersonName(input.displayName, 'displayName')
  const email = assertEmail(input.email)
  if (!isRole(input.role)) throw new DomainError('role')
  if (input.password !== '') assertPassword(input.password)
  if (input.actorUid === input.targetUid && input.role !== input.targetRole) throw new DomainError('selfRole')
  if (input.actorUid === input.targetUid && input.disabled) throw new DomainError('selfDisable')
  return { displayName, email, password: input.password, role: input.role, disabled: input.disabled === true }
}

export function matchesQuery(booking: Booking, query: string): boolean {
  const text = query.trim()
  if (!text) return false
  const lower = text.toLowerCase()
  const names = [booking.contactName, ...booking.pilgrims.map((pilgrim) => pilgrim.name)]
  if (names.some((name) => name.toLowerCase().includes(lower))) return true
  if (/^\d+$/.test(text) && String(booking.fileNumber) === text) return true
  const digits = text.replace(/\D/g, '')
  if (!digits) return false
  const stored = booking.phone.replace(/\D/g, '')
  const local = stored.startsWith('20') ? `0${stored.slice(2)}` : stored
  const withoutTrunk = digits.startsWith('0') ? digits.slice(1) : digits
  return stored.includes(digits) || local.includes(digits) || stored.includes(withoutTrunk)
}

export function compareBookings(a: Booking, b: Booking): number {
  const byDate = a.departureDate.localeCompare(b.departureDate)
  if (byDate !== 0) return byDate
  return a.fileNumber - b.fileNumber
}

export function compareBookingsRecent(a: Booking, b: Booking): number {
  const byDate = b.departureDate.localeCompare(a.departureDate)
  if (byDate !== 0) return byDate
  return a.fileNumber - b.fileNumber
}

export function cairoToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export type TripWhen = 'upcoming' | 'past'

export function isUpcomingDate(date: string, today: string): boolean {
  return date >= today
}

export function groupByDeparture(bookings: readonly Booking[], when: TripWhen, today: string): { date: string; bookings: Booking[]; people: number }[] {
  const grouped = new Map<string, Booking[]>()
  for (const booking of bookings) {
    const upcoming = isUpcomingDate(booking.departureDate, today)
    if (when === 'upcoming' ? !upcoming : upcoming) continue
    const current = grouped.get(booking.departureDate)
    if (current) current.push(booking)
    else grouped.set(booking.departureDate, [booking])
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => (when === 'upcoming' ? left.localeCompare(right) : right.localeCompare(left)))
    .map(([date, rows]) => {
      const sorted = [...rows].sort(compareBookings)
      return {
        date,
        bookings: sorted,
        people: sorted.reduce((count, booking) => count + booking.pilgrims.length, 0),
      }
    })
}

export function homeForRole(role: Role): string {
  if (role === 'admin') return '/queue'
  return '/queue'
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}

export function formatStamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}:${pick('minute')}`
}

function readString(value: unknown, code: string) {
  if (typeof value !== 'string') throw new DomainError(code)
  return value
}

export function parseReceptionDraft(input: unknown): ReceptionDraft {
  if (!input || typeof input !== 'object') throw new DomainError('invalid')
  const source = input as Record<string, unknown>
  if (!Array.isArray(source.pilgrims)) throw new DomainError('pilgrims')
  return assertReceptionDraft({
    contactName: readString(source.contactName, 'contactName'),
    phone: readString(source.phone, 'phone'),
    departureDate: readString(source.departureDate, 'departureDate'),
    programType: readString(source.programType, 'programType') as ProgramType,
    paymentPlan: readString(source.paymentPlan, 'paymentPlan') as PaymentPlan,
    tripLevel: readString(source.tripLevel, 'tripLevel') as TripLevel,
    pilgrims: source.pilgrims.map((item) => {
      if (!item || typeof item !== 'object') throw new DomainError('pilgrims')
      const pilgrim = item as Record<string, unknown>
      return {
        id: readString(pilgrim.id, 'pilgrimId'),
        name: readString(pilgrim.name, 'pilgrimName'),
        passportReceived: pilgrim.passportReceived === true,
      }
    }),
  })
}
