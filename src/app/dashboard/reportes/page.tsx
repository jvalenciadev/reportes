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

  // 2. Cargar Datos Granulares de Asistencia (PROFE v2.0)
  const { data: attendanceData, error: attError } = await supabase
    .from('asistencias')
    .select(`
      dia, estado,
      participantes (
        inscripciones (
          grupos (
            name,
            departamentos (name)
          )
        )
      )
    `)

  if (attError) console.error('Error Asistencia Granular:', attError)

  // 3. Cargar Datos Granulares de Inscripciones
  const { data: enrollmentData, error: enrError } = await supabase
    .from('grupos')
    .select(`
      name,
      departamentos (name),
      inscripciones (
        estado
      )
    `)
    .order('name')

  if (enrError) console.error('Error Inscripciones Granulares:', enrError)

  // 4. Mapeo y Consolidación Dinámica (BI Engine)
  // Agrupamos asistencias individuales por día y grupo para mantener compatibilidad con el dashboard
  const attendanceMap: Record<string, any> = {}
  
  attendanceData?.forEach((a: any) => {
    const group = a.participantes?.inscripciones?.[0]?.grupos
    if (!group) return

    const key = `${a.dia}-${group.name}`
    if (!attendanceMap[key]) {
      attendanceMap[key] = {
        dia: a.dia,
        asistieron: 0, atraso: 0, falta: 0, permiso: 0,
        group_name: group.name,
        dept_name: group.departamentos?.name || 'S/D'
      }
    }
    
    // Normalización de estados al esquema del dashboard
    if (a.estado === 'asistio') attendanceMap[key].asistieron++
    else if (a.estado === 'atraso') attendanceMap[key].atraso++
    else if (a.estado === 'falta') attendanceMap[key].falta++
    else if (a.estado === 'permiso') attendanceMap[key].permiso++
  })

  const flattenedAttendance = Object.values(attendanceMap).sort((a, b) => a.dia - b.dia)

  const flattenedEnrollment = enrollmentData?.map(g => {
    const total_inscritos = g.inscripciones?.length || 0
    const total_confirmados = g.inscripciones?.filter((i: any) => i.estado === 'inscrito').length || 0
    
    return {
      group_name: g.name || 'Grupo sin nombre',
      dept_name: (g.departamentos as any)?.name || 'S/D',
      total_inscritos,
      total_confirmados
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
