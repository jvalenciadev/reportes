'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Save, Search, CalendarDays, ChevronLeft, ChevronRight,
  Edit3, History, Users as UsersIcon, Clock, AlertCircle, FileText
} from 'lucide-react'

export default function AttendanceClient({
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
  const [history, setHistory] = useState<any[]>([])
  const [dayNumber, setDayNumber] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [data, setData] = useState({
    asistieron: 0,
    retraso: 0,
    falta: 0,
    permiso: 0
  })

  // Cálculo en tiempo real de la sumatoria total
  const totalDiario = useMemo(() => {
    return data.asistieron + data.retraso + data.falta + data.permiso
  }, [data])

  useEffect(() => {
    if (!selectedDepto) {
      setGroups([])
      return
    }
    const fetchGroups = async () => {
      const { data } = await supabase.from('grupos').select('*').eq('departamento_id', selectedDepto).order('name')
      setGroups(data || [])
    }
    fetchGroups()
  }, [selectedDepto])

  // Cargar historial del grupo seleccionado
  const loadHistory = async (groupId: string) => {
    const { data } = await supabase
      .from('asistencia_diaria')
      .select('*')
      .eq('grupo_id', groupId)
      .order('dia', { ascending: false })
      .limit(10)
    setHistory(data || [])
  }

  useEffect(() => {
    if (selectedGroup) loadHistory(selectedGroup)
  }, [selectedGroup])

  const loadData = async () => {
    if (!selectedGroup) return
    setLoading(true)
    const { data: res } = await supabase
      .from('asistencia_diaria')
      .select('*')
      .eq('grupo_id', selectedGroup)
      .eq('dia', dayNumber)
      .single()

    if (res) {
      setData({
        asistieron: res.asistieron,
        retraso: res.retraso,
        falta: res.falta,
        permiso: res.permiso
      })
    } else {
      setData({ asistieron: 0, retraso: 0, falta: 0, permiso: 0 })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (selectedGroup) loadData()
  }, [selectedGroup, dayNumber])

  const handleSave = async () => {
    if (!selectedGroup) return
    setSaving(true)
    const { error } = await supabase
      .from('asistencia_diaria')
      .upsert({
        grupo_id: selectedGroup,
        dia: dayNumber,
        ...data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'grupo_id,dia' })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      loadHistory(selectedGroup)
    }
    setSaving(false)
  }

  const editRow = (row: any) => {
    setDayNumber(row.dia)
    setData({
      asistieron: row.asistieron,
      retraso: row.retraso,
      falta: row.falta,
      permiso: row.permiso
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Controles Principales */}
      <div className="card glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
        <div className="form-group">
          <label style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarDays size={16} /> Jornada Laboral
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setDayNumber(prev => Math.max(1, prev - 1))}>
              <ChevronLeft size={20} />
            </button>
            <input
              type="number"
              min="1"
              value={dayNumber}
              onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
              style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '800', width: '80px' }}
            />
            <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setDayNumber(prev => prev + 1)}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>Departamento</label>
          <select value={selectedDepto} onChange={(e) => setSelectedDepto(e.target.value)} disabled={!!userDeptId}>
            <option value="">Seleccionar...</option>
            {departamentos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Grupo de Trabajo</label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} disabled={!selectedDepto}>
            <option value="">Seleccionar Grupo</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

        {/* Formulario de Registro */}
        {selectedGroup ? (
          <div className="card glass" style={{ borderTop: '4px solid var(--primary)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>Día {dayNumber}</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Edición de asistencia diaria</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase' }}>Sumatoria Total</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>{totalDiario}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <InputBox label="Asistieron" icon={UsersIcon} value={data.asistieron} color="#10b981" onChange={(v) => setData({ ...data, asistieron: v })} />
              <InputBox label="Retrasos" icon={Clock} value={data.retraso} color="#f59e0b" onChange={(v) => setData({ ...data, retraso: v })} />
              <InputBox label="Faltas" icon={AlertCircle} value={data.falta} color="#ef4444" onChange={(v) => setData({ ...data, falta: v })} />
              <InputBox label="Permisos" icon={FileText} value={data.permiso} color="#8b5cf6" onChange={(v) => setData({ ...data, permiso: v })} />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '2.5rem', padding: '1.25rem', fontSize: '1.1rem' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando...' : <><Save size={20} /> Guardar Cambios del Día {dayNumber}</>}
            </button>
          </div>
        ) : (
          <div className="card glass" style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <Search size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>Selecciona un departamento y grupo para comenzar</p>
          </div>
        )}

        {/* Listado de Historial */}
        <div className="card glass" style={{ borderTop: '4px solid #8b5cf6' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="#8b5cf6" /> Últimos Registros
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Total</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? history.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: '700' }}>Día {row.dia}</td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--foreground)' }}>
                        {row.asistieron + row.retraso + row.falta + row.permiso}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => editRow(row)}>
                        <Edit3 size={14} /> Editar
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>No hay registros previos</td>
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

function InputBox({
  label,
  value,
  onChange,
  color,
  icon: Icon
}: {
  label: string,
  value: number,
  onChange: (v: number) => void,
  color: string,
  icon: any
}) {
  return (
    <div className="form-group" style={{
      background: 'rgba(255,255,255,0.02)',
      padding: '1.25rem',
      borderRadius: '1rem',
      border: '1px solid var(--border)',
      transition: 'all 0.2s ease'
    }}>
      <label style={{ color: color, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
        <Icon size={14} /> {label}
      </label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        style={{
          fontSize: '1.5rem',
          fontWeight: '800',
          background: 'transparent',
          border: 'none',
          padding: 0,
          textAlign: 'center',
          color: 'var(--foreground)'
        }}
      />
    </div>
  )
}
