'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Save, Search, UserPlus, CheckCircle, LayoutGrid,
  AlertCircle, Contact, Mail, Phone, MapPin,
  Calendar, Trash2, UserCheck,
  Info,
  FileText
} from 'lucide-react'
import StatusModal, { StatusType } from '../components/StatusModal'
import ReasonModal from '../components/ReasonModal'
import ConfirmModal from '../components/ConfirmModal'

export default function InscriptionsClient({
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

  // State
  const [selectedDepto, setSelectedDepto] = useState(userDeptId || '')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [groups, setGroups] = useState<any[]>(userRole === 'facilitador' ? facilitadorGroups : [])
  const [programs, setPrograms] = useState<any[]>([])
  const [enrolledParticipants, setEnrolledParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Modal States
  const [reasonModal, setReasonModal] = useState({ show: false, id: '', status: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: '', newGroupId: '', groupName: '' })

  // Load Initial Data
  useEffect(() => {
    const fetchBaseData = async () => {
      const { data: prog } = await supabase.from('programas').select('*').eq('estado', 'activo')
      setPrograms(prog || [])
      if (prog && prog.length > 0) setSelectedProgram(prog[0].id)
    }
    fetchBaseData()
  }, [])

  // For facilitadores: load their groups on mount immediately + auto-select dept
  useEffect(() => {
    if (userRole === 'facilitador' && facilitadorGroups.length > 0) {
      const firstGroup = facilitadorGroups[0]
      setGroups(facilitadorGroups)
      setSelectedGroup(firstGroup.id)
      if (firstGroup.departamento_id) {
        setSelectedDepto(firstGroup.departamento_id)
      }
    }
  }, [userRole, JSON.stringify(facilitadorGroups)])

  // Load Groups when Depto changes (non-facilitadores only)
  useEffect(() => {
    if (userRole === 'facilitador') return // handled by mount effect above
    if (!selectedDepto) return
    const fetchGroups = async () => {
      const { data } = await supabase.from('grupos').select('*').eq('departamento_id', selectedDepto)
      setGroups(data || [])
    }
    fetchGroups()
  }, [selectedDepto, userRole])

  // Filter and Sort State
  const [filterStatus, setFilterStatus] = useState('all')

  // Load Enrolled Participants when Group/Program changes
  const loadParticipants = async () => {
    if (!selectedGroup || !selectedProgram) return
    setLoading(true)
    console.log('Cargando participantes para Grupo:', selectedGroup, 'Programa:', selectedProgram)

    const { data, error } = await supabase
      .from('inscripciones')
      .select('*, participantes(*)')
      .eq('grupo_id', selectedGroup)
      .eq('programa_id', selectedProgram)

    if (error) {
      console.error('Error de Supabase al cargar:', error)
      showNotif('error', 'Error de Conexión', error.message)
    }

    // --- LÓGICA DE ORDENAMIENTO SENIOR (PRIORIDAD POR ESTADO + ALFABÉTICO) ---
    const statusPriority: Record<string, number> = {
      'inscrito': 1,
      'preinscrito': 2,
      'baja': 3
    }

    const sortedData = (data || []).sort((a: any, b: any) => {
      // 1. Prioridad por Estado
      const pA = statusPriority[a.estado] || 99
      const pB = statusPriority[b.estado] || 99
      if (pA !== pB) return pA - pB

      // 2. Apellido (A-Z)
      const apellidoA = (a.participantes?.apellido || '').toLowerCase();
      const apellidoB = (b.participantes?.apellido || '').toLowerCase();
      if (apellidoA < apellidoB) return -1;
      if (apellidoA > apellidoB) return 1;

      // 3. Nombre (A-Z)
      const nombreA = (a.participantes?.nombre || '').toLowerCase();
      const nombreB = (b.participantes?.nombre || '').toLowerCase();
      if (nombreA < nombreB) return -1;
      if (nombreA > nombreB) return 1;
      return 0;
    });

    setEnrolledParticipants(sortedData)
    setLoading(false)
  }

  useEffect(() => {
    loadParticipants()
  }, [selectedGroup, selectedProgram])

  // Logic to handle participant registration removed as requested

  const updateStatus = async (id: string, newStatus: string) => {
    // Si es BAJA, abrir el modal en lugar de procesar directo
    if (newStatus === 'baja') {
      setReasonModal({ show: true, id, status: newStatus })
      return
    }

    try {
      console.log(`Intentando actualizar ID: ${id} a estado: ${newStatus}`)

      const { data, error, count } = await supabase
        .from('inscripciones')
        .update({ estado: newStatus })
        .eq('id', id)
        .select() // Forzar que devuelva el registro actualizado

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('No se encontró el registro o no tienes permisos para editarlo (RLS).')
      }

      console.log('Actualización exitosa. Datos nuevos:', data)
      loadParticipants()
      showNotif('success', 'Estado Actualizado', 'El cambio se ha guardado correctamente en la base de datos.')
    } catch (err: any) {
      console.error('Error crítico al actualizar:', err)
      showNotif('error', 'Error al actualizar', err.message)
      loadParticipants()
    }
  }

  const updateDocumento = async (id: string, currentValue: boolean) => {
    try {
      const newValue = !currentValue
      const { data, error } = await supabase
        .from('inscripciones')
        .update({ entrego_documento: newValue })
        .eq('id', id)
        .select()

      if (error) throw error

      showNotif('success', 'Documento Actualizado', newValue ? 'Documento marcado como entregado.' : 'Documento marcado como no entregado.')

      // Update local state directly for better UX
      setEnrolledParticipants(prev =>
        prev.map(p => p.id === id ? { ...p, entrego_documento: newValue } : p)
      )
    } catch (err: any) {
      showNotif('error', 'Error al actualizar', err.message)
    }
  }

  const updateGroup = async (id: string, newGroupId: string) => {
    const newGroupName = groups.find(g => g.id === newGroupId)?.name || 'Nuevo Grupo'
    setConfirmModal({ show: true, id, newGroupId, groupName: newGroupName })
  }

  const handleConfirmGroup = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('inscripciones')
        .update({ grupo_id: confirmModal.newGroupId })
        .eq('id', confirmModal.id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) throw new Error('No se pudo actualizar el grupo.')

      setConfirmModal({ show: false, id: '', newGroupId: '', groupName: '' })
      showNotif('success', 'Grupo Cambiado', 'El participante ha sido movido de grupo exitosamente.')
      loadParticipants()
    } catch (err: any) {
      showNotif('error', 'Error al cambiar grupo', err.message)
      loadParticipants()
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmBaja = async (reason: string) => {
    setSaving(true)
    try {
      console.log(`Procesando BAJA para ID: ${reasonModal.id} con motivo: ${reason}`)

      const { data, error } = await supabase
        .from('inscripciones')
        .update({
          estado: reasonModal.status,
          observacion: reason
        })
        .eq('id', reasonModal.id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('No se pudo procesar la baja. Verifica tus permisos de base de datos.')
      }

      setReasonModal({ show: false, id: '', status: '' })
      loadParticipants()
      showNotif('success', 'Baja Registrada', 'El participante ha sido dado de baja con éxito.')
    } catch (err: any) {
      console.error('Error en handleConfirmBaja:', err)
      showNotif('error', 'Error al procesar baja', err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateParticipantContact = async (participanteId: string, field: 'correo' | 'celular', newValue: string) => {
    try {
      const { error } = await supabase
        .from('participantes')
        .update({ [field]: newValue })
        .eq('id', participanteId)

      if (error) throw error

      showNotif('success', 'Datos Actualizados', `El ${field} ha sido actualizado exitosamente.`)

      setEnrolledParticipants(prev =>
        prev.map(p => p.participante_id === participanteId ? {
          ...p,
          participantes: { ...p.participantes, [field]: newValue }
        } : p)
      )
    } catch (err: any) {
      console.error('Error al actualizar contacto:', err)
      showNotif('error', 'Error al actualizar', err.message)
    }
  }

  return (
    <>
      <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} suppressHydrationWarning>

        {/* Global Selectors */}
        <div className="card glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }} suppressHydrationWarning>
          <div className="form-group" suppressHydrationWarning>
            <label>Programa Académico</label>
            <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
              {programs.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
            </select>
          </div>
          <div className="form-group" suppressHydrationWarning style={{ display: userRole === 'facilitador' ? 'none' : 'block' }}>
            <label>Departamento</label>
            <select value={selectedDepto} onChange={(e) => setSelectedDepto(e.target.value)} disabled={!!userDeptId || userRole === 'facilitador'}>
              <option value="">Seleccionar...</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group" suppressHydrationWarning>
            <label>
              Grupo
              {userRole === 'facilitador' && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '99px', fontWeight: 800 }}>
                  TUS GRUPOS
                </span>
              )}
            </label>
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} disabled={userRole === 'facilitador' && groups.length <= 1}>
              <option value="">Seleccionar Grupo</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>

        {selectedGroup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              background: 'var(--surface)',
              borderRadius: '1.25rem',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              padding: '1rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginBottom: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>

                {/* --- SECCIÓN IZQUIERDA: FILTRO Y TÍTULO --- */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(var(--primary-rgb), 0.1)'
                  }}>
                    <LayoutGrid size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gestión de Grupo</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--muted)' }}>Ver:</span>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                          background: 'transparent', border: 'none',
                          fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)',
                          cursor: 'pointer', outline: 'none', padding: '2px 4px',
                          borderBottom: '2px solid var(--primary-light)'
                        }}
                      >
                        <option value="all">Todos los Estados</option>
                        <option value="inscrito">Solo Inscritos</option>
                        <option value="preinscrito">Solo Preinscritos</option>
                        <option value="baja">Solo Bajas</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* --- SECCIÓN CENTRAL: MÉTRICAS --- */}
                <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></div>
                      <span style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--foreground)' }}>
                        {enrolledParticipants.filter(p => p.estado === 'inscrito').length}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Inscritos</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div>
                      <span style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--foreground)' }}>
                        {enrolledParticipants.filter(p => p.estado === 'preinscrito').length}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Preinscritos</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)' }}></div>
                      <span style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--muted)' }}>
                        {enrolledParticipants.filter(p => p.estado === 'baja').length}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Bajas</div>
                  </div>
                </div>

                {/* --- SECCIÓN DERECHA: TOTAL --- */}
                <div style={{
                  background: 'var(--primary-light)',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '1rem',
                  textAlign: 'center',
                  minWidth: '120px'
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.1 }}>
                    {enrolledParticipants.length}
                  </div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    Total Alumnos
                  </div>
                </div>

              </div>

              {/* --- BANNER DE REGLAS ADMINISTRATIVAS (RESALTADO) --- */}
              <div style={{
                marginTop: '1rem',
                padding: '1rem 1.5rem',
                background: 'rgba(59, 130, 246, 0.04)',
                borderRadius: '1rem',
                border: '1px solid rgba(59, 130, 246, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--foreground)', fontSize: '0.8rem', fontWeight: 600 }}>
                  <AlertCircle size={16} style={{ color: '#3b82f6' }} />
                  <span>IMPORTANTE: REQUISITOS DE GESTIÓN</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', paddingLeft: '2.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', fontSize: '0.75rem' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6' }}></div>
                    <span>Para registrar <strong>asistencia</strong> y <strong>subir calificaciones</strong>, el participante debe estar <strong>Inscrito</strong>.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', fontSize: '0.75rem' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6' }}></div>
                    <span>Todos los alumnos <strong>Inscritos</strong> deben entregar obligatoriamente sus documentos físicos <strong>(Marcar Check)</strong>.</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="card glass animate-fade-in" style={{ borderTop: '4px solid var(--success)' }} suppressHydrationWarning>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Participante</th>
                      <th>Identidad / Grupo</th>
                      <th>Contacto</th>
                      <th>Estado / Obs.</th>
                      <th style={{ textAlign: 'center' }}>Documentos</th>
                      <th style={{ textAlign: 'right' }}>Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledParticipants
                      .filter(i => filterStatus === 'all' || i.estado === filterStatus)
                      .length > 0 ? enrolledParticipants
                        .filter(i => filterStatus === 'all' || i.estado === filterStatus)
                        .map((i) => {
                          const isBaja = i.estado === 'baja';
                          const initials = `${i.participantes.nombre?.[0] || ''}${i.participantes.apellido?.[0] || ''}`.toUpperCase();

                          return (
                            <tr key={i.id} style={{
                              opacity: isBaja ? 0.6 : 1,
                              background: isBaja ? 'rgba(0,0,0,0.02)' : 'transparent',
                              transition: 'all 0.3s ease'
                            }}>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <div style={{
                                    width: '38px', height: '38px', borderRadius: '12px',
                                    background: isBaja ? 'var(--border)' : 'var(--primary-light)',
                                    color: isBaja ? 'var(--muted)' : 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.85rem', fontWeight: 900,
                                    border: `1px solid ${isBaja ? 'transparent' : 'rgba(var(--primary-rgb), 0.1)'}`,
                                    boxShadow: isBaja ? 'none' : '0 4px 10px rgba(0,0,0,0.05)'
                                  }}>
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{
                                      fontWeight: 800,
                                      fontSize: '0.95rem',
                                      textDecoration: isBaja ? 'line-through' : 'none',
                                      color: isBaja ? 'var(--muted)' : 'var(--foreground)'
                                    }}>
                                      {i.participantes.apellido}, {i.participantes.nombre}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                                      <MapPin size={10} /> {i.participantes.localidad_vive || 'Sin localidad'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--foreground-2)', marginBottom: '0.4rem' }}>{i.participantes.ci}</div>
                                <select
                                  value={i.grupo_id}
                                  onChange={(e) => updateGroup(i.id, e.target.value)}
                                  style={{
                                    padding: '0.3rem 0.5rem',
                                    fontSize: '0.7rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--primary)',
                                    fontWeight: 800,
                                    width: '100%',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ width: '220px' }}>
                                <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                    <Mail size={12} style={{ color: 'var(--muted)' }} />
                                  </div>
                                  <input
                                    type="email"
                                    defaultValue={i.participantes.correo || ''}
                                    onBlur={(e) => {
                                      if (e.target.value !== i.participantes.correo) {
                                        updateParticipantContact(i.participante_id, 'correo', e.target.value);
                                      }
                                    }}
                                    style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid transparent', padding: '0.2rem 0', fontSize: '0.8rem', color: 'var(--foreground)', transition: 'all 0.2s' }}
                                    placeholder="Sin correo..."
                                    onFocus={(e) => e.target.style.borderBottomColor = 'var(--primary)'}
                                  />
                                </div>
                                <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                    <Phone size={12} style={{ color: 'var(--muted)' }} />
                                  </div>
                                  <input
                                    type="text"
                                    defaultValue={i.participantes.celular || ''}
                                    onBlur={(e) => {
                                      if (e.target.value !== i.participantes.celular) {
                                        updateParticipantContact(i.participante_id, 'celular', e.target.value);
                                      }
                                    }}
                                    style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid transparent', padding: '0.2rem 0', fontSize: '0.8rem', color: 'var(--foreground)', transition: 'all 0.2s' }}
                                    placeholder="Sin celular..."
                                    onFocus={(e) => e.target.style.borderBottomColor = 'var(--primary)'}
                                  />
                                </div>
                              </td>
                              <td>
                                <select
                                  value={i.estado}
                                  onChange={(e) => updateStatus(i.id, e.target.value)}
                                  style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    background: i.estado === 'inscrito' ? 'var(--success)' : (i.estado === 'preinscrito' ? '#3b82f6' : 'var(--border)'),
                                    color: i.estado === 'inscrito' || i.estado === 'preinscrito' ? 'white' : 'var(--muted)'
                                  }}
                                >
                                  <option value="inscrito">Inscrito</option>
                                  <option value="preinscrito">Preinscrito</option>
                                  <option value="baja">Baja</option>
                                </select>

                                {i.observacion && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <AlertCircle size={10} /> {i.observacion}
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => i.estado === 'inscrito' && updateDocumento(i.id, !!i.entrego_documento)}
                                  className={`btn ${i.entrego_documento ? 'btn-primary' : 'btn-ghost'}`}
                                  disabled={i.estado !== 'inscrito'}
                                  style={{
                                    padding: '0.4rem 0.6rem',
                                    fontSize: '0.75rem',
                                    borderRadius: '0.5rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    border: i.entrego_documento ? 'none' : '1px solid var(--border)',
                                    opacity: i.estado === 'inscrito' ? 1 : 0.4,
                                    cursor: i.estado === 'inscrito' ? 'pointer' : 'not-allowed',
                                    filter: i.estado === 'inscrito' ? 'none' : 'grayscale(1)'
                                  }}
                                  title={i.estado !== 'inscrito' ? "Solo habilitado para inscritos" : (i.entrego_documento ? "Documento entregado" : "Falta documento")}
                                >
                                  <CheckCircle size={14} style={{ opacity: i.entrego_documento ? 1 : 0.4 }} />
                                  {i.entrego_documento ? 'Entregó' : 'Pendiente'}
                                </button>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                                  <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                  {new Date(i.created_at).toLocaleDateString()}
                                </div>
                              </td>
                            </tr>
                          );
                        }) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                          <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                          <div>No hay participantes inscritos en este grupo</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      <StatusModal
        show={notif.show}
        type={notif.type}
        title={notif.title}
        message={notif.message}
        onClose={() => setNotif({ ...notif, show: false })}
      />

      <ReasonModal
        show={reasonModal.show}
        title="Confirmar Baja"
        loading={saving}
        onConfirm={handleConfirmBaja}
        onCancel={() => {
          setReasonModal({ show: false, id: '', status: '' })
          loadParticipants() // Revertir el select
        }}
      />
      <ConfirmModal
        show={confirmModal.show}
        title="Cambio de Grupo"
        message={`¿Estás seguro de mover a este participante al grupo "${confirmModal.groupName}"?`}
        loading={saving}
        onConfirm={handleConfirmGroup}
        onCancel={() => {
          setConfirmModal({ show: false, id: '', newGroupId: '', groupName: '' })
          loadParticipants()
        }}
      />
    </>
  )
}
