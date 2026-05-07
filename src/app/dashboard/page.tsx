import { createClient } from '@/utils/supabase/server'
import { Users, Building2, UserSquare2, CheckCircle2, LayoutGrid, ArrowRight, Activity, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch some basic counts
  const { count: deptCount } = await supabase.from('departamentos').select('*', { count: 'exact', head: true })
  const { count: groupCount } = await supabase.from('grupos').select('*', { count: 'exact', head: true })
  
  // Inscripciones total
  const { data: enrData } = await supabase.from('inscripciones_resumen').select('total_inscritos, total_confirmados')
  const totalInscritos = enrData?.reduce((acc, curr) => acc + (curr.total_inscritos || 0), 0) || 0
  const totalConfirmados = enrData?.reduce((acc, curr) => acc + (curr.total_confirmados || 0), 0) || 0

  const stats = [
    { label: 'Departamentos', value: deptCount || 0, icon: Building2, color: '#4f8ef7', subtitle: 'Sedes operativas' },
    { label: 'Grupos Activos', value: groupCount || 0, icon: UserSquare2, color: '#a78bfa', subtitle: 'Equipos de trabajo' },
    { label: 'Total Inscritos', value: totalInscritos, icon: Users, color: '#10d98b', subtitle: 'Población captada' },
    { label: 'Confirmados', value: totalConfirmados, icon: CheckCircle2, color: '#f5a623', subtitle: 'Registros validados' },
  ]

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <LayoutGrid size={20} />
          </div>
          <h1 style={{ margin: 0 }}>Panel de Control</h1>
        </div>
        <p style={{ color: 'var(--foreground-3)', fontSize: '0.95rem' }}>Resumen ejecutivo del sistema administrativo PROFE</p>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="glass card" style={{ position: 'relative', overflow: 'hidden', borderBottom: `3px solid ${stat.color}` }}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, color: stat.color }}>
                <Icon size={80} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
                <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: `${stat.color}15`, color: stat.color }}>
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--foreground-3)' }}>
                {stat.subtitle}
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginTop: '2.5rem' }}>
        
        {/* Quick Actions Card */}
        <div className="glass card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '0.6rem', background: 'var(--surface)', color: 'var(--primary)' }}>
              <Activity size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Accesos Directos</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <QuickLink href="/dashboard/reportes" label="Ver Reportes Detallados" description="Gráficos, exportaciones y métricas" />
            <QuickLink href="/dashboard/asistencia" label="Registrar Asistencia" description="Control diario de jornadas" />
            <QuickLink href="/dashboard/inscripciones" label="Gestionar Inscripciones" description="Validación y seguimiento" />
          </div>
        </div>

        {/* Welcome / Info Card */}
        <div className="glass card" style={{ background: 'linear-gradient(135deg, var(--card), var(--primary-light))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '0.6rem', background: 'var(--card-solid)', color: 'var(--primary)' }}>
              <Calendar size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Estado del Sistema</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--card-solid)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-3)', marginBottom: '0.25rem' }}>Última Actualización</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            
            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--card-solid)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-3)', marginBottom: '0.25rem' }}>Integridad de Datos</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.9rem' }}>
                <CheckCircle2 size={16} /> Base de datos sincronizada
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function QuickLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="nav-link" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem', 
        background: 'var(--surface)',
        border: '1px solid var(--border)'
      }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '0.9rem' }}>{label}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--foreground-3)' }}>{description}</div>
        </div>
        <ArrowRight size={16} color="var(--primary)" />
      </div>
    </Link>
  )
}
