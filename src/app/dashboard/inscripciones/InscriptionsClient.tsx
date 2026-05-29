'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/utils/supabase/client'
import {
  Save, Search, UserPlus, CheckCircle, LayoutGrid,
  AlertCircle, Contact, Mail, Phone, MapPin,
  Trash2, UserCheck,
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
  const [statusConfirmModal, setStatusConfirmModal] = useState({ show: false, id: '', currentStatus: '', newStatus: '' })
  const [welcomeAlert, setWelcomeAlert] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const tutorialRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Show welcome alert on mount if not seen before
  useEffect(() => {
    setMounted(true)
    const hasSeen = sessionStorage.getItem('inscriptions_alert_seen')
    if (!hasSeen) {
      setWelcomeAlert(true)
    }
  }, [])

  // Cycle tutorial steps when modal is open
  useEffect(() => {
    if (welcomeAlert) {
      tutorialRef.current = setInterval(() => {
        setTutorialStep(s => (s + 1) % 4)
      }, 2000)
    } else {
      if (tutorialRef.current) clearInterval(tutorialRef.current)
      setTutorialStep(0)
    }
    return () => { if (tutorialRef.current) clearInterval(tutorialRef.current) }
  }, [welcomeAlert])

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

  const handleStatusChange = (inscription: any, newStatus: string) => {
    if (newStatus === 'inscrito') {
      setStatusConfirmModal({
        show: true,
        id: inscription.id,
        currentStatus: inscription.estado,
        newStatus: newStatus
      })
    } else {
      updateStatus(inscription.id, newStatus)
    }
  }

  const handleConfirmStatus = async () => {
    setSaving(true)
    try {
      await updateStatus(statusConfirmModal.id, statusConfirmModal.newStatus)
      setStatusConfirmModal({ show: false, id: '', currentStatus: '', newStatus: '' })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

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

      let autoFormalizado = false
      const enrollment = enrolledParticipants.find(p => p.id === id)
      const participanteId = enrollment?.participante_id
      const isFormalizado = !!enrollment?.participantes?.formalizado

      if (newValue && !isFormalizado && participanteId) {
        // Auto-formalize participant in Supabase: document delivery implies formalization!
        const { error: formalizeError } = await supabase
          .from('participantes')
          .update({ formalizado: true })
          .eq('id', participanteId)

        if (!formalizeError) {
          autoFormalizado = true
        } else {
          console.error('Error al auto-formalizar participante:', formalizeError)
        }
      }

      showNotif(
        'success',
        'Documento Actualizado',
        newValue
          ? (autoFormalizado
            ? 'Documento marcado como entregado. ¡El participante ha sido formalizado automáticamente!'
            : 'Documento marcado como entregado.')
          : 'Documento marcado como no entregado.'
      )

      // Update local state directly for better UX
      setEnrolledParticipants(prev =>
        prev.map(p => p.id === id ? {
          ...p,
          entrego_documento: newValue,
          participantes: autoFormalizado
            ? { ...p.participantes, formalizado: true }
            : p.participantes
        } : p)
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

  const updateGenero = async (participanteId: string, currentGenero: number | null) => {
    // Cycle: null -> 1 (Varón) -> 0 (Mujer) -> null
    const next = currentGenero === null ? 1 : currentGenero === 1 ? 0 : null
    try {
      const { error } = await supabase
        .from('participantes')
        .update({ genero: next })
        .eq('id', participanteId)
      if (error) throw error
      setEnrolledParticipants(prev =>
        prev.map(p => p.participante_id === participanteId ? {
          ...p,
          participantes: { ...p.participantes, genero: next }
        } : p)
      )
    } catch (err: any) {
      showNotif('error', 'Error al actualizar género', err.message)
    }
  }

  const updateParticipantField = async (participanteId: string, field: 'correo' | 'celular' | 'formalizado' | 'zona', newValue: any) => {
    try {
      const { error } = await supabase
        .from('participantes')
        .update({ [field]: newValue })
        .eq('id', participanteId)

      if (error) throw error

      showNotif('success', 'Datos Actualizados', `El campo ${field} ha sido actualizado exitosamente.`)

      setEnrolledParticipants(prev =>
        prev.map(p => p.participante_id === participanteId ? {
          ...p,
          participantes: { ...p.participantes, [field]: newValue }
        } : p)
      )
    } catch (err: any) {
      console.error('Error al actualizar participante:', err)
      showNotif('error', 'Error al actualizar', err.message)
    }
  }

  return (
    <>
      <style>{`
        .gender-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .gender-btn:hover {
          transform: scale(1.22) !important;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3) !important;
          filter: brightness(1.15);
        }
        .gender-btn:active {
          transform: scale(0.88) !important;
        }
        .pill-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04) !important;
        }
        .pill-btn:hover {
          transform: translateY(-1.5px) !important;
          box-shadow: 0 5px 12px rgba(0,0,0,0.12) !important;
          filter: brightness(1.08);
        }
        .pill-btn:active {
          transform: translateY(0) !important;
        }
        .doc-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .doc-btn:hover:not(:disabled) {
          transform: translateY(-1.5px) !important;
          box-shadow: 0 5px 12px rgba(0,0,0,0.1) !important;
          filter: brightness(1.08);
        }
        .doc-btn:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        .group-select-inline {
          transition: all 0.2s ease !important;
        }
        .group-select-inline:hover {
          border-color: var(--primary) !important;
          background: var(--surface-hover) !important;
        }
      `}</style>
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
                        <option value="inscrito">Solo Activos</option>
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
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Activos</div>
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
                    <span>Todos los alumnos <strong>Activos</strong> deben entregar obligatoriamente sus documentos físicos <strong>(Marcar Check)</strong>.</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="card glass animate-fade-in" style={{ borderTop: '4px solid var(--success)' }} suppressHydrationWarning>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '38%' }}>Participante</th>
                      <th style={{ width: '37%' }}>Contacto &amp; Detalles</th>
                      <th style={{ width: '25%', textAlign: 'center' }}>Estado &amp; Acciones</th>
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
                          const genero = i.participantes.genero ?? null
                          const avatarBg = isBaja ? 'var(--border)' : genero === 1 ? 'rgba(59,130,246,0.13)' : genero === 0 ? 'rgba(236,72,153,0.13)' : 'var(--primary-light)'
                          const avatarColor = isBaja ? 'var(--muted)' : genero === 1 ? '#3b82f6' : genero === 0 ? '#ec4899' : 'var(--primary)'

                          return (
                            <tr key={i.id} style={{
                              opacity: isBaja ? 0.55 : 1,
                              background: isBaja ? 'rgba(0,0,0,0.015)' : 'transparent',
                              transition: 'all 0.2s ease'
                            }}>

                              {/* ── COL 1: Participante ────────────────── */}
                              <td style={{ padding: '0.85rem 0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                                  {/* Avatar con micro-badge de género */}
                                  <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
                                    <div style={{
                                      width: '40px', height: '40px', borderRadius: '13px',
                                      background: avatarBg, color: avatarColor,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '0.88rem', fontWeight: 900,
                                      boxShadow: isBaja ? 'none' : '0 3px 10px rgba(0,0,0,0.07)',
                                      border: `1.5px solid ${isBaja ? 'transparent' : genero === 1 ? 'rgba(59,130,246,0.35)' : genero === 0 ? 'rgba(236,72,153,0.35)' : 'var(--border)'}`
                                    }}>
                                      {initials}
                                    </div>
                                    <button
                                      onClick={() => updateGenero(i.participante_id, genero)}
                                      className="gender-btn"
                                      title={genero === 1 ? 'Varón · Click para cambiar' : genero === 0 ? 'Mujer · Click para cambiar' : 'Sin género · Click para asignar'}
                                      style={{
                                        position: 'absolute', bottom: '-5px', right: '-5px',
                                        width: '22px', height: '22px', borderRadius: '50%',
                                        border: '2.5px solid var(--bg-3)',
                                        background: genero === 1 ? '#2563eb' : genero === 0 ? '#db2777' : '#475569',
                                        color: 'white', fontSize: '0.85rem', fontWeight: 900,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', padding: 0, lineHeight: 1,
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.35)'
                                      }}
                                    >
                                      {genero === 1 ? '♂' : genero === 0 ? '♀' : '?'}
                                    </button>
                                  </div>

                                  {/* Info principal */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontWeight: 800, fontSize: '0.92rem',
                                      textDecoration: isBaja ? 'line-through' : 'none',
                                      color: isBaja ? 'var(--muted)' : 'var(--foreground)',
                                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
                                      {i.participantes.apellido}, {i.participantes.nombre}
                                    </div>
                                    <div style={{ fontSize: '0.67rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                                      <MapPin size={9} /> {i.participantes.localidad_vive || 'Sin localidad'}
                                    </div>
                                    {/* CI + Grupo en una sola fila */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                                      <span style={{
                                        fontFamily: 'monospace', fontSize: '0.7rem',
                                        background: 'var(--surface)', border: '1px solid var(--border)',
                                        padding: '0.1rem 0.45rem', borderRadius: '0.4rem',
                                        color: 'var(--muted)', letterSpacing: '0.02em', fontWeight: 600
                                      }}>
                                        {i.participantes.ci}
                                      </span>
                                      <select
                                        value={i.grupo_id}
                                        onChange={(e) => updateGroup(i.id, e.target.value)}
                                        className="group-select-inline"
                                        style={{
                                          padding: '0.15rem 0.4rem', fontSize: '0.68rem',
                                          borderRadius: '0.4rem', border: '1px solid var(--border)',
                                          background: 'var(--primary-light)', color: 'var(--primary)',
                                          fontWeight: 800, cursor: 'pointer', maxWidth: '110px',
                                          outline: 'none'
                                        }}
                                      >
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* ── COL 2: Contacto & Detalles ─────────── */}
                              <td style={{ padding: '0.85rem 0.75rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  {/* Email */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                    <Mail size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                                    <input
                                      type="email"
                                      defaultValue={i.participantes.correo || ''}
                                      onBlur={(e) => {
                                        if (e.target.value !== i.participantes.correo)
                                          updateParticipantField(i.participante_id, 'correo', e.target.value)
                                        e.target.style.borderBottomColor = 'transparent'
                                      }}
                                      onFocus={(e) => e.target.style.borderBottomColor = 'var(--primary)'}
                                      placeholder="Sin correo"
                                      style={{
                                        flex: 1, background: 'transparent', border: 'none',
                                        borderBottom: '1px solid transparent', padding: '0.1rem 0',
                                        fontSize: '0.77rem', color: 'var(--foreground)',
                                        transition: 'all 0.2s', minWidth: 0,
                                        outline: 'none'
                                      }}
                                    />
                                  </div>
                                  {/* Celular */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                    <Phone size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                                    <input
                                      type="text"
                                      defaultValue={i.participantes.celular || ''}
                                      onBlur={(e) => {
                                        if (e.target.value !== i.participantes.celular)
                                          updateParticipantField(i.participante_id, 'celular', e.target.value)
                                        e.target.style.borderBottomColor = 'transparent'
                                      }}
                                      onFocus={(e) => e.target.style.borderBottomColor = 'var(--primary)'}
                                      placeholder="Sin celular"
                                      style={{
                                        flex: 1, background: 'transparent', border: 'none',
                                        borderBottom: '1px solid transparent', padding: '0.1rem 0',
                                        fontSize: '0.77rem', color: 'var(--foreground)',
                                        transition: 'all 0.2s', outline: 'none'
                                      }}
                                    />
                                  </div>
                                  {/* Pills clickeables: Zona + Formalizado */}
                                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => updateParticipantField(i.participante_id, 'zona', i.participantes.zona === 'urbano' ? 'rural' : 'urbano')}
                                      className="pill-btn"
                                      title="Click para cambiar zona"
                                      style={{
                                        padding: '0.3rem 0.75rem', borderRadius: '99px',
                                        fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                                        background: i.participantes.zona === 'rural' ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.08)',
                                        color: i.participantes.zona === 'rural' ? '#16a34a' : '#2563eb',
                                        border: `1.5px solid ${i.participantes.zona === 'rural' ? '#10b981' : '#3b82f6'}`
                                      }}
                                    >
                                      {i.participantes.zona === 'rural' ? '🌾 Rural' : '🏙 Urbano'}
                                    </button>
                                    <button
                                      onClick={() => updateParticipantField(i.participante_id, 'formalizado', !i.participantes.formalizado)}
                                      className="pill-btn"
                                      title="Click para cambiar estado de formalización"
                                      style={{
                                        padding: '0.3rem 0.75rem', borderRadius: '99px',
                                        fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                                        background: i.participantes.formalizado ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                                        color: i.participantes.formalizado ? '#16a34a' : '#d97706',
                                        border: `1.5px solid ${i.participantes.formalizado ? '#10b981' : '#f59e0b'}`
                                      }}
                                    >
                                      {i.participantes.formalizado ? '✓ Formalizado' : 'Pendiente'}
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* ── COL 3: Estado & Acciones ───────────── */}
                              <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem' }}>
                                  {/* Badge de estado */}
                                  <span style={{
                                    display: 'inline-block', padding: '0.35rem 0.75rem',
                                    borderRadius: '0.6rem', fontSize: '0.7rem', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                    background: i.estado === 'inscrito' ? 'rgba(34,197,94,0.15)'
                                      : i.estado === 'preinscrito' ? 'rgba(59,130,246,0.12)'
                                        : 'var(--border)',
                                    color: i.estado === 'inscrito' ? '#16a34a'
                                      : i.estado === 'preinscrito' ? '#3b82f6'
                                        : 'var(--muted)',
                                    border: `1px solid ${i.estado === 'inscrito' ? 'rgba(34,197,94,0.25)' : i.estado === 'preinscrito' ? 'rgba(59,130,246,0.2)' : 'transparent'}`
                                  }}>
                                    {i.estado === 'inscrito' ? '● Activo' : i.estado === 'preinscrito' ? '○ Preinscrito' : '× Baja'}
                                  </span>
                                  {/* Observación */}
                                  {i.observacion && (
                                    <div style={{ fontSize: '0.65rem', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', maxWidth: '160px', textAlign: 'left' }}>
                                      <AlertCircle size={9} style={{ flexShrink: 0 }} /> {i.observacion}
                                    </div>
                                  )}
                                  {/* Documento toggle */}
                                  <button
                                    onClick={() => i.estado === 'inscrito' && updateDocumento(i.id, !!i.entrego_documento)}
                                    disabled={i.estado !== 'inscrito'}
                                    className="doc-btn"
                                    title={i.estado !== 'inscrito' ? 'Solo habilitado para activos' : i.entrego_documento ? 'Doc. entregado ✓' : 'Falta documento'}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                      padding: '0.4rem 0.85rem', borderRadius: '0.6rem',
                                      fontSize: '0.72rem', fontWeight: 800,
                                      cursor: i.estado === 'inscrito' ? 'pointer' : 'not-allowed',
                                      opacity: i.estado === 'inscrito' ? 1 : 0.35,
                                      background: i.entrego_documento
                                        ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)',
                                      color: i.entrego_documento ? '#16a34a' : '#ef4444',
                                      border: `1.5px solid ${i.entrego_documento ? '#10b981' : '#f43f5e'}` as any
                                    }}
                                  >
                                    <CheckCircle size={13} />
                                    {i.entrego_documento ? 'Doc. OK' : 'Sin Doc.'}
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        }) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
                          <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                          <div>No hay participantes activos en este grupo</div>
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
      <ConfirmModal
        show={statusConfirmModal.show}
        title="Confirmar Inscripción"
        message="¿Estás seguro de inscribir a este participante? Una vez inscrito, su estado quedará activo y no podrá ser modificado."
        warningNote="ACCIÓN REQUERIDA: Si el programa ya está en curso, los facilitadores deberán registrar manualmente la asistencia de los módulos anteriores como FALTA y la calificación con 0 para este participante."
        loading={saving}
        onConfirm={handleConfirmStatus}
        onCancel={() => {
          setStatusConfirmModal({ show: false, id: '', currentStatus: '', newStatus: '' })
          loadParticipants()
        }}
      />

      {mounted && welcomeAlert && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(3, 4, 11, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '1.5rem'
        }}>
          <div className="card glass animate-scale-in" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '2.5rem 2rem',
            borderRadius: '2rem',
            border: '1.5px solid rgba(213, 173, 66, 0.3)',
            boxShadow: '0 30px 60px -12px rgba(0,0,0,0.8), 0 0 30px rgba(213, 173, 66, 0.1)',
            background: 'var(--bg-2)',
            color: 'var(--foreground)',
            position: 'relative'
          }}>

            {/* Icon & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '1.25rem',
                background: 'rgba(213, 173, 66, 0.15)',
                border: '1px solid rgba(213, 173, 66, 0.3)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 15px rgba(213, 173, 66, 0.2)',
                flexShrink: 0
              }}>
                <AlertCircle size={26} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--foreground)', letterSpacing: '-0.03em' }}>
                  Tutorial de Gestión Rápida
                </h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Guía visual para reportar con éxito
                </span>
              </div>
            </div>

            {/* ── Animated GIF-like row demo ── */}
            <style>{`
              @keyframes tut-pulse {
                0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.7); }
                50%      { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
              }
              @keyframes tut-bounce {
                0%,100% { transform: translateY(0); }
                50%      { transform: translateY(-4px); }
              }
              @keyframes tut-arrow {
                0%,100% { opacity: 0.4; transform: translateX(0); }
                50%      { opacity: 1;   transform: translateX(4px); }
              }
              .tut-highlight {
                outline: 2.5px solid #6366f1;
                outline-offset: 3px;
                border-radius: 6px;
                animation: tut-pulse 1.2s ease-in-out infinite;
              }
              .tut-label {
                animation: tut-bounce 1.2s ease-in-out infinite;
              }
            `}</style>

            {/* Step indicator dots */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '0.75rem' }}>
              {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'].map((c, i) => (
                <div key={i} style={{
                  width: tutorialStep === i ? '22px' : '8px',
                  height: '8px', borderRadius: '4px',
                  background: tutorialStep === i ? c : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.4s cubic-bezier(.4,0,.2,1)'
                }} />
              ))}
            </div>

            {/* Step label */}
            <div style={{
              textAlign: 'center', marginBottom: '0.75rem',
              fontSize: '0.78rem', fontWeight: 700,
              color: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'][tutorialStep],
              minHeight: '1.1rem', transition: 'color 0.3s'
            }}>
              {['① Haz clic en el género (? → ♂ ♀) en el avatar', '② Haz clic en la zona (Urbano / Rural)', '③ Haz clic en "Sin Doc." para registrar documento', '④ El sistema lo formaliza automáticamente'][tutorialStep]}
            </div>

            {/* Mini row mockup */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', padding: '0.65rem 0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              marginBottom: '1.25rem', position: 'relative', overflow: 'visible'
            }}>
              {/* Avatar + gender badge */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.95rem', color: '#fff'
                }}>MA</div>
                {/* Gender badge */}
                <div
                  className={tutorialStep === 0 ? 'tut-highlight tut-label' : ''}
                  style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: tutorialStep === 0 ? '#2563eb' : 'rgba(30,30,50,0.9)',
                    border: `2px solid ${tutorialStep === 0 ? '#93c5fd' : 'rgba(255,255,255,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', color: '#fff', fontWeight: 900,
                    transition: 'all 0.3s', cursor: 'pointer', zIndex: 2
                  }}
                >{tutorialStep === 0 ? '?' : tutorialStep >= 1 ? '♂' : '?'}</div>
              </div>

              {/* Center: name + zona */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  AGUILAR DELGADO, MELANY
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--foreground-2)' }}>8540257</span>
                  <span
                    className={tutorialStep === 1 ? 'tut-highlight' : ''}
                    style={{
                      fontSize: '0.68rem', fontWeight: 700,
                      background: tutorialStep === 1 ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.12)',
                      color: '#60a5fa', borderRadius: '4px', padding: '1px 6px',
                      border: `1px solid ${tutorialStep === 1 ? '#3b82f6' : 'rgba(37,99,235,0.2)'}`,
                      transition: 'all 0.3s', cursor: 'pointer'
                    }}
                  >🏙 Urbano</span>
                </div>
              </div>

              {/* Right: estado + doc btn */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end', flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700,
                  background: tutorialStep === 3 ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
                  color: '#34d399',
                  border: `1px solid ${tutorialStep === 3 ? '#10b981' : 'rgba(16,185,129,0.2)'}`,
                  borderRadius: '4px', padding: '2px 7px', transition: 'all 0.4s'
                }}>
                  {tutorialStep === 3 ? '✓ Formalizado' : '⏳ Pendiente'}
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--foreground-2)', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    ● Activo
                  </span>
                  <span
                    className={tutorialStep === 2 ? 'tut-highlight' : ''}
                    style={{
                      fontSize: '0.68rem', fontWeight: 700,
                      background: tutorialStep >= 2 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)',
                      color: tutorialStep >= 2 ? '#34d399' : '#f87171',
                      border: `1px solid ${tutorialStep >= 2 ? '#10b981' : 'rgba(239,68,68,0.3)'}`,
                      borderRadius: '4px', padding: '2px 7px',
                      transition: 'all 0.4s', cursor: 'pointer'
                    }}
                  >{tutorialStep >= 2 ? '📄 Doc. OK' : '📋 Sin Doc.'}</span>
                </div>
              </div>

              {/* Animated arrow pointing at the active zone */}
              <div style={{
                position: 'absolute',
                bottom: '-1.8rem',
                left: tutorialStep === 0 ? '28px' : tutorialStep === 1 ? '95px' : tutorialStep === 2 ? 'calc(100% - 90px)' : 'calc(100% - 115px)',
                transition: 'left 0.4s cubic-bezier(.4,0,.2,1)',
                fontSize: '1rem',
                animation: 'tut-bounce 1.2s ease-in-out infinite',
                color: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'][tutorialStep]
              }}>▲</div>
            </div>

            {/* Call to action note (highlighted) */}
            <div style={{
              background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '1rem',
              borderLeft: '4px solid var(--primary)', fontSize: '0.78rem',
              color: 'var(--foreground-2)', fontWeight: 600, marginBottom: '1.75rem',
              lineHeight: 1.5, marginTop: '1.5rem'
            }}>
              💡 <strong>¿Por qué es importante?</strong><br />
              Esto les ayudará a reportar de manera eficiente y rápido directo desde sistema.
            </div>

            {/* Action Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  sessionStorage.setItem('inscriptions_alert_seen', 'true')
                  setWelcomeAlert(false)
                }}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '0.9rem', fontWeight: 800,
                  borderRadius: '1.25rem',
                  boxShadow: '0 8px 16px rgba(213, 173, 66, 0.3)',
                  cursor: 'pointer'
                }}
              >
                Entendido, empezar
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  )
}
