'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createGrupo(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const code = formData.get('code') as string
  const departamento_id = formData.get('departamento_id') as string

  const { error } = await supabase.from('grupos').insert([{ name, code, departamento_id }])

  if (error) throw error
  revalidatePath('/dashboard/grupos')
}

export async function deleteGrupo(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('grupos').delete().eq('id', id)

  if (error) throw error
  revalidatePath('/dashboard/grupos')
}
