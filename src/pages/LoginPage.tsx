import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { homeForRole } from '@shared/domain'
import { call, errorCode } from '../lib/api'
import { sendPasswordReset, useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { Banner, FieldError } from '../components/ui'

const loginSchema = z.object({
  email: z.string().trim().email('email'),
  password: z.string().min(8, 'password'),
})

const resetSchema = z.object({
  email: z.string().trim().email('email'),
})

const setupSchema = loginSchema.extend({
  displayName: z.string().trim().min(1, 'displayName'),
})

type LoginValues = z.infer<typeof loginSchema>
type SetupValues = z.infer<typeof setupSchema>
type ResetValues = z.infer<typeof resetSchema>

export function LoginPage() {
  const { user, profile, ready, signIn } = useAuth()
  const { t, toggleLanguage } = useI18n()
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(sessionStorage.getItem('starshine.notice'))
  const [pending, setPending] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    sessionStorage.removeItem('starshine.notice')
    void call<{ needsBootstrap: boolean }>('needsBootstrap')
      .then((result) => setNeedsBootstrap(result.needsBootstrap))
      .catch((caught) => {
        setError(errorCode(caught))
        setNeedsBootstrap(false)
      })
  }, [])

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const resetForm = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { email: '' } })
  const setupForm = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  })

  if (ready && user && profile) return <Navigate to={homeForRole(profile.role)} replace />

  async function onLogin(values: LoginValues) {
    setPending(true)
    setError(null)
    try {
      await signIn(values.email, values.password)
    } catch (caught) {
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  function showSignIn() {
    setRecovering(false)
    setResetSent(false)
    setError(null)
    resetForm.reset()
  }

  async function onReset(values: ResetValues) {
    setPending(true)
    setError(null)
    try {
      await sendPasswordReset(values.email)
      setResetSent(true)
    } catch (caught) {
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  async function onSetup(values: SetupValues) {
    setPending(true)
    setError(null)
    try {
      await call('bootstrapAdmin', values)
      await signIn(values.email, values.password)
    } catch (caught) {
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-4 flex w-full max-w-md justify-end">
        <button type="button" className="min-h-11 rounded-md border border-line bg-card px-3 py-2 text-sm font-semibold" onClick={() => void toggleLanguage()}>
          {t('language')}
        </button>
      </div>
      <img src="/logo.webp" alt="Star Shine Tours Aswan" width={480} height={511} className="mb-6 w-full max-w-xs sm:max-w-sm" />
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-deep">{needsBootstrap ? t('createAdmin') : recovering ? t('resetPassword') : t('signIn')}</h1>
        {needsBootstrap && <p className="mt-2 text-sm text-muted">{t('setupLead')}</p>}
        <div className="mt-4">
          <Banner code={error} />
        </div>
        {needsBootstrap ? (
          <form className="mt-5 space-y-3" onSubmit={setupForm.handleSubmit(onSetup)} noValidate>
            <label className="block text-sm font-medium">
              {t('displayName')}
              <input className="mt-1 w-full rounded-md border border-line px-3 py-2" {...setupForm.register('displayName')} />
              <FieldError message={setupForm.formState.errors.displayName?.message} />
            </label>
            <label className="block text-sm font-medium">
              {t('email')}
              <input dir="ltr" className="mt-1 w-full rounded-md border border-line px-3 py-2" autoComplete="username" {...setupForm.register('email')} />
              <FieldError message={setupForm.formState.errors.email?.message} />
            </label>
            <label className="block text-sm font-medium">
              {t('password')}
              <input dir="ltr" type="password" className="mt-1 w-full rounded-md border border-line px-3 py-2" autoComplete="new-password" {...setupForm.register('password')} />
              <FieldError message={setupForm.formState.errors.password?.message} />
            </label>
            <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-deep px-4 py-2 font-semibold text-white disabled:opacity-50">
              {t('createAdmin')}
            </button>
          </form>
        ) : recovering ? (
          resetSent ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-deep">{t('resetSent')}</p>
              <button type="button" className="min-h-11 w-full rounded-md bg-deep px-4 py-2 font-semibold text-white" onClick={showSignIn}>
                {t('backToSignIn')}
              </button>
            </div>
          ) : (
            <form className="mt-5 space-y-3" onSubmit={resetForm.handleSubmit(onReset)} noValidate>
              <p className="text-sm text-muted">{t('resetLead')}</p>
              <label className="block text-sm font-medium">
                {t('email')}
                <input dir="ltr" className="mt-1 w-full rounded-md border border-line px-3 py-2" autoComplete="username" {...resetForm.register('email')} />
                <FieldError message={resetForm.formState.errors.email?.message} />
              </label>
              <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-deep px-4 py-2 font-semibold text-white disabled:opacity-50">
                {t('resetPassword')}
              </button>
              <button type="button" className="min-h-11 w-full text-sm font-semibold text-blue" onClick={showSignIn}>
                {t('backToSignIn')}
              </button>
            </form>
          )
        ) : (
          <form className="mt-5 space-y-3" onSubmit={loginForm.handleSubmit(onLogin)} noValidate>
            <label className="block text-sm font-medium">
              {t('email')}
              <input dir="ltr" className="mt-1 w-full rounded-md border border-line px-3 py-2" autoComplete="username" {...loginForm.register('email')} />
              <FieldError message={loginForm.formState.errors.email?.message} />
            </label>
            <label className="block text-sm font-medium">
              {t('password')}
              <input dir="ltr" type="password" className="mt-1 w-full rounded-md border border-line px-3 py-2" autoComplete="current-password" {...loginForm.register('password')} />
              <FieldError message={loginForm.formState.errors.password?.message} />
            </label>
            <button type="button" className="min-h-11 text-sm font-semibold text-blue" onClick={() => { setRecovering(true); setError(null); setResetSent(false) }}>
              {t('forgotPassword')}
            </button>
            <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-deep px-4 py-2 font-semibold text-white disabled:opacity-50">
              {t('signIn')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
