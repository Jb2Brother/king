import { useEffect, useMemo, useState } from 'react'
import { createBooking, getOccupiedHours, getPublicData, DoubleBookingError } from '../lib/backend'
import { HOURS, money } from '../lib/demoData'
import type { Barber, Barbershop, Booking, Profile, PublicData, Service } from '../lib/types'
import QrCode from './QrCode'

const STEPS = ['Barbería', 'Servicio', 'Barbero', 'Fecha', 'Hora', 'Domicilio', 'Revisión', 'Confirmación']

export default function BookingWizard({ user, onDone, onCancel }: { user: Profile | null; onDone: (b: Booking) => void; onCancel: () => void }) {
  const [data, setData] = useState<PublicData | null>(null)
  const [step, setStep] = useState(0)
  const [shop, setShop] = useState<Barbershop | null>(null)
  const [service, setService] = useState<Service | null>(null)
  const [barber, setBarber] = useState<Barber | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [home, setHome] = useState(false)
  const [address, setAddress] = useState('')
  const [clientName, setClientName] = useState(user?.full_name || '')
  const [clientPhone, setClientPhone] = useState(user?.phone || '')
  const [occupied, setOccupied] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Booking | null>(null)

  useEffect(() => { getPublicData().then(setData).catch(() => setData(null)) }, [])

  useEffect(() => {
    if (barber && date) getOccupiedHours(barber.id, date).then(setOccupied).catch(() => setOccupied([]))
  }, [barber, date])

  const shopBarbers = useMemo(() => data?.barbers.filter((b) => b.barbershop_id === shop?.id) || [], [data, shop])
  const shopServices = useMemo(() => data?.services.filter((s) => s.barbershop_id === shop?.id) || [], [data, shop])
  const total = (service?.price || 0) + (home && shop ? shop.home_surcharge || 0 : 0)
  const today = new Date().toISOString().slice(0, 10)

  async function confirm() {
    if (!shop || !service || !barber || !date || !time) return
    setError(''); setBusy(true)
    try {
      const qr = `BARBERLINK | ${shop.name} | ${service.name} | ${barber.name} | ${date} ${time} | ${money(total)}`
      const booking = await createBooking({
        client_id: user?.id || null,
        client_name: clientName.trim() || 'Cliente',
        client_phone: clientPhone.trim() || null,
        barbershop_id: shop.id, barber_id: barber.id, service_id: service.id,
        service_name: service.name, booking_date: date, booking_time: time,
        duration_minutes: service.duration_minutes, is_home_service: home,
        home_address: home ? address.trim() : null, total_price: total, qr_code: qr,
      })
      setCreated(booking)
      setStep(7)
    } catch (err) {
      setError(err instanceof DoubleBookingError ? err.message : err instanceof Error ? err.message : 'No se pudo crear la reserva.')
    } finally { setBusy(false) }
  }

  if (!data) return <p className="muted center">Cargando barberías…</p>

  return (
    <section className="wizard">
      <div className="wizard-head">
        <h2>Reservar cita</h2>
        <p className="muted">Paso {Math.min(step + 1, 8)} de 8 — {STEPS[step]}</p>
        <div className="progress"><div style={{ width: `${((step + 1) / 8) * 100}%` }} /></div>
      </div>
      {error && <p className="error">{error}</p>}

      {step === 0 && (
        <div className="grid-3">
          {data.shops.map((s) => (
            <button key={s.id} className={'card pick' + (shop?.id === s.id ? ' picked' : '')} onClick={() => setShop(s)}>
              <strong>{s.name}</strong><span className="muted">{s.address}</span>
              <span>★ {Number(s.rating || 0).toFixed(1)} {s.home_service ? '· A domicilio' : ''}</span>
              {s.is_demo && <span className="tag">Ejemplo</span>}
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="ledger">
          {shopServices.map((s) => (
            <button key={s.id} className={'ledger-row' + (service?.id === s.id ? ' picked' : '')} onClick={() => setService(s)}>
              <span><strong>{s.name}</strong><small>{s.description} · {s.duration_minutes} min</small></span>
              <strong>{money(s.price)}</strong>
            </button>
          ))}
          {shopServices.length === 0 && <p className="muted">Esta barbería aún no tiene servicios.</p>}
        </div>
      )}

      {step === 2 && (
        <div className="grid-3">
          {shopBarbers.map((b) => (
            <button key={b.id} className={'card pick' + (barber?.id === b.id ? ' picked' : '')} onClick={() => setBarber(b)}>
              <strong>{b.name}</strong><span className="muted">{b.specialty}</span>
            </button>
          ))}
          {shopBarbers.length === 0 && <p className="muted">Esta barbería aún no tiene barberos.</p>}
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <label>Elige la fecha<input className="input" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
      )}

      {step === 4 && (
        <div className="hours">
          {HOURS.map((h) => {
            const taken = occupied.includes(h)
            return (
              <button key={h} className={'hour' + (time === h ? ' picked' : '') + (taken ? ' taken' : '')}
                disabled={taken} onClick={() => setTime(h)} title={taken ? 'Hora ocupada' : h}>
                {h}{taken ? ' ✕' : ''}
              </button>
            )
          })}
          {!date && <p className="muted">Primero elige la fecha.</p>}
        </div>
      )}

      {step === 5 && (
        <div className="card form">
          <label className="check"><input type="checkbox" checked={home} onChange={(e) => setHome(e.target.checked)} /> Servicio a domicilio {shop?.home_service ? `(+${money(shop.home_surcharge || 0)})` : '(no disponible en esta barbería)'}</label>
          {home && <label>Dirección<input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, sector, ciudad" required /></label>}
          <label>Tu nombre<input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} required /></label>
          <label>Teléfono<input className="input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="809-000-0000" /></label>
        </div>
      )}

      {step === 6 && (
        <div className="card">
          <h3>Revisa tu reserva</h3>
          <dl className="review">
            <div><dt>Barbería</dt><dd>{shop?.name}</dd></div>
            <div><dt>Servicio</dt><dd>{service?.name} · {service?.duration_minutes} min</dd></div>
            <div><dt>Barbero</dt><dd>{barber?.name}</dd></div>
            <div><dt>Fecha y hora</dt><dd>{date} a las {time}</dd></div>
            <div><dt>Modalidad</dt><dd>{home ? `A domicilio — ${address}` : 'En la barbería'}</dd></div>
            <div><dt>Total</dt><dd><strong>{money(total)}</strong></dd></div>
          </dl>
          <button className="btn btn-primary" onClick={confirm} disabled={busy}>{busy ? 'Guardando…' : 'Confirmar reserva'}</button>
        </div>
      )}

      {step === 7 && created && (
        <div className="card center">
          <h3>¡Reserva confirmada!</h3>
          <p>{created.service_name} con {barber?.name} · {created.booking_date} a las {created.booking_time}</p>
          <p><strong>Total: {money(created.total_price)}</strong> · Estado: {created.status}</p>
          <QrCode text={created.qr_code || `BARBERLINK ${created.id}`} />
          <p className="muted">Muestra este QR en la barbería para verificar tu reserva.</p>
          <button className="btn btn-primary" onClick={() => onDone(created)}>Ver mis reservas</button>
        </div>
      )}

      {step < 7 && (
        <div className="wizard-nav">
          <button className="btn btn-ghost" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>Atrás</button>
          <button className="btn btn-primary" disabled={
            (step === 0 && !shop) || (step === 1 && !service) || (step === 2 && !barber) ||
            (step === 3 && !date) || (step === 4 && !time) ||
            (step === 5 && (!clientName.trim() || (home && !address.trim()) || (home && !shop?.home_service)))
          } onClick={() => setStep(step + 1)}>Continuar</button>
        </div>
      )}
    </section>
  )
}
