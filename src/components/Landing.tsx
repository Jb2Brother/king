import { useEffect, useRef, useState } from 'react'
import { money } from '../lib/demoData'
import type { PublicData } from '../lib/types'
import QrCode from './QrCode'

/*
 * Sistema de animación de la versión pública (barberlink-publica):
 * - Un SOLO bucle rAF continuo con valores interpolados (lerp) para scroll
 *   y mouse. El bucle escribe transforms directamente en el DOM (refs),
 *   nunca setState por fotograma: la fluidez es tipo video.
 * - Listener directo de scroll + mousemove que solo actualizan los valores
 *   objetivo; el bucle hace el resto. No depender solo de window.scrollY
 *   en cada render.
 * - Pieza fijada de 340vh con position:sticky. NUNCA overflow-x:hidden en
 *   un ancestro del sticky (lo rompe): ni en body, ni en .landing.
 */

const BOOKING_STEPS = [
  'Elige tu barbería', 'Elige el servicio', 'Elige tu barbero', 'Elige la fecha',
  'Elige la hora', 'Domicilio o en local', 'Revisa tu reserva', 'Confirma y listo',
]

const MANIFESTO_WORDS = 'La estética es nuestra pasión. Tu estilo, en tus manos.'.split(' ')
const MARQUEE = 'Fade · Barba · Navaja clásica · Diseño · A domicilio · Sin filas · Sin llamadas · '
const RING_LABELS = ['Fade', 'Barba', 'Diseño', 'Navaja clásica', 'Clásico', 'A domicilio']
const HOURS = ['09:00', '10:00', '11:00', '13:00', '14:00']

export default function Landing({ data, onBook, onLogin, onRegister }: {
  data: PublicData
  onBook: () => void
  onLogin: () => void
  onRegister: () => void
}) {
  // Refs del motor rAF (escritura directa, sin re-renders)
  const pinRef = useRef<HTMLDivElement>(null)
  const pinPhoneRef = useRef<HTMLDivElement>(null)
  const pinBarRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const heroContentRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const devicesRef = useRef<HTMLDivElement>(null)
  const manifestoRef = useRef<HTMLParagraphElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const poleRef = useRef<HTMLDivElement>(null)
  const hudNumRef = useRef<HTMLSpanElement>(null)
  const hudNameRef = useRef<HTMLSpanElement>(null)

  const [phoneStep, setPhoneStep] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [videoOk, setVideoOk] = useState(true)
  const stepRef = useRef(0)

  // Entrada: reveals de líneas con máscara al cargar
  useEffect(() => {
    const t = requestAnimationFrame(() => setLoaded(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Motor único: un bucle rAF continuo con lerp para scroll y mouse.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
    if (reduced) return
    let raf = 0
    let lastTime = performance.now()
    let ringAuto = 0
    const target = { scroll: window.scrollY, mouseX: 0, mouseY: 0 }
    const current = { scroll: window.scrollY, mouseX: 0, mouseY: 0 }
    let lastHud = ''

    const onScroll = () => { target.scroll = window.scrollY }
    const onMouse = (e: MouseEvent) => {
      target.mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      target.mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('mousemove', onMouse, { passive: true })

    const loop = (now: number) => {
      const dt = Math.min(50, now - lastTime)
      lastTime = now
      // Interpolación: ritmo cinematográfico lento, sin giros bruscos
      current.scroll += (target.scroll - current.scroll) * 0.12
      current.mouseX += (target.mouseX - current.mouseX) * 0.06
      current.mouseY += (target.mouseY - current.mouseY) * 0.06
      ringAuto += dt * 0.004 // ~4°/s, giro lento del anillo
      const y = current.scroll

      // Barra de progreso global
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`
      }

      // Hero: zoom del fondo ligado al scroll + parallax del contenido
      const heroZoom = 1 + Math.min(y, 900) * 0.00035
      if (heroVideoRef.current) heroVideoRef.current.style.transform = `scale(${heroZoom.toFixed(4)})`
      if (heroContentRef.current) {
        const f = Math.min(1, y / 700)
        heroContentRef.current.style.transform = `translateY(${(f * 60).toFixed(1)}px)`
        heroContentRef.current.style.opacity = String((1 - f * 0.55).toFixed(3))
      }
      if (heroRef.current) {
        heroRef.current.style.backgroundPosition = `0 ${(y * 0.15).toFixed(1)}px`
      }

      // Dispositivos: órbita lenta de cámara + tilt con el mouse (lerp)
      if (devicesRef.current) {
        const orbit = Math.sin(now * 0.00025) * 4
        devicesRef.current.style.transform =
          `perspective(1200px) rotateX(${(-current.mouseY * 5).toFixed(2)}deg) rotateY(${(orbit + current.mouseX * 7).toFixed(2)}deg)`
      }

      // Pieza fijada: el teléfono avanza 01→08 de forma reversible
      const pinEl = pinRef.current
      if (pinEl) {
        const r = pinEl.getBoundingClientRect()
        const total = r.height - window.innerHeight
        const pin = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0
        const step = Math.min(7, Math.floor(pin * 8))
        if (step !== stepRef.current) {
          stepRef.current = step
          setPhoneStep(step) // solo cambia el contenido, nunca por fotograma
        }
        if (pinPhoneRef.current) {
          const rot = (pin - 0.5) * 34 // -17° a +17°
          pinPhoneRef.current.style.transform =
            `rotate(${rot.toFixed(2)}deg) scale(${(0.96 + pin * 0.08).toFixed(3)})`
        }
        if (pinBarRef.current) pinBarRef.current.style.transform = `scaleX(${pin.toFixed(3)})`
      }

      // Manifiesto: palabras que se iluminan una a una con el scroll
      const mEl = manifestoRef.current
      if (mEl) {
        const r = mEl.getBoundingClientRect()
        const total = window.innerHeight * 0.9 + r.height
        const mani = Math.min(1, Math.max(0, (window.innerHeight * 0.9 - r.top) / total))
        const words = mEl.querySelectorAll('.word')
        words.forEach((w, i) => {
          const wp = Math.min(1, Math.max(0, mani * words.length - i))
          const el = w as HTMLElement
          el.style.opacity = String((0.22 + 0.78 * wp).toFixed(3))
          el.classList.toggle('lit', wp > 0.5)
        })
      }

      // Galería: anillo 3D con giro lento continuo + parallax de scroll
      if (ringRef.current) {
        ringRef.current.style.transform =
          `translateZ(-340px) rotateY(${(ringAuto + y * 0.05).toFixed(2)}deg)`
      }

      // Poste de barbero 3D: el cilindro rota con el scroll
      if (poleRef.current) {
        poleRef.current.style.transform = `rotateY(${(y * 0.12).toFixed(2)}deg)`
      }

      // HUD de sección: 01/09 — Inicio, 05/09 — Cómo funciona, ...
      let currentSection: HTMLElement | null = null
      for (const s of sections) {
        if (s.getBoundingClientRect().top <= window.innerHeight * 0.5) currentSection = s
      }
      if (currentSection) {
        const key = `${currentSection.dataset.num}|${currentSection.dataset.name}`
        if (key !== lastHud) {
          lastHud = key
          if (hudNumRef.current) hudNumRef.current.textContent = currentSection.dataset.num || ''
          if (hudNameRef.current) hudNameRef.current.textContent = currentSection.dataset.name || ''
        }
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouse)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Reveals escalonados por sección con IntersectionObserver
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

  // Tilt 3D de las tarjetas al pasar el mouse
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.tilt'))
    const cleanups = cards.map((card) => {
      const move = (e: MouseEvent) => {
        const r = card.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        card.style.transform =
          `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateY(-4px)`
      }
      const leave = () => { card.style.transform = '' }
      card.addEventListener('mousemove', move)
      card.addEventListener('mouseleave', leave)
      return () => {
        card.removeEventListener('mousemove', move)
        card.removeEventListener('mouseleave', leave)
      }
    })
    return () => cleanups.forEach((fn) => fn())
  }, [data])

  // --- Datos reales para las pantallas del teléfono fijado ---
  const topService = data.services.find((s) => s.name.toLowerCase().includes('fade')) ?? data.services[0]
  const topBarber = data.barbers[0]
  const homeShop = data.shops.find((s) => s.home_service)
  const nextDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + 1 + i)
    return d.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })
  })

  const phoneScreens: React.ReactNode[] = [
    // 01 — Barberías reales
    <div key="shops" className="phone-screen-inner">
      <p className="phone-label">Barberías cerca de ti</p>
      {data.shops.slice(0, 3).map((s, i) => (
        <div key={s.id} className={`phone-opt${i === 0 ? ' picked' : ''}`}>
          <span><strong>{s.name}</strong><small>{s.address}</small></span>
          <strong>★ {Number(s.rating || 0).toFixed(1)}</strong>
        </div>
      ))}
    </div>,
    // 02 — Servicios reales con precio y duración
    <div key="services" className="phone-screen-inner">
      <p className="phone-label">Servicios · {data.shops[0]?.name ?? 'BarberLink'}</p>
      {data.services.slice(0, 3).map((s, i) => (
        <div key={s.id} className={`phone-opt${i === 0 ? ' picked' : ''}`}>
          <span><strong>{s.name}</strong><small>{s.duration_minutes} min</small></span>
          <strong>{money(s.price)}</strong>
        </div>
      ))}
    </div>,
    // 03 — Barberos reales
    <div key="barbers" className="phone-screen-inner">
      <p className="phone-label">Elige tu barbero</p>
      {data.barbers.slice(0, 3).map((b, i) => (
        <div key={b.id} className={`phone-opt${i === 0 ? ' picked' : ''}`}>
          <span><strong>{b.name}</strong><small>{b.specialty ?? 'Barbero'}</small></span>
          <strong>★ 5.0</strong>
        </div>
      ))}
    </div>,
    // 04 — Fechas
    <div key="dates" className="phone-screen-inner">
      <p className="phone-label">Elige la fecha</p>
      {nextDays.map((d, i) => (
        <div key={d} className={`phone-opt${i === 0 ? ' picked' : ''}`}>
          <span><strong>{d}</strong></span>
          <strong>{i === 0 ? 'Disponible' : '·'}</strong>
        </div>
      ))}
    </div>,
    // 05 — Horas (10:00 elegida, 11:00 ocupada)
    <div key="hours" className="phone-screen-inner">
      <p className="phone-label">Horas disponibles</p>
      {HOURS.map((h) => (
        <div key={h} className={`phone-opt${h === '10:00' ? ' picked' : ''}${h === '11:00' ? ' taken' : ''}`}>
          <span><strong>{h}</strong></span>
          <strong>{h === '10:00' ? 'Elegida' : h === '11:00' ? 'Ocupada' : 'Libre'}</strong>
        </div>
      ))}
    </div>,
    // 06 — Domicilio o en local
    <div key="home" className="phone-screen-inner">
      <p className="phone-label">¿Dónde te atendemos?</p>
      <div className="phone-opt picked"><span><strong>En la barbería</strong><small>Sin recargo</small></span><strong>✓</strong></div>
      <div className="phone-opt"><span><strong>A domicilio</strong><small>Recargo {money(homeShop?.home_surcharge ?? 200)}</small></span><strong>→</strong></div>
    </div>,
    // 07 — Revisión con datos reales
    <div key="review" className="phone-screen-inner">
      <p className="phone-label">Revisa tu reserva</p>
      <div className="phone-opt"><span><strong>{topService?.name ?? 'Fade'}</strong><small>{topBarber?.name ?? 'Juan Pérez'}</small></span><strong>{topService ? money(topService.price) : 'RD$500'}</strong></div>
      <div className="phone-opt"><span><strong>{nextDays[0]}</strong><small>10:00 · En la barbería</small></span><strong>✓</strong></div>
    </div>,
    // 08 — Confirmación
    <div key="done" className="phone-screen-inner">
      <p className="phone-label">¡Reserva confirmada!</p>
      <div className="phone-confirm"><span className="phone-check">✓</span><strong>{topService?.name ?? 'Fade'} · {topService ? money(topService.price) : 'RD$500'}</strong><small>{topBarber?.name ?? 'Juan Pérez'} · 10:00 · {nextDays[0]}</small><code>BL-2481</code></div>
    </div>,
  ]

  // Anillo 3D: exactamente 6 paneles en un cilindro
  const ringItems = data.photos.length > 0
    ? [
        ...data.photos.slice(0, 6).map((p) => ({ id: p.id, label: p.kind === 'barberia' ? '✂ BARBERÍA' : '✂ CORTE', caption: p.description || p.kind })),
        ...RING_LABELS.slice(data.photos.slice(0, 6).length).map((label, i) => ({ id: `demo-${i}`, label: `✂ ${label.toUpperCase()}`, caption: label })),
      ].slice(0, 6)
    : RING_LABELS.map((label, i) => ({ id: `demo-${i}`, label: `✂ ${label.toUpperCase()}`, caption: label }))

  return (
    <div className="landing">
      {/* Grano de película animado en TODA la página */}
      <div className="page-grain" aria-hidden />
      <div className="scroll-progress" ref={progressRef} aria-hidden />
      {/* HUD de sección, como en la pública: 01/09 — Inicio, 05/09 — Cómo funciona */}
      <div className="section-hud" aria-hidden>
        <span ref={hudNumRef}>01 / 09</span>
        <span ref={hudNameRef}>Inicio</span>
      </div>

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

      {/* 01 — Inicio */}
      <section ref={heroRef} className={`hero ${loaded ? 'hero-loaded' : ''}`} data-section data-num="01 / 09" data-name="Inicio">
        <div className="hero-bg" aria-hidden />
        {videoOk && (
          <video
            ref={heroVideoRef}
            className="hero-video"
            src="/promo.mp4"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoOk(false)}
            aria-hidden
          />
        )}
        <div className="hero-light" aria-hidden />
        <div className="hero-grain" aria-hidden />
        <div className="hero-content" ref={heroContentRef}>
          <p className="eyebrow mask-line"><span>Reserva · Conecta · Estiliza</span></p>
          <h1>
            <span className="mask-line"><span>Tu <em className="serif">barbería</em></span></span><br />
            <span className="mask-line"><span>más cerca de ti</span></span>
          </h1>
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

      {/* 02 — Manifiesto */}
      <section className="manifesto reveal" data-section data-num="02 / 09" data-name="Manifiesto">
        <p ref={manifestoRef}>
          {MANIFESTO_WORDS.map((w, i) => (
            <span key={i} className="word">{w}{' '}</span>
          ))}
        </p>
      </section>

      {/* 03 — Servicios */}
      <section id="servicios" className="section reveal" data-section data-num="03 / 09" data-name="Servicios">
        <p className="section-num">03 / 09 — Servicios</p>
        <h2 className="wipe"><span>Precios claros, sin sorpresas</span></h2>
        <div className="ledger stagger">
          {data.services.slice(0, 8).map((s) => (
            <div key={s.id} className="ledger-row">
              <span><strong>{s.name}</strong><small>{s.description} · {s.duration_minutes} min</small></span>
              <strong>{money(s.price)}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* 04 — Barberías */}
      <section id="barberias" className="section reveal" data-section data-num="04 / 09" data-name="Barberías">
        <p className="section-num">04 / 09 — Barberías</p>
        <h2 className="wipe"><span>Barberos con nombre y apellido</span></h2>
        <div className="grid-3 stagger">
          {data.shops.map((s) => (
            <article key={s.id} className="card tilt shop-card">
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

      {/* 05 — Cómo funciona: pieza fijada de 340vh */}
      <section id="como-funciona" className="section pin-section" ref={pinRef} data-section data-num="05 / 09" data-name="Cómo funciona">
        <div className="pin-sticky">
          <div className="pin-head">
            <p className="section-num">05 / 09 — Cómo funciona</p>
            <div className="pin-progress"><div ref={pinBarRef} /></div>
            <p className="pin-counter">{String(phoneStep + 1).padStart(2, '0')} / 08</p>
          </div>
          <div className="pin-layout">
            <div className="pin-copy">
              <h2>Reserva en 8 pasos,<br /><em className="serif">sin llamadas</em></h2>
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
              <div className="device phone big" ref={pinPhoneRef}>
                <div className="device-shine" aria-hidden />
                <div className="device-screen">
                  <strong>BARBERLINK</strong>
                  <span className="phone-step">Paso {phoneStep + 1} / 8</span>
                  {phoneScreens[phoneStep]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 06 — Galería real */}
      <section className="section reveal" data-section data-num="06 / 09" data-name="Galería">
        <p className="section-num">06 / 09 — Galería</p>
        <h2 className="wipe"><span>Cortes y barberías reales</span></h2>
        <div className="gallery-stage">
          <div className="gallery-ring" ref={ringRef}>
            {ringItems.map((p, i) => (
              <figure
                key={p.id}
                className="gallery-item"
                style={{ transform: `rotateY(${(i * 60).toFixed(1)}deg) translateZ(340px)` }}
              >
                <div className="gallery-ph">{p.label}</div>
                <figcaption>{p.caption}</figcaption>
              </figure>
            ))}
          </div>
          <div className="gallery-floor" aria-hidden />
        </div>
        {data.photos.length === 0 && <p className="muted center">Aún no hay fotos subidas por los barberos. Pon una foto real en <code>public/barbershop.jpg</code> para usarla como portada.</p>}
      </section>

      {/* 07 — Reseñas verificadas */}
      <section className="section reveal" data-section data-num="07 / 09" data-name="Reseñas">
        <p className="section-num">07 / 09 — Reseñas</p>
        <h2 className="wipe"><span>Lo que dicen los clientes</span></h2>
        <div className="reviews stagger">
          {data.reviews.map((r) => (
            <blockquote key={r.id} className="card tilt">
              <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <p>“{r.comment}”</p>
              <footer>— {r.client_name} {r.is_verified && <span className="tag">Reseña verificada</span>}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Banda con cilindro de poste de barbero en 3D que rota con el scroll */}
      <div className="pole-band" aria-hidden>
        <div className="pole-stage"><div className="pole-3d" ref={poleRef}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="pole-face" style={{ transform: `rotateY(${i * 30}deg) translateZ(34px)` }} />
          ))}
        </div></div>
        <span>Tu estilo, en tus manos</span>
        <div className="pole-stage"><div className="pole-3d pole-3d-b">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="pole-face" style={{ transform: `rotateY(${i * 30}deg) translateZ(34px)` }} />
          ))}
        </div></div>
      </div>

      {/* 08 — Códigos QR */}
      <section className="section qr-band reveal" data-section data-num="08 / 09" data-name="Códigos QR">
        <div>
          <p className="section-num">08 / 09 — Reseñas verificadas</p>
          <h2 className="wipe"><span>Escanea, reserva y opina</span></h2>
          <p className="muted">Cada barbería tiene su QR. Solo quien completó una reserva puede dejar una reseña verificada.</p>
        </div>
        <QrCode text="BARBERLINK | Reserva tu barbería en República Dominicana" />
      </section>

      {/* 09 — Precios */}
      <section id="precios" className="section reveal" data-section data-num="09 / 09" data-name="Precios">
        <p className="section-num">09 / 09 — Precios</p>
        <h2 className="wipe"><span>RD$1,000 al mes por barbería</span></h2>
        <p className="muted">Para los clientes siempre es gratis. El precio lo puede cambiar el superadmin desde Configuración.</p>
        <div className="grid-3 stagger">
          <div className="card tilt"><h3>Cliente</h3><p className="price">RD$0</p><p className="muted">Reservas ilimitadas, reseñas y QR.</p></div>
          <div className="card tilt highlight"><h3>Barbería</h3><p className="price">RD$1,000<span>/mes</span></p><p className="muted">Panel, agenda, barberos, servicios, fotos y reseñas.</p></div>
          <div className="card tilt"><h3>Barbero</h3><p className="price">RD$0</p><p className="muted">Agenda, fotos de cortes y su QR personal.</p></div>
        </div>
        <p className="muted center" style={{ marginTop: '1.5rem' }}>
          ¿A domicilio? Las barberías con servicio a domicilio lo indican en su ficha, con su recargo.
        </p>
      </section>

      <footer className="site-footer">
        <div className="logo">BARBER<span>LINK</span></div>
        <p>Tu estilo, en tus manos · República Dominicana · RD$ · America/Santo_Domingo</p>
        <p className="muted">Los datos marcados como “Ejemplo” son de demostración, no son negocios reales.</p>
      </footer>
    </div>
  )
}
