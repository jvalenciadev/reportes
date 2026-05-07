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
  const nombre = formData.get('nombre') as string
  const apellidos = formData.get('apellidos') as string
  const ci = formData.get('ci') as string
  const correo = formData.get('correo') as string || email
  const departamento_id = formData.get('departamento_id') as string
  const role_name = formData.get('role') as string

  // 1. Crear el usuario en la tabla de Auth de Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { 
      full_name: full_name || `${nombre} ${apellidos}`,
      nombre,
      apellidos,
      ci
    }
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
      full_name: full_name || `${nombre} ${apellidos}`,
      nombre,
      apellidos,
      ci,
      correo,
      email, // Mantenemos email por compatibilidad
      departamento_id,
      role_id: roleData?.id,
      role: role_name, // Guardamos también como texto para compatibilidad
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

export async function assignFacilitatorGroup(email: string, groupName: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  )

  // 1. Obtener el profile_id por email
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!profile) throw new Error(`Facilitador con email ${email} no encontrado.`)

  // 2. Obtener el grupo_id por nombre
  const { data: group } = await supabaseAdmin
    .from('grupos')
    .select('id')
    .eq('name', groupName)
    .single()

  if (!group) throw new Error(`Grupo con nombre "${groupName}" no encontrado.`)

  // 3. Vincular
  const { error } = await supabaseAdmin
    .from('facilitador_grupos')
    .upsert({
      profile_id: profile.id,
      grupo_id: group.id
    }, { onConflict: 'profile_id,grupo_id' })

  if (error) throw error

  return { success: true }
}

export async function updateSystemUser(userId: string, formData: FormData) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  )

  const nombre = formData.get('nombre') as string
  const apellidos = formData.get('apellidos') as string
  const ci = formData.get('ci') as string
  const departamento_id = formData.get('departamento_id') as string
  const role_name = formData.get('role') as string

  // 1. Actualizar metadata en Auth
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { 
      full_name: `${nombre} ${apellidos}`,
      nombre,
      apellidos,
      ci
    }
  })

  if (authError) throw authError

  // 2. Obtener el ID del rol
  const { data: roleData } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', role_name)
    .single()

  // 3. Actualizar el perfil
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: `${nombre} ${apellidos}`,
      nombre,
      apellidos,
      ci,
      departamento_id,
      role_id: roleData?.id,
      role: role_name,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (profileError) throw profileError

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}
