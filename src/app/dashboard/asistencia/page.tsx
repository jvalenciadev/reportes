import { createClient } from '@/utils/supabase/server'
import AttendanceClient from './AttendanceClient'

export default async function AsistenciaPage() {
  const supabase = await createClient()

  // 1. Get user profile with role via join
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, roles(name), departamento_id')
    .eq('id', user?.id)
    .single()

  const userRole: string = profile?.roles?.name || ''
  const isFacilitador = userRole === 'facilitador'

  // 2. If facilitador, get their assigned groups with full detail
  let assignedGroups: any[] = []
  if (isFacilitador) {
    const { data } = await supabase
      .from('facilitador_grupos')
      .select('grupos(id, name, departamento_id, departamentos(name))')
      .eq('profile_id', user?.id)
    assignedGroups = data?.map(d => d.grupos).filter(Boolean) || []
  }

  // 3. Fetch departments for non-facilitadores
  let query = supabase.from('departamentos').select('*').order('name')
  if (profile?.departamento_id) {
    query = query.eq('id', profile.departamento_id)
  }
  const { data: departamentos } = await query

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Registro de Asistencia</h1>
        <p style={{ color: 'var(--muted)' }}>
          {isFacilitador ? 'Gestión de grupos asignados' : 'Gestiona la asistencia diaria por número de día'}
        </p>
      </header>

      <AttendanceClient
        departamentos={departamentos || []}
        userDeptId={profile?.departamento_id}
        userRole={userRole}
        facilitadorGroups={assignedGroups}
      />
    </div>
  )
}
