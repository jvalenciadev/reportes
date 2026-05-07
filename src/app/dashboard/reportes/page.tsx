import { createClient } from '@/utils/supabase/server'
import ReportsClient from './ReportsClient'
import { naturalSort } from '@/utils/sort'

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ from_day?: string; to_day?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // 1. Obtener usuario (Sin filtrar por departamento para asegurar visibilidad total)
  const { data: { user } } = await supabase.auth.getUser()

  console.log('--- AUDITORIA DE REPORTES (SERVER) ---')

  // 2. Cargar Asistencia
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

  const { data: attendanceData, error: attError } = await attendanceQuery.order('dia', { ascending: true })
  if (attError) console.error('Error Asistencia:', attError)

  // 3. Cargar Inscripciones (CONSULTA DEFINITIVA: Empezar desde Grupos)
  const { data: groupsWithEnrollment, error: enrError } = await supabase
    .from('grupos')
    .select(`
      name,
      departamentos (name),
      inscripciones_resumen!inscripciones_resumen_grupo_id_fkey (
        total_inscritos,
        total_confirmados
      )
    `)
    .order('name')

  if (enrError) console.error('Error Inscripciones:', enrError)


  // 4. Mapeo Seguro de Datos
  const flattenedAttendance = attendanceData?.map(a => ({
    dia: (a as any).dia,
    asistieron: a.asistieron || 0,
    retraso: a.retraso || 0,
    falta: a.falta || 0,
    permiso: a.permiso || 0,
    group_name: (a.grupos as any)?.name || 'Sin Nombre',
    dept_name: (a.grupos as any)?.departamentos?.name || 'S/D',
  })) || []

  const flattenedEnrollment = groupsWithEnrollment?.map(g => {
    // inscripciones_resumen es relación 1:1 (objeto, no array)
    const res = (g.inscripciones_resumen as any) || { total_inscritos: 0, total_confirmados: 0 }
    // Supabase puede devolver array o null si no hay registro
    const resData = Array.isArray(res) ? (res[0] || { total_inscritos: 0, total_confirmados: 0 }) : res
    return {
      total_inscritos: resData.total_inscritos || 0,
      total_confirmados: resData.total_confirmados || 0,
      group_name: g.name || 'Grupo sin nombre',
      dept_name: (g.departamentos as any)?.name || 'S/D',
    }
  }) || []

  // Natural sort por nombre de grupo
  flattenedEnrollment.sort((a, b) => naturalSort(a.group_name, b.group_name))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} suppressHydrationWarning>
      <header>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.04em' }}>Centro de Reportes Consolidado</h1>
        <p style={{ color: 'var(--muted)' }}>Visualización en tiempo real de métricas departamentales</p>
      </header>

      {/* Debug Info (Solo visible en desarrollo si es necesario, pero lo quitamos para UX) */}

      <ReportsClient
        attendanceData={flattenedAttendance}
        enrollmentData={flattenedEnrollment}
      />
    </div>
  )
}
