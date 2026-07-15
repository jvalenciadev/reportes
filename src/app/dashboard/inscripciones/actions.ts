'use server'

import { createClient as createBaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createParticipante(formData: FormData) {
  const supabase = await createClient()
  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string
  const grupo_id = formData.get('grupo_id') as string

  const { error } = await supabase.from('participantes').insert([{ first_name, last_name, grupo_id }])

  if (error) throw error
  revalidatePath('/dashboard/participantes')
}

export async function deleteParticipante(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('participantes').delete().eq('id', id)

  if (error) throw error
  revalidatePath('/dashboard/participantes')
}

export async function toggleConfirmation(id: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('confirmaciones_participantes')
    .upsert({ participante_id: id, confirmado: !currentStatus, fecha: new Date().toISOString().split('T')[0] }, { onConflict: 'participante_id,fecha' })

  if (error) throw error
  revalidatePath('/dashboard/participantes')
}

export async function migrateParticipant(data: any) {
  // Use Service Role Key for administrative migration (bypasses RLS)
  const supabaseAdmin = createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Resolve ids
    const grupo_nombre = data.grupo_nombre?.trim()
    const programa_titulo = data.programa_titulo?.trim()

    const { data: group, error: gErr } = await supabaseAdmin.from('grupos').select('id').eq('name', grupo_nombre).single()
    const { data: program, error: prErr } = await supabaseAdmin.from('programas').select('id').eq('titulo', programa_titulo).single()

    if (gErr || !group) throw new Error(`Grupo "${grupo_nombre}" no encontrado.`)
    if (prErr || !program) throw new Error(`Programa "${programa_titulo}" no encontrado.`)

    // 2. Insert/Get Participant
    const { data: participant, error: pError } = await supabaseAdmin
      .from('participantes')
      .upsert({
        nombre: data.nombre,
        apellido: data.apellido,
        ci: data.ci,
        correo: data.correo,
        celular: data.celular
      }, { onConflict: 'ci' })
      .select()
      .single()

    if (pError) throw pError

    // 3. Register Inscription
    const { error: iError } = await supabaseAdmin
      .from('inscripciones')
      .upsert({
        participante_id: participant.id,
        grupo_id: group.id,
        programa_id: program.id,
        estado: data.estado || 'inscrito',
        observacion: data.observacion || null
      }, { onConflict: 'participante_id,programa_id' })

    if (iError) throw iError

    revalidatePath('/dashboard/inscripciones')
    return { success: true }
  } catch (error: any) {
    console.error('Error en migración:', error.message)
    return { error: error.message || 'Error desconocido en la migración' }
  }
}

export async function updateParticipantFieldsByCI(ci: string, data: { formalizado?: boolean; zona?: string }) {
  const supabaseAdmin = createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const cleanCI = ci?.trim()
    if (!cleanCI) throw new Error('El CI no puede estar vacío.')

    // Update fields
    const { data: updated, error } = await supabaseAdmin
      .from('participantes')
      .update(data)
      .eq('ci', cleanCI)
      .select()

    if (error) throw error
    if (!updated || updated.length === 0) {
      throw new Error(`Participante con CI "${cleanCI}" no encontrado.`)
    }

    revalidatePath('/dashboard/inscripciones')
    return { success: true }
  } catch (error: any) {
    console.error('Error al actualizar participante por CI:', error.message)
    return { error: error.message || 'Error al actualizar participante' }
  }
}

export async function updateParticipantFieldById(
  id: string,
  data: {
    genero?: number | null
    zona?: string
    correo?: string
    celular?: string
    formalizado?: boolean
  }
) {
  const supabaseAdmin = createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    if (!id) throw new Error('El ID del participante no puede estar vacío.')

    const { data: updated, error } = await supabaseAdmin
      .from('participantes')
      .update(data)
      .eq('id', id)
      .select()

    if (error) throw error
    if (!updated || updated.length === 0) {
      throw new Error('No se encontró el participante en la base de datos.')
    }

    revalidatePath('/dashboard/inscripciones')
    return { success: true }
  } catch (error: any) {
    console.error('Error al actualizar participante por ID:', error.message)
    return { error: error.message || 'Error al actualizar participante' }
  }
}

export async function transferParticipantsGroup({
  participantIds,
  targetGroupId,
  programaId
}: {
  participantIds: string[]
  targetGroupId: string
  programaId: string
}) {
  const supabaseAdmin = createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    if (!participantIds || participantIds.length === 0) {
      throw new Error('Debe seleccionar al menos un participante.')
    }
    if (!targetGroupId) {
      throw new Error('Debe seleccionar un grupo de destino.')
    }
    if (!programaId) {
      throw new Error('Debe especificar el programa académico.')
    }

    // 1. Actualizar grupo_id en inscripciones
    const { data: updatedInscriptions, error: updateInsError } = await supabaseAdmin
      .from('inscripciones')
      .update({ grupo_id: targetGroupId })
      .in('participante_id', participantIds)
      .eq('programa_id', programaId)
      .select()

    if (updateInsError) throw updateInsError

    // 2. Obtener las fechas de asistencia del grupo destino para este programa
    // Para esto, buscamos otros participantes en el grupo destino
    const { data: targetEnrolled } = await supabaseAdmin
      .from('inscripciones')
      .select('participante_id')
      .eq('grupo_id', targetGroupId)
      .eq('programa_id', programaId)
      .not('participante_id', 'in', `(${participantIds.join(',')})`)

    const targetParticipantIds = targetEnrolled?.map(e => e.participante_id) || []

    if (targetParticipantIds.length > 0) {
      // Obtener los modulo_id del programa
      const { data: targetModuleIds } = await supabaseAdmin
        .from('programa_modulos')
        .select('id')
        .eq('programa_id', programaId)

      const moduleIds = targetModuleIds?.map(m => m.id) || []

      if (moduleIds.length > 0) {
        // Obtener asistencias de los participantes pre-existentes en el grupo destino
        const { data: targetAsistencias, error: getAttError } = await supabaseAdmin
          .from('asistencias')
          .select('modulo_id, dia, fecha')
          .in('participante_id', targetParticipantIds)
          .in('modulo_id', moduleIds)

        if (getAttError) throw getAttError

        if (targetAsistencias && targetAsistencias.length > 0) {
          // Calcular la fecha consenso por cada (modulo_id, dia)
          const dateCountsMap: Record<string, Record<string, number>> = {}

          targetAsistencias.forEach(a => {
            const key = `${a.modulo_id}_${a.dia}`
            if (!dateCountsMap[key]) {
              dateCountsMap[key] = {}
            }
            dateCountsMap[key][a.fecha] = (dateCountsMap[key][a.fecha] || 0) + 1
          })

          const consensusDates: Record<string, string> = {}
          Object.entries(dateCountsMap).forEach(([key, dateCounts]) => {
            let maxCount = 0
            let chosenDate = ''
            Object.entries(dateCounts).forEach(([dateStr, count]) => {
              if (count > maxCount) {
                maxCount = count
                chosenDate = dateStr
              }
            })
            consensusDates[key] = chosenDate
          })

          // Obtener las asistencias actuales de los participantes trasladados para este programa
          const { data: sourceAsistencias, error: getSrcAttError } = await supabaseAdmin
            .from('asistencias')
            .select('*')
            .in('participante_id', participantIds)
            .in('modulo_id', moduleIds)

          if (getSrcAttError) throw getSrcAttError

          if (sourceAsistencias && sourceAsistencias.length > 0) {
            // Actualizar la fecha para cada registro de asistencia que tenga fecha consenso diferente
            for (const att of sourceAsistencias) {
              const key = `${att.modulo_id}_${att.dia}`
              const consensusDate = consensusDates[key]
              if (consensusDate && att.fecha !== consensusDate) {
                // Para evitar duplicaciones (por si acaso el participante ya tiene una asistencia en esa fecha consensus)
                // Primero eliminamos cualquier duplicidad potencial en la fecha destino para ese participante/módulo
                await supabaseAdmin
                  .from('asistencias')
                  .delete()
                  .eq('participante_id', att.participante_id)
                  .eq('modulo_id', att.modulo_id)
                  .eq('fecha', consensusDate)

                // Actualizar la asistencia del día actual a la fecha consenso
                const { error: updAttError } = await supabaseAdmin
                  .from('asistencias')
                  .update({ fecha: consensusDate })
                  .eq('id', att.id)

                if (updAttError) {
                  console.error(`Error actualizando fecha de asistencia para ${att.participante_id} modulo ${att.modulo_id} dia ${att.dia}:`, updAttError)
                }
              }
            }
          }
        }
      }
    }

    revalidatePath('/dashboard/inscripciones')
    revalidatePath('/dashboard/asistencia')
    return { success: true }
  } catch (error: any) {
    console.error('Error al transferir participantes:', error.message)
    return { error: error.message || 'Error al realizar la unificación' }
  }
}

