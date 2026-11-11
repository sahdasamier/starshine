import { useState } from 'react'
import { errorCode } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { Banner } from './ui'

export function useRemoval() {
  const { t } = useI18n()
  const [target, setTarget] = useState<{ title: string; body: string; action: () => Promise<void> } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function ask(title: string, body: string, action: () => Promise<void>) {
    setError(null)
    setTarget({ title, body, action })
  }

  async function confirm() {
    if (!target) return
    setPending(true)
    setError(null)
    try {
      await target.action()
      setTarget(null)
    } catch (caught) {
      setError(errorCode(caught))
    } finally {
      setPending(false)
    }
  }

  const dialog = target ? (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-deep/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
        <h2 className="text-lg font-semibold">{target.title}</h2>
        <p className="mt-2 text-sm text-muted">{target.body}</p>
        <div className="mt-3">
          <Banner code={error} />
        </div>
        <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
          <button type="button" className="min-h-11 rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => setTarget(null)}>
            {t('cancel')}
          </button>
          <button type="button" disabled={pending} className="min-h-11 rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void confirm()}>
            {t('remove')}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { ask, dialog }
}
