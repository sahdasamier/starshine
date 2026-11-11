import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { collection, onSnapshot } from 'firebase/firestore'
import { z } from 'zod'
import { ROLES, TIERS, formatPounds, type Pricing, type Role } from '@shared/domain'
import { call, errorCode } from '../lib/api'
import { useAuth, type Profile } from '../lib/auth'
import { db } from '../lib/firebase'
import { useI18n } from '../lib/i18n'
import { usePricing } from '../lib/pricing'
import { useRemoval } from '../components/confirm'
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
  const [prices, setPrices] = useState<Record<keyof Pricing, string>>({ standard: '', premium: '', vip: '' })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrices({
      standard: pricing.standard == null ? '' : formatPounds(pricing.standard),
      premium: pricing.premium == null ? '' : formatPounds(pricing.premium),
      vip: pricing.vip == null ? '' : formatPounds(pricing.vip),
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
          {!self && (
            <button type="button" className="min-h-11 font-semibold text-danger" onClick={onRemove}>
              {t('removeEmployee')}
            </button>
          )}
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
            {!self && (
              <button type="button" className="font-semibold text-danger" onClick={onRemove}>
                {t('removeEmployee')}
              </button>
            )}
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
