import { isSupabaseConfigured, supabase } from './supabase'
import {
  DEMO_BOOKINGS, DEMO_PHOTOS, DEMO_PUBLIC, DEMO_SUBSCRIPTIONS, DEMO_USERS,
} from './demoData'
import type {
  AppNotification, Barber, Barbershop, Booking, BookingStatus, Payment, Photo,
  Profile, PublicData, Review, Service, Subscription,
} from './types'

export { isSupabaseConfigured }

/* ------------------------- almacenamiento local ------------------------- */

const LS_BOOKINGS = 'barberlink_local_bookings'
const LS_PROFILE = 'barberlink_local_profile'
const LS_PHOTOS = 'barberlink_local_photos'

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function writeLocal(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* sin almacenamiento */ }
}

export function localBookings(): Booking[] {
  return readLocal<Booking[]>(LS_BOOKINGS, DEMO_BOOKINGS)
}
function saveLocalBookings(list: Booking[]) { writeLocal(LS_BOOKINGS, list) }

export function localPhotos(): Photo[] {
  return readLocal<Photo[]>(LS_PHOTOS, DEMO_PHOTOS)
}

/* ------------------------------- catálogo ------------------------------- */

export async function getPublicData(): Promise<PublicData> {
  if (supabase) {
    try {
      const [shops, barbers, services, reviews, photos] = await Promise.all([
        supabase.from('barbershops').select('*').eq('status', 'activa').order('name'),
        supabase.from('barbers').select('*').eq('is_active', true).order('name'),
        supabase.from('services').select('*').eq('is_active', true).order('price'),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('photos').select('*').order('created_at', { ascending: false }).limit(24),
      ])
      if (shops.error || barbers.error || services.error) throw shops.error || barbers.error || services.error
      return {
        shops: (shops.data || []) as Barbershop[],
        barbers: (barbers.data || []) as Barber[],
        services: (services.data || []) as Service[],
        reviews: (reviews.data || []) as Review[],
        photos: (photos.data || []) as Photo[],
      }
    } catch {
      return DEMO_PUBLIC // sin conexión: no se rompe la app
    }
  }
  return DEMO_PUBLIC
}

/* -------------------------------- reservas ------------------------------ */

export async function getBookings(filter?: { clientId?: string; barberId?: string; shopId?: string }): Promise<Booking[]> {
  if (supabase) {
    let q = supabase.from('bookings').select('*').order('booking_date', { ascending: true }).order('booking_time')
    if (filter?.clientId) q = q.eq('client_id', filter.clientId)
    if (filter?.barberId) q = q.eq('barber_id', filter.barberId)
    if (filter?.shopId) q = q.eq('barbershop_id', filter.shopId)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data || []) as Booking[]
  }
  let list = localBookings()
  if (filter?.clientId) list = list.filter((b) => b.client_id === filter.clientId)
  if (filter?.barberId) list = list.filter((b) => b.barber_id === filter.barberId)
  if (filter?.shopId) list = list.filter((b) => b.barbershop_id === filter.shopId)
  return list
}

export async function getOccupiedHours(barberId: string, date: string): Promise<string[]> {
  if (supabase) {
    const { data, error } = await supabase.rpc('occupied_hours', { p_barber_id: barberId, p_date: date })
    if (!error && data) return (data as { booking_time: string }[]).map((r) => String(r.booking_time).slice(0, 5))
    const { data: rows } = await supabase.from('bookings')
      .select('booking_time').eq('barber_id', barberId).eq('booking_date', date).neq('status', 'cancelada')
    return (rows || []).map((r) => String(r.booking_time).slice(0, 5))
  }
  return localBookings()
    .filter((b) => b.barber_id === barberId && b.booking_date === date && b.status !== 'cancelada')
    .map((b) => b.booking_time.slice(0, 5))
}

export class DoubleBookingError extends Error {}

export async function createBooking(input: Omit<Booking, 'id' | 'status'> & { status?: BookingStatus }): Promise<Booking> {
  const payload = { ...input, status: (input.status || 'pendiente') as BookingStatus }
  if (supabase) {
    const { data, error } = await supabase.from('bookings').insert(payload).select().single()
    if (error) {
      // 23505 = índice único anti doble-reserva de la base de datos
      if ((error as { code?: string }).code === '23505') {
        throw new DoubleBookingError('Esa hora ya está ocupada. Elige otra hora.')
      }
      throw new Error(error.message)
    }
    return data as Booking
  }
  const clash = localBookings().some(
    (b) => b.barber_id === payload.barber_id && b.booking_date === payload.booking_date &&
      b.booking_time === payload.booking_time && b.status !== 'cancelada',
  )
  if (clash) throw new DoubleBookingError('Esa hora ya está ocupada. Elige otra hora.')
  const created: Booking = { ...payload, id: 'local-' + Date.now() }
  saveLocalBookings([...localBookings(), created])
  return created
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  saveLocalBookings(localBookings().map((b) => (b.id === id ? { ...b, status } : b)))
}

/* --------------------------------- reseñas ------------------------------ */

export async function createReview(input: Omit<Review, 'id' | 'is_verified'>): Promise<Review> {
  if (supabase) {
    // Verificada solo si existe una reserva completada de ese cliente
    let verified = false
    if (input.booking_id) {
      const { data } = await supabase.from('bookings').select('status')
        .eq('id', input.booking_id).eq('client_id', input.client_id || '').single()
      verified = data?.status === 'completada'
    }
    const { data, error } = await supabase.from('reviews')
      .insert({ ...input, is_verified: verified }).select().single()
    if (error) throw new Error(error.message)
    return data as Review
  }
  const created: Review = { ...input, id: 'rev-' + Date.now(), is_verified: true }
  return created
}

/* ---------------------------------- fotos ------------------------------- */

export async function uploadPhoto(file: File, meta: { barbershop_id?: string; barber_id?: string; kind: 'corte' | 'barberia'; description?: string; uploader_id?: string }): Promise<Photo> {
  if (supabase) {
    const path = `${meta.uploader_id || 'anon'}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const { error: upErr } = await supabase.storage.from('barberlink-fotos').upload(path, file, { upsert: false })
    if (upErr) throw new Error(upErr.message)
    const { data: pub } = supabase.storage.from('barberlink-fotos').getPublicUrl(path)
    const { data, error } = await supabase.from('photos')
      .insert({ ...meta, url: pub.publicUrl }).select().single()
    if (error) throw new Error(error.message)
    return data as Photo
  }
  // Modo local: la foto queda como vista previa en el navegador
  const url = URL.createObjectURL(file)
  const created: Photo = { id: 'photo-' + Date.now(), url, ...meta }
  writeLocal(LS_PHOTOS, [...localPhotos(), created])
  return created
}

export async function deletePhoto(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('photos').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(LS_PHOTOS, localPhotos().filter((p) => p.id !== id))
}

/* ---------------------------------- auth -------------------------------- */

export async function signIn(email: string, password: string): Promise<Profile> {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    const profile = await getProfile(data.user.id)
    if (!profile) throw new Error('Tu cuenta no tiene perfil en BarberLink.')
    if (profile.is_active === false) throw new Error('Tu cuenta está desactivada.')
    return profile
  }
  const demo = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
  if (!demo) throw new Error('Correo o contraseña incorrectos.')
  const { password: _pw, ...profile } = demo
  writeLocal(LS_PROFILE, profile)
  return profile
}

export async function signUp(email: string, password: string, fullName: string, role: Profile['role'] = 'cliente'): Promise<Profile> {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role } },
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('No se pudo crear la cuenta.')
    // El trigger handle_new_user crea el perfil; si aún no existe, créalo
    const existing = await getProfile(data.user.id)
    if (existing) return existing
    const { data: prof, error: pErr } = await supabase.from('profiles')
      .insert({ id: data.user.id, email, full_name: fullName, role }).select().single()
    if (pErr) throw new Error(pErr.message)
    return prof as Profile
  }
  if (DEMO_USERS.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Ese correo ya tiene una cuenta en el modo de ejemplo.')
  }
  const profile: Profile = { id: 'local-' + Date.now(), email, full_name: fullName, role }
  writeLocal(LS_PROFILE, profile)
  return profile
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
  try { localStorage.removeItem(LS_PROFILE) } catch { /* noop */ }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return (data as Profile) || null
  }
  return readLocal<Profile | null>(LS_PROFILE, null)
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (supabase) {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    return getProfile(data.user.id)
  }
  return readLocal<Profile | null>(LS_PROFILE, null)
}

/* ---------------------------------- admin ------------------------------- */

export async function getAllProfiles(): Promise<Profile[]> {
  if (supabase) {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []) as Profile[]
  }
  return DEMO_USERS.map(({ password: _pw, ...p }) => p)
}

export async function setProfileActive(id: string, active: boolean): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('profiles').update({ is_active: active }).eq('id', id)
    if (error) throw new Error(error.message)
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  if (supabase) {
    const { data, error } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []) as Subscription[]
  }
  return DEMO_SUBSCRIPTIONS
}

export async function getPayments(): Promise<Payment[]> {
  if (supabase) {
    const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []) as Payment[]
  }
  return []
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  if (supabase) {
    const { data, error } = await supabase.from('notifications').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    if (error) throw new Error(error.message)
    return (data || []) as AppNotification[]
  }
  return []
}

export async function getSetting(key: string): Promise<string | null> {
  if (supabase) {
    const { data } = await supabase.from('settings').select('value').eq('key', key).single()
    return data?.value ?? null
  }
  return key === 'subscription_price' ? '1000' : null
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('settings').upsert({ key, value })
    if (error) throw new Error(error.message)
  }
}

export async function setShopStatus(id: string, status: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('barbershops').update({ status }).eq('id', id)
    if (error) throw new Error(error.message)
  }
}

export async function testSupabaseConnection(): Promise<string> {
  if (!supabase) return 'Supabase no está configurado: faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.'
  const { error } = await supabase.from('barbershops').select('id', { count: 'exact', head: true })
  if (error) return 'Error: ' + error.message
  return 'Conexión correcta con Supabase. Las tablas responden.'
}
