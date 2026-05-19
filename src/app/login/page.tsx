import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AuthErrorListener from './AuthErrorListener'
import LoginForm from './LoginForm'
import { ShieldCheck, GraduationCap } from 'lucide-react'
import Link from 'next/link'

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

        <LoginForm message={message} />

        {/* Public Consultation Link */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--foreground-3)' }}>¿Es usted un participante? </span>
          <Link href="/consulta" style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            color: 'var(--primary)',
            textDecoration: 'none',
            borderBottom: '1px dashed var(--primary)',
            paddingBottom: '2px',
            transition: 'color 0.2s ease'
          }}>
            Consultar Asistencia y Calificaciones
          </Link>
        </div>

        <div style={{ 
          marginTop: '2.5rem', 
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
