'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Save, Search, Edit3, Users, CheckCircle, TrendingUp, LayoutGrid, AlertCircle } from 'lucide-react'

export default function InscriptionsClient({
  departamentos,
  userDeptId
}: {
  departamentos: any[],
  userDeptId?: string
}) {
  const supabase = createClient()
  const [selectedDepto, setSelectedDepto] = useState(userDeptId || '')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState({
    total_inscritos: 0,
    total_confirmados: 0
  })

  // SOLUCIÓN DEFINITIVA: Carga de datos simplificada para evitar bloqueos de RLS/Joins
  const fetchGroupsAndTotals = async () => {
    if (!selectedDepto) {
      setGroups([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('--- AUDITORIA DE CARGA ---')
      console.log('Buscando grupos para departamento ID:', selectedDepto)

      // 1. Traer solo los grupos (Consulta Directa)
      const { data: gruposData, error: gruposError } = await supabase
        .from('grupos')
        .select('id, name, code')
        .eq('departamento_id', selectedDepto)

      if (gruposError) throw gruposError

      console.log('Grupos encontrados:', gruposData?.length || 0)

      // 2. Traer los resúmenes de inscripción por separado
      const { data: resumenData, error: resumenError } = await supabase
        .from('inscripciones_resumen')
        .select('*')

      // Natural sort: BNI-G1, BNI-G2, ..., BNI-G10
      const mergedGroups = (gruposData || [])
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
        .map(g => {
          const resumen = (resumenData || []).find(r => r.grupo_id === g.id)
          return {
            ...g,
            resumen: resumen || { total_inscritos: 0, total_confirmados: 0 }
          }
        })

      setGroups(mergedGroups)

    } catch (err: any) {
      console.error('Error en auditoria:', err)
      setError(err.message || 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroupsAndTotals()
  }, [selectedDepto])

  const loadData = async (groupId: string) => {
    setSelectedGroup(groupId)
    const currentGroup = groups.find(g => g.id === groupId)
    if (currentGroup) {
      setData({
        total_inscritos: currentGroup.resumen.total_inscritos,
        total_confirmados: currentGroup.resumen.total_confirmados
      })
    }
  }

  const handleSave = async () => {
    if (!selectedGroup) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('inscripciones_resumen')
        .upsert({
          grupo_id: selectedGroup,
          ...data,
          updated_at: new Date().toISOString()
        }, { onConflict: 'grupo_id' })

      if (error) throw error

      await fetchGroupsAndTotals() // Recargar todo
      setSelectedGroup('')

    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} suppressHydrationWarning>

      {/* Selector de Departamento */}
      <div className="card glass" style={{ maxWidth: '400px' }} suppressHydrationWarning>
        <div className="form-group" style={{ marginBottom: 0 }} suppressHydrationWarning>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} color="var(--primary)" /> Seleccionar Departamento
          </label>
          <select
            value={selectedDepto}
            onChange={(e) => setSelectedDepto(e.target.value)}
            disabled={!!userDeptId}
          >
            <option value="">Seleccionar...</option>
            {departamentos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle size={20} />
          <span><b>Error de Base de Datos:</b> {error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedGroup ? '1fr 1fr' : '1fr', gap: '2rem', transition: 'all 0.3s ease' }} suppressHydrationWarning>

        {/* Listado Principal de Grupos */}
        <div className="card glass" style={{ borderTop: '4px solid var(--primary)' }} suppressHydrationWarning>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LayoutGrid size={20} color="var(--primary)" /> Grupos en {departamentos.find(d => d.id === selectedDepto)?.name || '...'}
            </h3>
            {loading && <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Cargando datos...</span>}
          </div>

          <div className="table-container" suppressHydrationWarning>
            <table>
              <thead>
                <tr>
                  <th>Nombre del Grupo</th>
                  <th>Inscritos</th>
                  <th>Confirmados</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {groups.length > 0 ? groups.map((g) => (
                  <tr key={g.id} style={{ background: selectedGroup === g.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: '700' }}>{g.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{g.code || 'SIN CÓDIGO'}</div>
                    </td>
                    <td style={{ fontSize: '1.1rem', fontWeight: '600' }}>{g.resumen.total_inscritos}</td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        {g.resumen.total_confirmados}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline" onClick={() => loadData(g.id)}>
                        <Edit3 size={16} /> <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                      {loading ? 'Consultando base de datos...' : (selectedDepto ? 'No se encontraron grupos. Verifica si están asignados a este departamento.' : 'Selecciona un departamento arriba.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de Edición Lateral */}
        {selectedGroup && (
          <div className="card glass" style={{
            borderTop: '4px solid #10b981',
            position: 'sticky',
            top: '2rem',
            height: 'fit-content',
            animation: 'fadeIn 0.3s ease-out'
          }} suppressHydrationWarning>
            <h3 style={{ marginBottom: '2rem' }}>Actualizar Grupo: {groups.find(g => g.id === selectedGroup)?.name}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Users size={16} /> Total Inscritos
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.total_inscritos}
                  onChange={(e) => setData({ ...data, total_inscritos: parseInt(e.target.value) || 0 })}
                  style={{ fontSize: '2rem', fontWeight: '800', background: 'transparent', border: 'none', textAlign: 'center' }}
                />
              </div>

              <div className="form-group" style={{ background: 'rgba(16, 185, 129, 0.02)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#10b981' }}>
                  <CheckCircle size={16} /> Total Confirmados
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.total_confirmados}
                  onChange={(e) => setData({ ...data, total_confirmados: parseInt(e.target.value) || 0 })}
                  style={{ fontSize: '2rem', fontWeight: '800', background: 'transparent', border: 'none', textAlign: 'center', color: '#10b981' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedGroup('')}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
                <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
