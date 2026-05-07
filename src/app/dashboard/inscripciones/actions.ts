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
