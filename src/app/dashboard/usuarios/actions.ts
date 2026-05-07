'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

/**
 * Nota: Para crear usuarios en Auth se requiere el Service Role Key
 * que tiene permisos de administrador.
 */
export async function createSystemUser(formData: FormData) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ¡Importante!
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const departamento_id = formData.get('departamento_id') as string
  const role_name = formData.get('role') as string

  // 1. Crear el usuario en la tabla de Auth de Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name }
  })

  if (authError) throw authError

  // 2. Obtener el ID del rol
  const { data: roleData } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', role_name)
    .single()

  // 3. Vincular con el perfil
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name,
      email, // Guardamos el email para visualización en el panel
      departamento_id,
      role_id: roleData?.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', authData.user.id)

  if (profileError) {
    // Si falla el perfil, borramos el usuario de auth para evitar inconsistencias
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    throw profileError
  }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}

export async function deleteSystemUser(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw error

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}
