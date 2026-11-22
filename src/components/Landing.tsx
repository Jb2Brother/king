import { useEffect, useRef, useState } from 'react'
import { money } from '../lib/demoData'
import type { PublicData } from '../lib/types'
import QrCode from './QrCode'

const BOOKING_STEPS = [
  'Elige tu barbería', 'Elige el servicio', 'Elige tu barbero', 'Elige la fecha',
  'Elige la hora', 'Domicilio o en local', 'Revisa tu reserva', 'Confirma y listo',
]

export default function Landing({ data, onBook, onLogin, onRegister }: {
  data: PublicData
  onBook: () => void
  onLogin: () => void
  onRegister: () => void
}) {
  const pinRef = useRef<HTMLDivElement>(null)
  const [phoneStep, setPhoneStep] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = pinRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0
      setPhoneStep(Math.min(7, Math.floor(p * 8)))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing">
      <header className="site-header">
        <div className="logo">BARBER<span>LINK</span></div>
        <nav>
          <a href="#servicios">Servicios</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#barberias">Barberías</a>
          <a href="#precios">Precios</a>
        </nav>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={onLogin}>Entrar</button>
          <button className="btn btn-primary" onClick={onBook}>Reservar cita</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-grain" aria-hidden />
        <div className="hero-content">
          <p className="eyebrow">Reserva · Conecta · Estiliza</p>
          <h1>Tu barbería<br />más cerca de ti</h1>
          <p className="hero-sub">Reserva tu silla · Sin filas · Sin llamadas. Elige barbería, servicio y barbero, y pide servicio a domicilio.</p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onBook}>Reservar cita</button>
            <button className="btn btn-ghost btn-lg" onClick={onRegister}>Registrar mi barbería</button>
          </div>
        </div>
        <div className="devices" aria-label="La plataforma en celular, tableta y computadora">
          <div className="device phone"><div className="device-screen"><strong>BARBERLINK</strong><span>Fade · RD$500</span><span>Juan Pérez · 10:00</span><em>Reservar →</em></div></div>
          <div className="device tablet"><div className="device-screen"><strong>Mis reservas</strong><span>Fade — Confirmada</span><span>Barba — Pendiente</span></div></div>
          <div className="device laptop"><div className="device-screen"><strong>Panel de control</strong><span>Reservas hoy: 12 · Ingresos: RD$6,400</span></div></div>
        </div>
      </section>

      <section className="manifesto">
        <p><span>La estética</span> es nuestra pasión. <span>Tu estilo,</span> en tus manos.</p>
      </section>

      <section id="servicios" className="section">
        <p className="section-num">01 — Servicios</p>
        <h2>Precios claros, sin sorpresas</h2>
        <div className="ledger">
          {data.services.slice(0, 8).map((s) => (
            <div key={s.id} className="ledger-row">
              <span><strong>{s.name}</strong><small>{s.description} · {s.duration_minutes} min</small></span>
              <strong>{money(s.price)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="section pin-section" ref={pinRef}>
        <p className="section-num">02 — Cómo funciona · {String(phoneStep + 1).padStart(2, '0')} / 08</p>
        <div className="pin-layout">
          <div className="pin-copy">
            <h2>Reserva en 8 pasos,<br />sin llamadas</h2>
            <ol className="steps-list">
              {BOOKING_STEPS.map((s, i) => (
                <li key={s} className={i === phoneStep ? 'active' : i < phoneStep ? 'done' : ''}>
                  <span>{String(i + 1).padStart(2, '0')}</span> {s}
                </li>
              ))}
            </ol>
            <button className="btn btn-primary" onClick={onBook}>Empezar ahora</button>
          </div>
          <div className="pin-phone">
            <div className="device phone big" style={{ transform: `rotate(${(phoneStep - 3.5) * 2}deg)` }}>
              <div className="device-screen">
                <strong>BARBERLINK</strong>
                <span className="phone-step">Paso {phoneStep + 1} / 8</span>
                <span>{BOOKING_STEPS[phoneStep]}</span>
                <em>{phoneStep === 7 ? '¡Reserva confirmada!' : 'Sigue bajando ↓'}</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="barberias" className="section">
        <p className="section-num">03 — Barberías destacadas</p>
        <h2>Barberos con nombre y apellido</h2>
        <div className="grid-3">
          {data.shops.map((s) => (
            <article key={s.id} className="card shop-card">
              <strong>{s.name}</strong>
              <span className="muted">{s.address}</span>
              <span>★ {Number(s.rating || 0).toFixed(1)} {s.home_service ? `· A domicilio +${money(s.home_surcharge || 0)}` : ''}</span>
              <span>{data.barbers.filter((b) => b.barbershop_id === s.id).map((b) => b.name).join(' · ')}</span>
              {s.is_demo && <span className="tag">Ejemplo</span>}
              <button className="btn btn-primary btn-sm" onClick={onBook}>Reservar aquí</button>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <p className="section-num">04 — Galería real</p>
        <h2>Cortes y barberías reales</h2>
        <div className="gallery-ring">
          {data.photos.map((p) => (
            <figure key={p.id} className="gallery-item">
              <div className="gallery-ph">{p.kind === 'barberia' ? '✂ BARBERÍA' : '✂ CORTE'}</div>
              <figcaption>{p.description || p.kind}</figcaption>
            </figure>
          ))}
          {data.photos.length === 0 && <p className="muted">Aún no hay fotos subidas por los barberos.</p>}
        </div>
        <div className="reviews">
          {data.reviews.map((r) => (
            <blockquote key={r.id} className="card">
              <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <p>“{r.comment}”</p>
              <footer>— {r.client_name} {r.is_verified && <span className="tag">Reseña verificada</span>}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="section qr-band">
        <div>
          <p className="section-num">05 — Reseñas verificadas</p>
          <h2>Escanea, reserva y opina</h2>
          <p className="muted">Cada barbería tiene su QR. Solo quien completó una reserva puede dejar una reseña verificada.</p>
        </div>
        <QrCode text="BARBERLINK | Reserva tu barbería en República Dominicana" />
      </section>

      <section id="precios" className="section">
        <p className="section-num">06 — Precios</p>
        <h2>RD$1,000 al mes por barbería</h2>
        <p className="muted">Para los clientes siempre es gratis. El precio lo puede cambiar el superadmin desde Configuración.</p>
        <div className="grid-3">
          <div className="card"><h3>Cliente</h3><p className="price">RD$0</p><p className="muted">Reservas ilimitadas, reseñas y QR.</p></div>
          <div className="card highlight"><h3>Barbería</h3><p className="price">RD$1,000<span>/mes</span></p><p className="muted">Panel, agenda, barberos, servicios, fotos y reseñas.</p></div>
          <div className="card"><h3>Barbero</h3><p className="price">RD$0</p><p className="muted">Agenda, fotos de cortes y su QR personal.</p></div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="logo">BARBER<span>LINK</span></div>
        <p>Tu estilo, en tus manos · República Dominicana · RD$ · America/Santo_Domingo</p>
        <p className="muted">Los datos marcados como “Ejemplo” son de demostración, no son negocios reales.</p>
      </footer>
    </div>
  )
}
