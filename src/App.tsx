import { useEffect, useState } from 'react'
import AdminPanel from './components/AdminPanel'
import Auth from './components/Auth'
import BookingWizard from './components/BookingWizard'
import Landing from './components/Landing'
import { BarberPanel, ClientPanel, OwnerPanel } from './components/Panels'
import { getCurrentProfile, getPublicData, signOut } from './lib/backend'
import { isSupabaseConfigured } from './lib/supabase'
import type { Booking, Profile, PublicData } from './lib/types'

type View = 'landing' | 'auth' | 'booking' | 'panel'

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [user, setUser] = useState<Profile | null>(null)
  const [data, setData] = useState<PublicData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicData().then(setData).catch(() => setData(null))
    getCurrentProfile().then((p) => { if (p) setUser(p) }).catch(() => undefined).finally(() => setLoading(false))
  }, [])

  function goPanel(p: Profile) {
    setUser(p)
    setView('panel')
  }

  async function logout() {
    await signOut()
    setUser(null)
    setView('landing')
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="logo">BARBER<span>LINK</span></div>
        <p className="muted">Cargando…</p>
      </div>
    )
  }

  if (view === 'panel' && user) {
    return (
      <div className="app">
        <header className="site-header">
          <button className="logo" onClick={() => setView('landing')}>BARBER<span>LINK</span></button>
          <span className="muted">{isSupabaseConfigured ? '● Supabase' : '● Modo ejemplo'}</span>
          <button className="btn btn-ghost" onClick={logout}>Cerrar sesión</button>
        </header>
        <main className="container">
          {user.role === 'superadmin' && <AdminPanel user={user} />}
          {user.role === 'propietario' && <OwnerPanel user={user} />}
          {user.role === 'barbero' && <BarberPanel user={user} />}
          {user.role === 'cliente' && <ClientPanel user={user} />}
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      {view === 'landing' && data && (
        <Landing
          data={data}
          onBook={() => setView('booking')}
          onLogin={() => setView('auth')}
          onRegister={() => setView('auth')}
        />
      )}
      {view === 'landing' && !data && <p className="muted center">Cargando BarberLink…</p>}
      {view === 'auth' && <Auth onAuth={goPanel} onCancel={() => setView('landing')} />}
      {view === 'booking' && (
        <main className="container">
          <BookingWizard
            user={user}
            onDone={(_b: Booking) => { if (user) setView('panel'); else setView('auth') }}
            onCancel={() => setView('landing')}
          />
          {!user && <p className="muted center">Para ver tus reservas, inicia sesión después de confirmar.</p>}
        </main>
      )}
    </div>
  )
}
