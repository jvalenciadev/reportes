import { createClient } from '@/utils/supabase/server'
import MigrationClient from './MigrationClient'

export const metadata = {
  title: 'Migración de Usuarios | PROFE v2.1',
  description: 'Gestión masiva de cuentas de usuario'
}

export default async function MigrationPage() {
  const supabase = await createClient()

  const { data: roles } = await supabase
    .from('roles')
    .select('*')
    .order('name')

  const { data: departamentos } = await supabase
    .from('departamentos')
    .select('*')
    .order('name')

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.04em' }}>
          Inteligencia de <span style={{ color: 'var(--primary)' }}>Migración</span>
        </h1>
        <p style={{ color: 'var(--foreground-2)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          Herramienta administrativa para la implementación masiva de cuentas de personal.
        </p>
      </header>

      <MigrationClient 
        roles={roles || []} 
        departamentos={departamentos || []} 
      />
    </div>
  )
}
