import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import {
  Users, Building2, UserSquare2, CheckCircle2,
  LayoutGrid, ArrowRight, Activity, Calendar,
  GraduationCap, UserCheck, Zap, Clock
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Redirect 'reportes' role straight to the reports page
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles(name)')
      .eq('id', user.id)
      .single()
    const role = (profile as any)?.roles?.name
    if (role === 'reportes') {
      return redirect('/dashboard/reportes')
    }
  }


  // 1. Fetch Real-time Metrics from Granular Tables
  const { count: participantCount } = await supabase.from('participantes').select('*', { count: 'exact', head: true })
  const { count: programCount } = await supabase.from('programas').select('*', { count: 'exact', head: true })

  // Facilitadores: Count via roles join
  const { count: facilitatorCount } = await supabase
    .from('profiles')
    .select('*, roles!inner(name)', { count: 'exact', head: true })
    .eq('roles.name', 'facilitador')

  // Attendance Today
  const today = new Date().toISOString().split('T')[0]
  const { count: attendanceToday } = await supabase.from('asistencias').select('*', { count: 'exact', head: true }).eq('fecha', today)

  const stats = [
    { label: 'Participantes', value: participantCount || 0, icon: Users, color: '#10d98b', subtitle: 'Registros individuales' },
    { label: 'Programas', value: programCount || 0, icon: GraduationCap, color: '#4f8ef7', subtitle: 'Oferta académica' },
    { label: 'Facilitadores', value: facilitatorCount || 0, icon: Zap, color: '#f5a623', subtitle: 'Personal asignado' },
    { label: 'Asistencias Hoy', value: attendanceToday || 0, icon: UserCheck, color: '#a78bfa', subtitle: 'Registros de hoy' },
  ]

  return (
    <div className="animate-fade-up" suppressHydrationWarning>
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <LayoutGrid size={20} />
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>Panel de Control BI</h1>
        </div>
        <p style={{ color: 'var(--foreground-3)', fontSize: '0.95rem' }}>Visualización de métricas granulares y estado operativo v2.1</p>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }} suppressHydrationWarning>
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="glass card" style={{ position: 'relative', overflow: 'hidden', borderBottom: `4px solid ${stat.color}`, padding: '2rem' }} suppressHydrationWarning>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, color: stat.color }} suppressHydrationWarning>
                <Icon size={100} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} suppressHydrationWarning>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--foreground-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {stat.label}
                </span>
                <div style={{ padding: '0.5rem', borderRadius: '0.75rem', background: `${stat.color}15`, color: stat.color }} suppressHydrationWarning>
                  <Icon size={20} />
                </div>
              </div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }} suppressHydrationWarning>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--foreground-3)', fontWeight: 600 }} suppressHydrationWarning>
                {stat.subtitle}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '3rem', padding: '2rem', background: 'var(--surface)', borderRadius: '1.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem' }}>
          <div className="animate-pulse" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10d98b' }}></div>
          <span style={{ fontWeight: 800, color: 'var(--foreground-2)' }}>SISTEMA OPERATIVO Y MONITOREO EN VIVO</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
          Los datos mostrados arriba representan el estado actual de la plataforma PROFE en tiempo real.
          Este panel es exclusivamente informativo.
        </p>
      </div>
    </div>
  )
}

