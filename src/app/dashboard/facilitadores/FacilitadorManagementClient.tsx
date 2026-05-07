'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  UserCircle2, Users, Save, CheckCircle2,
  Search, Building2, Zap, ArrowRightLeft
} from 'lucide-react'

export default function FacilitadorManagementClient({
  facilitators: initialFacilitators,
  groups,
  initialAssignments
}: {
  facilitators: any[],
  groups: any[],
  initialAssignments: any[]
}) {
  const supabase = createClient()

  // Sort facilitators by Department -> Name -> Surname
  const facilitators = [...initialFacilitators].sort((a, b) => {
    const deptA = a.departamentos?.name || 'Z' // Global at the end
    const deptB = b.departamentos?.name || 'Z'
    if (deptA !== deptB) return deptA.localeCompare(deptB)
    const nameA = a.nombre || ''
    const nameB = b.nombre || ''
    if (nameA !== nameB) return nameA.localeCompare(nameB)
    return (a.apellidos || '').localeCompare(b.apellidos || '')
  })
  const [selectedFacilitator, setSelectedFacilitator] = useState<any>(null)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Filtered groups based on facilitator's department AND search
  const filteredGroups = groups.filter(g => {
    // 1. If a facilitator is selected, only show groups of their department
    if (selectedFacilitator?.departamento_id && g.departamento_id !== selectedFacilitator.departamento_id) {
      return false
    }

    // 2. Apply search term filter
    const matchesSearch =
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.departamentos?.name.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const toggleAssignment = async (groupId: string) => {
    if (!selectedFacilitator) return

    const isAssigned = assignments.some(a =>
      a.profile_id === selectedFacilitator.id && a.grupo_id === groupId
    )

    setLoading(true)
    if (isAssigned) {
      // Remove
      const { error } = await supabase
        .from('facilitador_grupos')
        .delete()
        .eq('profile_id', selectedFacilitator.id)
        .eq('grupo_id', groupId)

      if (!error) {
        setAssignments(assignments.filter(a =>
          !(a.profile_id === selectedFacilitator.id && a.grupo_id === groupId)
        ))
      }
    } else {
      // Add
      const { data, error } = await supabase
        .from('facilitador_grupos')
        .insert([{ profile_id: selectedFacilitator.id, grupo_id: groupId }])
        .select()

      if (!error) {
        setAssignments([...assignments, data[0]])
      }
    }
    setLoading(false)
  }

  const getFacilitatorGroupsCount = (facilitatorId: string) => {
    return assignments.filter(a => a.profile_id === facilitatorId).length
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

      {/* Left Panel: Facilitators List */}
      <div className="card glass" style={{ borderTop: '4px solid var(--primary)' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCircle2 size={20} color="var(--primary)" /> Facilitadores Disponibles
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {facilitators.map(f => (
            <div
              key={f.id}
              onClick={() => setSelectedFacilitator(f)}
              style={{
                padding: '1rem',
                borderRadius: '1rem',
                background: selectedFacilitator?.id === f.id ? 'var(--primary-light)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selectedFacilitator?.id === f.id ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 800, color: selectedFacilitator?.id === f.id ? 'var(--primary)' : 'inherit' }}>{f.full_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{f.departamentos?.name || 'Acceso Global'}</div>
              </div>
              <div className="badge" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
                {getFacilitatorGroupsCount(f.id)} Grupos
              </div>
            </div>
          ))}
          {facilitators.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              No se encontraron usuarios con el rol de 'facilitador'.
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Group Assignment */}
      <div className="card glass" style={{ borderTop: '4px solid var(--success)' }}>
        {selectedFacilitator ? (
          <div className="animate-slide-in">
            <h3 style={{ marginBottom: '0.5rem' }}>Asignar Grupos a: {selectedFacilitator.full_name}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '2rem' }}>
              Marca los grupos que este facilitador tendrá bajo su responsabilidad.
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre de grupo o departamento..."
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: '0 0.4rem' }}>
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th>Grupo / Depto</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map(g => {
                    const isAssigned = assignments.some(a =>
                      a.profile_id === selectedFacilitator.id && a.grupo_id === g.id
                    )
                    return (
                      <tr key={g.id} style={{ background: isAssigned ? 'rgba(16, 217, 139, 0.05)' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{g.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Building2 size={10} /> {g.departamentos?.name}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className={`btn ${isAssigned ? 'btn-success' : 'btn-outline'}`}
                            onClick={() => toggleAssignment(g.id)}
                            disabled={loading}
                            style={{
                              padding: '0.4rem',
                              borderRadius: '0.5rem',
                              width: '32px', height: '32px',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            {isAssigned ? <CheckCircle2 size={16} /> : <Zap size={14} />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <ArrowRightLeft size={48} style={{ marginBottom: '1rem', opacity: 0.1 }} />
            <p>Selecciona un facilitador para gestionar sus grupos</p>
          </div>
        )}
      </div>

    </div>
  )
}
