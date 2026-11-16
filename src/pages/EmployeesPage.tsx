import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { collection, onSnapshot } from 'firebase/firestore'
import { z } from 'zod'
import { DomainError, ROLES, TIERS, assertPrograms, formatPounds, type Pricing, type Role, type UmrahProgram } from '@shared/domain'
import { call, errorCode } from '../lib/api'
import { useAuth, type Profile } from '../lib/auth'
import { db } from '../lib/firebase'
import { useI18n } from '../lib/i18n'
import { usePricing } from '../lib/pricing'
import { usePrograms } from '../lib/programs'
import { useRemoval } from '../components/confirm'
import { TrashButton } from '../components/icons'
import { Banner, FieldError, roleKey, tierKey } from '../components/ui'

const createSchema = z.object({
  displayName: z.string().trim().min(1, 'displayName'),
  email: z.string().trim().email('email'),
  password: z.string().min(8, 'password'),
  role: z.enum(ROLES),
})

type CreateValues = z.infer<typeof createSchema>
type EmployeeRow = Profile & { uid: string }

export function EmployeesPage() {
  const { profile, user } = useAuth()
  const { t } = useI18n()
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { displayName: '', email: '', password: '', role: 'reception' },
  })

  useEffect(() => {
    if (profile?.role !== 'admin') return
    return onSnapshot(collection(db, 'users'), (snap) => {
      setRows(
        snap.docs
          .map((item) => ({ uid: item.id, ...(item.data() as Profile) }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      )
    })
  }, [profile?.role])

  if (!profile) return null
  if (profile.role !== 'admin') return <Navigate to="/" replace />

  async function onCreate(values: CreateValues) {
    setPending(true)
    setError(null)
    try {
      await call('createEmployee', values)
      form.reset({ displayName: '', email: '', password: '', role: 'reception' })
    } catch (caught) {
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  const removal = useRemoval()
  const active = rows.filter((employee) => !employee.disabled).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-deep">{t('adminDashboard')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('adminLead')}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-line bg-card px-3 py-2">
            <dt className="text-xs text-muted">{t('employees')}</dt>
            <dd className="num text-xl font-semibold text-deep">{rows.length}</dd>
          </div>
          <div className="rounded-xl border border-line bg-card px-3 py-2">
            <dt className="text-xs text-muted">{t('active')}</dt>
            <dd className="num text-xl font-semibold text-deep">{active}</dd>
          </div>
          {ROLES.map((role) => (
            <div key={role} className="rounded-xl border border-line bg-card px-3 py-2">
              <dt className="text-xs text-muted">{t(roleKey(role))}</dt>
              <dd className="num text-xl font-semibold text-deep">{rows.filter((employee) => employee.role === role).length}</dd>
            </div>
          ))}
        </dl>
      </header>
      <PricingPanel />
      <ProgramPrices />
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold text-deep">{t('createEmployee')}</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onCreate)} noValidate>
          <label className="text-sm font-medium">
            {t('displayName')}
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('displayName')} />
            <FieldError message={form.formState.errors.displayName?.message} />
          </label>
          <label className="text-sm font-medium">
            {t('email')}
            <input dir="ltr" className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('email')} />
            <FieldError message={form.formState.errors.email?.message} />
          </label>
          <label className="text-sm font-medium">
            {t('password')}
            <input dir="ltr" type="password" className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('password')} />
            <FieldError message={form.formState.errors.password?.message} />
          </label>
          <label className="text-sm font-medium">
            {t('role')}
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" {...form.register('role')}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(roleKey(role))}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <Banner code={error} />
          </div>
          <button type="submit" disabled={pending} className="rounded-md bg-deep px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-2 md:w-fit">
            {t('createEmployee')}
          </button>
        </form>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-deep md:hidden">{t('directory')}</h2>
        <div className="space-y-3 md:hidden">
          {rows.map((employee) => (
            <EmployeeRow
              key={employee.uid}
              employee={employee}
              self={employee.uid === user?.uid}
              layout="card"
              onRemove={() => removal.ask(t('removeEmployee'), t('confirmRemoveEmployee'), () => call('deleteEmployee', { uid: employee.uid }))}
            />
          ))}
        </div>
      </section>
      <section className="hidden overflow-x-auto rounded-2xl border border-line bg-card md:block">
        <header className="border-b border-line px-4 py-4">
          <h2 className="text-lg font-semibold text-deep">{t('directory')}</h2>
        </header>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-paper text-start text-muted">
            <tr>
              {[t('displayName'), t('email'), t('role'), t('status'), ''].map((heading) => (
                <th key={heading || 'manage'} className="px-3 py-2 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((employee) => (
              <EmployeeRow
                key={employee.uid}
                employee={employee}
                self={employee.uid === user?.uid}
                layout="row"
                onRemove={() => removal.ask(t('removeEmployee'), t('confirmRemoveEmployee'), () => call('deleteEmployee', { uid: employee.uid }))}
              />
            ))}
          </tbody>
        </table>
      </section>
      {removal.dialog}
    </div>
  )
}

function PricingPanel() {
  const { t } = useI18n()
  const { pricing } = usePricing()
  const [prices, setPrices] = useState<Record<keyof Pricing, string>>({ farBus: '', close: '', closeVip: '' })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrices({
      farBus: pricing.farBus == null ? '' : formatPounds(pricing.farBus),
      close: pricing.close == null ? '' : formatPounds(pricing.close),
      closeVip: pricing.closeVip == null ? '' : formatPounds(pricing.closeVip),
    })
  }, [pricing])

  async function save() {
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      await call('setPricing', prices)
      setSaved(true)
    } catch (caught) {
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold text-deep">{t('defaultPrices')}</h2>
      <p className="mt-1 text-sm text-muted">{t('defaultPricesLead')}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {TIERS.map((tier) => (
          <label key={tier} className="text-sm font-medium">
            {t(tierKey(tier))}
            <input
              dir="ltr"
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              value={prices[tier]}
              onChange={(event) => setPrices((current) => ({ ...current, [tier]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={pending} className="rounded-md bg-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void save()}>
          {t('save')}
        </button>
        {saved && <span className="text-sm text-ok">{t('saved')}</span>}
      </div>
      <div className="mt-3">
        <Banner code={error} />
      </div>
    </section>
  )
}

type ProgramDraft = {
  id: string
  nameAr: string
  nameEn: string
  makkahAr: string
  makkahEn: string
  madinahAr: string
  madinahEn: string
  quad: string
  triple: string
  double: string
  quint: string
}

function draftProgram(program: UmrahProgram): ProgramDraft {
  return {
    id: program.id,
    nameAr: program.nameAr,
    nameEn: program.nameEn,
    makkahAr: program.makkahAr,
    makkahEn: program.makkahEn,
    madinahAr: program.madinahAr,
    madinahEn: program.madinahEn,
    quad: String(program.prices.quad),
    triple: String(program.prices.triple),
    double: String(program.prices.double),
    quint: program.prices.quint == null ? '' : String(program.prices.quint),
  }
}

function blankProgram(): ProgramDraft {
  return { id: `prog_${crypto.randomUUID().slice(0, 8)}`, nameAr: '', nameEn: '', makkahAr: '', makkahEn: '', madinahAr: '', madinahEn: '', quad: '', triple: '', double: '', quint: '' }
}

function wholePounds(value: string) {
  if (!/^\d+$/.test(value.trim())) return Number.NaN
  return Number(value.trim())
}

function ProgramPrices() {
  const { t } = useI18n()
  const { programs, ready } = usePrograms()
  const [rows, setRows] = useState<ProgramDraft[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!ready || rows) return
    setRows(programs.map(draftProgram))
  }, [ready, programs, rows])

  function update(id: string, patch: Partial<ProgramDraft>) {
    setSaved(false)
    setRows((current) => current?.map((row) => (row.id === id ? { ...row, ...patch } : row)) ?? current)
  }

  async function save() {
    if (!rows) return
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      const next = rows.map((row) => ({
        id: row.id,
        nameAr: row.nameAr,
        nameEn: row.nameEn,
        makkahAr: row.makkahAr,
        makkahEn: row.makkahEn,
        madinahAr: row.madinahAr,
        madinahEn: row.madinahEn,
        prices: {
          quad: wholePounds(row.quad),
          triple: wholePounds(row.triple),
          double: wholePounds(row.double),
          quint: row.quint.trim() === '' ? null : wholePounds(row.quint),
        },
      }))
      assertPrograms(next)
      await call('setPrograms', { programs: next })
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof DomainError ? caught.code : errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold text-deep">{t('programPrices')}</h2>
      <p className="mt-1 text-sm text-muted">{t('programPricesLead')}</p>
      {!rows ? (
        <p className="mt-4 text-sm text-muted">{t('loading')}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((row, index) => (
            <fieldset key={row.id} className="rounded-xl border border-line p-3">
              <legend className="px-1 text-sm font-semibold text-deep">{index + 1}</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium">
                  {t('nameAr')}
                  <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={row.nameAr} onChange={(event) => update(row.id, { nameAr: event.target.value })} />
                </label>
                <label className="text-sm font-medium">
                  {t('nameEn')}
                  <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={row.nameEn} onChange={(event) => update(row.id, { nameEn: event.target.value })} />
                </label>
                <label className="text-sm font-medium">
                  {t('makkahAr')}
                  <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={row.makkahAr} onChange={(event) => update(row.id, { makkahAr: event.target.value })} />
                </label>
                <label className="text-sm font-medium">
                  {t('makkahEn')}
                  <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={row.makkahEn} onChange={(event) => update(row.id, { makkahEn: event.target.value })} />
                </label>
                <label className="text-sm font-medium">
                  {t('madinahAr')}
                  <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={row.madinahAr} onChange={(event) => update(row.id, { madinahAr: event.target.value })} />
                </label>
                <label className="text-sm font-medium">
                  {t('madinahEn')}
                  <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={row.madinahEn} onChange={(event) => update(row.id, { madinahEn: event.target.value })} />
                </label>
                {(['quad', 'triple', 'double', 'quint'] as const).map((room) => (
                  <label key={room} className="text-sm font-medium">
                    {t(room === 'quad' ? 'programQuad' : room === 'triple' ? 'programTriple' : room === 'double' ? 'programDouble' : 'programQuint')}
                    <input dir="ltr" inputMode="numeric" className="mt-1 w-full rounded-md border border-line px-3 py-2" value={row[room]} onChange={(event) => update(row.id, { [room]: event.target.value })} />
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-danger disabled:opacity-40"
                disabled={rows.length === 1}
                onClick={() => {
                  setSaved(false)
                  setRows((current) => current?.filter((item) => item.id !== row.id) ?? current)
                }}
              >
                {t('removeProgram')}
              </button>
            </fieldset>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => setRows((current) => (current ? [...current, blankProgram()] : current))}>
              {t('addProgram')}
            </button>
            <button type="button" disabled={pending} className="rounded-md bg-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void save()}>
              {t('save')}
            </button>
            {saved && <span className="text-sm text-ok">{t('saved')}</span>}
          </div>
          <Banner code={error} />
        </div>
      )}
    </section>
  )
}

function EmployeeRow({ employee, self, layout, onRemove }: { employee: EmployeeRow; self: boolean; layout: 'row' | 'card'; onRemove: () => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(employee.displayName)
  const [email, setEmail] = useState(employee.email)
  const [role, setRole] = useState<Role>(employee.role)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDisplayName(employee.displayName)
    setEmail(employee.email)
    setRole(employee.role)
  }, [employee.displayName, employee.email, employee.role])

  async function changeRole(next: Role) {
    const previous = role
    setRole(next)
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      await call('updateEmployee', {
        uid: employee.uid,
        displayName: employee.displayName,
        email: employee.email,
        role: next,
        password: '',
        disabled: employee.disabled,
      })
      setSaved(true)
    } catch (caught) {
      setRole(previous)
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  async function saveDetails() {
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      await call('updateEmployee', { uid: employee.uid, displayName, email, role, password, disabled: employee.disabled })
      setPassword('')
      setSaved(true)
    } catch (caught) {
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  async function setDisabled(next: boolean) {
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      await call('updateEmployee', {
        uid: employee.uid,
        displayName: employee.displayName,
        email: employee.email,
        role: employee.role,
        password: '',
        disabled: next,
      })
      setSaved(true)
    } catch (caught) {
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  const details = open ? (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          {t('displayName')}
          <input className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          {t('email')}
          <input dir="ltr" className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          {t('newPassword')}
          <input dir="ltr" type="password" className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">{t('passwordHint')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} className="min-h-11 rounded-md bg-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void saveDetails()}>
          {t('saveEmployee')}
        </button>
        <button type="button" disabled={pending || self} className="min-h-11 rounded-md border border-line bg-card px-4 py-2 text-sm font-semibold disabled:opacity-50" onClick={() => void setDisabled(!employee.disabled)}>
          {employee.disabled ? t('enable') : t('disable')}
        </button>
        {saved && <span className="text-sm text-ok">{t('saved')}</span>}
      </div>
      <div className="mt-3">
        <Banner code={error} />
      </div>
    </div>
  ) : null

  const roleSelect = (
    <>
      <label className="sr-only" htmlFor={`role-${layout}-${employee.uid}`}>{t('role')}</label>
      <select
        id={`role-${layout}-${employee.uid}`}
        className="w-full rounded-md border border-line bg-card px-2 py-1 md:w-auto"
        value={role}
        disabled={pending || self}
        onChange={(event) => void changeRole(event.target.value as Role)}
      >
        {ROLES.map((item) => (
          <option key={item} value={item}>
            {t(roleKey(item))}
          </option>
        ))}
      </select>
    </>
  )

  if (layout === 'card') {
    return (
      <article className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{employee.displayName}</p>
            <p dir="ltr" className="truncate text-start text-sm text-muted">{employee.email}</p>
          </div>
          <span className={`shrink-0 text-sm font-semibold ${employee.disabled ? 'text-danger' : 'text-ok'}`}>{employee.disabled ? t('disabled') : t('active')}</span>
        </div>
        {roleSelect}
        {error && !open && <Banner code={error} />}
        <div className="flex flex-wrap gap-4">
          <button type="button" className="min-h-11 font-semibold text-blue" onClick={() => setOpen((value) => !value)}>
            {open ? t('cancel') : t('manage')}
          </button>
          {!self && <TrashButton label={t('removeEmployee')} onClick={onRemove} />}
        </div>
        {details}
      </article>
    )
  }

  return (
    <>
      <tr className="border-t border-line">
        <td className="px-3 py-3 font-medium">{employee.displayName}</td>
        <td dir="ltr" className="px-3 py-3 text-start">{employee.email}</td>
        <td className="px-3 py-3">
          {roleSelect}
          {error && !open && (
            <div className="mt-2">
              <Banner code={error} />
            </div>
          )}
        </td>
        <td className={`px-3 py-3 font-semibold ${employee.disabled ? 'text-danger' : 'text-ok'}`}>{employee.disabled ? t('disabled') : t('active')}</td>
        <td className="px-3 py-3 text-end">
          <span className="inline-flex items-center gap-3">
            <button type="button" className="font-semibold text-blue" onClick={() => setOpen((value) => !value)}>
              {open ? t('cancel') : t('manage')}
            </button>
            {!self && <TrashButton label={t('removeEmployee')} onClick={onRemove} />}
          </span>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-line bg-paper">
          <td colSpan={5} className="px-3 py-4">
            {details}
          </td>
        </tr>
      )}
    </>
  )
}
