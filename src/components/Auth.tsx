import { useState } from 'react'
import { signIn, signUp } from '../lib/backend'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Profile, Role } from '../lib/types'

export default function Auth({ onAuth, onCancel }: { onAuth: (p: Profile) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('cliente')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const profile = mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim() || email.split('@')[0], role)
      onAuth(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="card auth-card">
        <button className="link" onClick={onCancel}>← Volver</button>
        <div className="logo">BARBER<span>LINK</span></div>
        <p className="muted">Tu estilo, en tus manos</p>
        <h2>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
        {!isSupabaseConfigured && (
          <p className="notice">Modo de ejemplo (sin Supabase configurado). Cuentas demo: cliente@demo.do, propietario@demo.do, juan@demo.do con demo1234; admin camilobarber@gmail.com con 12345.</p>
        )}
        <form onSubmit={submit} className="form">
          {mode === 'register' && (
            <>
              <label>Nombre completo<input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></label>
              <label>Rol
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="cliente">Cliente</option>
                  <option value="barbero">Barbero</option>
                  <option value="propietario">Propietario de barbería</option>
                </select>
              </label>
            </>
          )}
          <label>Correo<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Contraseña<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={5} /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Cargando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
        <button className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </section>
  )
}
