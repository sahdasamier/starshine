import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { homeForRole } from '@shared/domain'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { CloseIcon, MenuIcon } from './icons'
import { roleKey } from './ui'

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-deep text-white' : 'text-deep hover:bg-paper'}`

const menuLink = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center rounded-md px-3 text-sm font-semibold ${isActive ? 'bg-deep text-white' : 'text-deep hover:bg-paper'}`

export function Shell() {
  const { profile, signOutUser } = useAuth()
  const { t, toggleLanguage } = useI18n()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  if (!profile) return null
  const home = homeForRole(profile.role)
  const links = [
    { to: '/queue', label: t('queue') },
    ...(profile.role === 'reception' || profile.role === 'auditor' || profile.role === 'admin' ? [{ to: '/bookings/new', label: t('newBooking') }] : []),
    { to: '/trips', label: t('trips') },
    { to: '/history', label: t('archive') },
    { to: '/search', label: t('search') },
    { to: '/completed', label: t('completed') },
    ...(profile.role === 'admin' ? [{ to: '/employees', label: t('adminDashboard') }] : []),
  ]

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-card pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <NavLink to={home} className="shrink-0">
            <img src="/logo.jpg" alt="Star Shine Tours Aswan" className="h-12 w-auto bg-white object-contain sm:h-16" />
          </NavLink>
          <nav className="hidden min-w-0 items-center gap-1 xl:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={desktopLink}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="ms-auto hidden items-center gap-2 text-sm xl:flex">
            <div className="text-end">
              <div className="font-semibold">{profile.displayName}</div>
              <div className="text-xs text-muted">{t(roleKey(profile.role))}</div>
            </div>
            <button type="button" className="min-h-11 rounded-md border border-line px-3 py-2 font-semibold text-deep" onClick={() => void toggleLanguage()}>
              {t('language')}
            </button>
            <button type="button" className="min-h-11 rounded-md bg-deep px-3 py-2 font-semibold text-white" onClick={() => void signOutUser()}>
              {t('signOut')}
            </button>
          </div>
          <div className="relative ms-auto xl:hidden" ref={menuRef}>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-md border border-line text-deep"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? t('cancel') : t('menu')}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            {menuOpen && (
              <div id="site-menu" className="absolute end-0 z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-card p-2 shadow-lg">
                <p className="px-3 py-2 text-sm font-semibold">
                  {profile.displayName}
                  <span className="ms-2 text-xs font-medium text-muted">{t(roleKey(profile.role))}</span>
                </p>
                <nav className="grid gap-1">
                  {links.map((link) => (
                    <NavLink key={link.to} to={link.to} className={menuLink}>
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-2 grid gap-2 border-t border-line pt-2">
                  <button type="button" className="min-h-11 rounded-md border border-line px-3 py-2 text-sm font-semibold text-deep" onClick={() => void toggleLanguage()}>
                    {t('language')}
                  </button>
                  <button type="button" className="min-h-11 rounded-md bg-deep px-3 py-2 text-sm font-semibold text-white" onClick={() => void signOutUser()}>
                    {t('signOut')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {menuOpen && <button type="button" className="fixed inset-0 z-20 xl:hidden" aria-label={t('cancel')} onClick={() => setMenuOpen(false)} />}
      <main className="mx-auto min-w-0 max-w-6xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  )
}
