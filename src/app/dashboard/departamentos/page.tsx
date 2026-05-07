import { createClient } from '@/utils/supabase/server'
import { createDepartamento, deleteDepartamento } from './actions'
import { Plus, Trash2 } from 'lucide-react'

export default async function DepartamentosPage() {
  const supabase = await createClient()
  const { data: departamentos } = await supabase.from('departamentos').select('*').order('name')

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Departamentos</h1>
          <p style={{ color: 'var(--muted)' }}>Gestiona los departamentos de la institución</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Nuevo Departamento</h3>
          <form action={createDepartamento}>
            <div className="form-group">
              <label>Nombre del Departamento</label>
              <input name="name" type="text" placeholder="Ej: Recursos Humanos" required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={18} /> Crear Departamento
            </button>
          </form>
        </div>

        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Listado</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {departamentos?.map((dept) => (
                  <tr key={dept.id}>
                    <td>{dept.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={async () => {
                        'use server'
                        await deleteDepartamento(dept.id)
                      }}>
                        <button className="btn" style={{ color: '#ef4444' }}>
                          <Trash2 size={18} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {departamentos?.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                      No hay departamentos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
