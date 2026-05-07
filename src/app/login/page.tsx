import { login } from './actions'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AuthErrorListener from './AuthErrorListener'
import { Mail, Lock, ShieldCheck, ArrowRight, Info, GraduationCap } from 'lucide-react'

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
    <div style={{ 
      display: 'flex',
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
      padding: '1.5rem'
    }}>
      {/* Mesh Background Decorations */}
      <div style={{ 
        position: 'absolute', 
        top: '-15%', 
        left: '-5%', 
        width: '50%', 
        height: '50%', 
        background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
        filter: 'blur(100px)',
        zIndex: 0,
        opacity: 0.5
      }} />
      <div style={{ 
        position: 'absolute', 
        bottom: '-15%', 
        right: '-5%', 
        width: '50%', 
        height: '50%', 
        background: 'radial-gradient(circle, var(--purple-light) 0%, transparent 70%)',
        filter: 'blur(100px)',
        zIndex: 0,
        opacity: 0.5
      }} />

      {/* Floating Geometric Shapes for Depth */}
      <div className="animate-fade-up" style={{ animationDelay: '0.1s', position: 'absolute', top: '10%', right: '15%', width: '100px', height: '100px', border: '1px solid var(--border)', borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', opacity: 0.1 }} />
      <div className="animate-fade-up" style={{ animationDelay: '0.3s', position: 'absolute', bottom: '15%', left: '10%', width: '150px', height: '150px', border: '1px solid var(--border)', borderRadius: '64% 36% 27% 73% / 55% 58% 42% 45%', opacity: 0.1 }} />

      <div className="glass animate-scale-in" style={{ 
        width: '100%', 
        maxWidth: '460px', 
        padding: '3.5rem 2.5rem',
        borderRadius: '2rem',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo Section */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)', 
            borderRadius: '1.5rem', 
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 40px -10px var(--primary-glow)',
            transform: 'rotate(-4deg)',
            transition: 'transform 0.3s ease'
          }}>
            <GraduationCap size={40} color="white" strokeWidth={2} />
          </div>
          
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '900', 
            letterSpacing: '-0.05em', 
            marginBottom: '0.5rem',
            color: 'var(--foreground)',
            lineHeight: 1
          }}>PROFE</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>
            <ShieldCheck size={14} /> Panel Administrativo
          </div>
          <p style={{ color: 'var(--foreground-3)', fontSize: '0.9rem', fontWeight: '500' }}>Inicie sesión con sus credenciales institucionales</p>
        </div>

        <AuthErrorListener />

        <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="email" style={{ fontWeight: '700', color: 'var(--foreground-2)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.25rem' }}>Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-3)' }}>
                <Mail size={18} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="usuario@profe.gob.bo"
                required
                className="btn-ghost"
                style={{ 
                  padding: '0.875rem 1rem 0.875rem 3.25rem', 
                  width: '100%', 
                  fontSize: '0.95rem',
                  background: 'var(--input-bg)',
                  textAlign: 'left',
                  cursor: 'text'
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '0.25rem' }}>
              <label htmlFor="password" style={{ fontWeight: '700', color: 'var(--foreground-2)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña</label>
              <a href="#" style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none', opacity: 0.8 }}>¿Olvido sus datos?</a>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-3)' }}>
                <Lock size={18} />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="btn-ghost"
                style={{ 
                  padding: '0.875rem 1rem 0.875rem 3.25rem', 
                  width: '100%', 
                  fontSize: '0.95rem',
                  background: 'var(--input-bg)',
                  textAlign: 'left',
                  cursor: 'text'
                }}
              />
            </div>
          </div>

          <button className="btn btn-primary" style={{ 
            width: '100%', 
            padding: '1rem', 
            fontSize: '1rem',
            fontWeight: '800',
            marginTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            boxShadow: '0 12px 24px -6px var(--primary-glow)'
          }}>
            Entrar al Sistema <ArrowRight size={18} />
          </button>

          {message && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.875rem', 
              borderRadius: '0.75rem', 
              backgroundColor: 'var(--danger-light)', 
              color: 'var(--danger)', 
              fontSize: '0.85rem',
              textAlign: 'center',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              justifyContent: 'center',
              animation: 'fadeUp 0.3s ease-out'
            }}>
              <Info size={16} /> {message}
            </div>
          )}
        </form>

        <div style={{ 
          marginTop: '3.5rem', 
          textAlign: 'center',
          opacity: 0.6
        }}>
          <div style={{ width: '40px', height: '1px', background: 'var(--border)', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '0.65rem', color: 'var(--foreground-3)', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Ministerio de Educación<br />
            <span style={{ fontWeight: 500, fontSize: '0.6rem' }}>Estado Plurinacional de Bolivia</span>
          </p>
        </div>
      </div>
    </div>
  )
}
