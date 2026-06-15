import { createClient } from '@/utils/supabase/server'
import TutorsAttendanceClient from './TutorsAttendanceClient'

export const metadata = {
  title: 'Asistencia Tutores | PROFE v2.2',
  description: 'Registro de asistencia de tutores asignados a grupos académicos'
}

export default async function TutoresPage() {
  const supabase = await createClient()

  // 1. Obtener perfil del usuario actual con su rol
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, roles(name), departamento_id')
    .eq('id', user?.id)
    .single()

  const userRole: string = profile?.roles?.name || ''
  const isFacilitador = userRole === 'facilitador'

  // 2. Si es facilitador, obtener sus grupos asignados
  let assignedGroups: any[] = []
  if (isFacilitador) {
    const { data } = await supabase
      .from('facilitador_grupos')
      .select('grupos(id, name, departamento_id, departamentos(name))')
      .eq('profile_id', user?.id)
    assignedGroups = data?.map(d => d.grupos).filter(Boolean) || []
  }

  // 3. Obtener departamentos permitidos para el filtro (solo administradores / reportes / usuarios de departamento)
  let query = supabase.from('departamentos').select('*').order('name')
  if (profile?.departamento_id) {
    query = query.eq('id', profile.departamento_id)
  }
  const { data: departamentos } = await query

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.04em' }}>
          Asistencia de <span style={{ color: 'var(--primary)' }}>Tutores</span>
        </h1>
        <p style={{ color: 'var(--foreground-2)', fontSize: '1.05rem', marginTop: '0.4rem' }}>
          {isFacilitador 
            ? 'Control de asistencia diario para los tutores a cargo de sus grupos asignados.' 
            : 'Administración y seguimiento de la asistencia diaria de tutores por departamento y grupo.'}
        </p>
      </header>

      <TutorsAttendanceClient
        departamentos={departamentos || []}
        userDeptId={profile?.departamento_id}
        userRole={userRole}
        facilitadorGroups={assignedGroups}
        currentUser={profile?.full_name || 'Personal Autorizado'}
      />
    </div>
  )
}
