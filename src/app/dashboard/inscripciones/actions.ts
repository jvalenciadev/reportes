'use server'

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
  const supabase = await createClient()

  // 1. Resolve ids
  const { data: group } = await supabase.from('grupos').select('id').eq('name', data.grupo_nombre).single()
  const { data: program } = await supabase.from('programas').select('id').eq('titulo', data.programa_titulo).single()

  if (!group) throw new Error(`Grupo "${data.grupo_nombre}" no encontrado.`)
  if (!program) throw new Error(`Programa "${data.programa_titulo}" no encontrado.`)

  // 2. Insert/Get Participant
  const { data: participant, error: pError } = await supabase
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
  const { error: iError } = await supabase
    .from('inscripciones')
    .upsert({
      participante_id: participant.id,
      grupo_id: group.id,
      programa_id: program.id,
      estado: 'inscrito'
    }, { onConflict: 'participante_id,programa_id' })

  if (iError) throw iError

  revalidatePath('/dashboard/inscripciones')
  return { success: true }
}
