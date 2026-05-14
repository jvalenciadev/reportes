'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Save, Search, CalendarDays, ChevronLeft, ChevronRight,
  History, Users as UsersIcon, Clock, AlertCircle, FileText,
  CheckCircle, XCircle, Info, Zap,
  UserCheck,
  UserMinus,
  ShieldCheck
} from 'lucide-react'
import StatusModal, { StatusType } from '../components/StatusModal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function AttendanceClient({
  departamentos,
  userDeptId,
  userRole,
  facilitadorGroups = [],
  currentUser
}: {
  departamentos: any[],
  userDeptId?: string,
  userRole?: string,
  facilitadorGroups?: any[],
  currentUser: string
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
  const [facilitators, setFacilitators] = useState<{ name: string, depto: string }[]>([])
  const [selectedFacilitator, setSelectedFacilitator] = useState('')
  const [dayNumber, setDayNumber] = useState(1)
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedModule, setSelectedModule] = useState('')

  // Data State
  const [groups, setGroups] = useState<any[]>(userRole === 'facilitador' ? facilitadorGroups : [])
  const [programs, setPrograms] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // UI State
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({}) // participantId -> status
  const [initialAttendance, setInitialAttendance] = useState<Record<string, string>>({})
  const [initialDate, setInitialDate] = useState('')
  const isDirty = JSON.stringify(attendanceData) !== JSON.stringify(initialAttendance) || selectedDate !== initialDate
  const [showDirtyModal, setShowDirtyModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [historyDays, setHistoryDays] = useState<{ dia: number, fecha: string, asistio: number, atraso: number, falta: number, permiso: number, total: number }[]>([])

  // 1. Initial Load: Programs
  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase.from('programas').select('*').eq('estado', 'activo')
      setPrograms(data || [])
      if (data && data.length > 0) setSelectedProgram(data[0].id)
    }
    fetchPrograms()
  }, [])

  // Auto-select for facilitadores: dept + group from their assigned groups
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

    // A. Fetch Participants enrolled in this group/program (Only active 'inscritos')
    const { data: enrolled, error: pErr } = await supabase
      .from('inscripciones')
      .select('*, participantes(*)')
      .eq('grupo_id', selectedGroup)
      .eq('programa_id', selectedProgram)
      .eq('estado', 'inscrito')

    if (pErr) {
      console.error('Error cargando participantes:', pErr)
      showNotif('error', 'Error de Carga', pErr.message)
      setLoading(false)
      return
    }

    // B. Fetch Existing Attendance for this specific module/day/date
    const { data: existing } = await supabase
      .from('asistencias')
      .select('*')
      .eq('modulo_id', selectedModule)

    // Filter existing attendance for the participants in this group
    const enrolledIds = enrolled?.map((p: any) => p.participante_id) || []
    const groupAttendance = existing?.filter((a: any) => enrolledIds.includes(a.participante_id)) || []

    // Generate history of days (Grouped strictly by Day Number)
    const historyMap = new Map()
    groupAttendance.forEach((a: any) => {
      const key = a.dia
      if (!historyMap.has(key)) {
        historyMap.set(key, { dia: a.dia, fecha: a.fecha, asistio: 0, atraso: 0, falta: 0, permiso: 0, total: 0 })
      }
      const entry = historyMap.get(key)
      entry.total += 1
      if (a.estado === 'asistio') entry.asistio += 1
      if (a.estado === 'atraso') entry.atraso += 1
      if (a.estado === 'falta') entry.falta += 1
      if (a.estado === 'permiso') entry.permiso += 1
      // Keep the most recent date as reference for the history list
      if (new Date(a.fecha) > new Date(entry.fecha)) entry.fecha = a.fecha
    })
    const historyList = Array.from(historyMap.values()).sort((a, b) => a.dia - b.dia)

    // Map existing attendance for the CURRENT dayNumber to state
    const currentSessionAttendance = groupAttendance.filter((a: any) => a.dia === dayNumber)
    const attMap: Record<string, string> = {}

    // Senior Approach: Initialize attendance for ALL enrolled participants
    // If a record exists, use it. If not, start as empty (no status)
    enrolled?.forEach((p: any) => {
      const existing = currentSessionAttendance.find((a: any) => a.participante_id === p.participante_id)
      attMap[p.participante_id] = existing ? existing.estado : ''
    })



    const sortedEnrolled = (enrolled || []).sort((a: any, b: any) => {
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

    // C. Fetch Facilitators for this group to select "Responsable" in PDF
    const { data: facs } = await supabase
      .from('facilitador_grupos')
      .select('profiles(full_name, departamentos(name))')
      .eq('grupo_id', selectedGroup)

    const facObjects = facs?.map((f: any) => ({
      name: f.profiles?.full_name || '',
      depto: f.profiles?.departamentos?.name || 'N/A'
    })).filter(f => f.name) || []

    setFacilitators(facObjects)
    if (facObjects.length > 0) setSelectedFacilitator(facObjects[0].name)

    setParticipants(sortedEnrolled)
    setAttendanceData(attMap)
    setInitialAttendance(attMap)
    setInitialDate(selectedDate)
    setHistoryDays(historyList)

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

    // 1. Fetch existing records for these participants in THIS module/day
    const { data: existingRecords } = await supabase
      .from('asistencias')
      .select('id, participante_id')
      .eq('modulo_id', selectedModule)
      .eq('dia', dayNumber)

    // Senior Approach: Save entries for all participants who have a status selected
    // and explicitly update the date for ALL of them to match the current selection.
    const records = Object.entries(attendanceData)
      .filter(([_, estado]) => estado !== '') // Only save if a status is selected
      .map(([participantId, estado]) => {
        const existing = existingRecords?.find(r => r.participante_id === participantId)
        return {
          ...(existing ? { id: existing.id } : {}),
          participante_id: participantId,
          modulo_id: selectedModule,
          dia: dayNumber,
          estado,
          fecha: selectedDate
        }
      })

    // Now upserting with 'id' is safe because 'id' is the Primary Key 
    // and always has a unique constraint.
    const { error } = await supabase
      .from('asistencias')
      .upsert(records, { onConflict: 'id' })

    if (error) {
      showNotif('error', 'Fallo en el Registro', `No se pudo guardar la asistencia: ${error.message}`)
    } else {
      showNotif('success', '¡Asistencia Guardada!', 'Se han registrado correctamente los datos.')
      setInitialAttendance(attendanceData) // Reset dirty state
      setInitialDate(selectedDate)
      loadAttendanceSession()
    }
    setSaving(false)
  }

  // Stats for current session
  // Stats for current session (calculated in every render)
  const stats = {
    asistieron: participants.filter(p => attendanceData[p.participante_id] === 'asistio').length,
    atrasos: participants.filter(p => attendanceData[p.participante_id] === 'atraso').length,
    faltas: participants.filter(p => attendanceData[p.participante_id] === 'falta').length,
    permisos: participants.filter(p => attendanceData[p.participante_id] === 'permiso').length,
  }

  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // 1. Full Page Background
    const backgroundImage = 'https://czdeexmxosivvpwwatsq.supabase.co/storage/v1/object/sign/logos/fondo_doc.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85ZTAwNzJkNC00ZTNjLTQ1ZjMtYjZhNC0yZWJmZThkNGNkM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9mb25kb19kb2MuanBnIiwiaWF0IjoxNzc4NjgyNjkzLCJleHAiOjE4MTAyMTg2OTN9.Z6qEHAgrqYN04OWtGdZHdwZ0D10xrm1bVulbk-MWTxM'

    try {
      doc.addImage(backgroundImage, 'JPEG', 0, 0, pageWidth, pageHeight)
    } catch (e) {
      console.warn("Background image not found")
    }

    const group = groups.find(g => g.id === selectedGroup)
    const groupName = group?.name || 'GRUPO'
    const programName = programs.find(p => p.id === selectedProgram)?.titulo || ''
    const moduleName = modules.find(m => m.id === selectedModule)?.titulo_modulo || ''
    const deptoName = departamentos.find(d => d.id === selectedDepto)?.nombre || 'N/A'
    // --- TITULO PRINCIPAL (BANNER INSTITUCIONAL) ---
    doc.setFillColor(187, 151, 58) // Dorado institucional #bb973a
    doc.rect(14, 40, 182, 10, 'F')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('ASISTENCIA DE ESTUDIANTES / PARTICIPANTES', pageWidth / 2, 54.5, { align: 'center' })

    const currentFac = facilitators.find(f => f.name === selectedFacilitator)
    const facilitatorDepto = currentFac?.depto || 'N/A'

    // --- BLOQUE DE METADATOS (TABLA DINÁMICA - AUTO AJUSTABLE) ---
    autoTable(doc, {
      startY: 58,
      body: [
        [
          { content: `DEPARTAMENTO: ${facilitatorDepto.toUpperCase()}`, styles: { cellWidth: 91 } },
          { content: `PERIODO: I/2026`, styles: { cellWidth: 91 } }
        ],
        [
          { content: `FACILITADOR: ${selectedFacilitator.toUpperCase() || 'N/A'}` },
          { content: `FECHA: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}` }
        ],
        [
          { content: `MÓDULO: ${moduleName.toUpperCase()}` },
          { content: `PROGRAMA: ${programName.toUpperCase()}` }
        ],
        [
          { content: `GRUPO: ${groupName.toUpperCase()}` },
          { content: `JORNADA REGISTRADA: DÍA ${dayNumber}` }
        ]
      ],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [20, 20, 20],
        lineWidth: 0.1,
        lineColor: [100, 100, 100],
        overflow: 'linebreak' // Permite el salto de línea automático
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    })

    const metaFinalY = (doc as any).lastAutoTable.finalY + 5

    // --- TABLA DE ASISTENCIA ---
    const tableData = participants.map((p, idx) => {
      const apellidos = p.participantes.apellido.split(' ')
      const paterno = apellidos[0] || ''
      const materno = apellidos.slice(1).join(' ') || ''

      const status = attendanceData[p.participante_id]
      let statusChar = ''
      switch (status) {
        case 'asistio': statusChar = 'A'; break
        case 'atraso': statusChar = 'AT'; break
        case 'falta': statusChar = 'F'; break
        case 'permiso': statusChar = 'P'; break
        default: statusChar = '-'; break
      }

      return [
        idx + 1,
        p.participantes.ci,
        p.participantes.nombre.toUpperCase(),
        p.paterno || paterno.toUpperCase(),
        p.materno || materno.toUpperCase(),
        statusChar,
        ''
      ]
    })

    autoTable(doc, {
      startY: metaFinalY,
      head: [['Nro', 'C.I.', 'NOMBRES', 'APELLIDO PATERNO', 'APELLIDO MATERNO', 'ASIST.', 'OBSERVACIONES']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontSize: 7,
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [80, 80, 80],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [30, 30, 30],
        lineWidth: 0.1,
        lineColor: [150, 150, 150]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 15 },
        6: { cellWidth: 40 }
      },
      margin: { left: 14, right: 14 }
    })

    const finalY = (doc as any).lastAutoTable.finalY || 150

    // --- LEYENDA Y RESUMEN ESTADÍSTICO (DISEÑO TÉCNICO) ---
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100)
    doc.text('SIMBOLOGÍA: A: ASISTIÓ | AT: ATRASO | F: FALTA | P: PERMISO', 14, finalY + 5)

    const pct = participants.length > 0 ? Math.round((stats.asistieron / participants.length) * 100) : 0

    autoTable(doc, {
      startY: finalY + 8,
      head: [[{ content: 'INDICADORES ESTADÍSTICOS DE LA JORNADA', colSpan: 5, styles: { halign: 'center', fillColor: [245, 245, 245], fontSize: 7 } }]],
      body: [
        [
          { content: 'TOTAL PARTICIPANTES', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'ASISTENCIA (%)', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'ATRASOS', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'FALTAS', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'PERMISOS', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }
        ],
        [
          participants.length,
          `${stats.asistieron} (${pct}%)`,
          stats.atrasos,
          stats.faltas,
          stats.permisos
        ]
      ],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [180, 180, 180],
        textColor: [0, 0, 0]
      },
      margin: { left: 14, right: 14 }
    })

    // --- SECCIÓN DE FIRMA (DISEÑO PROFESIONAL) ---
    const lastY = (doc as any).lastAutoTable.finalY || finalY + 30
    const signatureY = Math.min(pageHeight - 35, lastY + 25)

    doc.setDrawColor(0)
    doc.line(70, signatureY, 140, signatureY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('FIRMA DEL FACILITADOR', pageWidth / 2, signatureY + 5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.text(selectedFacilitator.toUpperCase(), pageWidth / 2, signatureY + 9, { align: 'center' })

    // Pie de página institucional
    doc.setFontSize(6)
    doc.setTextColor(150)
    doc.text(`Documento generado por el Sistema de Gestión PROFE v2.1 el ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' })

    doc.save(`ASISTENCIA_${groupName.replace(/\s+/g, '_')}_DIA_${dayNumber}.pdf`)
  }

  return (
    <>
      <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* 1. Control Panel Header (Always Visible) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
          <div className="card glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(var(--primary-rgb), 0.05) 100%)' }}>
            <div style={{ background: 'var(--primary)', color: '#000', width: '60px', height: '60px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(var(--primary-rgb), 0.3)' }}>
              <Zap size={32} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 700, marginBottom: '0.25rem' }}>Jornada Actual</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)' }}>DÍA {dayNumber}</div>
            </div>
          </div>

          <div className="card glass" style={{ padding: '1.5rem' }}>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800, display: 'block', marginBottom: '0.5rem' }}>Fecha de Registro</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.6rem', color: 'var(--foreground)', fontSize: '0.9rem' }}
            />
          </div>

          <div className="card glass" style={{ padding: '1.5rem' }}>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800, display: 'block', marginBottom: '0.5rem' }}>Programa & Módulo</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                {programs.map((p: any) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>
              <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                {modules.map((m: any) => <option key={m.id} value={m.id}>{m.titulo_modulo}</option>)}
              </select>
            </div>
          </div>

          <div className="card glass" style={{ padding: '1.5rem' }}>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800, display: 'block', marginBottom: '0.5rem' }}>{userRole === 'facilitador' ? 'Modo Facilitador' : 'Filtro de Grupo'}</label>
            <select value={selectedGroup} onChange={e => { setSelectedGroup(e.target.value); setSelectedFacilitator(''); }} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontWeight: 600 }}>
              <option value="">Seleccionar Grupo</option>
              {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedGroup ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Prominent History Table */}
          <div className="card glass" style={{ borderTop: '4px solid var(--info)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} color="var(--info)" /> Jornadas Registradas para {groups.find(g => g.id === selectedGroup)?.name}
              </h3>
              <button
                className="btn btn-outline"
                onClick={() => {
                  const action = () => {
                    const today = new Date().toISOString().split('T')[0];
                    setSelectedDate(today);
                    const nextDay = historyDays.length > 0 ? Math.max(...historyDays.map(h => h.dia)) + 1 : 1;
                    setDayNumber(nextDay);
                  };
                  if (isDirty) {
                    setPendingAction(() => action);
                    setShowDirtyModal(true);
                  } else {
                    action();
                  }
                }}
                style={{ borderColor: 'var(--info)', color: 'var(--info)' }}
              >
                + Nueva Jornada (Hoy)
              </button>
            </div>

            {historyDays.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr style={{ background: 'transparent' }}>
                      <th>Jornada</th>
                      <th style={{ textAlign: 'center' }}>Asistió</th>
                      <th style={{ textAlign: 'center' }}>Atraso</th>
                      <th style={{ textAlign: 'center' }}>Falta</th>
                      <th style={{ textAlign: 'center' }}>Permiso</th>
                      <th style={{ textAlign: 'center' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyDays.map(h => {
                      const isEditing = h.dia === dayNumber;
                      return (
                        <tr key={h.dia} style={{ background: isEditing ? 'var(--primary-light)' : 'transparent', transition: 'all 0.2s' }}>
                          <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>Día {h.dia}</td>
                          <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 800 }}>{h.asistio}</td>
                          <td style={{ textAlign: 'center', color: 'var(--warning)', fontWeight: 800 }}>{h.atraso}</td>
                          <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 800 }}>{h.falta}</td>
                          <td style={{ textAlign: 'center', color: 'var(--info)', fontWeight: 800 }}>{h.permiso}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--muted)' }}>{h.total}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className={`btn ${isEditing ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => {
                                const action = () => {
                                  setDayNumber(h.dia);
                                  setSelectedDate(h.fecha);
                                };
                                if (isDirty && !isEditing) {
                                  setPendingAction(() => action);
                                  setShowDirtyModal(true);
                                } else {
                                  action();
                                }
                              }}
                              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', border: isEditing ? 'none' : '1px solid var(--border)' }}
                            >
                              {isEditing ? 'Editando...' : 'Ver / Editar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px dashed var(--border)' }}>
                <History size={32} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                <div>No hay asistencias registradas aún. Comienza pasando lista abajo.</div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>

            {/* Listado de Pase de Lista */}
            <div className="card glass" style={{ borderTop: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UsersIcon size={20} color="var(--primary)" /> Pase de Lista: Día {dayNumber} ({new Date(selectedDate + 'T00:00:00').toLocaleDateString()})
                  {isDirty && (
                    <div className="animate-fade-in" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#f59e0b',
                      fontSize: '0.7rem',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '0.375rem',
                      fontWeight: 700,
                      marginLeft: '1rem',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      <AlertCircle size={14} /> Cambios Pendientes de Guardado
                    </div>
                  )}
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
                    {participants.map((p) => {
                      const current = attendanceData[p.participante_id]
                      const rowBg = current === 'asistio' ? 'rgba(16,217,139,0.05)'
                        : current === 'atraso' ? 'rgba(245,166,35,0.05)'
                          : current === 'falta' ? 'rgba(239,68,68,0.05)'
                            : current === 'permiso' ? 'rgba(99,102,241,0.05)'
                              : 'transparent'

                      const statusConfig = {
                        asistio: { label: '✓ Asistió', activeColor: '#10d98b', activeBg: 'rgba(16,217,139,0.15)', activeBorder: '#10d98b' },
                        atraso: { label: '⏱ Atraso', activeColor: '#f5a623', activeBg: 'rgba(245,166,35,0.15)', activeBorder: '#f5a623' },
                        falta: { label: '✗ Falta', activeColor: '#ef4444', activeBg: 'rgba(239,68,68,0.15)', activeBorder: '#ef4444' },
                        permiso: { label: '📋 Permiso', activeColor: '#6366f1', activeBg: 'rgba(99,102,241,0.15)', activeBorder: '#6366f1' },
                      } as Record<string, any>

                      return (
                        <tr key={p.participante_id} style={{ background: rowBg, transition: 'background 0.2s' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{p.participantes.apellido}, {p.participantes.nombre}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>CI: {p.participantes.ci}</div>
                          </td>
                          {(['asistio', 'atraso', 'falta', 'permiso'] as const).map((status) => {
                            const cfg = statusConfig[status]
                            const isActive = current === status
                            return (
                              <td key={status} style={{ textAlign: 'center', padding: '0.85rem 0.5rem' }}>
                                <button
                                  onClick={() => handleStatusChange(p.participante_id, isActive ? '' : status)}
                                  style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '0.75rem',
                                    border: isActive ? `2px solid ${cfg.activeBorder}` : '1px solid var(--border)',
                                    background: isActive ? cfg.activeBg : 'transparent',
                                    color: isActive ? cfg.activeColor : 'var(--muted)',
                                    fontWeight: isActive ? 800 : 500,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    width: '100%',
                                    minWidth: '100px',
                                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                    boxShadow: isActive ? `0 4px 12px ${cfg.activeBg}` : 'none'
                                  }}
                                >
                                  {cfg.label}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{
                marginTop: '2rem',
                padding: '1.25rem',
                borderRadius: '1.25rem',
                background: 'rgba(var(--primary-rgb), 0.03)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                    <ShieldCheck size={16} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuración de Firmas en Reporte</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontStyle: 'italic' }}>Este diseño aparecerá al final de tu PDF</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px dashed var(--border)', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
                    <div style={{ height: '1px', background: 'var(--foreground)', margin: '0 auto 1rem', opacity: 0.2, width: '60%' }}></div>

                    {facilitators.length > 1 ? (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <select
                          value={selectedFacilitator}
                          onChange={e => setSelectedFacilitator(e.target.value)}
                          style={{
                            background: 'rgba(var(--primary-rgb), 0.1)',
                            border: '1px solid var(--primary)',
                            color: 'var(--primary)',
                            fontWeight: 900,
                            fontSize: '0.95rem',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '0.5rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          {facilitators.map((f: any) => <option key={f.name} value={f.name}>{f.name.toUpperCase()}</option>)}
                        </select>
                        <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.5rem', fontWeight: 600 }}>
                          Para descargar, seleccione el facilitador a cargo del módulo. <br />
                          <span style={{ color: 'var(--primary)', opacity: 0.8 }}>No es necesario "Consolidar" para descargar el PDF.</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.2rem' }}>
                          {(selectedFacilitator || 'N/A').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--primary)', opacity: 0.8, fontWeight: 600 }}>
                          No es necesario "Consolidar" para descargar el PDF.
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>FIRMA DEL FACILITADOR</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '1.25rem', fontSize: '1.1rem' }}
                  onClick={() => setShowConfirm(true)}
                  disabled={saving || participants.length === 0}
                >
                  {saving ? 'Consolidando...' : <><Save size={20} /> Consolidar Reporte de Asistencia</>}
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '1.25rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={generatePDF}
                  disabled={participants.length === 0}
                >
                  <FileText size={20} /> Generar PDF
                </button>
              </div>


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
        </div>
      ) : (
        <div className="card glass" style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.1 }} />
          <p>Selecciona Programa, Módulo y Grupo para iniciar el pase de lista</p>
        </div>
      )}

      <style jsx>{`
        .btn-status-asistio { background: #10b981; color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .btn-status-atraso { background: #f59e0b; color: white; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
        .btn-status-falta { background: #ef4444; color: white; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
        .btn-status-permiso { background: #3b82f6; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .btn-ghost { 
          background: rgba(0, 0, 0, 0.03); 
          color: var(--muted); 
          border: 1px solid var(--border);
        }
        .btn-ghost:hover { 
          background: rgba(0, 0, 0, 0.08);
          color: var(--foreground);
        }
        .row-hover:hover { 
          background: rgba(0, 0, 0, 0.02) !important; 
        }
      `}</style>

      {/* Custom Confirmation Modal for Saving */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card glass animate-fade-up" style={{ maxWidth: '400px', width: '90%', padding: '2rem', borderTop: '4px solid var(--warning)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
              <AlertCircle size={24} /> Confirmar Asistencia
            </h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              ¿Estás seguro que los datos son correctos? <strong style={{ color: 'var(--foreground)' }}>Una vez finalizado, no se podrán editar fácilmente.</strong>
            </p>

            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span>Fecha de Asistencia:</span> <strong style={{ color: 'var(--primary)' }}>{new Date(selectedDate + 'T00:00:00').toLocaleDateString()}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span>Jornada / Día:</span> <strong style={{ color: 'var(--primary)' }}>Día {dayNumber}</strong></div>
              <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span>Total Inscritos:</span> <strong style={{ fontSize: '1.1rem' }}>{participants.length}</strong></div>
              <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontSize: '0.9rem' }}><span>Total Asistieron:</span> <strong style={{ fontSize: '1.1rem' }}>{stats.asistieron}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)', fontSize: '0.9rem' }}><span>Total Atrasos:</span> <strong style={{ fontSize: '1.1rem' }}>{stats.atrasos}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)', fontSize: '0.9rem' }}><span>Total Faltas:</span> <strong style={{ fontSize: '1.1rem' }}>{stats.faltas}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--info)', fontSize: '0.9rem' }}><span>Total Permisos:</span> <strong style={{ fontSize: '1.1rem' }}>{stats.permisos}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }}
                onClick={() => {
                  setShowConfirm(false);
                  saveAttendance();
                }}
              >
                Sí, Guardar Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dirty State Warning Modal */}
      {showDirtyModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div className="card glass animate-fade-up" style={{ maxWidth: '450px', width: '90%', padding: '2.5rem', borderTop: '5px solid #ef4444', textAlign: 'center' }}>
            <div style={{ color: '#ef4444', marginBottom: '1.5rem' }}>
              <AlertCircle size={64} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ marginBottom: '1rem', fontWeight: 900 }}>¡Cambios sin Guardar!</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
              Tienes modificaciones en el pase de lista de la jornada actual (Día {dayNumber}).
              Si continúas, estos cambios se **perderán permanentemente**.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444', padding: '1rem' }}
                onClick={() => {
                  if (pendingAction) pendingAction();
                  setShowDirtyModal(false);
                  setPendingAction(null);
                }}
              >
                Descartar Cambios y Continuar
              </button>
              <button
                className="btn btn-outline"
                style={{ padding: '1rem' }}
                onClick={() => {
                  setShowDirtyModal(false);
                  setPendingAction(null);
                }}
              >
                Volver y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

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
