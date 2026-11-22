export type Role = 'cliente' | 'barbero' | 'propietario' | 'superadmin'
export type BookingStatus = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string | null
  role: Role
  is_active?: boolean
}

export interface Barbershop {
  id: string
  owner_id?: string | null
  name: string
  slug?: string | null
  description?: string | null
  address?: string | null
  phone?: string | null
  whatsapp?: string | null
  instagram?: string | null
  cover_url?: string | null
  home_service?: boolean
  home_surcharge?: number
  status?: string
  is_demo?: boolean
  rating?: number
}

export interface Barber {
  id: string
  user_id?: string | null
  barbershop_id: string
  name: string
  specialty?: string | null
  bio?: string | null
  photo_url?: string | null
  is_active?: boolean
  is_demo?: boolean
}

export interface Service {
  id: string
  barbershop_id: string
  name: string
  description?: string | null
  price: number
  duration_minutes: number
  is_active?: boolean
  is_demo?: boolean
}

export interface Booking {
  id: string
  client_id?: string | null
  client_name: string
  client_phone?: string | null
  barbershop_id: string
  barber_id?: string | null
  service_id?: string | null
  service_name?: string | null
  booking_date: string
  booking_time: string
  duration_minutes?: number
  is_home_service?: boolean
  home_address?: string | null
  total_price: number
  status: BookingStatus
  qr_code?: string | null
  notes?: string | null
  created_at?: string
}

export interface Review {
  id: string
  booking_id?: string | null
  client_id?: string | null
  client_name: string
  barbershop_id: string
  barber_id?: string | null
  rating: number
  comment?: string | null
  is_verified?: boolean
  created_at?: string
}

export interface Photo {
  id: string
  uploader_id?: string | null
  barbershop_id?: string | null
  barber_id?: string | null
  url: string
  kind: 'corte' | 'barberia'
  description?: string | null
  created_at?: string
}

export interface Subscription {
  id: string
  barbershop_id: string
  plan_price: number
  status: string
  starts_at?: string | null
  ends_at?: string | null
}

export interface Payment {
  id: string
  subscription_id?: string | null
  barbershop_id: string
  amount: number
  method?: string | null
  reference?: string | null
  status: string
  paid_at?: string | null
  created_at?: string
}

export interface AppNotification {
  id: string
  user_id?: string | null
  title: string
  message: string
  is_read?: boolean
  created_at?: string
}

export interface PublicData {
  shops: Barbershop[]
  barbers: Barber[]
  services: Service[]
  reviews: Review[]
  photos: Photo[]
}
