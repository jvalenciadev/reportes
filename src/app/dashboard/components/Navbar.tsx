'use client'

import { useEffect, useState } from 'react'
import { User, Shield, Sun, Moon } from 'lucide-react'

export default function Navbar({ profile }: { profile: any }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null
    const initial = stored ?? 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
    : 'U'

  return (
    <header
      suppressHydrationWarning
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1.25rem',
        marginBottom: '2rem',
        borderRadius: '1rem',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="theme-toggle"
        aria-label="Cambiar tema"
        suppressHydrationWarning
      >
        {theme === 'dark' ? (
          <><Sun size={14} /> Claro</>
        ) : (
          <><Moon size={14} /> Oscuro</>
        )}
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--border)' }} />

      {/* User Info */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--foreground)' }}>
          {profile?.full_name || 'Usuario'}
        </div>
        <div style={{
          fontSize: '0.68rem',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          justifyContent: 'flex-end',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          <Shield size={9} />
          {(profile?.roles?.name || 'Invitado')}
        </div>
      </div>

      {/* Avatar */}
      <div style={{
        width: 38,
        height: 38,
        borderRadius: '10px',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 800,
        fontSize: '0.8rem',
        letterSpacing: '-0.02em',
        boxShadow: '0 4px 12px var(--primary-glow)',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {initials}
      </div>
    </header>
  )
}
