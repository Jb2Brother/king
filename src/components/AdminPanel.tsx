import { useEffect, useState } from 'react'
import {
  getAllProfiles, getBookings, getPayments, getPublicData, getSetting, getSubscriptions,
  setProfileActive, setSetting, setShopStatus, testSupabaseConnection, updateBookingStatus,
} from '../lib/backend'
import { money } from '../lib/demoData'
import { SUPABASE_URL, isSupabaseConfigured } from '../lib/supabase'
import type { Booking, Profile, PublicData } from '../lib/types'
import { AreaChart, BarChart } from './Charts'
import QrCode, { QrGenerator } from './QrCode'

function last14Days(bookings: Booking[]) {
  const days: { label: string; value: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    days.push({ label: String(d.getDate()), value: bookings.filter((b) => b.booking_date === iso).length })
  }
  return days
}

export default function AdminPanel({ user }: { user: Profile }) {
  const [tab, setTab] = useState('resumen')
  const [data, setData] = useState<PublicData | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [subs, setSubs] = useState<{ id: string; barbershop_id: string; plan_price: number; status: string }[]>([])
  const [payments, setPayments] = useState<{ id: string; barbershop_id: string; amount: number; method?: string | null; status: string }[]>([])
  const [price, setPrice] = useState('1000')
  const [testMsg, setTestMsg] = useState('')

  useEffect(() => {
    getPublicData().then(setData).catch(() => setData(null))
    getBookings().then(setBookings).catch(() => setBookings([]))
    getAllProfiles().then(setProfiles).catch(() => setProfiles([]))
    getSubscriptions().then(setSubs).catch(() => setSubs([]))
    getPayments().then(setPayments).catch(() => setPayments([]))
    getSetting('subscription_price').then((v) => { if (v) setPrice(v) }).catch(() => undefined)
  }, [])

  const income = bookings.filter((b) => b.status === 'completada' || b.status === 'confirmada')
    .reduce((s, b) => s + (b.total_price || 0), 0)
  const byStatus = ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio']
    .map((s) => ({ label: s.slice(0, 4), value: bookings.filter((b) => b.status === s).length }))
  const byShop = (data?.shops || []).map((s) => ({ label: s.name.split(' ')[0], value: bookings.filter((b) => b.barbershop_id === s.id).length }))
  const topServices = (data?.services || []).map((s) => ({ label: s.name, value: bookings.filter((b) => b.service_id === s.id).length }))
    .sort((a, b) => b.value - a.value).slice(0, 5)

  const tabs = [
    ['resumen', 'Resumen'], ['graficos', 'Gráficos'], ['barberias', 'Barberías'],
    ['usuarios', 'Usuarios'], ['reservas', 'Reservas'], ['suscripciones', 'Suscripciones'],
    ['resenas', 'Reseñas'], ['configuracion', 'Configuración'],
  ] as const

  return (
    <section className="panel admin">
      <h2>Administración de BarberLink</h2>
      <p className="muted">Superadmin · {user.email} · {isSupabaseConfigured ? 'Modo Supabase activo' : 'Modo local de ejemplo (sin Supabase configurado)'}</p>
      <nav className="tabs scroll">
        {tabs.map(([k, label]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>

      {tab === 'resumen' && (
        <div>
          <div className="stats">
            <div className="stat"><strong>{profiles.length}</strong><span>Usuarios</span></div>
            <div className="stat"><strong>{data?.shops.length || 0}</strong><span>Barberías</span></div>
            <div className="stat"><strong>{bookings.length}</strong><span>Reservas</span></div>
            <div className="stat"><strong>{money(income)}</strong><span>Ingresos</span></div>
            <div className="stat"><strong>★ {data?.reviews.length ? (data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length).toFixed(1) : '—'}</strong><span>Calificación</span></div>
          </div>
          <div className="card"><h3>Reservas, últimos 14 días</h3><AreaChart data={last14Days(bookings)} /></div>
          <h3>Últimas reservas</h3>
          <div className="grid-2">
            {bookings.slice(0, 4).map((b) => (
              <div key={b.id} className="card"><strong>{b.service_name}</strong><span>{b.booking_date} {b.booking_time} · {b.client_name} · {b.status}</span><span>{money(b.total_price)}</span></div>
            ))}
          </div>
        </div>
      )}

      {tab === 'graficos' && (
        <div className="grid-2">
          <div className="card"><h3>Reservas por estado</h3><BarChart data={byStatus} /></div>
          <div className="card"><h3>Reservas por barbería</h3><BarChart data={byShop} /></div>
          <div className="card"><h3>Servicios más pedidos</h3><BarChart data={topServices} /></div>
          <div className="card"><h3>Reservas, últimos 14 días</h3><AreaChart data={last14Days(bookings)} /></div>
        </div>
      )}

      {tab === 'barberias' && (
        <div className="grid-2">
          {data?.shops.map((s) => (
            <div key={s.id} className="card">
              <strong>{s.name}</strong><span>{s.address} · {s.status}</span>
              <div className="row">
                <button className="btn btn-sm" onClick={async () => { await setShopStatus(s.id, 'activa'); setData(await getPublicData()) }}>Aprobar</button>
                <button className="btn btn-ghost btn-sm" onClick={async () => { await setShopStatus(s.id, 'suspendida'); setData(await getPublicData()) }}>Suspender</button>
              </div>
              <QrCode text={`BARBERLINK | ${s.name} | ${s.address || ''} | ${s.phone || ''}`} size={120} />
            </div>
          ))}
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="grid-2">
          {profiles.map((p) => (
            <div key={p.id} className="card">
              <strong>{p.full_name}</strong><span>{p.email} · {p.role} · {p.is_active === false ? 'Desactivado' : 'Activo'}</span>
              <button className="btn btn-ghost btn-sm" onClick={async () => { await setProfileActive(p.id, p.is_active === false); setProfiles(await getAllProfiles()) }}>
                {p.is_active === false ? 'Activar' : 'Desactivar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'reservas' && (
        <div className="grid-2">
          {bookings.map((b) => (
            <div key={b.id} className="card">
              <strong>{b.service_name} · {b.client_name}</strong>
              <span>{b.booking_date} {b.booking_time} · {money(b.total_price)} · {b.status}</span>
              <div className="row">
                {(['confirmada', 'completada', 'no_asistio', 'cancelada'] as const).map((s) => (
                  <button key={s} className="btn btn-ghost btn-sm" onClick={async () => { await updateBookingStatus(b.id, s); setBookings(await getBookings()) }}>{s}</button>
                ))}
              </div>
            </div>
          ))}
          {bookings.length === 0 && <p className="muted">Sin reservas todavía.</p>}
        </div>
      )}

      {tab === 'suscripciones' && (
        <div>
          <div className="grid-2">
            {subs.map((s) => (
              <div key={s.id} className="card"><strong>{data?.shops.find((x) => x.id === s.barbershop_id)?.name || s.barbershop_id}</strong><span>{money(s.plan_price)}/mes · {s.status}</span></div>
            ))}
          </div>
          <h3>Pagos manuales</h3>
          <div className="grid-2">
            {payments.length === 0 && <p className="muted">Sin pagos registrados. Los pagos son manuales: no se simula ningún cargo real sin una pasarela configurada.</p>}
            {payments.map((p) => (
              <div key={p.id} className="card"><strong>{money(p.amount)}</strong><span>{p.method || 'Manual'} · {p.status}</span></div>
            ))}
          </div>
        </div>
      )}

      {tab === 'resenas' && (
        <div className="grid-2">
          {data?.reviews.map((r) => (
            <div key={r.id} className="card">
              <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <p>“{r.comment}”</p>
              <footer>— {r.client_name} {r.is_verified ? <span className="tag">Verificada</span> : <span className="tag">Sin verificar</span>}</footer>
            </div>
          ))}
        </div>
      )}

      {tab === 'configuracion' && (
        <div className="grid-2">
          <div className="card">
            <h3>Precio de suscripción</h3>
            <label>RD$ por barbería al mes<input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
            <button className="btn btn-primary btn-sm" onClick={async () => { await setSetting('subscription_price', price); alert('Precio guardado: RD$' + price) }}>Guardar precio</button>
          </div>
          <div className="card">
            <h3>Supabase — conexión por env</h3>
            <p className="muted">El código lee solo <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> desde variables de entorno. Ninguna clave está en el código.</p>
            <p><strong>URL:</strong> <code>{SUPABASE_URL || 'no configurada'}</code></p>
            <p><strong>Modo:</strong> {isSupabaseConfigured ? 'Supabase activo' : 'Local de ejemplo'}</p>
            <button className="btn btn-sm" onClick={async () => setTestMsg(await testSupabaseConnection())}>Probar conexión con Supabase</button>
            {testMsg && <p className="muted">{testMsg}</p>}
            <h4>Cómo hacer tu cuenta admin en Supabase</h4>
            <ol className="steps">
              <li>Regístrate en la app con camilobarber@gmail.com.</li>
              <li>En Supabase &gt; Table Editor &gt; profiles, cambia su <code>role</code> a <code>superadmin</code>.</li>
              <li>Vuelve a entrar: verás este panel de admin.</li>
            </ol>
            <h4>GitHub → Netlify</h4>
            <ol className="steps">
              <li>Sube este proyecto a GitHub.</li>
              <li>En Netlify, New site from Git, elige el repositorio.</li>
              <li>Build: <code>npm run build</code> · Publish: <code>dist</code>.</li>
              <li>En Environment variables pon <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.</li>
              <li>En Supabase &gt; Authentication &gt; URL Configuration pon la URL de Netlify como Site URL.</li>
            </ol>
            <p className="muted">El SQL completo está en <code>supabase-schema.sql</code> en la raíz del repositorio.</p>
          </div>
          <QrGenerator />
        </div>
      )}
    </section>
  )
}
