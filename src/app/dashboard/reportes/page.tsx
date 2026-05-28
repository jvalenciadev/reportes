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
  let attendanceData: any[] = []
  let attPage = 0
  const PAGE_SIZE = 1000
  let keepFetchingAtt = true

  while (keepFetchingAtt) {
    const { data, error } = await supabase
      .from('asistencias')
      .select(`
        participante_id, dia, estado, modulo_id,
        programa_modulos (
          titulo_modulo,
          grupo,
          programa_id
        ),
        participantes (
          inscripciones (
            estado,
            programa_id,
            entrego_documento,
            grupos (
              name,
              departamentos (name)
            )
          )
        )
      `)
      .range(attPage * PAGE_SIZE, (attPage + 1) * PAGE_SIZE - 1)

    if (error) {
      console.error(`Error Asistencia Granular (Pág ${attPage}):`, error)
      keepFetchingAtt = false
    } else if (!data || data.length === 0) {
      keepFetchingAtt = false
    } else {
      attendanceData = attendanceData.concat(data)
      if (data.length < PAGE_SIZE) {
        keepFetchingAtt = false
      } else {
        attPage++
      }
    }
  }

  console.log(`[AUDIT] Total Asistencias Cargadas: ${attendanceData.length}`)

  // 3. Cargar Datos Granulares de Inscripciones
  const { data: enrollmentData, error: enrError } = await supabase
    .from('grupos')
    .select(`
      name,
      departamentos (name),
      inscripciones (
        estado,
        entrego_documento,
        participantes (
          formalizado,
          zona
        )
      )
    `)
    .order('name')

  if (enrError) console.error('Error Inscripciones Granulares:', enrError)

  // 4. Cargar Datos de Calificaciones (PROFE v2.1)
  let gradesData: any[] = []
  let gradesPage = 0
  let keepFetchingGrades = true

  while (keepFetchingGrades) {
    const { data, error } = await supabase
      .from('calificaciones')
      .select(`
        total, modulo_id,
        programa_modulos (
          titulo_modulo,
          grupo,
          programa_id
        ),
        participantes (
          inscripciones (
            estado,
            programa_id,
            entrego_documento,
            grupos (
              name,
              departamentos (name)
            )
          )
        )
      `)
      .range(gradesPage * PAGE_SIZE, (gradesPage + 1) * PAGE_SIZE - 1)

    if (error) {
      console.error(`Error Calificaciones Granulares (Pág ${gradesPage}):`, error)
      keepFetchingGrades = false
    } else if (!data || data.length === 0) {
      keepFetchingGrades = false
    } else {
      gradesData = gradesData.concat(data)
      if (data.length < PAGE_SIZE) {
        keepFetchingGrades = false
      } else {
        gradesPage++
      }
    }
  }

  console.log(`[AUDIT] Total Calificaciones Cargadas: ${gradesData.length}`)

  // 5. Mapeo y Consolidación Dinámica (BI Engine)
  // Agrupamos asistencias filtrando por 'inscrito' y deduplicando por alumno por día
  const attendanceMap: Record<string, any> = {}
  const attendanceModuleMap: Record<string, any> = {}

  // A. Primero, calculamos asistencia única por estudiante por día
  const uniqueDailyAttendance: Record<string, {
    dia: number;
    estado: string;
    group: any;
    dept_name: string;
  }> = {}

  // B. Calculamos asistencia única por estudiante por día por módulo
  const uniqueModuleAttendance: Record<string, {
    dia: number;
    modulo_id: string;
    modulo_name: string;
    estado: string;
    group: any;
    dept_name: string;
  }> = {}

  // Prioridad de estados: asistio > atraso > permiso > falta
  const STATE_PRIORITY: Record<string, number> = {
    'asistio': 4,
    'atraso': 3,
    'permiso': 2,
    'falta': 1
  }

  attendanceData?.forEach((a: any) => {
    const studentId = a.participante_id || a.participantes?.id
    if (!studentId) return

    const programaId = a.programa_modulos?.programa_id
    const inscripcion = a.participantes?.inscripciones?.find(
      (i: any) => i.programa_id === programaId
    )
    if (!inscripcion) return

    // FILTRO REQUERIDO: Solo inscritos activos
    if (inscripcion.estado !== 'inscrito') return

    const group = inscripcion.grupos
    if (!group) return

    const currentStatus = a.estado || 'falta'

    // 1. Deduplicar para Asistencia General (Día/Estudiante)
    const dailyKey = `${a.dia}-${studentId}`
    if (!uniqueDailyAttendance[dailyKey]) {
      uniqueDailyAttendance[dailyKey] = {
        dia: a.dia,
        estado: currentStatus,
        group: group,
        dept_name: group.departamentos?.name || 'S/D'
      }
    } else {
      const existingStatus = uniqueDailyAttendance[dailyKey].estado
      if ((STATE_PRIORITY[currentStatus] || 0) > (STATE_PRIORITY[existingStatus] || 0)) {
        uniqueDailyAttendance[dailyKey].estado = currentStatus
      }
    }

    // 2. Deduplicar para Asistencia por Módulo (Día/Estudiante/Módulo)
    const moduloId = a.modulo_id || 'no-mod'
    const moduloKey = `${a.dia}-${studentId}-${moduloId}`

    const modulo_titulo = a.programa_modulos?.titulo_modulo || 'S/M'
    const modulo_grupo = a.programa_modulos?.grupo
    const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
    const full_modulo_name = `${modulo_prefix}${modulo_titulo}`

    if (!uniqueModuleAttendance[moduloKey]) {
      uniqueModuleAttendance[moduloKey] = {
        dia: a.dia,
        modulo_id: a.modulo_id || null,
        modulo_name: full_modulo_name,
        estado: currentStatus,
        group: group,
        dept_name: group.departamentos?.name || 'S/D'
      }
    } else {
      const existingStatus = uniqueModuleAttendance[moduloKey].estado
      if ((STATE_PRIORITY[currentStatus] || 0) > (STATE_PRIORITY[existingStatus] || 0)) {
        uniqueModuleAttendance[moduloKey].estado = currentStatus
      }
    }
  })

  // C. Construir attendanceMap (General)
  Object.values(uniqueDailyAttendance).forEach((item: any) => {
    const key = `${item.dia}-${item.group.name}`
    if (!attendanceMap[key]) {
      attendanceMap[key] = {
        dia: item.dia,
        asistieron: 0, atraso: 0, falta: 0, permiso: 0,
        group_name: item.group.name,
        dept_name: item.dept_name
      }
    }

    if (item.estado === 'asistio') attendanceMap[key].asistieron++
    else if (item.estado === 'atraso') attendanceMap[key].atraso++
    else if (item.estado === 'falta') attendanceMap[key].falta++
    else if (item.estado === 'permiso') attendanceMap[key].permiso++
  })

  // D. Construir attendanceModuleMap (Por Módulo)
  Object.values(uniqueModuleAttendance).forEach((item: any) => {
    const keyMod = `${item.dia}-${item.group.name}-${item.modulo_id || 'no-mod'}`
    if (!attendanceModuleMap[keyMod]) {
      attendanceModuleMap[keyMod] = {
        dia: item.dia,
        modulo_id: item.modulo_id,
        modulo_name: item.modulo_name,
        asistieron: 0, atraso: 0, falta: 0, permiso: 0,
        group_name: item.group.name,
        dept_name: item.dept_name
      }
    }

    if (item.estado === 'asistio') attendanceModuleMap[keyMod].asistieron++
    else if (item.estado === 'atraso') attendanceModuleMap[keyMod].atraso++
    else if (item.estado === 'falta') attendanceModuleMap[keyMod].falta++
    else if (item.estado === 'permiso') attendanceModuleMap[keyMod].permiso++
  })

  const flattenedAttendance = Object.values(attendanceMap).sort((a, b) => a.dia - b.dia)
  const flattenedAttendanceByModules = Object.values(attendanceModuleMap).sort((a, b) => a.dia - b.dia)

  // C. Agrupación de Calificaciones por módulo
  const gradesMap: Record<string, any> = {}

  gradesData?.forEach((g: any) => {
    const programaId = g.programa_modulos?.programa_id
    const inscripcion = g.participantes?.inscripciones?.find(
      (i: any) => i.programa_id === programaId
    )
    if (!inscripcion) return

    // FILTRO REQUERIDO: Solo inscritos activos
    if (inscripcion.estado !== 'inscrito') return

    const group = inscripcion.grupos
    if (!group) return

    const modulo_titulo = g.programa_modulos?.titulo_modulo || 'S/M'
    const modulo_grupo = g.programa_modulos?.grupo
    const modulo_prefix = modulo_grupo === 1 ? 'LENGUAJE - ' : modulo_grupo === 2 ? 'MATEMÁTICA - ' : ''
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
        abandonos: 0,
        suma_total: 0,
        suma_total_con_nota: 0,
        total_con_nota: 0
      }
    }

    const nota = Number(g.total || 0)
    gradesMap[key].total_calificados++
    gradesMap[key].suma_total += nota
    if (nota === 0) {
      gradesMap[key].abandonos++
    } else {
      gradesMap[key].suma_total_con_nota += nota
      gradesMap[key].total_con_nota++
      if (nota >= 51) {
        gradesMap[key].aprobados++
      } else {
        gradesMap[key].reprobados++
      }
    }
  })

  const flattenedGrades = Object.values(gradesMap)

  const flattenedEnrollment = enrollmentData?.map(g => {
    const inscripciones = g.inscripciones || []
    const total_inscritos = inscripciones.length
    const activos = inscripciones.filter((i: any) => i.estado === 'inscrito')
    const total_confirmados = activos.length
    const total_preinscritos = inscripciones.filter((i: any) => i.estado === 'preinscrito').length

    const preinscritos_entrego = inscripciones.filter((i: any) => i.estado === 'preinscrito').length
    const inscritos_entrego = activos.length

    const total_formalizados = activos.filter((i: any) => i.participantes?.formalizado === true).length
    const total_rural = activos.filter((i: any) => i.participantes?.zona === 'rural').length
    const total_urbano = activos.filter((i: any) => i.participantes?.zona === 'urbano').length

    return {
      group_name: g.name || 'Grupo sin nombre',
      dept_name: (g.departamentos as any)?.name || 'S/D',
      total_inscritos,
      total_confirmados,
      total_preinscritos,
      preinscritos_entrego,
      inscritos_entrego,
      total_formalizados,
      total_rural,
      total_urbano
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
