import { createClient } from '@/utils/supabase/server'
import SubirCalificacionClient from './SubirCalificacionClient'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Subir Calificaciones | PROFE v2.1',
  description: 'Registro de calificaciones para participantes'
}

export default async function SubirCalificacionPage() {
  const supabase = await createClient()

  // 1. Get user profile with role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, roles(name), departamento_id')
    .eq('id', user?.id)
    .single()

  const userRole: string = profile?.roles?.name || ''
  if (userRole === 'visualizador') {
    redirect('/dashboard/calificaciones')
  }
  const isFacilitador = userRole === 'facilitador'

  // 2. Get assigned groups
  let assignedGroups: any[] = []
  if (isFacilitador) {
    const { data } = await supabase
      .from('facilitador_grupos')
      .select('grupos(id, name, departamento_id, departamentos(name))')
      .eq('profile_id', user?.id)
    assignedGroups = data?.map(d => d.grupos).filter(Boolean) || []
  }

  // 3. Fetch departments
  let query = supabase.from('departamentos').select('*').order('name')
  if (profile?.departamento_id) {
    query = query.eq('id', profile.departamento_id)
  }
  const { data: departamentos } = await query

  return (
    <div style={{ padding: '0 1rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.04em' }}>
          Subir <span style={{ color: 'var(--primary)' }}>Calificaciones</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.05rem', marginTop: '0.4rem' }}>
          {isFacilitador ? 'Registra las notas finales del módulo de tus grupos asignados' : 'Registro de calificaciones y notas del módulo por participante'}
        </p>
      </header>

      <SubirCalificacionClient
        departamentos={departamentos || []}
        userDeptId={profile?.departamento_id}
        userRole={userRole}
        facilitadorGroups={assignedGroups}
        currentUser={profile?.full_name || 'Personal Autorizado'}
      />
    </div>
  )
}
