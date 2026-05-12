import { createClient } from '@/utils/supabase/server'
import InscriptionsClient from './InscriptionsClient'

export default async function InscripcionesPage() {
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

  // 2. If facilitador, get ONLY their assigned groups from facilitador_grupos
  let assignedGroups: any[] = []
  if (isFacilitador) {
    const { data } = await supabase
      .from('facilitador_grupos')
      .select('grupos(id, name, departamento_id, departamentos(name))')
      .eq('profile_id', user?.id)
    assignedGroups = data?.map(d => d.grupos).filter(Boolean) || []
  }

  // 3. Fetch departments (hidden for facilitadores but needed for admins)
  let query = supabase.from('departamentos').select('*').order('name')
  if (profile?.departamento_id) {
    query = query.eq('id', profile.departamento_id)
  }
  const { data: departamentos } = await query

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Resumen de Inscripciones</h1>
        <p style={{ color: 'var(--muted)' }}>
          {isFacilitador ? 'Gestión de participantes de tus grupos asignados' : 'Ingresa los totales de inscritos y confirmados por grupo'}
        </p>
      </header>

      <InscriptionsClient
        departamentos={departamentos || []}
        userDeptId={profile?.departamento_id}
        userRole={userRole}
        facilitadorGroups={assignedGroups}
      />
    </div>
  )
}
