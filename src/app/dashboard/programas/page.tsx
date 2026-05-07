import { createClient } from '@/utils/supabase/server'
import ProgramsClient from '@/app/dashboard/programas/ProgramsClient'

export default async function ProgramsPage() {
  const supabase = await createClient()

  const { data: programs } = await supabase
    .from('programas')
    .select('*, programa_modulos(*)')
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.04em' }}>Gestión de Programas</h1>
        <p style={{ color: 'var(--muted)' }}>Configuración de oferta académica y módulos de estudio</p>
      </header>

      <ProgramsClient initialPrograms={programs || []} />
    </div>
  )
}
