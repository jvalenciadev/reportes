'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, UserSquare2,
  CheckSquare, BarChart3, LogOut, UserCog, GraduationCap,
  UserPlus, Database
} from 'lucide-react'
import { signOut } from '@/app/login/actions'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/programas', label: 'Programas', icon: GraduationCap },
  { href: '/dashboard/departamentos', label: 'Departamentos', icon: Building2 },
  { href: '/dashboard/grupos', label: 'Grupos', icon: UserSquare2 },
  { href: '/dashboard/inscripciones', label: 'Inscripciones', icon: Users },
  { href: '/dashboard/asistencia', label: 'Asistencia', icon: CheckSquare },
  { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/dashboard/facilitadores', label: 'Facilitadores', icon: UserPlus, adminOnly: true },
  { href: '/dashboard/usuarios', label: 'Usuarios', icon: UserCog, adminOnly: true },
  { href: '/dashboard/migracion', label: 'Migración', icon: Database, adminOnly: true },
]

export default function Sidebar({ role, departamentoId }: { role?: string; departamentoId?: string }) {
  const pathname = usePathname()

  return (
    <aside className="sidebar" suppressHydrationWarning>

      {/* Logo */}
      <div style={{ padding: '0.5rem 0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px var(--primary-glow)',
            flexShrink: 0,
          }}>
            <GraduationCap size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
              PROFE
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--foreground-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Admin Panel
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--foreground-3)', padding: '0.25rem 1rem', marginBottom: '0.25rem' }}>
          Menú Principal
        </div>
        {navItems.map((item) => {
          if (departamentoId && (item.href === '/dashboard/usuarios' || item.href === '/dashboard/departamentos')) return null
          if (item.adminOnly && role && role !== 'administrador') return null

          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <div style={{
                width: 28, height: 28,
                borderRadius: '8px',
                background: isActive ? 'var(--primary-light)' : 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}>
                <Icon size={15} />
              </div>
              <span>{item.label}</span>
              {isActive && (
                <div style={{
                  marginLeft: 'auto',
                  width: 5, height: 5,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <form action={signOut}>
          <button className="nav-link" style={{ width: '100%', color: 'var(--danger)' }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: '8px',
              background: 'var(--danger-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <LogOut size={15} color="var(--danger)" />
            </div>
            <span>Cerrar Sesión</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
