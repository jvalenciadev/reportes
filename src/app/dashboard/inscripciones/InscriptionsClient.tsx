'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Save, Search, UserPlus, CheckCircle, LayoutGrid,
  AlertCircle, Contact, Mail, Phone, MapPin,
  Calendar, Trash2, UserCheck
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

    console.log('Datos recibidos:', data)
    const sortedData = (data || []).sort((a: any, b: any) => {
      const apellidoA = (a.participantes?.apellido || '').toLowerCase();
      const apellidoB = (b.participantes?.apellido || '').toLowerCase();
      if (apellidoA < apellidoB) return -1;
      if (apellidoA > apellidoB) return 1;
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', background: 'var(--surface)', padding: '0.4rem', borderRadius: '0.75rem' }}>
                <div
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.5rem', cursor: 'default' }}
                >
                  <LayoutGrid size={18} /> Lista de Inscritos
                </div>
              </div>
              <div className="badge" style={{ padding: '0.75rem 1.25rem', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 800 }}>
                {enrolledParticipants.length} INSCRITOS EN TOTAL
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
                    {enrolledParticipants.length > 0 ? enrolledParticipants.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: 800 }}>{i.participantes.apellido}, {i.participantes.nombre}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={10} /> {i.participantes.localidad_vive || 'Sin localidad'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{i.participantes.ci}</div>
                          <select
                            value={i.grupo_id}
                            onChange={(e) => updateGroup(i.id, e.target.value)}
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.2rem 0.4rem',
                              fontSize: '0.7rem',
                              borderRadius: '0.4rem',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              width: '100%'
                            }}
                          >
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ width: '200px' }}>
                          <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                            <Mail size={12} style={{ color: 'var(--muted)', minWidth: '12px' }} />
                            <input
                              type="email"
                              defaultValue={i.participantes.correo || ''}
                              onBlur={(e) => {
                                if (e.target.value !== i.participantes.correo) {
                                  updateParticipantContact(i.participante_id, 'correo', e.target.value);
                                }
                              }}
                              style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', color: 'var(--foreground)', minWidth: '0' }}
                              placeholder="Sin correo..."
                            />
                          </div>
                          <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Phone size={12} style={{ color: 'var(--muted)', minWidth: '12px' }} />
                            <input
                              type="text"
                              defaultValue={i.participantes.celular || ''}
                              onBlur={(e) => {
                                if (e.target.value !== i.participantes.celular) {
                                  updateParticipantContact(i.participante_id, 'celular', e.target.value);
                                }
                              }}
                              style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', color: 'var(--foreground)', minWidth: '0' }}
                              placeholder="Sin celular..."
                            />
                          </div>
                        </td>
                        <td>
                          <select
                            value={i.estado}
                            onChange={(e) => updateStatus(i.id, e.target.value)}
                            style={{
                              padding: '0.3rem 0.6rem',
                              borderRadius: '0.5rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                              background: i.estado === 'inscrito' ? 'rgba(16, 217, 139, 0.1)' : (i.estado === 'preinscrito' ? 'rgba(245, 166, 35, 0.1)' : 'rgba(255,255,255,0.05)'),
                              color: i.estado === 'inscrito' ? 'var(--success)' : (i.estado === 'preinscrito' ? '#f5a623' : 'var(--foreground-2)'),
                              textTransform: 'uppercase'
                            }}
                          >
                            <option value="preinscrito">Preinscrito</option>
                            <option value="inscrito">Inscrito</option>
                            <option value="baja">Baja</option>
                          </select>

                          {i.observacion && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.3rem', maxWidth: '150px', fontStyle: 'italic' }}>
                              "{i.observacion}"
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => updateDocumento(i.id, !!i.entrego_documento)}
                            className={`btn ${i.entrego_documento ? 'btn-primary' : 'btn-ghost'}`}
                            style={{
                              padding: '0.4rem 0.6rem',
                              fontSize: '0.75rem',
                              borderRadius: '0.5rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              border: i.entrego_documento ? 'none' : '1px solid var(--border)'
                            }}
                            title={i.entrego_documento ? "Documento entregado" : "Falta documento"}
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
                    )) : (
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
