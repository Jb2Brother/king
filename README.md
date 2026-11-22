# BARBERLINK — Tu estilo, en tus manos

Plataforma de reservas de barberías para República Dominicana (RD$).
Frontend en Vite + React + TypeScript, con **Supabase** como base de datos
y autenticación. Sin servidor propio: se despliega como sitio estático
en Netlify.

## Qué hace

- Landing premium oscura (navy `#060b16`, azul eléctrico, grano de película):
  hero con dispositivos realistas, manifiesto, servicios como ledger,
  sección fijada de 8 pasos con teléfono, galería, QR y precios.
- Reserva en **8 pasos**: barbería → servicio → barbero → fecha → hora →
  domicilio → revisión → confirmación, con QR de verificación al confirmar.
- **Sin doble-reserva**: índice único en la base de datos
  `(barber_id, booking_date, booking_time)` para reservas no canceladas,
  además de la comprobación de horas ocupadas en la app.
- 4 roles: **cliente, barbero, propietario, superadmin**.
  - Cliente: mis reservas, explorar, galería, QR, avisos.
  - Barbero: agenda, subir fotos de cortes/barbería (Storage, hasta 6 MB),
    su QR personal y el de su barbería.
  - Propietario: reservas, barberos, servicios, fotos y QR de su barbería.
  - Superadmin: 7+ pestañas — resumen, gráficos, barberías (aprobar/suspender),
    usuarios (activar/desactivar), reservas, suscripciones y pagos manuales,
    reseñas, configuración (precio RD$1,000/mes y panel Supabase).
- Reseñas **verificadas** solo con reserva completada.
- Suscripciones RD$1,000/mes por barbería, clientes gratis.
- Sin las variables de Supabase, la app cae a **datos de ejemplo locales**
  (marcados “Ejemplo”) y no se rompe.

## 1. Supabase — correr el SQL

1. Entra a tu proyecto en Supabase: `https://hyuagzaspuylrvscgovl.supabase.co`
2. Abre **SQL Editor → New query**.
3. Pega todo el archivo `supabase-schema.sql` de este repositorio y pulsa **Run**.
   Es idempotente: puedes correrlo de nuevo sin borrar datos.
4. Crea las tablas: `profiles, barbershops, barbers, services, bookings,
   reviews, photos, subscriptions, payments, notifications, settings`,
   más RLS por filas, el bucket público `barberlink-fotos`, el trigger
   que crea el perfil al registrarse, los disparadores de avisos, la
   función `occupied_hours` y `link_barber_by_email`.

## 2. Video y foto reales de la landing

La landing ya tiene las animaciones y el video de fondo preparados.
Para que se vean tus archivos reales, ponlos en la carpeta `public/`:

| Archivo | Qué hace |
|---|---|
| `public/promo.mp4` | Video vertical (720x1280) de fondo del hero, con zoom ligado al scroll. Se reproduce en bucle, sin sonido. |
| `public/barbershop.jpg` | Foto real de tu barbería, usada como portada. |

El código ya los usa si existen: si `promo.mp4` no está, el hero muestra
el fondo animado (gradiente + barrido de luz + grano) y no se rompe nada.
No hay que tocar código, solo copiar el archivo y volver a desplegar
(Netlify lo toma solo con el siguiente push a GitHub).

## 3. Variables de entorno

Copia `.env.example` a `.env` en local, o pon las mismas variables
en Netlify. **Nunca** subas un `.env` real a GitHub.

```env
VITE_SUPABASE_URL=https://hyuagzaspuylrvscgovl.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica-aqui
```

Usa la clave **anon / publishable** (la pública). La librería
`@supabase/supabase-js` la maneja bien. Jamás uses la `service_role`
en el frontend.

## 4. Desarrollo local

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # genera dist/
```

Cuentas de ejemplo (solo sin Supabase configurado):

| Rol | Correo | Clave |
|---|---|---|
| Cliente | cliente@demo.do | demo1234 |
| Propietario | propietario@demo.do | demo1234 |
| Barbero | juan@demo.do | demo1234 |
| Superadmin | camilobarber@gmail.com | 12345 |

Con Supabase configurado, cada usuario se registra con Supabase Auth.
Para hacer admin a una cuenta: en Supabase → Table Editor → `profiles`,
cambia su `role` a `superadmin`.

## 5. Subir a GitHub

```bash
git init
git add .
git commit -m "BarberLink con Supabase"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/barberlink.git
git push -u origin main
```

Crea antes el repositorio vacío en GitHub (sin README).

## 6. Desplegar en Netlify

1. Netlify → **Add new site → Import an existing project → GitHub**,
   elige el repositorio.
2. Build command: `npm run build` · Publish directory: `dist`
   (ya están en `netlify.toml`).
3. **Site settings → Environment variables**:
   - `VITE_SUPABASE_URL` = `https://hyuagzaspuylrvscgovl.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = tu clave anon / publishable
4. En Supabase → **Authentication → URL Configuration**: pon la URL
   de Netlify como **Site URL** y en Redirect URLs.
5. En Supabase → **Authentication → Providers → Email**: activado.
   Si dejas la confirmación por correo activada, cada usuario nuevo
   debe confirmar su correo antes de entrar.

## Archivos

- `supabase-schema.sql` — esquema completo para Supabase.
- `src/lib/supabase.ts` — cliente Supabase solo desde env.
- `src/lib/backend.ts` — toda la capa de datos (catálogo, reservas,
  reseñas, fotos, auth, admin) con respaldo local.
- `src/components/` — Landing, reserva en 8 pasos, login/registro,
  paneles de cliente, barbero, propietario y admin, QR y gráficos.
