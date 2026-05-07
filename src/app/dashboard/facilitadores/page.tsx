import { createClient } from '@/utils/supabase/server'
import FacilitadorManagementClient from '@/app/dashboard/facilitadores/FacilitadorManagementClient'

export default async function FacilitadoresPage() {
  const supabase = await createClient()

  // 1. Obtener todos los perfiles con rol de facilitador mediante join con la tabla roles
  const { data: facilitators } = await supabase
    .from('profiles')
    .select('*, roles!inner(name), departamentos(name)')
    .eq('roles.name', 'facilitador')
    .order('full_name')

  // 2. Obtener todos los grupos para asignación
  const { data: groups } = await supabase
    .from('grupos')
    .select('*, departamentos(name)')
    .order('name')

  // 3. Obtener las asignaciones actuales
  const { data: assignments } = await supabase
    .from('facilitador_grupos')
    .select('*')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.04em' }}>Asignación de Facilitadores</h1>
        <p style={{ color: 'var(--muted)' }}>Vincula facilitadores con sus respectivos grupos de trabajo</p>
      </header>

      <FacilitadorManagementClient
        facilitators={facilitators || []}
        groups={groups || []}
        initialAssignments={assignments || []}
      />
    </div>
  )
}
