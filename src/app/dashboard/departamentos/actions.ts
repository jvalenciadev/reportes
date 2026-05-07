'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDepartamento(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string

  const { error } = await supabase.from('departamentos').insert([{ name }])

  if (error) throw error
  revalidatePath('/dashboard/departamentos')
}

export async function deleteDepartamento(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('departamentos').delete().eq('id', id)

  if (error) throw error
  revalidatePath('/dashboard/departamentos')
}
