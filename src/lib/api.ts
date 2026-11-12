import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export async function call<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const fn = httpsCallable<Record<string, unknown>, T>(functions, 'api')
  const result = await fn({ action, ...data })
  return result.data
}

export function errorCode(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message: string }).message)
    const match = message.match(/code:([A-Za-z]+)/)
    if (match) return match[1]
  }
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String((error as { code: string }).code)
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-login-credentials') {
      return 'credentials'
    }
    if (code === 'auth/user-disabled') return 'disabled'
    if (code === 'auth/invalid-email') return 'email'
    if (code === 'auth/too-many-requests') return 'tooMany'
    if (code === 'functions/unavailable' || code === 'functions/not-found') return 'unavailable'
  }
  return 'internal'
}
