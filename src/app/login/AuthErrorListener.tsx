'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Lock, CheckCircle2, Loader2 } from 'lucide-react'

export default function AuthErrorListener() {
  const [supabase] = useState(() => createClient())
  const [error, setError] = useState<string | null>(null)
  const [isRecovery, setIsRecovery] = useState(false)
  const [isSettingSession, setIsSettingSession] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.substring(1))
        const errorDescription = params.get('error_description')
        if (errorDescription) {
          setError(decodeURIComponent(errorDescription).replace(/\+/g, ' '))
        }
      } else if (hash.includes('type=recovery')) {
        setIsRecovery(true)
        
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        
        if (accessToken && refreshToken) {
          setIsSettingSession(true)
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          }).then(({ data, error }) => {
            setIsSettingSession(false)
            if (error) {
              console.error('Error setting recovery session:', error.message)
              setError('No se pudo establecer la sesión de recuperación: ' + error.message)
            } else {
              console.log('Recovery session set successfully')
            }
          })
        }
        
        // Opcional: Escuchar el evento de recuperación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsRecovery(true)
          }
        })
        return () => subscription.unsubscribe()
      }
    }
  }, [supabase])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })
    setIsUpdating(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      // Redirigir al dashboard y limpiar el hash después de 2 segundos
      setTimeout(() => {
        window.location.hash = ''
        window.location.href = '/dashboard'
      }, 2000)
    }
  }

  if (success) {
    return (
      <div className="glass animate-scale-in" style={{ padding: '2rem', borderRadius: '1rem', border: '1px solid var(--success)', marginBottom: '1.5rem', background: 'var(--surface)', textAlign: 'center' }}>
        <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem', fontWeight: 800 }}>¡Contraseña Actualizada!</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--foreground-3)' }}>Iniciando sesión de forma segura...</p>
      </div>
    )
  }

  if (isSettingSession) {
    return (
      <div className="glass animate-scale-in" style={{ 
        padding: '2.5rem 2rem', 
        borderRadius: '1.5rem', 
        border: '1px solid var(--primary)', 
        marginBottom: '2rem', 
        background: 'var(--surface)', 
        boxShadow: '0 10px 30px -10px var(--primary-glow)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spinner-recovery {
            animation: spin 1s linear infinite;
            color: var(--primary);
          }
        `}</style>
        <Loader2 size={40} className="spinner-recovery" />
        <h3 style={{ color: 'var(--foreground)', fontWeight: 800, fontSize: '1.1rem' }}>Verificando Token</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--foreground-2)', maxWidth: '280px', margin: '0 auto' }}>
          Estableciendo conexión segura para restablecer su contraseña...
        </p>
      </div>
    )
  }

  if (isRecovery) {
    return (
      <div className="glass animate-scale-in" style={{ padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--primary)', marginBottom: '2rem', background: 'var(--surface)', boxShadow: '0 10px 30px -10px var(--primary-glow)' }}>
        <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 900, fontSize: '1.25rem' }}>Nueva Contraseña</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--foreground-3)', marginBottom: '1.5rem' }}>
          Por favor ingresa tu nueva contraseña para acceder al panel.
        </p>
        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-3)' }}>
              <Lock size={18} />
            </div>
            <input
              type="password"
              placeholder="Escribe la nueva contraseña"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="btn-ghost"
              style={{ padding: '0.875rem 1rem 0.875rem 3.25rem', width: '100%', fontSize: '0.95rem', background: 'var(--input-bg)' }}
            />
          </div>
          <button type="submit" disabled={isUpdating || newPassword.length < 6} className="btn btn-primary" style={{ padding: '1rem', fontWeight: 800 }}>
            {isUpdating ? 'Guardando...' : 'Actualizar Contraseña'}
          </button>
        </form>
        {error && <div style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem', background: 'var(--danger-light)', borderRadius: '0.5rem' }}>{error}</div>}
      </div>
    )
  }

  if (!error) return null

  return (
    <div 
      className="error-banner animate-fade-up"
      style={{
        padding: '1rem',
        borderRadius: '1rem',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: '#ef4444',
        fontSize: '0.875rem',
        marginBottom: '1.5rem',
        textAlign: 'center'
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Error de Autenticación</div>
      {error}
    </div>
  )
}
