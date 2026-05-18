'use client'

import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Info } from 'lucide-react'
import { login } from './actions'

export default function LoginForm({ message }: { message?: string }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
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
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            className="btn-ghost"
            style={{ 
              padding: '0.875rem 3.25rem 0.875rem 3.25rem', 
              width: '100%', 
              fontSize: '0.95rem',
              background: 'var(--input-bg)',
              textAlign: 'left',
              cursor: 'text'
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--foreground-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              transition: 'color 0.2s ease',
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
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
  )
}
