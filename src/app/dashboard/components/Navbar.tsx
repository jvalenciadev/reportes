'use client'

import { useEffect, useState } from 'react'
import { User, Shield, Sun, Moon } from 'lucide-react'

export default function Navbar({ profile }: { profile: any }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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
        gap: '1rem',
        padding: '0.8rem 1.5rem',
        marginBottom: '2.5rem',
        borderRadius: '1.25rem',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="theme-toggle"
        style={{ padding: '0.5rem 1rem', borderRadius: '0.85rem' }}
        aria-label="Cambiar tema"
        suppressHydrationWarning
      >
        {mounted && (
          theme === 'dark' ? (
            <><Sun size={14} style={{ marginRight: '4px' }} /> Modo Claro</>
          ) : (
            <><Moon size={14} style={{ marginRight: '4px' }} /> Modo Oscuro</>
          )
        )}
      </button>

      <div style={{ width: 1, height: 24, background: 'var(--border-strong)', margin: '0 0.25rem' }} />

      {/* User Info */}
      <div style={{ textAlign: 'right', paddingRight: '0.5rem' }} suppressHydrationWarning>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--foreground)', letterSpacing: '-0.02em' }} suppressHydrationWarning>
          {profile?.full_name || 'Usuario'}
        </div>
        <div style={{
          fontSize: '0.65rem',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          justifyContent: 'flex-end',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginTop: '0.1rem'
        }} suppressHydrationWarning>
          <Shield size={10} />
          {(profile?.roles?.name || 'Invitado')}
        </div>
      </div>

      {/* Avatar */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '12px',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 900,
        fontSize: '0.85rem',
        letterSpacing: '-0.02em',
        boxShadow: '0 4px 15px var(--primary-glow)',
        flexShrink: 0,
        userSelect: 'none',
        border: '2px solid rgba(255,255,255,0.1)'
      }} suppressHydrationWarning>
        {initials}
      </div>
    </header>
  )
}
