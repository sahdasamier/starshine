import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import {
  DomainError,
  applyAccounting,
  applyApprove,
  applyComplete,
  applyFlags,
  applyHandoff,
  applyHotel,
  applyPaid,
  applyReceptionEdit,
  applyReturn,
  applySubmitReception,
  assertEmployee,
  assertEmployeeUpdate,
  assertPricing,
  emptyBooking,
  isLanguage,
  isPlan,
  isRole,
  isTier,
  normalizeBooking,
  withoutPilgrim,
  parsePoundsToPiasters,
  parseReceptionDraft,
  stageOwner,
  type Booking,
  type Language,
  type Role,
} from '../../shared/domain'

initializeApp()

const db = getFirestore()
const auth = getAuth()

interface Actor {
  uid: string
  displayName: string
  email: string
  role: Role
  disabled: boolean
  language: Language
}

function fail(error: unknown): never {
  if (error instanceof DomainError) {
    throw new HttpsError('failed-precondition', `code:${error.code}`)
  }
  if (error instanceof HttpsError) throw error
  const authCode = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : ''
  if (authCode.includes('email-already-exists') || authCode.includes('email-already-in-use')) {
    throw new HttpsError('already-exists', 'code:emailInUse')
  }
  console.error(error)
  throw new HttpsError('internal', 'code:internal')
}

async function actorOf(request: CallableRequest): Promise<Actor> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'code:auth')
  const snap = await db.doc(`users/${request.auth.uid}`).get()
  if (!snap.exists) throw new HttpsError('permission-denied', 'code:noProfile')
  const data = snap.data() as Omit<Actor, 'uid'>
  if (data.disabled) throw new HttpsError('permission-denied', 'code:disabled')
  if (!isRole(data.role)) throw new HttpsError('permission-denied', 'code:role')
  return { uid: request.auth.uid, ...data }
}

function requireRole(actor: Actor, role: Role) {
  if (actor.role !== role && actor.role !== 'admin') throw new DomainError('role')
}

async function saveBooking(id: string, mutate: (booking: Booking) => Booking) {
  if (!id || typeof id !== 'string') throw new DomainError('notFound')
  const ref = db.collection('bookings').doc(id)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new DomainError('notFound')
    tx.set(ref, normalizeBooking(mutate(snap.data() as Booking)))
  })
  return { id }
}

function text(data: Record<string, unknown>, key: string) {
  const value = data[key]
  if (typeof value !== 'string') throw new DomainError('invalid')
  return value
}

function optionalPrice(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return null
  return parsePoundsToPiasters(value)
}

export const api = onCall({ region: 'europe-west1', invoker: 'public', timeoutSeconds: 30 }, async (request) => {
  try {
    const data = (request.data ?? {}) as Record<string, unknown>
    const action = text(data, 'action')

    if (action === 'needsBootstrap') {
      const existing = await db.collection('users').limit(1).get()
      return { needsBootstrap: existing.empty }
    }

    if (action === 'bootstrapAdmin') {
      const employee = assertEmployee({
        displayName: text(data, 'displayName'),
        email: text(data, 'email'),
        password: text(data, 'password'),
        role: 'admin',
      })
      const gate = db.doc('meta/bootstrap')
      const opened = await db.runTransaction(async (tx) => {
        const snap = await tx.get(gate)
        if (snap.exists) return false
        tx.set(gate, { at: new Date().toISOString() })
        return true
      })
      if (!opened) throw new DomainError('bootstrapClosed')
      try {
        const user = await auth.createUser({
          email: employee.email,
          password: employee.password,
          displayName: employee.displayName,
        })
        await db.doc(`users/${user.uid}`).set({
          displayName: employee.displayName,
          email: employee.email,
          role: 'admin',
          disabled: false,
          language: 'ar',
        })
        return { uid: user.uid }
      } catch (error) {
        await gate.delete().catch(() => undefined)
        throw error
      }
    }

    const actor = await actorOf(request)

    if (action === 'createEmployee') {
      requireRole(actor, 'admin')
      const employee = assertEmployee({
        displayName: text(data, 'displayName'),
        email: text(data, 'email'),
        password: text(data, 'password'),
        role: text(data, 'role') as Role,
      })
      const user = await auth.createUser({
        email: employee.email,
        password: employee.password,
        displayName: employee.displayName,
      })
      try {
        await db.doc(`users/${user.uid}`).set({
          displayName: employee.displayName,
          email: employee.email,
          role: employee.role,
          disabled: false,
          language: 'ar',
        })
      } catch (error) {
        await auth.deleteUser(user.uid).catch(() => undefined)
        throw error
      }
      return { uid: user.uid }
    }

    if (action === 'updateEmployee') {
      requireRole(actor, 'admin')
      const uid = text(data, 'uid')
      const snap = await db.doc(`users/${uid}`).get()
      if (!snap.exists) throw new DomainError('notFound')
      const current = snap.data() as { role: Role }
      const next = assertEmployeeUpdate({
        displayName: text(data, 'displayName'),
        email: text(data, 'email'),
        password: typeof data.password === 'string' ? data.password : '',
        role: text(data, 'role') as Role,
        disabled: data.disabled === true,
        actorUid: actor.uid,
        targetUid: uid,
        targetRole: current.role,
      })
      await auth.updateUser(uid, {
        email: next.email,
        displayName: next.displayName,
        disabled: next.disabled,
        ...(next.password ? { password: next.password } : {}),
      })
      await db.doc(`users/${uid}`).update({
        displayName: next.displayName,
        email: next.email,
        role: next.role,
        disabled: next.disabled,
      })
      return { uid }
    }

    if (action === 'deleteEmployee') {
      requireRole(actor, 'admin')
      const uid = text(data, 'uid')
      if (uid === actor.uid) throw new DomainError('selfDelete')
      const snap = await db.doc(`users/${uid}`).get()
      if (!snap.exists) throw new DomainError('notFound')
      await db.doc(`users/${uid}`).delete()
      await auth.deleteUser(uid).catch((error: { code?: string }) => {
        if (error.code !== 'auth/user-not-found') throw error
      })
      return { uid }
    }

    if (action === 'createBooking') {
      if (actor.role !== 'reception' && actor.role !== 'auditor' && actor.role !== 'admin') throw new DomainError('role')
      const draft = parseReceptionDraft(data)
      const id = await db.runTransaction(async (tx) => {
        const counterRef = db.doc('meta/fileCounter')
        const counter = await tx.get(counterRef)
        const fileNumber = counter.exists ? Number(counter.data()?.next) : 1
        if (!Number.isInteger(fileNumber) || fileNumber < 1) throw new DomainError('invalid')
        const ref = db.collection('bookings').doc()
        tx.set(ref, emptyBooking(fileNumber, draft))
        tx.set(counterRef, { next: fileNumber + 1 })
        return ref.id
      })
      return { id }
    }

    if (action === 'setPricing') {
      requireRole(actor, 'admin')
      const pricing = assertPricing({
        standard: optionalPrice(data.standard),
        premium: optionalPrice(data.premium),
        vip: optionalPrice(data.vip),
      })
      await db.doc('meta/pricing').set(pricing)
      return pricing
    }

    const id = text(data, 'id')

    if (action === 'updateReception') {
      if (actor.role !== 'reception' && actor.role !== 'auditor' && actor.role !== 'admin') throw new DomainError('role')
      const draft = parseReceptionDraft(data)
      await saveBooking(id, (booking) =>
        applyReceptionEdit(booking, draft, { anyStage: actor.role === 'admin' || actor.role === 'auditor' }),
      )
      return { id }
    }

    if (action === 'submitReception') {
      requireRole(actor, 'reception')
      await saveBooking(id, applySubmitReception)
      return { id }
    }

    if (action === 'updateAccounting') {
      if (actor.role !== 'accountant' && actor.role !== 'auditor' && actor.role !== 'admin') throw new DomainError('role')
      const plan = text(data, 'paymentPlan')
      const tripLevel = text(data, 'tripLevel')
      if (!isPlan(plan)) throw new DomainError('paymentPlan')
      if (!isTier(tripLevel)) throw new DomainError('tripLevel')
      const total = parsePoundsToPiasters(text(data, 'total'))
      const hotelName = typeof data.hotelName === 'string' ? data.hotelName : ''
      await saveBooking(id, (booking) =>
        applyAccounting(booking, total, plan, { tripLevel, hotelName }, {
          anyStage: actor.role === 'admin' || actor.role === 'auditor',
          allowAudit: actor.role === 'auditor' || actor.role === 'admin',
        }),
      )
      return { id }
    }

    if (action === 'setHotel') {
      if (actor.role !== 'auditor' && actor.role !== 'admin') throw new DomainError('role')
      const hotelName = typeof data.hotelName === 'string' ? data.hotelName : ''
      await saveBooking(id, (booking) => applyHotel(booking, hotelName, { anyStage: actor.role === 'admin' || actor.role === 'auditor' }))
      return { id }
    }

    if (action === 'setAmountPaid') {
      if (actor.role !== 'accountant' && actor.role !== 'auditor' && actor.role !== 'admin') throw new DomainError('role')
      const paid = parsePoundsToPiasters(text(data, 'amountPaid'))
      await saveBooking(id, (booking) => applyPaid(booking, paid, { anyStage: actor.role === 'admin' || actor.role === 'auditor' }))
      return { id }
    }

    if (action === 'handoff') {
      requireRole(actor, 'accountant')
      await saveBooking(id, applyHandoff)
      return { id }
    }

    if (action === 'approve') {
      requireRole(actor, 'auditor')
      await saveBooking(id, applyApprove)
      return { id }
    }

    if (action === 'returnBooking') {
      const reason = text(data, 'reason')
      await saveBooking(id, (booking) => {
        const owner = stageOwner(booking.stage)
        if (!owner || (owner !== actor.role && actor.role !== 'admin')) throw new DomainError('role')
        return applyReturn(booking, actor, reason, new Date().toISOString())
      })
      return { id }
    }

    if (action === 'updateFlags') {
      if (actor.role !== 'operations' && actor.role !== 'auditor' && actor.role !== 'admin') throw new DomainError('role')
      if (!Array.isArray(data.flags)) throw new DomainError('flags')
      const flags = data.flags.map((item) => {
        if (!item || typeof item !== 'object') throw new DomainError('flags')
        const flag = item as Record<string, unknown>
        if (typeof flag.id !== 'string') throw new DomainError('flags')
        return {
          id: flag.id,
          visaIssued: flag.visaIssued === true,
          ticketIssued: flag.ticketIssued === true,
          ...(typeof flag.passportReceived === 'boolean' ? { passportReceived: flag.passportReceived } : {}),
        }
      })
      await saveBooking(id, (booking) => applyFlags(booking, flags, { anyStage: actor.role === 'admin' || actor.role === 'auditor' }))
      return { id }
    }

    if (action === 'deleteBooking') {
      requireRole(actor, 'admin')
      const ref = db.collection('bookings').doc(id)
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists) throw new DomainError('notFound')
        tx.delete(ref)
      })
      return { id }
    }

    if (action === 'removePilgrim') {
      requireRole(actor, 'admin')
      const pilgrimId = text(data, 'pilgrimId')
      const ref = db.collection('bookings').doc(id)
      let deleted = false
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists) throw new DomainError('notFound')
        const next = withoutPilgrim(normalizeBooking(snap.data() as Booking), pilgrimId)
        if (!next) {
          tx.delete(ref)
          deleted = true
          return
        }
        tx.set(ref, next)
      })
      return { id, deleted }
    }

    if (action === 'complete') {
      requireRole(actor, 'operations')
      await saveBooking(id, applyComplete)
      return { id }
    }

    if (action === 'setLanguage') {
      const language = text(data, 'language')
      if (!isLanguage(language)) throw new DomainError('language')
      await db.doc(`users/${actor.uid}`).update({ language })
      return { language }
    }

    throw new DomainError('invalid')
  } catch (error) {
    fail(error)
  }
})
