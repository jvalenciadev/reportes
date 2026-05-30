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
