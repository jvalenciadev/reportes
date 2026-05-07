import { createClient } from '@/utils/supabase/server'
import AttendanceClient from './AttendanceClient'

export default async function AsistenciaPage() {
  const supabase = await createClient()

  // 1. Get user profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('departamento_id').eq('id', user?.id).single()

  // 2. Fetch initial data for filters
  let query = supabase.from('departamentos').select('*').order('name')
  
  // If user belongs to a dept, only fetch that dept
  if (profile?.departamento_id) {
    query = query.eq('id', profile.departamento_id)
  }

  const { data: departamentos } = await query
  
  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Registro de Asistencia</h1>
        <p style={{ color: 'var(--muted)' }}>Gestiona la asistencia diaria por número de día</p>
      </header>

      <AttendanceClient 
        departamentos={departamentos || []} 
        userDeptId={profile?.departamento_id}
      />
    </div>
  )
}
