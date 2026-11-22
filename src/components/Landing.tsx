import { useEffect, useRef, useState } from 'react'
import { money } from '../lib/demoData'
import type { PublicData } from '../lib/types'
import QrCode from './QrCode'

const BOOKING_STEPS = [
  'Elige tu barbería', 'Elige el servicio', 'Elige tu barbero', 'Elige la fecha',
  'Elige la hora', 'Domicilio o en local', 'Revisa tu reserva', 'Confirma y listo',
]

const MANIFESTO_WORDS = 'La estética es nuestra pasión. Tu estilo, en tus manos.'.split(' ')
const MARQUEE = 'Fade · Barba · Navaja clásica · Diseño · A domicilio · Sin filas · Sin llamadas · '
const RING_LABELS = ['Fade', 'Barba', 'Diseño', 'Navaja clásica', 'Clásico', 'A domicilio']

type Anim = { scroll: number; hero: number; pin: number; mani: number; ring: number }

export default function Landing({ data, onBook, onLogin, onRegister }: {
  data: PublicData
  onBook: () => void
  onLogin: () => void
  onRegister: () => void
}) {
  const pinRef = useRef<HTMLDivElement>(null)
  const manifestoRef = useRef<HTMLParagraphElement>(null)
  const devicesRef = useRef<HTMLDivElement>(null)
  const [phoneStep, setPhoneStep] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [videoOk, setVideoOk] = useState(true)
  const [anim, setAnim] = useState<Anim>({ scroll: 0, hero: 1, pin: 0, mani: 0, ring: 0 })

  // Entrada: reveals de líneas con máscara al cargar
  useEffect(() => {
    const t = requestAnimationFrame(() => setLoaded(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Scroll: progreso, zoom del hero, avance del pin, manifiesto y anillo 3D (con rAF)
  useEffect(() => {
    let raf = 0
    let ticking = false
    const update = () => {
      ticking = false
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      const scroll = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0
      const hero = 1 + Math.min(y, 900) * 0.00035
      let pin = 0
      const pinEl = pinRef.current
      if (pinEl) {
        const r = pinEl.getBoundingClientRect()
        const total = r.height - window.innerHeight
        pin = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0
        setPhoneStep(Math.min(7, Math.floor(pin * 8)))
      }
      let mani = 0
      const mEl = manifestoRef.current
      if (mEl) {
        const r = mEl.getBoundingClientRect()
        const total = window.innerHeight * 0.9 + r.height
        mani = Math.min(1, Math.max(0, (window.innerHeight * 0.9 - r.top) / total))
      }
      setAnim({ scroll, hero, pin, mani, ring: y * 0.08 })
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        raf = requestAnimationFrame(update)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Reveals por sección con IntersectionObserver (translate + blur, no solo fade)
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'))
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          ;(e.target as HTMLElement).classList.add('in')
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.12 })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [data])

  // Tilt 3D suave (lerp) de los dispositivos con el mouse
  useEffect(() => {
    const el = devicesRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let tx = 0; let ty = 0; let cx = 0; let cy = 0; let raf = 0; let active = false
    const loop = () => {
      cx += (tx - cx) * 0.08
      cy += (ty - cy) * 0.08
      el.style.transform = `perspective(1200px) rotateX(${(-cy * 6).toFixed(2)}deg) rotateY(${(cx * 8).toFixed(2)}deg)`
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        raf = requestAnimationFrame(loop)
      } else {
        active = false
      }
    }
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2
      if (!active) { active = true; raf = requestAnimationFrame(loop) }
    }
    const onLeave = () => { tx = 0; ty = 0; if (!active) { active = true; raf = requestAnimationFrame(loop) } }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  const pinRotate = (anim.pin - 0.5) * 24 // -12° a +12°
  const pinScale = 0.96 + anim.pin * 0.08
  const ringItems = data.photos.length > 0
    ? data.photos.map((p) => ({ id: p.id, label: p.kind === 'barberia' ? '✂ BARBERÍA' : '✂ CORTE', caption: p.description || p.kind }))
    : RING_LABELS.map((label, i) => ({ id: `demo-${i}`, label: `✂ ${label.toUpperCase()}`, caption: label }))

  return (
    <div className="landing">
      <div className="scroll-progress" style={{ transform: `scaleX(${anim.scroll})` }} aria-hidden />
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

      <section className={`hero ${loaded ? 'hero-loaded' : ''}`}>
        <div className="hero-bg" aria-hidden />
        {videoOk && (
          <video
            className="hero-video"
            src="/promo.mp4"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoOk(false)}
            style={{ transform: `scale(${anim.hero.toFixed(3)})` }}
            aria-hidden
          />
        )}
        <div className="hero-light" aria-hidden />
        <div className="hero-grain" aria-hidden />
        <div className="hero-content">
          <p className="eyebrow mask-line"><span>Reserva · Conecta · Estiliza</span></p>
          <h1><span className="mask-line"><span>Tu barbería</span></span><br /><span className="mask-line"><span>más cerca de ti</span></span></h1>
          <p className="hero-sub mask-line"><span>Reserva tu silla · Sin filas · Sin llamadas. Elige barbería, servicio y barbero, y pide servicio a domicilio.</span></p>
          <div className="hero-actions mask-line">
            <span>
              <button className="btn btn-primary btn-lg" onClick={onBook}>Reservar cita</button>
              <button className="btn btn-ghost btn-lg" onClick={onRegister}>Registrar mi barbería</button>
            </span>
          </div>
        </div>
        <div className="devices" ref={devicesRef} aria-label="La plataforma en celular, tableta y computadora">
          <div className="device phone"><div className="device-shine" aria-hidden /><div className="device-screen"><strong>BARBERLINK</strong><span>Fade · RD$500</span><span>Juan Pérez · 10:00</span><em>Reservar →</em></div></div>
          <div className="device tablet"><div className="device-shine" aria-hidden /><div className="device-screen"><strong>Mis reservas</strong><span>Fade — Confirmada</span><span>Barba — Pendiente</span></div></div>
          <div className="device laptop"><div className="device-shine" aria-hidden /><div className="device-screen"><strong>Panel de control</strong><span>Reservas hoy: 12 · Ingresos: RD$6,400</span></div></div>
        </div>
      </section>

      <div className="marquee" aria-hidden><div className="marquee-track"><span>{MARQUEE.repeat(4)}</span><span>{MARQUEE.repeat(4)}</span></div></div>

      <section className="manifesto reveal">
        <p ref={manifestoRef}>
          {MANIFESTO_WORDS.map((w, i) => {
            const wp = Math.min(1, Math.max(0, anim.mani * MANIFESTO_WORDS.length - i))
            return (
              <span key={i} className={wp > 0.5 ? 'word lit' : 'word'} style={{ opacity: 0.22 + 0.78 * wp }}>
                {w}{' '}
              </span>
            )
          })}
        </p>
      </section>

      <section id="servicios" className="section reveal">
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
          <div className="pin-copy reveal">
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
            <div className="device phone big" style={{ transform: `rotate(${pinRotate.toFixed(1)}deg) scale(${pinScale.toFixed(3)})` }}>
              <div className="device-shine" aria-hidden />
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

      <section id="barberias" className="section reveal">
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

      <section className="section reveal">
        <p className="section-num">04 — Galería real</p>
        <h2>Cortes y barberías reales</h2>
        <div className="gallery-stage">
          <div className="gallery-ring" style={{ transform: `translateZ(-340px) rotateY(${anim.ring.toFixed(1)}deg)` }}>
            {ringItems.map((p, i) => (
              <figure
                key={p.id}
                className="gallery-item"
                style={{ transform: `rotateY(${(i * 360 / ringItems.length).toFixed(1)}deg) translateZ(340px)` }}
              >
                <div className="gallery-ph">{p.label}</div>
                <figcaption>{p.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        {data.photos.length === 0 && <p className="muted center">Aún no hay fotos subidas por los barberos. Pon una foto real en <code>public/barbershop.jpg</code> para usarla como portada.</p>}
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

      <div className="pole-band" aria-hidden>
        <div className="pole" />
        <span>Tu estilo, en tus manos</span>
        <div className="pole" />
      </div>

      <section className="section qr-band reveal">
        <div>
          <p className="section-num">05 — Reseñas verificadas</p>
          <h2>Escanea, reserva y opina</h2>
          <p className="muted">Cada barbería tiene su QR. Solo quien completó una reserva puede dejar una reseña verificada.</p>
        </div>
        <QrCode text="BARBERLINK | Reserva tu barbería en República Dominicana" />
      </section>

      <section id="precios" className="section reveal">
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
