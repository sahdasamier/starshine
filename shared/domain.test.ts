import { describe, expect, it } from 'vitest'
import {
  applyAccounting,
  applyApprove,
  applyComplete,
  applyFlags,
  applyHandoff,
  applyHotel,
  applyNotes,
  applyPaid,
  applyReceptionEdit,
  applyReturn,
  assertEmployeeUpdate,
  cairoToday,
  compareBookings,
  groupByDeparture,
  isUpcomingDate,
  emptyBooking,
  assertPrograms,
  packageQuotePiasters,
  pricedTotal,
  normalizeBooking,
  coerceTier,
  referralChoices,
  rememberTrip,
  UMRAH_PROGRAMS,
  withoutPilgrim,
  formatDate,
  formatMoney,
  matchesQuery,
  meetsPaymentRule,
  normalizePhone,
  paidPercent,
  parsePoundsToPiasters,
  showMissingPassport,
  showUnderpaid,
  type Booking,
} from './domain'

const draft = {
  contactName: '  Sara Ali  ',
  phone: '01012345678',
  departureDate: '2026-12-01',
  programType: 'quad' as const,
  paymentPlan: 'installments' as const,
  tripLevel: 'farBus' as const,
  packageId: 'prog_1',
  referralType: 'marketer',
  referrerName: '  مكتب النيل  ',
  bookingStatus: 'confirmed' as const,
  hotelName: 'Dar Al Eiman',
  customerNotes: '  يحتاج كرسي متحرك  ',
  internalNotes: '',
  enteredById: 'user-1',
  pilgrims: [
    { id: 'a', name: 'Sara Ali', category: 'adult' as const, gender: 'woman' as const, militaryCompleted: null, papersConfirmed: false, guardianName: '', passportReceived: true },
    { id: 'b', name: 'Omar Ali', category: 'child' as const, gender: '' as const, militaryCompleted: null, papersConfirmed: false, guardianName: 'Sara Ali', passportReceived: false },
  ],
}

function sample(): Booking {
  return emptyBooking(1, draft)
}

describe('phone', () => {
  it('stores an Egyptian mobile in +20 form', () => {
    expect(normalizePhone('01012345678')).toBe('+201012345678')
    expect(normalizePhone('+20 101 234 5678')).toBe('+201012345678')
  })

  it('rejects other numbers', () => {
    expect(() => normalizePhone('2011123456789')).toThrow('phone')
    expect(() => normalizePhone('+966501234567')).toThrow('phone')
  })
})

describe('money', () => {
  it('converts pounds to piasters', () => {
    expect(parsePoundsToPiasters('100')).toBe(10000)
    expect(parsePoundsToPiasters('100.5')).toBe(10050)
    expect(parsePoundsToPiasters('100.50')).toBe(10050)
  })

  it('keeps the payment gate exact', () => {
    expect(meetsPaymentRule({ paymentPlan: 'installments', totalPiasters: 10000, paidPiasters: 5000 })).toBe(true)
    expect(meetsPaymentRule({ paymentPlan: 'installments', totalPiasters: 10000, paidPiasters: 4999 })).toBe(false)
    expect(meetsPaymentRule({ paymentPlan: 'cash', totalPiasters: 10000, paidPiasters: 4999 })).toBe(false)
    expect(meetsPaymentRule({ paymentPlan: 'cash', totalPiasters: 10000, paidPiasters: 5000 })).toBe(true)
    expect(paidPercent(10000, 5000)).toBe(50)
  })

  it('formats EGP with western digits', () => {
    expect(formatMoney(10050, 'en')).toBe('100.50 EGP')
    expect(formatMoney(10050, 'ar')).toBe('100.50 ج.م')
  })
})

describe('pipeline', () => {
  it('creates a booking directly in accounting', () => {
    const booking = sample()
    expect(booking.stage).toBe('accounting')
    expect(booking.fileNumber).toBe(1)
    expect(booking.phone).toBe('+201012345678')
    expect(booking.paidPiasters).toBe(0)
    expect(booking.totalPiasters).toBe(4400000)
    expect(packageQuotePiasters('prog_5', 'double')).toBe(12350000)
    expect(packageQuotePiasters('prog_1', 'quint')).toBeNull()
    expect(assertPrograms([{ ...UMRAH_PROGRAMS[0], nameAr: 'برنامج خاص', prices: { quad: 1000, triple: 2000, double: 3000 } }])[0].prices.double).toBe(3000)
    expect(() => assertPrograms([])).toThrow('programs')
    expect(pricedTotal(4400000, 'prog_1', 'quad', 'prog_1', 'triple')).toBe(4750000)
    expect(pricedTotal(5000000, 'prog_1', 'quad', 'prog_1', 'triple')).toBe(5000000)
    expect(booking.pilgrims[1].visaIssued).toBe(false)
    expect(booking.pilgrims[0].gender).toBe('woman')
    expect(booking.pilgrims[0].militaryCompleted).toBeNull()
    expect(booking.pilgrims[1].category).toBe('child')
    expect(booking.pilgrims[1].guardianName).toBe('Sara Ali')
    expect(booking.pilgrims[1].papersConfirmed).toBe(false)
    expect(booking.customerNotes).toBe('يحتاج كرسي متحرك')
    expect(booking.createdByName).toBe('')
    expect(booking.referrerName).toBe('مكتب النيل')
    expect(booking.bookingStatus).toBe('confirmed')
    const entered = emptyBooking(2, draft, '  نورا  ', ' user-1 ')
    expect(entered.createdByName).toBe('نورا')
    expect(entered.enteredById).toBe('user-1')
    expect(coerceTier('premium')).toBe('close')
    expect(referralChoices(['وكالة'], 'marketer')).toEqual(['marketer', 'office', 'وكالة'])
    expect(() => emptyBooking(6, { ...draft, referralType: 'other' })).toThrow('referralType')
    expect(() => applyHandoff({ ...sample(), bookingStatus: 'withdrawn', totalPiasters: 10000, paidPiasters: 0 })).toThrow('withdrawn')
  })

  it('keeps agency trips and remembers a new one', () => {
    expect(rememberTrip([], 'shaban')).toEqual([])
    expect(rememberTrip([], '2026-10-14')).toEqual([])
    expect(rememberTrip([], '2026-11-18')).toEqual(['2026-11-18'])
    expect(rememberTrip(['شعبان إضافي'], '  شعبان إضافي  ')).toEqual(['شعبان إضافي'])
    expect(rememberTrip([], 'رجب')).toEqual(['رجب'])
    expect(applyNotes(sample(), '  كرسي  ', 'اتصال غدا').customerNotes).toBe('كرسي')
    expect(applyNotes(sample(), 'كرسي', 'اتصال غدا').internalNotes).toBe('اتصال غدا')
    expect(isUpcomingDate('ramadan', '2026-11-12')).toBe(true)
    const aged = normalizeBooking({ ...sample(), pilgrims: [{ ...sample().pilgrims[0], category: undefined as never, gender: undefined as never }] })
    expect(aged.pilgrims[0].category).toBe('adult')
    expect(aged.pilgrims[0].gender).toBe('')
    const man = emptyBooking(3, {
      ...draft,
      pilgrims: [{ id: 'm', name: 'Ali Hassan', category: 'adult', gender: 'man', militaryCompleted: false, papersConfirmed: true, guardianName: 'ignored', passportReceived: true }],
    })
    expect(man.pilgrims[0].militaryCompleted).toBe(false)
    expect(man.pilgrims[0].guardianName).toBe('')
    expect(() => emptyBooking(4, { ...draft, pilgrims: [{ ...draft.pilgrims[0], gender: 'man', militaryCompleted: null }] })).toThrow('military')
    expect(() => emptyBooking(5, { ...draft, pilgrims: [{ ...draft.pilgrims[1], guardianName: '  ' }] })).toThrow('guardian')
  })

  it('blocks approval until passports and the payment rule pass', () => {
    const booking = { ...sample(), stage: 'audit' as const, totalPiasters: 20000, paidPiasters: 10000 }
    expect(() => applyApprove(booking)).toThrow('passports')
    const withPassports = applyReceptionEdit(
      { ...booking, stage: 'reception' },
      { ...draft, pilgrims: draft.pilgrims.map((pilgrim) => ({ ...pilgrim, passportReceived: true })) },
    )
    const ready = { ...booking, pilgrims: withPassports.pilgrims }
    expect(applyApprove(ready).stage).toBe('execution')
    expect(() => applyApprove({ ...ready, paidPiasters: 1000 })).toThrow('paymentRule')
  })

  it('lets accounting hand off with nothing paid once the total is set', () => {
    const booking = { ...sample(), totalPiasters: 15000 }
    expect(applyHandoff(booking).stage).toBe('audit')
    expect(() => applyHandoff({ ...sample(), totalPiasters: null })).toThrow('total')
  })

  it('lets an admin change passport, visa, and ticket on any stage', () => {
    const booking = { ...sample(), stage: 'accounting' as const }
    const edited = applyReceptionEdit(booking, { ...draft, contactName: 'Nada Ali', paymentPlan: 'cash' }, { anyStage: true })
    expect(edited.stage).toBe('accounting')
    expect(edited.contactName).toBe('Nada Ali')
    expect(edited.paymentPlan).toBe('cash')
    const flagged = applyFlags(
      { ...edited, totalPiasters: 10000, paidPiasters: 5000 },
      edited.pilgrims.map((pilgrim) => ({ id: pilgrim.id, passportReceived: true, visaIssued: true, ticketIssued: false })),
      { anyStage: true },
    )
    expect(flagged.pilgrims.every((pilgrim) => pilgrim.passportReceived && pilgrim.visaIssued)).toBe(true)
    expect(() =>
      applyFlags(
        edited,
        edited.pilgrims.map((pilgrim) => ({ id: pilgrim.id, visaIssued: true, ticketIssued: false })),
        { anyStage: true },
      ),
    ).toThrow('halfPaid')
    expect(() => applyReceptionEdit(booking, draft)).toThrow('stage')
  })

  it('lets an auditor correct any file, including a completed one', () => {
    const booking = { ...sample(), stage: 'execution' as const, paymentPlan: 'cash' as const, totalPiasters: 10000, paidPiasters: 5000 }
    const edited = applyReceptionEdit(booking, draft, { anyStage: true })
    expect(edited.contactName).toBe('Sara Ali')
    expect(edited.paymentPlan).toBe('installments')
    expect(edited.stage).toBe('execution')
    const completed = applyReceptionEdit({ ...booking, stage: 'completed' }, draft, { anyStage: true })
    expect(completed.stage).toBe('completed')
    expect(applyHotel({ ...booking, stage: 'execution' }, 'Hilton', { anyStage: true }).hotelName).toBe('Hilton')
    expect(applyPaid({ ...booking, stage: 'completed' }, 4000, { anyStage: true }).paidPiasters).toBe(4000)
    expect(() =>
      applyFlags(booking, booking.pilgrims.map((pilgrim) => ({ id: pilgrim.id, visaIssued: true, ticketIssued: false })), { anyStage: true }),
    ).not.toThrow()
    expect(() =>
      applyFlags(
        { ...booking, paidPiasters: 1000 },
        booking.pilgrims.map((pilgrim) => ({ id: pilgrim.id, visaIssued: true, ticketIssued: false })),
        { anyStage: true },
      ),
    ).toThrow('halfPaid')
  })

  it('lets an admin return a file the same way the stage owner can', () => {
    const booking = { ...sample(), stage: 'audit' as const }
    const returned = applyReturn(booking, { displayName: 'Admin', role: 'admin' }, 'تصحيح', '2026-11-07T12:00:00.000Z')
    expect(returned.stage).toBe('accounting')
    expect(returned.returns[0].byRole).toBe('admin')
  })

  it('returns one stage and keeps the data', () => {
    const booking = { ...sample(), stage: 'execution' as const, totalPiasters: 10000, paidPiasters: 10000 }
    const returned = applyReturn(booking, { displayName: 'Nour', role: 'operations' }, '  Tickets changed  ', '2026-11-07T12:00:00.000Z')
    expect(returned.stage).toBe('audit')
    expect(returned.paidPiasters).toBe(10000)
    expect(returned.returns).toHaveLength(1)
    expect(returned.returns[0].reason).toBe('Tickets changed')
    expect(returned.returns[0].from).toBe('execution')
    expect(() => applyReturn(returned, { displayName: 'Nour', role: 'operations' }, 'no', '2026-11-07T12:00:00.000Z')).toThrow('stage')
  })

  it('completes only when every pilgrim has a visa and a ticket', () => {
    const booking = { ...sample(), stage: 'execution' as const, totalPiasters: 10000, paidPiasters: 5000 }
    expect(() => applyComplete({ ...booking, paidPiasters: 0 })).toThrow('halfPaid')
    expect(() => applyComplete(booking)).toThrow('flags')
    const flagged = applyFlags(booking, [
      { id: 'a', visaIssued: true, ticketIssued: true },
      { id: 'b', visaIssued: true, ticketIssued: false },
    ])
    expect(() => applyComplete(flagged)).toThrow('flags')
    const done = applyFlags(flagged, [
      { id: 'a', visaIssued: true, ticketIssued: true },
      { id: 'b', visaIssued: true, ticketIssued: true },
    ])
    expect(applyComplete(done).stage).toBe('completed')
  })

  it('lets an auditor replace the default total while the file is in audit', () => {
    const booking = { ...sample(), stage: 'audit' as const, totalPiasters: 100000, paidPiasters: 0 }
    const priced = applyAccounting(booking, 80000, 'installments', { tripLevel: 'closeVip', hotelName: 'Fairmont' }, { allowAudit: true })
    expect(priced.totalPiasters).toBe(80000)
    expect(priced.tripLevel).toBe('closeVip')
    expect(priced.hotelName).toBe('Fairmont')
    const kept = applyAccounting({ ...sample(), hotelName: 'Fairmont', totalPiasters: 100000, paidPiasters: 0 }, 90000, 'cash', { tripLevel: 'farBus', hotelName: '' })
    expect(kept.hotelName).toBe('Fairmont')
    expect(sample().hotelName).toBe('')
    expect(applyHotel(booking, '  Hilton  ').hotelName).toBe('Hilton')
    expect(applyHotel({ ...sample(), stage: 'execution' }, 'Hilton', { anyStage: true }).hotelName).toBe('Hilton')
    expect(() => applyHotel({ ...sample(), stage: 'execution' }, 'Hilton')).toThrow('stage')
    expect(() => applyAccounting(booking, 80000, 'installments', { tripLevel: 'closeVip', hotelName: 'Fairmont' })).toThrow('stage')
  })

  it('rejects a total below the amount already paid', () => {
    const booking = { ...sample(), totalPiasters: 10000, paidPiasters: 8000, stage: 'audit' as const }
    expect(() => applyPaid(booking, 10001)).toThrow('amountPaid')
    expect(applyPaid(booking, 4000).paidPiasters).toBe(4000)
  })

  it('preserves visa flags when reception edits a returned file', () => {
    const booking = applyFlags({ ...sample(), stage: 'execution', totalPiasters: 10000, paidPiasters: 5000 }, [
      { id: 'a', visaIssued: true, ticketIssued: false },
      { id: 'b', visaIssued: false, ticketIssued: true },
    ])
    const edited = applyReceptionEdit(
      { ...booking, stage: 'reception' },
      { ...draft, pilgrims: [{ id: 'a', name: 'Sara', category: 'adult', gender: 'woman', militaryCompleted: null, papersConfirmed: false, guardianName: '', passportReceived: true }] },
    )
    expect(edited.pilgrims).toHaveLength(1)
    expect(edited.pilgrims[0].visaIssued).toBe(true)
    expect(edited.pilgrims[0].gender).toBe('woman')
  })

  it('removes one pilgrim and clears the file when the last pilgrim is removed', () => {
    const booking = sample()
    const kept = withoutPilgrim(booking, 'b')
    expect(kept?.pilgrims.map((pilgrim) => pilgrim.id)).toEqual(['a'])
    expect(booking.pilgrims).toHaveLength(2)
    expect(withoutPilgrim(kept!, 'a')).toBeNull()
    expect(() => withoutPilgrim(booking, 'missing')).toThrow('notFound')
  })
})

describe('marks and search', () => {
  it('marks underpaid files only after accounting', () => {
    const low = { ...sample(), totalPiasters: 10000, paidPiasters: 1000, paymentPlan: 'cash' as const }
    expect(showUnderpaid(low)).toBe(false)
    expect(showUnderpaid({ ...low, stage: 'execution' })).toBe(true)
    expect(showMissingPassport(low)).toBe(true)
    expect(showMissingPassport({ ...low, stage: 'execution' })).toBe(false)
  })

  it('matches a file number exactly and a phone in either form', () => {
    const booking = sample()
    expect(matchesQuery(booking, '1')).toBe(true)
    expect(matchesQuery(booking, '01012345678')).toBe(true)
    expect(matchesQuery(booking, '+201012345678')).toBe(true)
    expect(matchesQuery(booking, 'omar')).toBe(true)
    const other = { ...booking, fileNumber: 12, phone: '+201098765432' }
    expect(matchesQuery(other, '12')).toBe(true)
    expect(matchesQuery(other, '99')).toBe(false)
    expect(matchesQuery({ ...other, fileNumber: 8 }, '12')).toBe(false)
  })

  it('sorts by departure date, then file number', () => {
    const first = { ...sample(), fileNumber: 2, departureDate: '2026-12-02' }
    const second = { ...sample(), fileNumber: 9, departureDate: '2026-12-01' }
    const third = { ...sample(), fileNumber: 3, departureDate: '2026-12-01' }
    expect([first, second, third].sort(compareBookings).map((item) => item.fileNumber)).toEqual([3, 9, 2])
  })
})

describe('accounts', () => {
  it('stops an admin from disabling themselves or dropping their own role', () => {
    expect(() =>
      assertEmployeeUpdate({
        displayName: 'Admin',
        email: 'admin@starshinetoursaswan.com',
        password: '',
        role: 'reception',
        disabled: false,
        actorUid: 'a',
        targetUid: 'a',
        targetRole: 'admin',
      }),
    ).toThrow('selfRole')
    expect(() =>
      assertEmployeeUpdate({
        displayName: 'Admin',
        email: 'admin@starshinetoursaswan.com',
        password: '',
        role: 'admin',
        disabled: true,
        actorUid: 'a',
        targetUid: 'a',
        targetRole: 'admin',
      }),
    ).toThrow('selfDisable')
  })
})

describe('dates', () => {
  it('prints day-month-year', () => {
    expect(formatDate('2026-12-01')).toBe('01/12/2026')
  })

  it('groups pilgrims by departure date and keeps today with upcoming trips', () => {
    expect(cairoToday(new Date('2026-07-05T22:30:00.000Z'))).toBe('2026-07-06')
    expect(isUpcomingDate('2026-07-06', '2026-07-06')).toBe(true)
    const soon = sample()
    const sameDay = { ...sample(), fileNumber: 4, pilgrims: sample().pilgrims.slice(0, 1) }
    const old = { ...sample(), fileNumber: 2, departureDate: '2026-07-06' }
    const upcoming = groupByDeparture([old, soon, sameDay], 'upcoming', '2026-11-07')
    expect(upcoming.map((group) => group.date)).toEqual(['2026-12-01'])
    expect(upcoming[0].people).toBe(3)
    expect(upcoming[0].bookings.map((booking) => booking.fileNumber)).toEqual([1, 4])
    expect(groupByDeparture([old, soon], 'past', '2026-11-07').map((group) => group.date)).toEqual(['2026-07-06'])
  })
})
