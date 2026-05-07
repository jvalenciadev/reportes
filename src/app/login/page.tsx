import { login } from './actions'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AuthErrorListener from './AuthErrorListener'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="main-container" style={{ 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.1), transparent)'
    }}>
      <div className="card glass" style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '2.5rem',
        borderRadius: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'var(--primary)', 
            borderRadius: '1rem', 
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.4)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>Reporte PROFE</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.925rem' }}>Gestión Administrativa Centralizada</p>
        </div>

        {/* Captura errores de Supabase en el fragmento #error */}
        <AuthErrorListener />

        <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="email" style={{ fontWeight: '600', color: 'var(--foreground)', marginBottom: '0.5rem', display: 'block' }}>Correo Electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="admin@profe.gob.bo"
              required
              style={{ padding: '0.875rem 1rem' }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="password" style={{ fontWeight: '600', color: 'var(--foreground)', marginBottom: 0 }}>Contraseña</label>
              <a href="#" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>¿Olvidaste tu contraseña?</a>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              style={{ padding: '0.875rem 1rem' }}
            />
          </div>

          <button className="btn btn-primary" style={{ 
            width: '100%', 
            padding: '1rem', 
            borderRadius: '1rem',
            fontSize: '1rem',
            fontWeight: '700',
            marginTop: '0.5rem'
          }}>
            Entrar al Sistema
          </button>

          {message && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.75rem', 
              borderRadius: '0.75rem', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              fontSize: '0.825rem',
              textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.1)'
            }}>
              {message}
            </div>
          )}
        </form>

        <div style={{ 
          marginTop: '2.5rem', 
          borderTop: '1px solid var(--border)', 
          paddingTop: '1.5rem', 
          textAlign: 'center' 
        }}>
          <p style={{ fontSize: '0.825rem', color: 'var(--muted)', lineHeight: '1.6' }}>
            <span style={{ opacity: 0.6 }}>Acceso Restringido</span><br />
            <strong>Ministerio de Educación</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
