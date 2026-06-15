'use server'

import { createClient as createBaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Inicializar Supabase Admin con la clave de servicio
const supabaseAdmin = createBaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function migrateTutor(data: {
  nombre: string
  apellido: string
  rol?: string
  grupo_nombre: string
  ci?: string
  correo?: string
  password?: string
}) {
  try {
    const nombre = data.nombre?.trim()
    const apellido = data.apellido?.trim()
    const groupName = data.grupo_nombre?.trim()
    const ci = data.ci?.trim() || ''
    const rawRole = data.rol?.trim()?.toLowerCase() || 'tutor'

    if (!nombre || !apellido || !groupName) {
      throw new Error('Faltan campos obligatorios: nombre, apellido o grupo_nombre.')
    }

    // 1. Obtener grupo
    const { data: group, error: gErr } = await supabaseAdmin
      .from('grupos')
      .select('id')
      .eq('name', groupName)
      .single()

    if (gErr || !group) {
      throw new Error(`Grupo "${groupName}" no encontrado en el sistema.`)
    }

    // 2. Obtener ID del rol 'tutor'
    const { data: roleData, error: rErr } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'tutor')
      .single()

    if (rErr || !roleData) {
      throw new Error('Rol "tutor" no encontrado en la base de datos.')
    }

    // 3. Determinar el correo electrónico
    // Si no se provee, autogeneramos uno único y consistente
    let email = data.correo?.trim()
    if (!email) {
      const sanitizedName = nombre.toLowerCase().replace(/[^a-z0-9]/g, '')
      const sanitizedLastName = apellido.toLowerCase().replace(/[^a-z0-9]/g, '')
      // Añadimos un hash aleatorio/corto para evitar colisiones
      const randomSuffix = Math.floor(100 + Math.random() * 900)
      email = `${sanitizedName}.${sanitizedLastName}.${randomSuffix}@tutor.profe.gob.bo`
    }

    // Determinar contraseña por defecto si no se provee
    const password = data.password || `Tutor${ci ? ci.replace(/[^0-9]/g, '') : '123'}*`

    // 4. Buscar si ya existe un perfil con el mismo CI o correo
    let existingProfile: any = null

    if (ci) {
      const { data: profileByCI } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('ci', ci)
        .maybeSingle()
      existingProfile = profileByCI
    }

    if (!existingProfile && email) {
      const { data: profileByEmail } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle()
      existingProfile = profileByEmail
    }

    let userId: string

    if (existingProfile) {
      // Si el perfil ya existe, actualizamos su rol a 'tutor'
      userId = existingProfile.id
      const { error: profileUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          nombre,
          apellidos: apellido,
          full_name: `${nombre} ${apellido}`,
          role_id: roleData.id,
          ci: ci || existingProfile.ci,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileUpdateErr) throw new Error(profileUpdateErr.message)
    } else {
      // Si no existe, creamos el usuario en Auth y se creará automáticamente el perfil
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: `${nombre} ${apellido}`,
          nombre,
          apellidos: apellido,
          ci
        }
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('No se pudo crear el usuario en Auth.')

      userId = authData.user.id

      // Forzar actualización del perfil recién creado para asegurar el rol_id correcto y campos
      const { error: profileUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          nombre,
          apellidos: apellido,
          full_name: `${nombre} ${apellido}`,
          ci,
          correo: email,
          email,
          role_id: roleData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileUpdateErr) {
        // Revertir creación de usuario si falla la actualización del perfil
        await supabaseAdmin.auth.admin.deleteUser(userId)
        throw new Error(`Error al configurar perfil del tutor: ${profileUpdateErr.message}`)
      }
    }

    // 5. Vincular al tutor con el grupo en `tutor_grupos`
    const { error: linkErr } = await supabaseAdmin
      .from('tutor_grupos')
      .upsert({
        profile_id: userId,
        grupo_id: group.id
      }, { onConflict: 'profile_id,grupo_id' })

    if (linkErr) throw new Error(`Error al vincular tutor al grupo: ${linkErr.message}`)

    revalidatePath('/dashboard/tutores')
    revalidatePath('/dashboard/migracion')
    return { success: true }
  } catch (error: any) {
    console.error('Error en migrateTutor:', error.message)
    return { error: error.message || 'Error desconocido al migrar tutor.' }
  }
}

export async function updateTutorProfile(
  tutorId: string,
  data: {
    nombre: string
    apellidos: string
    ci: string
    correo: string
  }
) {
  try {
    const nombre = data.nombre?.trim().toUpperCase()
    const apellidos = data.apellidos?.trim().toUpperCase()
    const ci = data.ci?.trim()
    const correo = data.correo?.trim()

    if (!nombre || !apellidos) {
      throw new Error('El nombre y los apellidos son obligatorios.')
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        nombre,
        apellidos,
        full_name: `${nombre} ${apellidos}`,
        ci,
        correo,
        email: correo,
        updated_at: new Date().toISOString()
      })
      .eq('id', tutorId)

    if (error) throw new Error(error.message)

    // Sincronizar el correo en Supabase Auth si es posible
    try {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(tutorId)
      if (user && user.user && user.user.email !== correo) {
        await supabaseAdmin.auth.admin.updateUserById(tutorId, {
          email: correo,
          email_confirm: true
        })
      }
    } catch (authErr) {
      console.warn('No se pudo actualizar el email en Auth (puede no tener permisos suficientes):', authErr)
    }

    revalidatePath('/dashboard/tutores')
    return { success: true }
  } catch (error: any) {
    console.error('Error en updateTutorProfile:', error.message)
    return { error: error.message || 'Error al actualizar el perfil del tutor.' }
  }
}

export async function getTutorsAttendanceSession(deptoId: string, moduloId: string, dayNumber: number, userRole?: string, allowedGroupIds?: string[]) {
  try {
    // 1. Obtener grupos para el departamento
    let query = supabaseAdmin.from('grupos').select('id, name').eq('departamento_id', deptoId)
    const { data: groups, error: gErr } = await query

    if (gErr) throw new Error(gErr.message)
    const groupIds = groups?.map(g => g.id) || []

    if (groupIds.length === 0) {
      return { tutors: [], attendance: [], facilitators: [], groups: groups || [] }
    }

    // 2. Obtener tutores vinculados a estos grupos
    const { data: links, error: lErr } = await supabaseAdmin
      .from('tutor_grupos')
      .select('grupo_id, grupos(name), profiles(id, nombre, apellidos, ci, correo, email)')
      .in('grupo_id', groupIds)

    if (lErr) throw new Error(lErr.message)

    const tutors = links?.map((l: any) => {
      if (!l.profiles) return null
      return {
        ...l.profiles,
        grupo_id: l.grupo_id,
        grupo_name: l.grupos?.name || 'N/A'
      }
    }).filter(Boolean) || []

    const tutorIds = tutors.map((t: any) => t.id)

    // 3. Obtener asistencias existentes para este módulo
    let attendance: any[] = []
    if (tutorIds.length > 0) {
      const { data: existing, error: aErr } = await supabaseAdmin
        .from('asistencias_tutores')
        .select('*')
        .eq('modulo_id', moduloId)
        .in('tutor_id', tutorIds)

      if (aErr) throw new Error(aErr.message)
      attendance = existing || []
    }

    // 4. Sincronización automática de asistencia (ej: crear faltas por defecto)
    if (tutorIds.length > 0 && attendance.length > 0) {
      let didChange = false

      // Limpieza de jornadas inválidas (>6)
      const invalidRecords = attendance.filter((a: any) => a.dia > 6)
      if (invalidRecords.length > 0) {
        const { error: deleteErr } = await supabaseAdmin
          .from('asistencias_tutores')
          .delete()
          .eq('modulo_id', moduloId)
          .gt('dia', 6)
          .in('tutor_id', tutorIds)
        if (!deleteErr) didChange = true
      }

      // Identificar días registrados válidos (1 a 6)
      const registeredDays = Array.from(new Set(attendance.map((a: any) => a.dia))).filter(d => d >= 1 && d <= 6)
      const missingRecords: any[] = []
      const daysToSyncDates: { dia: number; chosenDate: string }[] = []

      // Obtener fecha de inicio del módulo para calcular fechas automáticas
      const { data: modData } = await supabaseAdmin
        .from('programa_modulos')
        .select('fecha_inicio')
        .eq('id', moduloId)
        .single()

      const fechaInicio = modData?.fecha_inicio || new Date().toISOString().split('T')[0]

      const getAutoDateForDayLocal = (day: number) => {
        try {
          const startDate = new Date(fechaInicio + 'T00:00:00')
          startDate.setDate(startDate.getDate() + (day - 1))
          return startDate.toISOString().split('T')[0]
        } catch (e) {
          return new Date().toISOString().split('T')[0]
        }
      }

      registeredDays.forEach((dia: number) => {
        const recordsForDay = attendance.filter((a: any) => a.dia === dia)
        const chosenDate = getAutoDateForDayLocal(dia)

        const hasDateDiscrepancy = recordsForDay.some((r: any) => r.fecha !== chosenDate)
        if (hasDateDiscrepancy) {
          daysToSyncDates.push({ dia, chosenDate })
        }

        tutorIds.forEach((tId: string) => {
          const hasRecord = recordsForDay.some((r: any) => r.tutor_id === tId)
          if (!hasRecord) {
            missingRecords.push({
              tutor_id: tId,
              modulo_id: moduloId,
              dia: dia,
              estado: 'falta',
              fecha: chosenDate
            })
          }
        })
      })

      if (missingRecords.length > 0) {
        const { error: insertErr } = await supabaseAdmin
          .from('asistencias_tutores')
          .insert(missingRecords)
        if (!insertErr) didChange = true
      }

      if (daysToSyncDates.length > 0) {
        for (const sync of daysToSyncDates) {
          const { error: updateErr } = await supabaseAdmin
            .from('asistencias_tutores')
            .update({ fecha: sync.chosenDate })
            .eq('modulo_id', moduloId)
            .eq('dia', sync.dia)
            .in('tutor_id', tutorIds)
          if (!updateErr) didChange = true
        }
      }

      if (didChange) {
        const { data: refreshed, error: aErr } = await supabaseAdmin
          .from('asistencias_tutores')
          .select('*')
          .eq('modulo_id', moduloId)
          .in('tutor_id', tutorIds)
        if (!aErr && refreshed) {
          attendance = refreshed
        }
      }
    }

    // 5. Obtener facilitadores del departamento
    const { data: facs } = await supabaseAdmin
      .from('facilitador_grupos')
      .select('profiles(full_name, departamentos(name))')
      .in('grupo_id', groupIds)

    const facilitators = facs?.map((f: any) => ({
      name: f.profiles?.full_name || '',
      depto: f.profiles?.departamentos?.name || 'N/A'
    })).filter(f => f.name) || []

    return { tutors, attendance, facilitators, groups: groups || [] }
  } catch (error: any) {
    console.error('Error in getTutorsAttendanceSession:', error.message)
    return { error: error.message }
  }
}

export async function saveTutorAttendanceServer(records: any[]) {
  try {
    const { error } = await supabaseAdmin
      .from('asistencias_tutores')
      .upsert(records, { onConflict: 'id' })

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (error: any) {
    console.error('Error in saveTutorAttendanceServer:', error.message)
    return { error: error.message }
  }
}

export async function getAllTutorsAttendance(moduloId: string, tutorIds: string[]) {
  try {
    const { data, error } = await supabaseAdmin
      .from('asistencias_tutores')
      .select('*')
      .eq('modulo_id', moduloId)
      .in('tutor_id', tutorIds)

    if (error) throw new Error(error.message)
    return { data }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getGeneralTutorsAttendance(programId: string, tutorIds: string[]) {
  try {
    // 1. Obtener todos los módulos del programa
    const { data: mods, error: mErr } = await supabaseAdmin
      .from('programa_modulos')
      .select('id, titulo_modulo')
      .eq('programa_id', programId)
      .order('orden', { ascending: true })

    if (mErr) throw new Error(mErr.message)
    const modIds = mods?.map(m => m.id) || []

    if (modIds.length === 0) return { data: [], modules: [] }

    // 2. Obtener todas las asistencias para estos módulos y tutores
    const { data: attendance, error: aErr } = await supabaseAdmin
      .from('asistencias_tutores')
      .select('*')
      .in('modulo_id', modIds)
      .in('tutor_id', tutorIds)

    if (aErr) throw new Error(aErr.message)

    return { data: attendance || [], modules: mods || [] }
  } catch (error: any) {
    return { error: error.message }
  }
}


