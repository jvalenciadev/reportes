import { createClient } from '@/utils/supabase/server'
import { Users, Building2, UserSquare2, CheckCircle2 } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch some basic counts
  const { count: deptCount } = await supabase.from('departamentos').select('*', { count: 'exact', head: true })
  const { count: groupCount } = await supabase.from('grupos').select('*', { count: 'exact', head: true })
  const { count: partCount } = await supabase.from('participantes').select('*', { count: 'exact', head: true })
  const { count: confirmCount } = await supabase.from('confirmaciones_participantes').select('*', { count: 'exact', head: true }).eq('confirmado', true)

  const stats = [
    { label: 'Departamentos', value: deptCount || 0, icon: Building2, color: '#3b82f6' },
    { label: 'Grupos', value: groupCount || 0, icon: UserSquare2, color: '#8b5cf6' },
    { label: 'Participantes', value: partCount || 0, icon: Users, color: '#10b981' },
    { label: 'Confirmados', value: confirmCount || 0, icon: CheckCircle2, color: '#f59e0b' },
  ]

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Panel de Control</h1>
        <p style={{ color: 'var(--muted)' }}>Resumen general del sistema administrativo</p>
      </header>

      <div className="stats-grid">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="card stat-card glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-label">{stat.label}</span>
                <Icon size={20} color={stat.color} />
              </div>
              <div className="stat-value">{stat.value}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="card glass">
          <h3 style={{ marginBottom: '1rem' }}>Actividad Reciente</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No hay actividad reciente para mostrar.</p>
        </div>
        <div className="card glass">
          <h3 style={{ marginBottom: '1rem' }}>Asistencia por Departamento</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Gráfico de asistencia disponible pronto.</p>
        </div>
      </div>
    </div>
  )
}
