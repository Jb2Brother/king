import type { Barber, Barbershop, Booking, Photo, Profile, PublicData, Review, Service, Subscription } from './types'

export const DEMO_SHOPS: Barbershop[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Barbería El Trono', slug: 'barberia-el-trono', description: 'Barbería clásica con estilo moderno.', address: 'Av. Winston Churchill, Santo Domingo', phone: '809-555-0101', home_service: true, home_surcharge: 200, status: 'activa', is_demo: true, rating: 5.0 },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Fade Factory RD', slug: 'fade-factory-rd', description: 'Especialistas en fade y diseño.', address: 'Calle El Conde, Zona Colonial', phone: '809-555-0102', home_service: false, home_surcharge: 0, status: 'activa', is_demo: true, rating: 4.8 },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Navaja & Estilo', slug: 'navaja-y-estilo', description: 'Navaja clásica y barba de precisión.', address: 'Av. Abraham Lincoln, Santo Domingo', phone: '809-555-0103', home_service: true, home_surcharge: 150, status: 'activa', is_demo: true, rating: 4.7 },
]

export const DEMO_BARBERS: Barber[] = [
  { id: '11111111-1111-1111-1111-111111111112', barbershop_id: DEMO_SHOPS[0].id, name: 'Juan Pérez', specialty: 'Fade y diseño', is_demo: true },
  { id: '22222222-2222-2222-2222-222222222223', barbershop_id: DEMO_SHOPS[1].id, name: 'Carlos Méndez', specialty: 'Clásico y barba', is_demo: true },
  { id: '33333333-3333-3333-3333-333333333334', barbershop_id: DEMO_SHOPS[2].id, name: 'Luis Ramírez', specialty: 'Navaja clásica', is_demo: true },
]

export const DEMO_SERVICES: Service[] = [
  { id: 's1', barbershop_id: DEMO_SHOPS[0].id, name: 'Fade', description: 'Corte fade con acabado limpio.', price: 500, duration_minutes: 30, is_demo: true },
  { id: 's2', barbershop_id: DEMO_SHOPS[0].id, name: 'Corte clásico', description: 'Corte clásico con tijera y máquina.', price: 400, duration_minutes: 30, is_demo: true },
  { id: 's3', barbershop_id: DEMO_SHOPS[0].id, name: 'Barba', description: 'Arreglo de barba con navaja.', price: 300, duration_minutes: 20, is_demo: true },
  { id: 's4', barbershop_id: DEMO_SHOPS[1].id, name: 'Fade', description: 'Corte fade con acabado limpio.', price: 500, duration_minutes: 30, is_demo: true },
  { id: 's5', barbershop_id: DEMO_SHOPS[1].id, name: 'Diseño', description: 'Diseño en el corte.', price: 600, duration_minutes: 40, is_demo: true },
  { id: 's6', barbershop_id: DEMO_SHOPS[2].id, name: 'Navaja clásica', description: 'Afeitado clásico con navaja.', price: 450, duration_minutes: 30, is_demo: true },
  { id: 's7', barbershop_id: DEMO_SHOPS[2].id, name: 'Barba de precisión', description: 'Barba con líneas precisas.', price: 350, duration_minutes: 25, is_demo: true },
]

export const DEMO_REVIEWS: Review[] = [
  { id: 'r1', client_name: 'Pedro G.', barbershop_id: DEMO_SHOPS[0].id, barber_id: DEMO_BARBERS[0].id, rating: 5, comment: 'El mejor fade de Santo Domingo, sin filas y a tiempo.', is_verified: true },
  { id: 'r2', client_name: 'Ana M.', barbershop_id: DEMO_SHOPS[1].id, barber_id: DEMO_BARBERS[1].id, rating: 5, comment: 'Reservé desde el celular y me atendieron puntual.', is_verified: true },
  { id: 'r3', client_name: 'José R.', barbershop_id: DEMO_SHOPS[2].id, barber_id: DEMO_BARBERS[2].id, rating: 4, comment: 'Buen servicio a domicilio, la navaja impecable.', is_verified: true },
]

export const DEMO_PHOTOS: Photo[] = [
  { id: 'p1', barbershop_id: DEMO_SHOPS[0].id, barber_id: DEMO_BARBERS[0].id, url: '', kind: 'corte', description: 'Fade con diseño — Juan Pérez' },
  { id: 'p2', barbershop_id: DEMO_SHOPS[1].id, barber_id: DEMO_BARBERS[1].id, url: '', kind: 'corte', description: 'Clásico con barba — Carlos Méndez' },
  { id: 'p3', barbershop_id: DEMO_SHOPS[2].id, barber_id: DEMO_BARBERS[2].id, url: '', kind: 'barberia', description: 'Navaja & Estilo, local' },
]

export const DEMO_SUBSCRIPTIONS: Subscription[] = [
  { id: 'sub1', barbershop_id: DEMO_SHOPS[0].id, plan_price: 1000, status: 'activa' },
  { id: 'sub2', barbershop_id: DEMO_SHOPS[1].id, plan_price: 1000, status: 'activa' },
  { id: 'sub3', barbershop_id: DEMO_SHOPS[2].id, plan_price: 1000, status: 'pendiente' },
]

export const DEMO_BOOKINGS: Booking[] = [
  {
    id: 'b-demo-1', client_name: 'Cliente Demo', barbershop_id: DEMO_SHOPS[0].id,
    barber_id: DEMO_BARBERS[0].id, service_id: 's1', service_name: 'Fade',
    booking_date: '2026-11-25', booking_time: '10:00', duration_minutes: 30,
    is_home_service: false, total_price: 500, status: 'pendiente',
    qr_code: 'BARBERLINK | Barbería El Trono | Fade | Juan Pérez | 2026-11-25 10:00 | RD$500',
  },
]

/** Cuentas de demostración del modo local (sin Supabase configurado). */
export const DEMO_USERS: (Profile & { password: string })[] = [
  { id: 'demo-cliente', email: 'cliente@demo.do', full_name: 'Cliente Demo', role: 'cliente', password: 'demo1234' },
  { id: 'demo-propietario', email: 'propietario@demo.do', full_name: 'Propietario Demo', role: 'propietario', password: 'demo1234' },
  { id: 'demo-juan', email: 'juan@demo.do', full_name: 'Juan Pérez', role: 'barbero', password: 'demo1234' },
  { id: 'demo-admin', email: 'camilobarber@gmail.com', full_name: 'Camilo Barber', role: 'superadmin', password: '12345' },
]

export const DEMO_PUBLIC: PublicData = {
  shops: DEMO_SHOPS,
  barbers: DEMO_BARBERS,
  services: DEMO_SERVICES,
  reviews: DEMO_REVIEWS,
  photos: DEMO_PHOTOS,
}

export const HOURS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']

export function money(n: number): string {
  return 'RD$' + Number(n || 0).toLocaleString('es-DO')
}
