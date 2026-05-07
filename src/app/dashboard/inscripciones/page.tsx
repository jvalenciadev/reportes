import { createClient } from '@/utils/supabase/server'
import InscriptionsClient from './InscriptionsClient'

export default async function InscripcionesPage() {
  const supabase = await createClient()

  // 1. Get user profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('departamento_id').eq('id', user?.id).single()

  // 2. Fetch initial data
  let query = supabase.from('departamentos').select('*').order('name')
  if (profile?.departamento_id) {
    query = query.eq('id', profile.departamento_id)
  }
  const { data: departamentos } = await query

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Resumen de Inscripciones</h1>
        <p style={{ color: 'var(--muted)' }}>Ingresa los totales de inscritos y confirmados por grupo</p>
      </header>

      <InscriptionsClient 
        departamentos={departamentos || []} 
        userDeptId={profile?.departamento_id}
      />
    </div>
  )
}
