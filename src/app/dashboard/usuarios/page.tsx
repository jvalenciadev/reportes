import { createClient } from '@/utils/supabase/server'
import UserManagementClient from './UserManagementClient'
import { redirect } from 'next/navigation'

export default async function UsuariosPage() {
  const supabase = await createClient()

  // 1. Verificar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Obtener perfil y rol
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, roles(name)')
    .eq('id', user.id)
    .single()

  // 3. Control de acceso (Permisivo para el primer admin)
  if (profile?.roles && (profile.roles as any)?.name !== 'administrador') {
    redirect('/dashboard')
  }

  // 4. Carga de datos paralela con manejo de errores
  const [resUsers, resRoles, resDeptos] = await Promise.all([
    supabase.from('profiles').select('*, roles(name), departamentos(name)').order('updated_at', { ascending: false }),
    supabase.from('roles').select('*').order('name'),
    supabase.from('departamentos').select('*').order('name')
  ])

  return (
    <div>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: '800' }}>Gestión de Usuarios</h1>
        <p style={{ color: 'var(--muted)' }}>Administra el personal y sus niveles de acceso al sistema</p>
      </header>

      <UserManagementClient 
        users={resUsers.data || []} 
        roles={resRoles.data || []} 
        departamentos={resDeptos.data || []} 
      />
    </div>
  )
}
