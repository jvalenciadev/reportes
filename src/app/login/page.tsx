import { login } from './actions'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AuthErrorListener from './AuthErrorListener'
import { Mail, Lock, ShieldCheck, ArrowRight, Info } from 'lucide-react'

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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Elementos Decorativos de Fondo (Aesthetics) */}
      <div style={{ 
        position: 'absolute', 
        top: '-10%', 
        right: '-10%', 
        width: '40%', 
        height: '40%', 
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 0
      }} />
      <div style={{ 
        position: 'absolute', 
        bottom: '-10%', 
        left: '-10%', 
        width: '40%', 
        height: '40%', 
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 0
      }} />

      <div className="card glass" style={{ 
        width: '100%', 
        maxWidth: '440px', 
        padding: '3rem',
        borderRadius: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ 
            width: '72px', 
            height: '72px', 
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', 
            borderRadius: '1.25rem', 
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 15px 30px -5px rgba(59, 130, 246, 0.5)',
            transform: 'rotate(-5deg)'
          }}>
            <ShieldCheck size={36} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ 
            fontSize: '2.25rem', 
            fontWeight: '900', 
            letterSpacing: '-0.04em', 
            marginBottom: '0.5rem',
            background: 'linear-gradient(to bottom, #fff, #a1a1aa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Reporte PROFE</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', fontWeight: '500' }}>Inicie sesión para acceder al portal</p>
        </div>

        <AuthErrorListener />

        <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="email" style={{ fontWeight: '700', color: '#e4e4e7', fontSize: '0.85rem', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Institucional</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
                <Mail size={18} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="usuario@profe.gob.bo"
                required
                style={{ padding: '1rem 1rem 1rem 3rem', width: '100%', fontSize: '1rem' }}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <label htmlFor="password" style={{ fontWeight: '700', color: '#e4e4e7', fontSize: '0.85rem', marginBottom: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña</label>
              <a href="#" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>¿Olvido sus datos?</a>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
                <Lock size={18} />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                style={{ padding: '1rem 1rem 1rem 3rem', width: '100%', fontSize: '1rem' }}
              />
            </div>
          </div>

          <button className="btn btn-primary" style={{ 
            width: '100%', 
            padding: '1.1rem', 
            borderRadius: '1.1rem',
            fontSize: '1rem',
            fontWeight: '800',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            boxShadow: '0 8px 20px -6px rgba(59, 130, 246, 0.5)'
          }}>
            Ingresar al Portal <ArrowRight size={18} />
          </button>

          {message && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '1rem', 
              borderRadius: '1rem', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              color: '#f87171', 
              fontSize: '0.875rem',
              textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'center'
            }}>
              <Info size={16} /> {message}
            </div>
          )}
        </form>

        <div style={{ 
          marginTop: '3rem', 
          textAlign: 'center' 
        }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Ministerio de Educación<br />
            <span style={{ opacity: 0.5 }}>Estado Plurinacional de Bolivia</span>
          </p>
        </div>
      </div>
    </div>
  )
}
