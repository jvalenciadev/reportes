'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, UserSquare2,
  CheckSquare, BarChart3, LogOut, UserCog, GraduationCap,
  UserPlus, Database, Award, ClipboardCheck
} from 'lucide-react'
import { signOut } from '@/app/login/actions'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, reportesHidden: true },
  { href: '/dashboard/programas', label: 'Programas', icon: GraduationCap, adminOnly: true, reportesHidden: true },
  { href: '/dashboard/departamentos', label: 'Departamentos', icon: Building2, adminOnly: true, reportesHidden: true },
  { href: '/dashboard/grupos', label: 'Grupos', icon: UserSquare2, adminOnly: true, reportesHidden: true },
  { href: '/dashboard/inscripciones', label: 'Inscripciones', icon: Users, reportesHidden: true },
  { href: '/dashboard/asistencia', label: 'Asistencia', icon: CheckSquare, reportesHidden: true },
  { href: '/dashboard/calificaciones/subir', label: 'Subir Calificación', icon: ClipboardCheck, reportesHidden: true },
  { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: Award, reportesHidden: true },
  { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3, adminOnly: true },
  { href: '/dashboard/facilitadores', label: 'Facilitadores', icon: UserPlus, adminOnly: true, reportesHidden: true },
  { href: '/dashboard/usuarios', label: 'Usuarios', icon: UserCog, adminOnly: true, reportesHidden: true },
  { href: '/dashboard/migracion', label: 'Migración', icon: Database, adminOnly: true, reportesHidden: true },
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
              {role === 'reportes' ? 'Reportes' : 'Admin Panel'}
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
          const isFacilitador = role === 'facilitador'
          const isReportes = role === 'reportes'
          // Reportes role: only show the Reportes link
          if (isReportes && item.reportesHidden) return null
          // Admin-only pages are hidden for facilitadores
          if (item.adminOnly && isFacilitador) return null
          // Departmental restrictions
          if (departamentoId && (item.href === '/dashboard/usuarios' || item.href === '/dashboard/departamentos')) return null

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
