import { createClient } from '@/utils/supabase/server'
import ReportsClient from './ReportsClient'

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ from_day?: string; to_day?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // 1. Get user profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('departamento_id').eq('id', user?.id).single()
  
  // 2. Fetch attendance data
  let attendanceQuery = supabase
    .from('asistencia_diaria')
    .select(`
      dia, asistieron, retraso, falta, permiso,
      grupos!inner (
        name,
        departamento_id,
        departamentos (name)
      )
    `)

  if (profile?.departamento_id) {
    attendanceQuery = attendanceQuery.eq('grupos.departamento_id', profile.departamento_id)
  }
  if (params.from_day) attendanceQuery = attendanceQuery.gte('dia', parseInt(params.from_day))
  if (params.to_day) attendanceQuery = attendanceQuery.lte('dia', parseInt(params.to_day))

  const { data: attendanceData } = await attendanceQuery.order('dia', { ascending: true })

  // 3. Fetch enrollment data starting from groups to see everything
  let enrollmentQuery = supabase
    .from('grupos')
    .select(`
      name,
      departamento_id,
      departamentos (name),
      inscripciones_resumen (
        total_inscritos,
        total_confirmados
      )
    `)

  if (profile?.departamento_id) {
    enrollmentQuery = enrollmentQuery.eq('departamento_id', profile.departamento_id)
  }
  const { data: groupsWithEnrollment } = await enrollmentQuery.order('name')

  const flattenedAttendance = attendanceData?.map(a => ({
    dia: a.dia,
    asistieron: a.asistieron,
    retraso: a.retraso,
    falta: a.falta,
    permiso: a.permiso,
    group_name: (a.grupos as any)?.name,
    dept_name: (a.grupos as any)?.departamentos?.name,
  })) || []

  const flattenedEnrollment = groupsWithEnrollment?.map(g => {
    const res = (g.inscripciones_resumen as any)?.[0] || { total_inscritos: 0, total_confirmados: 0 }
    return {
      total_inscritos: res.total_inscritos,
      total_confirmados: res.total_confirmados,
      group_name: g.name,
      dept_name: (g.departamentos as any)?.name,
    }
  }) || []

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Reportes Consolidados</h1>
        <p style={{ color: 'var(--muted)' }}>Consulta los totales de asistencia por día e inscripción</p>
      </header>

      <div className="card glass" style={{ marginBottom: '1.5rem' }}>
        <form style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Desde Día</label>
            <input type="number" name="from_day" min="1" defaultValue={params.from_day} style={{ width: '100px' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Hasta Día</label>
            <input type="number" name="to_day" min="1" defaultValue={params.to_day} style={{ width: '100px' }} />
          </div>
          <button className="btn btn-primary">Filtrar Días</button>
        </form>
      </div>

      <ReportsClient 
        attendanceData={flattenedAttendance} 
        enrollmentData={flattenedEnrollment}
      />
    </div>
  )
}
