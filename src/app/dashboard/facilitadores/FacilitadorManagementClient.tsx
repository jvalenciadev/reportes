'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { UserCircle2, CheckCircle2, Search, Building2, ArrowRightLeft, Users, X } from 'lucide-react'

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

  const facilitators = [...initialFacilitators].sort((a, b) => {
    const deptA = a.departamentos?.name || 'Z'
    const deptB = b.departamentos?.name || 'Z'
    if (deptA !== deptB) return deptA.localeCompare(deptB)
    return (a.full_name || '').localeCompare(b.full_name || '')
  })

  const [selectedFacilitator, setSelectedFacilitator] = useState<any>(null)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [loading, setLoading] = useState<string | null>(null) // stores groupId being toggled
  const [searchTerm, setSearchTerm] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Group facilitators by department
  const byDept = facilitators.reduce((acc, f) => {
    const dept = f.departamentos?.name || 'Global'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(f)
    return acc
  }, {} as Record<string, any[]>)

  const filteredGroups = groups
    .filter(g => {
      if (selectedFacilitator?.departamento_id && g.departamento_id !== selectedFacilitator.departamento_id) return false
      const q = searchTerm.toLowerCase()
      return g.name.toLowerCase().includes(q) || g.departamentos?.name?.toLowerCase().includes(q)
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

  const toggleAssignment = async (groupId: string) => {
    if (!selectedFacilitator) return
    const isAssigned = assignments.some(a => a.profile_id === selectedFacilitator.id && a.grupo_id === groupId)
    setLoading(groupId)
    setErrorMsg(null)

    if (isAssigned) {
      const { error } = await supabase.from('facilitador_grupos')
        .delete().eq('profile_id', selectedFacilitator.id).eq('grupo_id', groupId)
      if (error) setErrorMsg(error.message)
      else setAssignments(prev => prev.filter(a => !(a.profile_id === selectedFacilitator.id && a.grupo_id === groupId)))
    } else {
      const { data, error } = await supabase.from('facilitador_grupos')
        .insert([{ profile_id: selectedFacilitator.id, grupo_id: groupId }]).select()
      if (error) setErrorMsg(error.message)
      else setAssignments(prev => [...prev, data[0]])
    }
    setLoading(null)
  }

  const getCount = (id: string) => assignments.filter(a => a.profile_id === id).length

  const getInitials = (name: string) => name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || '?'

  const assignedCount = selectedFacilitator ? getCount(selectedFacilitator.id) : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2rem', alignItems: 'start' }}>

      {/* ── LEFT: Facilitators ── */}
      <div className="card glass" style={{ borderTop: '4px solid var(--primary)', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1rem' }}>Facilitadores</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{facilitators.length} registrados</div>
            </div>
          </div>
        </div>

        {/* List grouped by dept */}
        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0.75rem' }}>
          {Object.entries(byDept).map(([dept, facs]) => (
            <div key={dept} style={{ marginBottom: '1rem' }}>
              {/* Department label */}
              <div style={{
                fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--primary)', padding: '0.25rem 0.5rem',
                marginBottom: '0.4rem'
              }}>
                <Building2 size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {dept}
              </div>

              {(facs as any[]).map((f: any) => {
                const count = getCount(f.id)
                const isSelected = selectedFacilitator?.id === f.id
                return (
                  <div
                    key={f.id}
                    onClick={() => { setSelectedFacilitator(f); setSearchTerm(''); setErrorMsg(null) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '0.75rem',
                      marginBottom: '0.3rem',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                      background: isSelected ? 'var(--primary)' : 'var(--surface)',
                      color: isSelected ? 'white' : 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 900, border: '1px solid var(--border)',
                      transition: 'all 0.18s'
                    }}>
                      {getInitials(f.full_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700, fontSize: '0.8rem', color: isSelected ? 'var(--primary)' : 'var(--foreground)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {f.full_name}
                      </div>
                    </div>
                    {/* Count badge */}
                    <div style={{
                      minWidth: 24, height: 24, borderRadius: '8px', flexShrink: 0,
                      background: count > 0 ? 'var(--primary)' : 'var(--border)',
                      color: count > 0 ? 'white' : 'var(--muted)',
                      fontSize: '0.65rem', fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 6px'
                    }}>
                      {count}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Group Assignment ── */}
      <div className="card glass" style={{ borderTop: '4px solid #10b981', padding: 0, overflow: 'hidden', position: 'sticky', top: '2rem' }}>
        {selectedFacilitator ? (
          <>
            {/* Header */}
            <div style={{
              padding: '1.5rem', borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, transparent 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '16px',
                    background: 'linear-gradient(135deg, var(--primary), #10b981)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 900, boxShadow: '0 8px 20px -4px var(--primary-glow)'
                  }}>
                    {getInitials(selectedFacilitator.full_name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                      {selectedFacilitator.full_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Building2 size={11} />
                      {selectedFacilitator.departamentos?.name || 'Global'}
                      <span style={{
                        marginLeft: '0.5rem', padding: '0.1rem 0.5rem',
                        background: assignedCount > 0 ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
                        color: assignedCount > 0 ? '#10b981' : 'var(--muted)',
                        borderRadius: '99px', fontWeight: 800, fontSize: '0.65rem'
                      }}>
                        {assignedCount} grupo{assignedCount !== 1 ? 's' : ''} asignado{assignedCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFacilitator(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div style={{
                margin: '1rem 1.5rem 0', padding: '0.75rem 1rem',
                borderRadius: '0.75rem', background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444',
                fontSize: '0.8rem', fontWeight: 600
              }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Search */}
            <div style={{ padding: '1rem 1.5rem 0', position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '2.5rem', top: '50%', transform: 'translateY(-30%)', color: 'var(--muted)', opacity: 0.5 }} />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar grupo..."
                style={{ paddingLeft: '2.25rem', width: '100%', borderRadius: '0.75rem' }}
              />
            </div>

            {/* Groups grid */}
            <div style={{ padding: '1rem 1.5rem 1.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                {filteredGroups.map(g => {
                  const isAssigned = assignments.some(a => a.profile_id === selectedFacilitator.id && a.grupo_id === g.id)
                  const isLoading = loading === g.id
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleAssignment(g.id)}
                      disabled={!!loading}
                      style={{
                        padding: '1rem',
                        borderRadius: '1rem',
                        border: `2px solid ${isAssigned ? '#10b981' : 'var(--border)'}`,
                        background: isAssigned ? 'rgba(16,185,129,0.08)' : 'var(--surface)',
                        cursor: loading ? 'wait' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s cubic-bezier(0.175,0.885,0.32,1.275)',
                        transform: isLoading ? 'scale(0.95)' : 'scale(1)',
                        opacity: loading && !isLoading ? 0.6 : 1,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Check badge */}
                      {isAssigned && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          color: '#10b981',
                          display: 'flex', alignItems: 'center'
                        }}>
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                      <div style={{
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        color: isAssigned ? '#10b981' : 'var(--foreground)',
                        marginBottom: '0.25rem',
                        paddingRight: isAssigned ? '1.2rem' : 0
                      }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Building2 size={9} /> {g.departamentos?.name}
                      </div>
                    </button>
                  )
                })}

                {filteredGroups.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                    Sin grupos para este departamento
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ height: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', gap: '1rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
              <ArrowRightLeft size={36} style={{ opacity: 0.2 }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>Selecciona un facilitador</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Para gestionar sus grupos asignados</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
