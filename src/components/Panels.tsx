import { useEffect, useState } from 'react'
import { deletePhoto, getBookings, getNotifications, getPublicData, updateBookingStatus, uploadPhoto } from '../lib/backend'
import { money } from '../lib/demoData'
import type { Booking, Photo, Profile, PublicData } from '../lib/types'
import QrCode, { QrGenerator } from './QrCode'

function BookingCard({ b, onStatus }: { b: Booking; onStatus?: (id: string, s: Booking['status']) => void }) {
  const [showQr, setShowQr] = useState(false)
  return (
    <article className="card">
      <strong>{b.service_name || 'Servicio'}</strong>
      <span>{b.booking_date} a las {b.booking_time} · {money(b.total_price)}</span>
      <span>Cliente: {b.client_name} · Estado: <b>{b.status}</b></span>
      {b.is_home_service && <span>A domicilio: {b.home_address}</span>}
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={() => setShowQr(!showQr)}>{showQr ? 'Ocultar QR' : 'Ver QR'}</button>
        {onStatus && b.status === 'pendiente' && <button className="btn btn-sm" onClick={() => onStatus(b.id, 'confirmada')}>Confirmar</button>}
        {onStatus && b.status === 'confirmada' && <button className="btn btn-sm" onClick={() => onStatus(b.id, 'completada')}>Completar</button>}
        {onStatus && (b.status === 'pendiente' || b.status === 'confirmada') && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => onStatus(b.id, 'no_asistio')}>No asistió</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onStatus(b.id, 'cancelada')}>Cancelar</button>
          </>
        )}
      </div>
      {showQr && <QrCode text={b.qr_code || `BARBERLINK ${b.id}`} size={140} />}
    </article>
  )
}

export function ClientPanel({ user }: { user: Profile }) {
  const [tab, setTab] = useState('reservas')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [data, setData] = useState<PublicData | null>(null)
  const [notes, setNotes] = useState<{ title: string; message: string }[]>([])

  useEffect(() => {
    getBookings({ clientId: user.id }).then(setBookings).catch(() => setBookings([]))
    getPublicData().then(setData).catch(() => setData(null))
    getNotifications(user.id).then((n) => setNotes(n.map((x) => ({ title: x.title, message: x.message })))).catch(() => setNotes([]))
  }, [user.id])

  return (
    <section className="panel">
      <h2>Hola, {user.full_name}</h2>
      <p className="muted">Tu espacio de cliente · {user.email}</p>
      <nav className="tabs">
        {(['reservas', 'explorar', 'galeria', 'qr', 'avisos'] as const).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t === 'reservas' ? 'Mis reservas' : t === 'explorar' ? 'Explorar' : t === 'galeria' ? 'Galería de cortes' : t === 'qr' ? 'Códigos QR' : 'Avisos'}</button>
        ))}
      </nav>
      {tab === 'reservas' && (
        <div className="grid-2">
          {bookings.length === 0 && <p className="muted">Aún no tienes reservas. Reserva tu primera cita desde la portada.</p>}
          {bookings.map((b) => <BookingCard key={b.id} b={b} />)}
        </div>
      )}
      {tab === 'explorar' && (
        <div className="grid-3">
          {data?.shops.map((s) => (
            <article key={s.id} className="card"><strong>{s.name}</strong><span className="muted">{s.address}</span><span>★ {Number(s.rating || 0).toFixed(1)}</span>{s.is_demo && <span className="tag">Ejemplo</span>}</article>
          ))}
        </div>
      )}
      {tab === 'galeria' && (
        <div className="grid-3">
          {data?.photos.map((p) => (
            <figure key={p.id} className="card"><div className="gallery-ph">✂ {p.kind}</div><figcaption>{p.description || p.kind}</figcaption></figure>
          ))}
        </div>
      )}
      {tab === 'qr' && (
        <div className="grid-2">
          {data?.shops.map((s) => (
            <div key={s.id} className="card center"><strong>{s.name}</strong><QrCode text={`BARBERLINK | ${s.name} | ${s.address || ''} | ${s.phone || ''}`} size={140} /></div>
          ))}
          <QrGenerator />
        </div>
      )}
      {tab === 'avisos' && (
        <div className="grid-2">
          {notes.length === 0 && <p className="muted">No tienes avisos por ahora.</p>}
          {notes.map((n, i) => <div key={i} className="card"><strong>{n.title}</strong><span>{n.message}</span></div>)}
        </div>
      )}
    </section>
  )
}

export function BarberPanel({ user }: { user: Profile }) {
  const [tab, setTab] = useState('agenda')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [data, setData] = useState<PublicData | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'corte' | 'barberia'>('corte')
  const [desc, setDesc] = useState('')
  const [msg, setMsg] = useState('')

  const myBarber = data?.barbers.find((b) => b.user_id === user.id) || data?.barbers.find((b) => b.name === user.full_name)

  useEffect(() => {
    getPublicData().then(setData).catch(() => setData(null))
    getBookings({ barberId: myBarber?.id }).then(setBookings).catch(() => setBookings([]))
  }, [user.id, myBarber?.id])

  useEffect(() => { setPhotos(data?.photos.filter((p) => p.barber_id === myBarber?.id) || []) }, [data, myBarber?.id])

  async function onStatus(id: string, s: Booking['status']) {
    await updateBookingStatus(id, s)
    setBookings(await getBookings({ barberId: myBarber?.id }))
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    if (file.size > 6 * 1024 * 1024) { setMsg('La foto no puede pasar de 6 MB.'); return }
    setMsg('Subiendo…')
    try {
      const photo = await uploadPhoto(file, { barber_id: myBarber?.id, barbershop_id: myBarber?.barbershop_id, kind, description: desc, uploader_id: user.id })
      setPhotos([...photos, photo]); setMsg('Foto subida.'); setFile(null); setDesc('')
    } catch (err) { setMsg(err instanceof Error ? err.message : 'No se pudo subir la foto.') }
  }

  return (
    <section className="panel">
      <h2>Tu agenda, {user.full_name}</h2>
      <p className="muted">Barbero · {myBarber ? `${myBarber.specialty || ''} en ${data?.shops.find((s) => s.id === myBarber.barbershop_id)?.name || ''}` : 'Sin barbería vinculada todavía (el propietario te vincula por correo).'}</p>
      <nav className="tabs">
        {(['agenda', 'fotos', 'qr'] as const).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t === 'agenda' ? 'Mi agenda' : t === 'fotos' ? 'Mis fotos' : 'Mis códigos QR'}</button>
        ))}
      </nav>
      {tab === 'agenda' && (
        <div className="grid-2">
          {bookings.length === 0 && <p className="muted">No tienes reservas en tu agenda.</p>}
          {bookings.map((b) => <BookingCard key={b.id} b={b} onStatus={onStatus} />)}
        </div>
      )}
      {tab === 'fotos' && (
        <div>
          <form className="card form" onSubmit={onUpload}>
            <h3>Subir foto de tu barbería o de tus cortes</h3>
            <label>Foto (JPG, PNG o WebP, hasta 6 MB)<input className="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></label>
            <label>Tipo<select className="input" value={kind} onChange={(e) => setKind(e.target.value as 'corte' | 'barberia')}><option value="corte">Corte</option><option value="barberia">Barbería</option></select></label>
            <label>Descripción<input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Fade con diseño" /></label>
            <button className="btn btn-primary" type="submit">Subir foto</button>
            {msg && <p className="muted">{msg}</p>}
          </form>
          <div className="grid-3">
            {photos.map((p) => (
              <figure key={p.id} className="card"><div className="gallery-ph">✂ {p.kind}</div><figcaption>{p.description || p.kind}</figcaption>
                <button className="btn btn-ghost btn-sm" onClick={async () => { await deletePhoto(p.id); setPhotos(photos.filter((x) => x.id !== p.id)) }}>Borrar</button>
              </figure>
            ))}
          </div>
        </div>
      )}
      {tab === 'qr' && (
        <div className="grid-2">
          <div className="card center"><strong>Mi QR personal</strong><QrCode text={`BARBERLINK | Barbero ${user.full_name} | ${myBarber?.specialty || ''}`} /></div>
          {myBarber && <div className="card center"><strong>QR de mi barbería</strong><QrCode text={`BARBERLINK | ${data?.shops.find((s) => s.id === myBarber.barbershop_id)?.name || ''}`} /></div>}
          <QrGenerator />
        </div>
      )}
    </section>
  )
}

export function OwnerPanel({ user }: { user: Profile }) {
  const [tab, setTab] = useState('reservas')
  const [data, setData] = useState<PublicData | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')

  const myShop = data?.shops.find((s) => s.owner_id === user.id) || data?.shops[0]

  useEffect(() => {
    getPublicData().then(setData).catch(() => setData(null))
    if (myShop) getBookings({ shopId: myShop.id }).then(setBookings).catch(() => setBookings([]))
  }, [user.id, myShop?.id])

  async function onStatus(id: string, s: Booking['status']) {
    await updateBookingStatus(id, s)
    if (myShop) setBookings(await getBookings({ shopId: myShop.id }))
  }

  return (
    <section className="panel">
      <h2>Panel de {myShop?.name || 'mi barbería'}</h2>
      <p className="muted">Propietario · {user.email} · Suscripción RD$1,000/mes</p>
      <nav className="tabs">
        {(['reservas', 'barberos', 'servicios', 'fotos', 'qr'] as const).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t === 'reservas' ? 'Reservas' : t === 'barberos' ? 'Barberos' : t === 'servicios' ? 'Servicios' : t === 'fotos' ? 'Fotos' : 'Códigos QR'}</button>
        ))}
      </nav>
      {tab === 'reservas' && (
        <div className="grid-2">
          {bookings.length === 0 && <p className="muted">Sin reservas todavía en esta barbería.</p>}
          {bookings.map((b) => <BookingCard key={b.id} b={b} onStatus={onStatus} />)}
        </div>
      )}
      {tab === 'barberos' && (
        <div className="grid-3">
          {data?.barbers.filter((b) => b.barbershop_id === myShop?.id).map((b) => (
            <article key={b.id} className="card"><strong>{b.name}</strong><span className="muted">{b.specialty}</span><QrCode text={`BARBERLINK | Barbero ${b.name} | ${myShop?.name || ''}`} size={120} /></article>
          ))}
        </div>
      )}
      {tab === 'servicios' && (
        <div className="ledger">
          {data?.services.filter((s) => s.barbershop_id === myShop?.id).map((s) => (
            <div key={s.id} className="ledger-row"><span><strong>{s.name}</strong><small>{s.duration_minutes} min</small></span><strong>{money(s.price)}</strong></div>
          ))}
        </div>
      )}
      {tab === 'fotos' && (
        <div>
          <form className="card form" onSubmit={async (e) => {
            e.preventDefault()
            if (!file || !myShop) return
            setMsg('Subiendo…')
            try { await uploadPhoto(file, { barbershop_id: myShop.id, kind: 'barberia', uploader_id: user.id }); setMsg('Foto subida.'); setFile(null) }
            catch (err) { setMsg(err instanceof Error ? err.message : 'No se pudo subir.') }
          }}>
            <h3>Subir foto de la barbería</h3>
            <input className="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            <button className="btn btn-primary" type="submit">Subir foto</button>
            {msg && <p className="muted">{msg}</p>}
          </form>
          <div className="grid-3">
            {data?.photos.filter((p) => p.barbershop_id === myShop?.id).map((p) => (
              <figure key={p.id} className="card"><div className="gallery-ph">✂ {p.kind}</div><figcaption>{p.description || p.kind}</figcaption></figure>
            ))}
          </div>
        </div>
      )}
      {tab === 'qr' && (
        <div className="grid-2">
          <div className="card center"><strong>QR principal de la barbería</strong><QrCode text={`BARBERLINK | ${myShop?.name || ''} | ${myShop?.address || ''} | ${myShop?.phone || ''}`} /></div>
          <div className="card center"><strong>QR de reseñas</strong><QrCode text={`BARBERLINK | Reseñas de ${myShop?.name || ''} | Solo reseñas verificadas`} /></div>
          <QrGenerator />
        </div>
      )}
    </section>
  )
}
