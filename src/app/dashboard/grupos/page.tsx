import { createClient } from '@/utils/supabase/server'
import { createGrupo, deleteGrupo } from './actions'
import { Plus, Trash2 } from 'lucide-react'

export default async function GruposPage() {
  const supabase = await createClient()

  // 1. Get user profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('departamento_id').eq('id', user?.id).single()

  // 2. Fetch data with filters
  let groupsQuery = supabase.from('grupos').select('*, departamentos(name)')
  let deptoQuery = supabase.from('departamentos').select('*')

  if (profile?.departamento_id) {
    groupsQuery = groupsQuery.eq('departamento_id', profile.departamento_id)
    deptoQuery = deptoQuery.eq('id', profile.departamento_id)
  }

  const { data: grupos } = await groupsQuery.order('name')
  const { data: departamentos } = await deptoQuery.order('name')

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Grupos</h1>
        <p style={{ color: 'var(--muted)' }}>Gestiona los grupos del departamento</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Nuevo Grupo</h3>
          <form action={createGrupo}>
            <div className="form-group">
              <label>Nombre del Grupo</label>
              <input name="name" type="text" placeholder="Ej: Grupo A" required />
            </div>
            <div className="form-group">
              <label>Código del Grupo</label>
              <input name="code" type="text" placeholder="Ej: GA-2024" required />
            </div>
            <div className="form-group">
              <label>Departamento</label>
              <select name="departamento_id" required defaultValue={profile?.departamento_id || ''}>
                <option value="">Seleccionar...</option>
                {departamentos?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={18} /> Crear Grupo
            </button>
          </form>
        </div>

        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Listado</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Departamento</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {grupos?.map((g) => (
                  <tr key={g.id}>
                    <td><code style={{ background: 'var(--background)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{g.code}</code></td>
                    <td>{g.name}</td>
                    <td>{(g.departamentos as any)?.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={async () => {
                        'use server'
                        await deleteGrupo(g.id)
                      }}>
                        <button className="btn" style={{ color: '#ef4444' }}>
                          <Trash2 size={18} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
