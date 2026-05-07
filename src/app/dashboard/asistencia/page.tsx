import { createClient } from '@/utils/supabase/server'
import AttendanceClient from './AttendanceClient'

export default async function AsistenciaPage() {
  const supabase = await createClient()

  // 1. Get user profile and role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, departamento_id')
    .eq('id', user?.id)
    .single()

  // 2. If facilitator, get assigned groups
  let assignedGroups: any[] = []
  if (profile?.role === 'facilitador') {
    const { data } = await supabase
      .from('facilitador_grupos')
      .select('grupos(*)')
      .eq('profile_id', user?.id)
    assignedGroups = data?.map(d => d.grupos) || []
  }

  // 3. Fetch initial data for filters (Admins/Deptos)
  let query = supabase.from('departamentos').select('*').order('name')
  if (profile?.departamento_id) {
    query = query.eq('id', profile.departamento_id)
  }
  const { data: departamentos } = await query

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Registro de Asistencia</h1>
        <p style={{ color: 'var(--muted)' }}>{profile?.role === 'facilitador' ? 'Gestión de grupos asignados' : 'Gestiona la asistencia diaria por número de día'}</p>
      </header>

      <AttendanceClient
        departamentos={departamentos || []}
        userDeptId={profile?.departamento_id}
        userRole={profile?.role}
        facilitadorGroups={assignedGroups}
      />
    </div>
  )
}
