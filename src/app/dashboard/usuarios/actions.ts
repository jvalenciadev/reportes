'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

/**
 * Nota: Para crear usuarios en Auth se requiere el Service Role Key
 * que tiene permisos de administrador.
 */
export async function createSystemUser(formData: FormData) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const full_name = formData.get('full_name') as string
    const nombre = formData.get('nombre') as string
    const apellidos = formData.get('apellidos') as string
    const ci = formData.get('ci') as string
    const correo = (formData.get('correo') as string) || email
    const departamento_id = formData.get('departamento_id') as string
    const role_name = formData.get('role') as string

    // 1. Obtener ID del rol
    const { data: roleData } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role_name)
      .single()

    // 2. Verificar si el usuario ya existe en profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      // Actualizar metadatos y contraseña en Auth
      const updatePayload: any = {
        user_metadata: { full_name: full_name || `${nombre} ${apellidos}`, nombre, apellidos, ci }
      }
      if (password) {
        updatePayload.password = password
      }
      await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, updatePayload)

      // Actualizar perfil
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: full_name || `${nombre} ${apellidos}`,
          nombre, apellidos, ci, correo, email, departamento_id,
          role_id: roleData?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)

      if (profileError) return { error: profileError.message }

      revalidatePath('/dashboard/usuarios')
      return { success: true }
    }

    // Si no existe, crear nuevo usuario
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || `${nombre} ${apellidos}`, nombre, apellidos, ci }
    })

    if (authError) return { error: authError.message }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name || `${nombre} ${apellidos}`,
        nombre, apellidos, ci, correo, email, departamento_id,
        role_id: roleData?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id)

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { error: profileError.message }
    }

    revalidatePath('/dashboard/usuarios')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteSystemUser(userId: string) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }

    revalidatePath('/dashboard/usuarios')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function assignFacilitatorGroup(email: string, groupName: string) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) return { error: `Facilitador con email ${email} no encontrado.` }

    const gNameClean = groupName?.trim()
    const { data: group } = await supabaseAdmin
      .from('grupos')
      .select('id')
      .eq('name', gNameClean)
      .single()

    if (!group) return { error: `Grupo con nombre "${gNameClean}" no encontrado.` }

    const { error } = await supabaseAdmin
      .from('facilitador_grupos')
      .upsert({
        profile_id: profile.id,
        grupo_id: group.id
      }, { onConflict: 'profile_id,grupo_id' })

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateSystemUser(userId: string, formData: FormData) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const nombre = formData.get('nombre') as string
    const apellidos = formData.get('apellidos') as string
    const ci = formData.get('ci') as string
    const departamento_id = formData.get('departamento_id') as string
    const role_name = formData.get('role') as string

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: `${nombre} ${apellidos}`, nombre, apellidos, ci }
    })

    if (authError) return { error: authError.message }

    const { data: roleData } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role_name)
      .single()

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: `${nombre} ${apellidos}`,
        nombre, apellidos, ci, departamento_id,
        role_id: roleData?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) return { error: profileError.message }

    revalidatePath('/dashboard/usuarios')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateSystemUserPassword(userId: string, newPassword: string) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (authError) return { error: authError.message }

    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
