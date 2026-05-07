'use client'
import { User, Shield } from 'lucide-react'

export default function Navbar({ profile }: { profile: any }) {
  return (
    <header className="glass" suppressHydrationWarning style={{ 
      display: 'flex', 
      justifyContent: 'flex-end', 
      padding: '0.75rem 1.5rem',
      marginBottom: '2rem',
      borderRadius: '1rem',
      alignItems: 'center',
      gap: '1rem',
      border: '1px solid var(--border)'
    }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--foreground)' }}>
          {profile?.full_name || 'Cargando...'}
        </div>
        <div style={{ 
          fontSize: '0.7rem', 
          color: 'var(--primary)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.25rem', 
          justifyContent: 'flex-end',
          fontWeight: '600'
        }}>
          <Shield size={10} /> {(profile?.roles?.name || 'Invitado').toUpperCase()}
        </div>
      </div>
      <div style={{ 
        width: '36px', 
        height: '36px', 
        borderRadius: '10px', 
        background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
      }}>
        <User size={18} />
      </div>
    </header>
  )
}
