import { NavLink, Outlet } from 'react-router-dom'
import { homeForRole } from '@shared/domain'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { roleKey } from './ui'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-deep text-white' : 'text-deep hover:bg-paper'}`

export function Shell() {
  const { profile, signOutUser } = useAuth()
  const { t, toggleLanguage } = useI18n()
  if (!profile) return null
  const home = homeForRole(profile.role)

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <NavLink to={home} className="shrink-0">
            <img src="/logo.jpg" alt="Star Shine Tours Aswan" className="h-16 w-auto bg-white object-contain" />
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/queue" className={linkClass}>
              {t('queue')}
            </NavLink>
            {(profile.role === 'reception' || profile.role === 'admin') && (
              <NavLink to="/bookings/new" className={linkClass}>
                {t('newBooking')}
              </NavLink>
            )}
            <NavLink to="/trips" className={linkClass}>
              {t('trips')}
            </NavLink>
            <NavLink to="/history" className={linkClass}>
              {t('archive')}
            </NavLink>
            <NavLink to="/search" className={linkClass}>
              {t('search')}
            </NavLink>
            <NavLink to="/completed" className={linkClass}>
              {t('completed')}
            </NavLink>
            {profile.role === 'admin' && (
              <NavLink to="/employees" className={linkClass}>
                {t('adminDashboard')}
              </NavLink>
            )}
          </nav>
          <div className="ms-auto flex items-center gap-2 text-sm">
            <div className="text-end">
              <div className="font-semibold">{profile.displayName}</div>
              <div className="text-xs text-muted">{t(roleKey(profile.role))}</div>
            </div>
            <button type="button" className="rounded-md border border-line px-3 py-2 font-semibold text-deep" onClick={() => void toggleLanguage()}>
              {t('language')}
            </button>
            <button type="button" className="rounded-md bg-deep px-3 py-2 font-semibold text-white" onClick={() => void signOutUser()}>
              {t('signOut')}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
