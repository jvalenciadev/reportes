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
      dia, estado, modulo_id,
      programa_modulos (
        titulo_modulo,
        grupo
      ),
      participantes (
        inscripciones (
          estado,
          entrego_documento,
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
        estado,
        entrego_documento
      )
    `)
    .order('name')

  if (enrError) console.error('Error Inscripciones Granulares:', enrError)

  // 4. Cargar Datos de Calificaciones (PROFE v2.1)
  const { data: gradesData, error: gradesError } = await supabase
    .from('calificaciones')
    .select(`
      total, modulo_id,
      programa_modulos (
        titulo_modulo,
        grupo
      ),
      participantes (
        inscripciones (
          estado,
          entrego_documento,
          grupos (
            name,
            departamentos (name)
          )
        )
      )
    `)

  if (gradesError) console.error('Error Calificaciones Granulares:', gradesError)

  // 5. Mapeo y Consolidación Dinámica (BI Engine)
  // Agrupamos asistencias filtrando por 'inscrito' y 'entrego_documento' = true
  const attendanceMap: Record<string, any> = {}
  const attendanceModuleMap: Record<string, any> = {}

  attendanceData?.forEach((a: any) => {
    const inscripcion = a.participantes?.inscripciones?.[0]
    if (!inscripcion) return

    // FILTRO REQUERIDO: Solo inscritos activos que entregaron documentos
    if (inscripcion.estado !== 'inscrito' || !inscripcion.entrego_documento) return

    const group = inscripcion.grupos
    if (!group) return

    // A. Agrupación estándar para compatibilidad con el dashboard
    const key = `${a.dia}-${group.name}`
    if (!attendanceMap[key]) {
      attendanceMap[key] = {
        dia: a.dia,
        asistieron: 0, atraso: 0, falta: 0, permiso: 0,
        group_name: group.name,
        dept_name: group.departamentos?.name || 'S/D'
      }
    }

    if (a.estado === 'asistio') attendanceMap[key].asistieron++
    else if (a.estado === 'atraso') attendanceMap[key].atraso++
    else if (a.estado === 'falta') attendanceMap[key].falta++
    else if (a.estado === 'permiso') attendanceMap[key].permiso++

    // B. Agrupación por módulo
    const modulo_titulo = a.programa_modulos?.titulo_modulo || 'S/M'
    const modulo_grupo = a.programa_modulos?.grupo
    const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMATICA - ' : ''
    const full_modulo_name = `${modulo_prefix}${modulo_titulo}`

    const keyMod = `${a.dia}-${group.name}-${a.modulo_id || 'no-mod'}`
    if (!attendanceModuleMap[keyMod]) {
      attendanceModuleMap[keyMod] = {
        dia: a.dia,
        modulo_id: a.modulo_id || null,
        modulo_name: full_modulo_name,
        asistieron: 0, atraso: 0, falta: 0, permiso: 0,
        group_name: group.name,
        dept_name: group.departamentos?.name || 'S/D'
      }
    }

    if (a.estado === 'asistio') attendanceModuleMap[keyMod].asistieron++
    else if (a.estado === 'atraso') attendanceModuleMap[keyMod].atraso++
    else if (a.estado === 'falta') attendanceModuleMap[keyMod].falta++
    else if (a.estado === 'permiso') attendanceModuleMap[keyMod].permiso++
  })

  const flattenedAttendance = Object.values(attendanceMap).sort((a, b) => a.dia - b.dia)
  const flattenedAttendanceByModules = Object.values(attendanceModuleMap).sort((a, b) => a.dia - b.dia)

  // C. Agrupación de Calificaciones por módulo
  const gradesMap: Record<string, any> = {}

  gradesData?.forEach((g: any) => {
    const inscripcion = g.participantes?.inscripciones?.[0]
    if (!inscripcion) return

    // FILTRO REQUERIDO: Solo inscritos activos que entregaron documentos
    if (inscripcion.estado !== 'inscrito' || !inscripcion.entrego_documento) return

    const group = inscripcion.grupos
    if (!group) return

    const modulo_titulo = g.programa_modulos?.titulo_modulo || 'S/M'
    const modulo_grupo = g.programa_modulos?.grupo
    const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMATICA - ' : ''
    const full_modulo_name = `${modulo_prefix}${modulo_titulo}`

    const key = `${group.name}-${g.modulo_id || 'no-mod'}`
    if (!gradesMap[key]) {
      gradesMap[key] = {
        modulo_id: g.modulo_id || null,
        modulo_name: full_modulo_name,
        group_name: group.name,
        dept_name: group.departamentos?.name || 'S/D',
        total_calificados: 0,
        aprobados: 0,
        reprobados: 0,
        suma_total: 0
      }
    }

    gradesMap[key].total_calificados++
    gradesMap[key].suma_total += Number(g.total || 0)
    if (Number(g.total || 0) >= 51) {
      gradesMap[key].aprobados++
    } else {
      gradesMap[key].reprobados++
    }
  })

  const flattenedGrades = Object.values(gradesMap)

  const flattenedEnrollment = enrollmentData?.map(g => {
    const inscripciones = g.inscripciones || []
    const total_inscritos = inscripciones.length
    const total_confirmados = inscripciones.filter((i: any) => i.estado === 'inscrito').length
    const total_preinscritos = inscripciones.filter((i: any) => i.estado === 'preinscrito').length

    const preinscritos_entrego = inscripciones.filter((i: any) => i.estado === 'preinscrito' && i.entrego_documento).length
    const inscritos_entrego = inscripciones.filter((i: any) => i.estado === 'inscrito' && i.entrego_documento).length

    return {
      group_name: g.name || 'Grupo sin nombre',
      dept_name: (g.departamentos as any)?.name || 'S/D',
      total_inscritos,
      total_confirmados,
      total_preinscritos,
      preinscritos_entrego,
      inscritos_entrego
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

      <ReportsClient
        attendanceData={flattenedAttendance}
        enrollmentData={flattenedEnrollment}
        attendanceByModulesData={flattenedAttendanceByModules}
        gradesData={flattenedGrades}
      />
    </div>
  )
}
