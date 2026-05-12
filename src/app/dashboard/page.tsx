import { createClient } from '@/utils/supabase/server'
import { 
  Users, Building2, UserSquare2, CheckCircle2, 
  LayoutGrid, ArrowRight, Activity, Calendar,
  GraduationCap, UserCheck, Zap, Clock
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Fetch Real-time Metrics from Granular Tables
  const { count: participantCount } = await supabase.from('participantes').select('*', { count: 'exact', head: true })
  const { count: programCount } = await supabase.from('programas').select('*', { count: 'exact', head: true })
  const { count: facilitatorCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'facilitador')
  
  // Attendance Today
  const today = new Date().toISOString().split('T')[0]
  const { count: attendanceToday } = await supabase.from('asistencias').select('*', { count: 'exact', head: true }).eq('fecha', today)

  // 2. Recent Activity: Last 5 Enrollments
  const { data: recentInscriptions } = await supabase
    .from('inscripciones')
    .select('id, created_at, participantes(nombre, apellido), grupos(name)')
    .order('created_at', { ascending: false })
    .limit(5)

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }} suppressHydrationWarning>
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="glass card" style={{ position: 'relative', overflow: 'hidden', borderBottom: `4px solid ${stat.color}` }} suppressHydrationWarning>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, color: stat.color }} suppressHydrationWarning>
                <Icon size={80} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }} suppressHydrationWarning>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--foreground-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
                <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: `${stat.color}15`, color: stat.color }} suppressHydrationWarning>
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }} suppressHydrationWarning>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--foreground-3)', fontWeight: 600 }} suppressHydrationWarning>
                {stat.subtitle}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2.5rem' }} suppressHydrationWarning>
        
        {/* Recent Inscriptions */}
        <div className="glass card" suppressHydrationWarning>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }} suppressHydrationWarning>
            <div style={{ padding: '0.5rem', borderRadius: '0.6rem', background: 'var(--surface)', color: 'var(--primary)' }} suppressHydrationWarning>
              <Clock size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Inscripciones Recientes</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} suppressHydrationWarning>
            {recentInscriptions?.map((ins: any) => (
              <div key={ins.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid var(--border)' }} suppressHydrationWarning>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} suppressHydrationWarning>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    {ins.participantes.nombre[0]}{ins.participantes.apellido[0]}
                  </div>
                  <div suppressHydrationWarning>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ins.participantes.nombre} {ins.participantes.apellido}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Asignado a: {ins.grupos.name}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'right' }} suppressHydrationWarning>
                   {new Date(ins.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   <br />
                   {new Date(ins.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {(!recentInscriptions || recentInscriptions.length === 0) && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.85rem' }} suppressHydrationWarning>
                No hay inscripciones recientes registradas.
              </div>
            )}
          </div>
        </div>

        {/* Quick Links & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} suppressHydrationWarning>
          <div className="glass card" style={{ background: 'linear-gradient(135deg, var(--card), var(--primary-light))' }} suppressHydrationWarning>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} /> Acciones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} suppressHydrationWarning>
              <QuickLink href="/dashboard/programas" label="Gestionar Programas" icon={GraduationCap} />
              <QuickLink href="/dashboard/facilitadores" label="Asignar Facilitadores" icon={Zap} />
              <QuickLink href="/dashboard/reportes" label="Analítica Estratégica" icon={Activity} />
            </div>
          </div>

          <div className="glass card" suppressHydrationWarning>
            <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Estado de Red</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--surface)', borderRadius: '1rem' }} suppressHydrationWarning>
               <div className="animate-pulse" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10d98b' }}></div>
               <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Supabase v2 Conectado</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="nav-link" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        padding: '0.85rem 1rem', 
        background: 'var(--card-solid)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem'
      }}>
        <Icon size={16} color="var(--primary)" />
        <span style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '0.85rem' }}>{label}</span>
        <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
      </div>
    </Link>
  )
}

