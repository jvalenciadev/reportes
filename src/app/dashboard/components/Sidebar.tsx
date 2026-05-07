'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  UserSquare2,
  CheckSquare,
  BarChart3,
  LogOut,
  UserCog
} from 'lucide-react'
import { signOut } from '@/app/login/actions'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/departamentos', label: 'Departamentos', icon: Building2 },
  { href: '/dashboard/grupos', label: 'Grupos', icon: UserSquare2 },
  { href: '/dashboard/inscripciones', label: 'Inscripciones', icon: Users },
  { href: '/dashboard/asistencia', label: 'Asistencia', icon: CheckSquare },
  { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/dashboard/usuarios', label: 'Usuarios', icon: UserCog, adminOnly: true },
]

export default function Sidebar({ role, departamentoId }: { role?: string, departamentoId?: string }) {
  const pathname = usePathname()

  return (
    <aside className="sidebar" suppressHydrationWarning>
      <div style={{ padding: '0 1rem', marginBottom: '1rem' }} suppressHydrationWarning>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>PROFE Admin</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          // 1. Si el usuario pertenece a un departamento específico (departamentoId != null)
          // NO puede ver "Usuarios" ni "Departamentos" (Gestión global)
          if (departamentoId && (item.href === '/dashboard/usuarios' || item.href === '/dashboard/departamentos')) {
            return null
          }

          // 2. Control de roles administrativos
          if (item.adminOnly && role && role !== 'administrador') return null

          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto' }} suppressHydrationWarning>
        <form action={signOut}>
          <button className="nav-link" style={{ width: '100%', textAlign: 'left' }}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
