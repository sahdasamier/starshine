import { Navigate, Route, Routes } from 'react-router-dom'
import { homeForRole } from '@shared/domain'
import { Shell } from './components/Shell'
import { useAuth } from './lib/auth'
import { BookingsProvider } from './lib/bookings'
import { useI18n } from './lib/i18n'
import { BookingFormPage } from './pages/BookingFormPage'
import { BookingPage } from './pages/BookingPage'
import { CompletedPage } from './pages/CompletedPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { LoginPage } from './pages/LoginPage'
import { HistoryPage } from './pages/HistoryPage'
import { QueuePage } from './pages/QueuePage'
import { SearchPage } from './pages/SearchPage'
import { TripsPage } from './pages/TripsPage'

function Home() {
  const { profile } = useAuth()
  if (!profile) return null
  return <Navigate to={homeForRole(profile.role)} replace />
}

function Protected() {
  const { user, profile, ready } = useAuth()
  const { t } = useI18n()
  if (!ready) return <p className="p-10 text-center text-muted">{t('loading')}</p>
  if (!user || !profile) return <Navigate to="/login" replace />
  return (
    <BookingsProvider>
      <Shell />
    </BookingsProvider>
  )
}

function Missing() {
  const { t } = useI18n()
  return (
    <div className="p-10 text-center">
      <p>{t('notFound')}</p>
      <a href="/" className="mt-3 inline-block font-semibold text-blue">
        {t('backHome')}
      </a>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Home />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/completed" element={<CompletedPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/bookings/new" element={<BookingFormPage />} />
        <Route path="/bookings/:id" element={<BookingPage />} />
        <Route path="/bookings/:id/edit" element={<BookingFormPage />} />
      </Route>
      <Route path="*" element={<Missing />} />
    </Routes>
  )
}
