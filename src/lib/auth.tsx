import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import type { Language, Role } from '@shared/domain'
import { auth, db } from './firebase'

export interface Profile {
  displayName: string
  email: string
  role: Role
  disabled: boolean
  language: Language
}

interface AuthValue {
  user: User | null
  profile: Profile | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      if (!next) {
        setProfile(null)
        setReady(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    setReady(false)
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (!snap.exists() || snap.data().disabled === true) {
          sessionStorage.setItem('starshine.notice', snap.exists() ? 'disabled' : 'noProfile')
          void signOut(auth)
          return
        }
        setProfile(snap.data() as Profile)
        setReady(true)
      },
      () => {
        setProfile(null)
        setReady(true)
      },
    )
  }, [user])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      profile,
      ready,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      },
      signOutUser: () => signOut(auth),
    }),
    [profile, ready, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(
      auth,
      email.trim(),
      import.meta.env.VITE_USE_EMULATOR === 'true' ? undefined : { url: `${window.location.origin}/login` },
    )
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'auth/user-not-found') return
    throw error
  }
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('auth')
  return value
}
