'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Save, Search, CalendarDays, ChevronLeft, ChevronRight,
  History, Users as UsersIcon, Clock, AlertCircle, FileText,
  CheckCircle, XCircle, Info, Zap,
  UserCheck,
  UserMinus
} from 'lucide-react'
import StatusModal, { StatusType } from '../components/StatusModal'

export default function AttendanceClient({
  departamentos,
  userDeptId,
  userRole,
  facilitadorGroups = []
}: {
  departamentos: any[],
  userDeptId?: string,
  userRole?: string,
  facilitadorGroups?: any[]
}) {
  const supabase = createClient()

  // Notification State
  const [notif, setNotif] = useState({ show: false, type: 'info' as StatusType, title: '', message: '' })
  const showNotif = (type: StatusType, title: string, message: string) => {
    setNotif({ show: true, type, title, message })
  }

  // Selectors State
  const [selectedDepto, setSelectedDepto] = useState(userDeptId || '')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedModule, setSelectedModule] = useState('')

  // Data State
  const [groups, setGroups] = useState<any[]>(userRole === 'facilitador' ? facilitadorGroups : [])
  const [programs, setPrograms] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])

  // UI State
  const [dayNumber, setDayNumber] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({}) // participantId -> status

  // 1. Initial Load: Programs
  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase.from('programas').select('*').eq('estado', 'activo')
      setPrograms(data || [])
      if (data && data.length > 0) setSelectedProgram(data[0].id)
    }
    fetchPrograms()
  }, [])

  // 2. Load Modules when Program changes
  useEffect(() => {
    if (!selectedProgram) return
    const fetchModules = async () => {
      const { data } = await supabase.from('programa_modulos').select('*').eq('programa_id', selectedProgram)
      setModules(data || [])
      if (data && data.length > 0) setSelectedModule(data[0].id)
    }
    fetchModules()
  }, [selectedProgram])

  // 3. Load Groups when Depto changes (Only for non-facilitators)
  useEffect(() => {
    if (!selectedDepto || userRole === 'facilitador') return
    const fetchGroups = async () => {
      const { data } = await supabase.from('grupos').select('*').eq('departamento_id', selectedDepto)
      setGroups(data || [])
    }
    fetchGroups()
  }, [selectedDepto, userRole])

  // 4. Load Participants and their existing Attendance for the day
  const loadAttendanceSession = async () => {
    if (!selectedGroup || !selectedModule) return
    setLoading(true)

    // A. Fetch Participants enrolled in this group/program
    const { data: enrolled } = await supabase
      .from('inscripciones')
      .select('*, participantes(*)')
      .eq('grupo_id', selectedGroup)
      .eq('programa_id', selectedProgram)
      .eq('estado', 'confirmado')

    // B. Fetch Existing Attendance for this specific module/day
    const { data: existing } = await supabase
      .from('asistencias')
      .select('*')
      .eq('modulo_id', selectedModule)
      .eq('dia', dayNumber)

    // Map existing attendance to state
    const attMap: Record<string, string> = {}
    existing?.forEach(a => {
      attMap[a.participante_id] = a.estado
    })

    setParticipants(enrolled || [])
    setAttendanceData(attMap)
    setLoading(false)
  }

  useEffect(() => {
    loadAttendanceSession()
  }, [selectedGroup, selectedModule, dayNumber])

  const handleStatusChange = (participantId: string, status: string) => {
    setAttendanceData(prev => ({ ...prev, [participantId]: status }))
  }

  const saveAttendance = async () => {
    if (!selectedModule || participants.length === 0) return
    setSaving(true)

    const records = Object.entries(attendanceData).map(([participantId, estado]) => ({
      participante_id: participantId,
      modulo_id: selectedModule,
      dia: dayNumber,
      estado,
      fecha: new Date().toISOString().split('T')[0]
    }))

    const { error } = await supabase
      .from('asistencias')
      .upsert(records, { onConflict: 'participante_id,modulo_id,fecha' })

    if (error) {
      showNotif('error', 'Fallo en el Registro', `No se pudo guardar la asistencia: ${error.message}`)
    } else {
      showNotif('success', '¡Asistencia Guardada!', 'Se han registrado correctamente los datos.')
      loadAttendanceSession()
    }
    setSaving(false)
  }

  // Stats for current session
  const stats = {
    asistieron: Object.values(attendanceData).filter(s => s === 'asistio').length,
    atrasos: Object.values(attendanceData).filter(s => s === 'atraso').length,
    faltas: Object.values(attendanceData).filter(s => s === 'falta').length,
    permisos: Object.values(attendanceData).filter(s => s === 'permiso').length,
  }

  return (
    <>
      <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Configuration Bar */}
        <div className="card glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
          <div className="form-group">
            <label><CalendarDays size={14} color="var(--primary)" /> Jornada / Día</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setDayNumber(d => Math.max(1, d - 1))}><ChevronLeft size={18} /></button>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, width: '40px', textAlign: 'center' }}>{dayNumber}</div>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setDayNumber(d => d + 1)}><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="form-group">
            <label>Programa</label>
            <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}>
              {programs.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Módulo</label>
            <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)}>
              {modules.map(m => <option key={m.id} value={m.id}>{m.titulo_modulo}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ display: userRole === 'facilitador' ? 'none' : 'block' }}>
            <label>Departamento</label>
            <select value={selectedDepto} onChange={e => setSelectedDepto(e.target.value)} disabled={!!userDeptId}>
              <option value="">Seleccionar...</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{userRole === 'facilitador' ? <span style={{ color: 'var(--primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Zap size={14} /> MODO FACILITADOR</span> : 'Grupo'}</label>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} disabled={!selectedDepto && userRole !== 'facilitador'}>
              <option value="">Seleccionar Grupo</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>

        {selectedGroup ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>

            {/* Listado de Pase de Lista */}
            <div className="card glass" style={{ borderTop: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UsersIcon size={20} color="var(--primary)" /> Pase de Lista: {groups.find(g => g.id === selectedGroup)?.name}
                </h3>
                {loading && <div className="animate-pulse" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Cargando lista...</div>}
              </div>

              <div className="table-container">
                <table style={{ borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                  <thead>
                    <tr style={{ background: 'transparent' }}>
                      <th>Participante</th>
                      <th style={{ textAlign: 'center' }}>Asistió</th>
                      <th style={{ textAlign: 'center' }}>Atraso</th>
                      <th style={{ textAlign: 'center' }}>Falta</th>
                      <th style={{ textAlign: 'center' }}>Permiso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.participante_id} className="row-hover" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 800 }}>{p.participantes.nombre} {p.participantes.apellido}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>CI: {p.participantes.ci}</div>
                        </td>
                        {['asistio', 'atraso', 'falta', 'permiso'].map((status) => (
                          <td key={status} style={{ textAlign: 'center' }}>
                            <button
                              className={`btn ${attendanceData[p.participante_id] === status ? 'btn-status-' + status : 'btn-ghost'}`}
                              onClick={() => handleStatusChange(p.participante_id, status)}
                              style={{
                                width: '40px', height: '40px', borderRadius: '50%', padding: 0,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              {status === 'asistio' && <UserCheck size={18} />}
                              {status === 'atraso' && <Clock size={18} />}
                              {status === 'falta' && <UserMinus size={18} />}
                              {status === 'permiso' && <FileText size={18} />}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '2rem', padding: '1.25rem', fontSize: '1.1rem' }}
                onClick={saveAttendance}
                disabled={saving || participants.length === 0}
              >
                {saving ? 'Guardando cambios...' : <><Save size={20} /> Finalizar Pase de Lista</>}
              </button>
            </div>

            {/* Quick Stats Panel */}
            <div className="card glass" style={{ position: 'sticky', top: '2rem' }}>
              <h4 style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Resumen de Jornada</h4>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <StatCard label="Asistencias" value={stats.asistieron} color="var(--success)" icon={UserCheck} />
                <StatCard label="Atrasos" value={stats.atrasos} color="var(--warning)" icon={Clock} />
                <StatCard label="Faltas" value={stats.faltas} color="var(--danger)" icon={UserMinus} />
                <StatCard label="Permisos" value={stats.permisos} color="var(--info)" icon={FileText} />
              </div>
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--primary-light)', borderRadius: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>PORCENTAJE DE ASISTENCIA</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                  {participants.length > 0 ? Math.round((stats.asistieron / participants.length) * 100) : 0}%
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="card glass" style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.1 }} />
            <p>Selecciona Programa, Módulo y Grupo para iniciar el pase de lista</p>
          </div>
        )}

        <style jsx>{`
        .btn-status-asistio { background: var(--success); color: white; }
        .btn-status-atraso { background: var(--warning); color: white; }
        .btn-status-falta { background: var(--danger); color: white; }
        .btn-status-permiso { background: var(--info); color: white; }
        .btn-ghost { background: rgba(255,255,255,0.05); color: var(--muted); }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); }
        .row-hover:hover { background: rgba(255,255,255,0.05) !important; }
      `}</style>
      </div>
      <StatusModal
        show={notif.show}
        type={notif.type}
        title={notif.title}
        message={notif.message}
        onClose={() => setNotif({ ...notif, show: false })}
      />
    </>
  )
}

function StatCard({ label, value, color, icon: Icon }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ padding: '0.5rem', background: color + '22', color: color, borderRadius: '0.5rem' }}><Icon size={16} /></div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
      </div>
      <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>{value}</span>
    </div>
  )
}
