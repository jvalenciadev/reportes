'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/utils/supabase/client'
import {
  Save, Search, CalendarDays, ChevronLeft, ChevronRight,
  History, Users as UsersIcon, Clock, AlertCircle, FileText,
  CheckCircle, XCircle, Info, Zap, Edit2
} from 'lucide-react'
import StatusModal, { StatusType } from '../components/StatusModal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { updateTutorProfile, getTutorsAttendanceSession, saveTutorAttendanceServer, getAllTutorsAttendance, getGeneralTutorsAttendance } from './actions'

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string), false)
    reader.addEventListener('error', () => reject(new Error('Failed to read blob')))
    reader.readAsDataURL(blob)
  })
}

export default function TutorsAttendanceClient({
  departamentos,
  userDeptId,
  userRole,
  facilitadorGroups = [],
  currentUser
}: {
  departamentos: any[]
  userDeptId?: string
  userRole?: string
  facilitadorGroups?: any[]
  currentUser: string
}) {
  const supabase = createClient()
  const isReadOnly = userRole === 'visualizador'
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Notification State
  const [notif, setNotif] = useState({ show: false, type: 'info' as StatusType, title: '', message: '' })
  const showNotif = (type: StatusType, title: string, message: string) => {
    setNotif({ show: true, type, title, message })
  }

  // Selectors State
  const [selectedDepto, setSelectedDepto] = useState(userDeptId || '')
  const [facilitators, setFacilitators] = useState<{ name: string; depto: string }[]>([])
  const [selectedFacilitator, setSelectedFacilitator] = useState('')
  const [dayNumber, setDayNumber] = useState(1)
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedModule, setSelectedModule] = useState('')
  const [selectedFilterGroups, setSelectedFilterGroups] = useState<string[]>([])

  // Data State
  const [groups, setGroups] = useState<any[]>(userRole === 'facilitador' ? facilitadorGroups : [])
  const [programs, setPrograms] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [tutors, setTutors] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // UI State
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({}) // tutorId -> status
  const [initialAttendance, setInitialAttendance] = useState<Record<string, string>>({})
  const [initialDate, setInitialDate] = useState('')
  const isDirty = JSON.stringify(attendanceData) !== JSON.stringify(initialAttendance) || selectedDate !== initialDate
  const [historyDays, setHistoryDays] = useState<{ dia: number; fecha: string; asistio: number; atraso: number; falta: number; permiso: number; total: number }[]>([])

  // States for inline tutor editing
  const [editingTutorId, setEditingTutorId] = useState<string | null>(null)
  const [editTutorData, setEditTutorData] = useState({
    nombre: '',
    apellidos: '',
    ci: '',
    correo: ''
  })
  const [updatingTutor, setUpdatingTutor] = useState(false)

  const currentModuleObj = modules.find(m => m.id === selectedModule)
  const visibleTutors = selectedFilterGroups.length > 0 ? tutors.filter(t => selectedFilterGroups.includes(t.grupo_id)) : tutors

  const getAutoDateForDay = (day: number) => {
    if (!currentModuleObj || !currentModuleObj.fecha_inicio) {
      return new Date().toISOString().split('T')[0]
    }
    try {
      const startDate = new Date(currentModuleObj.fecha_inicio + 'T00:00:00')
      startDate.setDate(startDate.getDate() + (day - 1))
      return startDate.toISOString().split('T')[0]
    } catch (e) {
      return new Date().toISOString().split('T')[0]
    }
  }

  const handleSaveTutor = async (tutorId: string) => {
    const upperNombre = editTutorData.nombre.trim().toUpperCase()
    const upperApellidos = editTutorData.apellidos.trim().toUpperCase()

    if (!upperNombre || !upperApellidos) {
      showNotif('error', 'Campos requeridos', 'El nombre y apellidos son obligatorios.')
      return
    }

    setUpdatingTutor(true)
    const res = await updateTutorProfile(tutorId, {
      nombre: upperNombre,
      apellidos: upperApellidos,
      ci: editTutorData.ci,
      correo: editTutorData.correo
    })

    if (res?.error) {
      showNotif('error', 'Fallo al Guardar', `Error al actualizar los datos del tutor: ${res.error}`)
    } else {
      showNotif('success', '¡Datos Actualizados!', 'Los datos del tutor se han actualizado correctamente.')
      setEditingTutorId(null)
      setTutors(prev => prev.map(t => {
        if (t.id === tutorId) {
          return {
            ...t,
            nombre: upperNombre,
            apellidos: upperApellidos,
            ci: editTutorData.ci,
            correo: editTutorData.correo,
            email: editTutorData.correo
          }
        }
        return t
      }))
    }
    setUpdatingTutor(false)
  }

  // 1. Initial Load: Programs
  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase.from('programas').select('*').eq('estado', 'activo')
      setPrograms(data || [])
      if (data && data.length > 0) setSelectedProgram(data[0].id)
    }
    fetchPrograms()
  }, [])

  // Auto-select for facilitadores
  useEffect(() => {
    if (userRole === 'facilitador' && facilitadorGroups.length > 0) {
      const firstGroup = facilitadorGroups[0]
      setGroups(facilitadorGroups)
      if (firstGroup.departamento_id) {
        setSelectedDepto(firstGroup.departamento_id)
      }
    }
  }, [userRole, JSON.stringify(facilitadorGroups)])

  // 2. Load Modules when Program changes
  useEffect(() => {
    if (!selectedProgram) return
    const fetchModules = async () => {
      const { data } = await supabase
        .from('programa_modulos')
        .select('*')
        .eq('programa_id', selectedProgram)
        .order('grupo', { ascending: true })
        .order('orden', { ascending: true })

      const sortedData = data || []
      const todayStr = new Date().toISOString().split('T')[0]
      const visibleData = sortedData.filter(m => todayStr >= m.fecha_inicio)
      setModules(visibleData)

      if (visibleData.length > 0) {
        const currentModule = visibleData.find(m => todayStr >= m.fecha_inicio && todayStr <= m.fecha_fin)
        if (currentModule) {
          setSelectedModule(currentModule.id)
        } else {
          setSelectedModule(visibleData[visibleData.length - 1].id)
        }
      } else {
        setSelectedModule('')
      }
    }
    fetchModules()
  }, [selectedProgram])

  // 3. Load Groups when Depto changes
  useEffect(() => {
    if (!selectedDepto) return
    const fetchGroups = async () => {
      let query = supabase.from('grupos').select('*').eq('departamento_id', selectedDepto)
      const { data } = await query
      setGroups(data || [])

      setSelectedFilterGroups([])
    }
    fetchGroups()
  }, [selectedDepto])

  // 4. Load Tutors and their existing Attendance for the day
  const loadAttendanceSession = async () => {
    if (!selectedDepto || !selectedModule) return
    setLoading(true)

    if (dayNumber > 6) {
      setDayNumber(6)
      setLoading(false)
      return
    }

    const res = await getTutorsAttendanceSession(
      selectedDepto,
      selectedModule,
      dayNumber,
      userRole,
      facilitadorGroups?.map(fg => fg.id)
    )

    if (res?.error) {
      console.error('Error cargando asistencias/tutores:', res.error)
      showNotif('error', 'Fallo al Cargar Datos', `No se pudieron obtener los registros: ${res.error}`)
      setLoading(false)
      return
    }

    const activeTutors = res.tutors || []
    const groupAttendance = res.attendance || []
    const facObjects = res.facilitators || []
    const fetchedGroups = res.groups || []

    if (fetchedGroups.length > 0) {
      setGroups(fetchedGroups)
    }

    // Generate history of days
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
      if (new Date(a.fecha) > new Date(entry.fecha)) entry.fecha = a.fecha
    })
    const historyList = Array.from(historyMap.values()).sort((a, b) => a.dia - b.dia)

    // Map existing attendance for current day
    const currentSessionAttendance = groupAttendance.filter((a: any) => a.dia === dayNumber)
    const attMap: Record<string, string> = {}

    activeTutors.forEach((t: any) => {
      const existing = currentSessionAttendance.find((a: any) => a.tutor_id === t.id)
      attMap[t.id] = existing ? existing.estado : ''
    })

    const sortedTutors = activeTutors.sort((a: any, b: any) => {
      const apellidoA = (a.apellidos || '').toLowerCase()
      const apellidoB = (b.apellidos || '').toLowerCase()
      if (apellidoA < apellidoB) return -1
      if (apellidoA > apellidoB) return 1
      const nombreA = (a.nombre || '').toLowerCase()
      const nombreB = (b.nombre || '').toLowerCase()
      if (nombreA < nombreB) return -1
      if (nombreA > nombreB) return 1
      return 0
    })

    setFacilitators(facObjects)
    if (facObjects.length > 0) setSelectedFacilitator(facObjects[0].name)

    setTutors(sortedTutors)
    setAttendanceData(attMap)
    setInitialAttendance(attMap)

    let activeDate = selectedDate
    if (currentSessionAttendance.length > 0) {
      activeDate = currentSessionAttendance[0].fecha
      setSelectedDate(activeDate)
    }
    setInitialDate(activeDate)
    setHistoryDays(historyList)
    setLoading(false)
  }

  useEffect(() => {
    loadAttendanceSession()
  }, [selectedDepto, selectedModule, dayNumber])

  // Auto-sync date when dayNumber or module changes
  useEffect(() => {
    if (selectedModule && dayNumber && modules.length > 0) {
      const autoDate = getAutoDateForDay(dayNumber)
      setSelectedDate(autoDate)
    }
  }, [selectedModule, dayNumber, modules])

  const handleStatusChange = (tutorId: string, status: string) => {
    setAttendanceData(prev => ({ ...prev, [tutorId]: status }))
  }

  const saveAttendance = async () => {
    if (!selectedModule || visibleTutors.length === 0) return
    setSaving(true)

    if (dayNumber > 6) {
      showNotif('error', 'Límite de Dias', 'No se puede registrar asistencia para un Día superior a 6.')
      setSaving(false)
      return false
    }

    const tutorIds = visibleTutors.map((t: any) => t.id)
    if (tutorIds.length === 0) {
      setSaving(false)
      return false
    }

    // Load existing records first to preserve IDs if present
    const resLoad = await getTutorsAttendanceSession(
      selectedDepto,
      selectedModule,
      dayNumber,
      userRole,
      facilitadorGroups?.map(fg => fg.id)
    )

    const existingRecords = resLoad?.attendance?.filter((a: any) => a.dia === dayNumber) || []

    const records = visibleTutors.map((t: any) => {
      const tutorId = t.id
      const estado = attendanceData[tutorId] || 'falta'
      const existing = existingRecords?.find((r: any) => r.tutor_id === tutorId)
      return {
        ...(existing ? { id: existing.id } : {}),
        tutor_id: tutorId,
        modulo_id: selectedModule,
        dia: dayNumber,
        estado: estado === '' ? 'falta' : estado,
        fecha: selectedDate
      }
    })

    const resSave = await saveTutorAttendanceServer(records)

    if (resSave?.error) {
      showNotif('error', 'Fallo en el Registro', `No se pudo guardar la asistencia: ${resSave.error}`)
      setSaving(false)
      return false
    } else {
      showNotif('success', '¡Asistencia Guardada!', 'Se han registrado correctamente los datos.')
      const savedStates: Record<string, string> = {}
      records.forEach(r => {
        savedStates[r.tutor_id] = r.estado
      })
      setAttendanceData(savedStates)
      setInitialAttendance(savedStates)
      setInitialDate(selectedDate)
      loadAttendanceSession()
      setSaving(false)
      return true
    }
  }

  const stats = {
    asistieron: visibleTutors.filter(t => attendanceData[t.id] === 'asistio').length,
    atrasos: visibleTutors.filter(t => attendanceData[t.id] === 'atraso').length,
    faltas: visibleTutors.filter(t => attendanceData[t.id] === 'falta').length,
    permisos: visibleTutors.filter(t => attendanceData[t.id] === 'permiso').length,
  }

  const generateModularPDF = async () => {
    const tutorIds = visibleTutors.map((t: any) => t.id)
    if (tutorIds.length === 0) return

    setLoading(true)
    const resAll = await getAllTutorsAttendance(selectedModule, tutorIds)

    if (resAll?.error) {
      console.error('Error cargando asistencias para el PDF:', resAll.error)
      showNotif('error', 'Fallo al Generar PDF', `No se pudieron cargar los registros de asistencia. Detalle técnico: ${resAll.error}`)
      setLoading(false)
      return
    }

    const allAtt = resAll.data || []

    const doc = new jsPDF('p', 'mm', [216, 279])
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    const backgroundImage = 'https://czdeexmxosivvpwwatsq.supabase.co/storage/v1/object/sign/logos/hojas--muestra_horizontal%20(1).jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85ZTAwNzJkNC00ZTNjLTQ1ZjMtYjZhNC0yZWJmZThkNGNkM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9ob2phcy0tbXVlc3RyYV9ob3Jpem9udGFsICgxKS5qcGciLCJpYXQiOjE3ODAzNDcwMDMsImV4cCI6MTgxMTg4MzAwM30.hKfpFCOyTe4VDXcnJ-Kqzy00-Uz_9jzgFK9s5JkItwg'

    let bgBase64 = ''
    try {
      bgBase64 = await getBase64ImageFromUrl(backgroundImage)
    } catch (err) {
      console.warn("Failed to pre-load background image as base64", err)
    }

    const addPdfBackground = (pdfDoc: any) => {
      try {
        const w = pdfDoc.internal.pageSize.getWidth()
        const h = pdfDoc.internal.pageSize.getHeight()
        const imgData = bgBase64 || backgroundImage
        let format = 'JPEG'
        if (imgData.startsWith('data:image/png')) {
          format = 'PNG'
        } else if (imgData.startsWith('data:image/webp')) {
          format = 'WEBP'
        }
        pdfDoc.addImage(imgData, format, 0, 0, w, h)
      } catch (e) {
        console.warn("Background image error:", e)
      }
    }

    const addPdfFooter = (pdfDoc: any) => {
      const totalPages = pdfDoc.internal.getNumberOfPages()
      const w = pdfDoc.internal.pageSize.getWidth()
      const h = pdfDoc.internal.pageSize.getHeight()
      const now = new Date()
      const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      const footerText = `Impreso por: ${(currentUser || 'N/A').toUpperCase()} | ${dateStr} ${timeStr}`

      for (let i = 1; i <= totalPages; i++) {
        pdfDoc.setPage(i)
        pdfDoc.setFont('helvetica', 'italic')
        pdfDoc.setFontSize(6)
        pdfDoc.setTextColor(150, 150, 150)
        pdfDoc.text(footerText, w - 14, h - 7, { align: 'right' })
      }
    }

    addPdfBackground(doc)

    const progText = programs.find(p => p.id === selectedProgram)?.titulo || 'N/A'
    const modText = modules.find(m => m.id === selectedModule)?.titulo_modulo || 'N/A'
    const deptName = departamentos.find(d => d.id === selectedDepto)?.name || 'N/A'

    // --- TITULO PRINCIPAL (BANNER INSTITUCIONAL) ---
    const areaText = currentModuleObj?.grupo === 1 ? 'LENGUAJE' : currentModuleObj?.grupo === 2 ? 'MATEMÁTICA' : ''
    doc.setFillColor(201, 167, 81) // Dorado institucional #bb973a
    doc.rect(14, 40, pageWidth - 28, 10, 'F')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text(`REPORTE DE ASISTENCIA DE TUTORES${areaText ? ' - ' + areaText : ''}`, pageWidth / 2, 46.5, { align: 'center' })

    // --- BLOQUE DE METADATOS (TABLA DINÁMICA - AUTO AJUSTABLE) ---
    autoTable(doc, {
      startY: 53,
      body: [
        [
          { content: `DEPARTAMENTO: ${deptName.toUpperCase()}`, styles: { fontStyle: 'bold' } },
          { content: `PERIODO: I/2026`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `TIPO DE REPORTE: MÓDULO (DÍAS 1 AL 6)${areaText ? ' - ' + areaText : ''}`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `PROGRAMA: ${progText.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `MÓDULO: ${modText.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
        ]
      ],
      theme: 'plain',
      styles: {
        fontSize: 7,
        cellPadding: 1.3,
        textColor: [40, 40, 40],
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: (pageWidth - 28) / 2 },
        1: { cellWidth: (pageWidth - 28) / 2 }
      },
      margin: { top: 40, left: 17, right: 14 }
    })

    const metaFinalY = (doc as any).lastAutoTable.finalY

    // Draw the luxury vertical gold accent bar next to the metadata block
    doc.setFillColor(201, 167, 81) // dorado institucional #bb973a
    doc.rect(14, 53, 1.5, metaFinalY - 53, 'F')

    const tableStartY = metaFinalY + 5

    const tableHeaders = ['Nº', 'C.I.', 'APELLIDOS Y NOMBRES', 'GRUPO', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'FALTAS', '% ASIST.']
    const tableRows: any[] = []

    tutors.forEach((t: any, index: number) => {
      const row: any[] = []
      row.push(index + 1)
      row.push(t.ci || 'N/A')
      row.push(`${t.apellidos || ''}, ${t.nombre || ''}`.toUpperCase())
      row.push(t.grupo_name || 'N/A')

      let countAsistio = 0
      let countFalta = 0
      let totalRegistered = 0

      for (let day = 1; day <= 6; day++) {
        const att = allAtt?.find((a: any) => a.tutor_id === t.id && a.dia === day)
        if (att) {
          totalRegistered++
          if (att.estado === 'asistio') {
            countAsistio++
            row.push('A')
          } else if (att.estado === 'atraso') {
            countAsistio++
            row.push('AT')
          } else if (att.estado === 'permiso') {
            countAsistio++
            row.push('P')
          } else {
            countFalta++
            row.push('F')
          }
        } else {
          row.push('-')
        }
      }

      row.push(countFalta)
      const percent = totalRegistered > 0 ? Math.round((countAsistio / totalRegistered) * 100) : 0
      row.push(`${percent}%`)
      tableRows.push(row)
    })

    autoTable(doc, {
      startY: tableStartY,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      willDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addPdfBackground(doc)
        }
      },
      headStyles: {
        fillColor: [201, 167, 81], // Elegant institutional gold
        textColor: 255, // Clean white text
        fontSize: 7,
        halign: 'center',
        lineWidth: 0.05,
        lineColor: [120, 100, 40],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [253, 252, 248] // Subtle warm ivory zebra striping
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.3,
        textColor: [30, 30, 30],
        lineWidth: 0.05,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 64 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 10, halign: 'center' },
        5: { cellWidth: 10, halign: 'center' },
        6: { cellWidth: 10, halign: 'center' },
        7: { cellWidth: 10, halign: 'center' },
        8: { cellWidth: 10, halign: 'center' },
        9: { cellWidth: 10, halign: 'center' },
        10: { cellWidth: 13, halign: 'center' },
        11: { cellWidth: 15, halign: 'center' },
      },
      margin: { top: 40, left: 14, right: 14 }
    })

    const finalY = (doc as any).lastAutoTable.finalY || 150

    const spaceNeededForEnding = 60
    let signatureY = finalY + 15

    if (pageHeight - finalY < spaceNeededForEnding) {
      doc.addPage()
      addPdfBackground(doc)
      signatureY = 40
    }

    const sigCenterX = pageWidth / 2

    doc.setDrawColor(40, 40, 40)
    doc.setLineWidth(0.3)
    doc.line(sigCenterX - 35, signatureY + 12, sigCenterX + 35, signatureY + 12)
    doc.setFillColor(201, 167, 81)
    doc.circle(sigCenterX, signatureY + 12, 1, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(201, 167, 81)
    doc.text('RESPONSABLE DEPARTAMENTAL', sigCenterX, signatureY + 17, { align: 'center' })

    addPdfFooter(doc)

    const areaFilenameText = currentModuleObj?.grupo === 1 ? 'Lenguaje' : currentModuleObj?.grupo === 2 ? 'Matematica' : ''
    const cleanFilename = `Asistencia_Tutores_${areaFilenameText ? areaFilenameText + '_' : ''}${deptName.replace(/\s+/g, '_')}_${modText.substring(0, 15).replace(/\s+/g, '_')}.pdf`
    doc.save(cleanFilename)
    setLoading(false)
  }

  const generateGeneralPDF = async () => {
    const tutorIds = visibleTutors.map((t: any) => t.id)
    if (tutorIds.length === 0) return

    setLoading(true)
    const resAll = await getGeneralTutorsAttendance(selectedProgram, tutorIds)

    if (resAll?.error) {
      console.error('Error cargando asistencia general para el PDF:', resAll.error)
      showNotif('error', 'Fallo al Generar PDF', `No se pudieron cargar los registros de asistencia. Detalle técnico: ${resAll.error}`)
      setLoading(false)
      return
    }

    const allAtt = resAll.data || []
    const modulesList = resAll.modules || []

    const doc = new jsPDF('l', 'mm', [216, 279])
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    const backgroundImage = 'https://czdeexmxosivvpwwatsq.supabase.co/storage/v1/object/sign/logos/hojas--muestra_horizontal%20(1).jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85ZTAwNzJkNC00ZTNjLTQ1ZjMtYjZhNC0yZWJmZThkNGNkM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9ob2phcy0tbXVlc3RyYV9ob3Jpem9udGFsICgxKS5qcGciLCJpYXQiOjE3ODAzNDcwMDMsImV4cCI6MTgxMTg4MzAwM30.hKfpFCOyTe4VDXcnJ-Kqzy00-Uz_9jzgFK9s5JkItwg'

    let bgBase64 = ''
    try {
      bgBase64 = await getBase64ImageFromUrl(backgroundImage)
    } catch (err) {
      console.warn("Failed to pre-load background image as base64", err)
    }

    const addPdfBackground = (pdfDoc: any) => {
      try {
        const w = pdfDoc.internal.pageSize.getWidth()
        const h = pdfDoc.internal.pageSize.getHeight()
        const imgData = bgBase64 || backgroundImage
        let format = 'JPEG'
        if (imgData.startsWith('data:image/png')) {
          format = 'PNG'
        } else if (imgData.startsWith('data:image/webp')) {
          format = 'WEBP'
        }
        pdfDoc.addImage(imgData, format, 0, 0, w, h)
      } catch (e) {
        console.warn("Background image error:", e)
      }
    }

    const addPdfFooter = (pdfDoc: any) => {
      const totalPages = pdfDoc.internal.getNumberOfPages()
      const w = pdfDoc.internal.pageSize.getWidth()
      const h = pdfDoc.internal.pageSize.getHeight()
      const now = new Date()
      const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      const footerText = `Impreso por: ${(currentUser || 'N/A').toUpperCase()} | ${dateStr} ${timeStr}`

      for (let i = 1; i <= totalPages; i++) {
        pdfDoc.setPage(i)
        pdfDoc.setFont('helvetica', 'italic')
        pdfDoc.setFontSize(6)
        pdfDoc.setTextColor(150, 150, 150)
        pdfDoc.text(footerText, w - 14, h - 7, { align: 'right' })
      }
    }

    addPdfBackground(doc)

    const progText = programs.find(p => p.id === selectedProgram)?.titulo || 'N/A'
    const deptName = departamentos.find(d => d.id === selectedDepto)?.name || 'N/A'

    // --- TITULO PRINCIPAL (BANNER INSTITUCIONAL) ---
    const areaText = currentModuleObj?.grupo === 1 ? 'LENGUAJE' : currentModuleObj?.grupo === 2 ? 'MATEMÁTICA' : ''
    doc.setFillColor(201, 167, 81) // Dorado institucional #bb973a
    doc.rect(14, 40, pageWidth - 28, 10, 'F')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text(`REPORTE GENERAL DE ASISTENCIA DE TUTORES${areaText ? ' - ' + areaText : ''}`, pageWidth / 2, 46.5, { align: 'center' })

    // --- BLOQUE DE METADATOS (TABLA DINÁMICA - AUTO AJUSTABLE) ---
    autoTable(doc, {
      startY: 53,
      body: [
        [
          { content: `DEPARTAMENTO: ${deptName.toUpperCase()}`, styles: { fontStyle: 'bold' } },
          { content: `PERIODO: I/2026`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `TIPO DE REPORTE: CONSOLIDADO GENERAL DE MÓDULOS${areaText ? ' - ' + areaText : ''}`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `PROGRAMA: ${progText.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
        ]
      ],
      theme: 'plain',
      styles: {
        fontSize: 7,
        cellPadding: 1.3,
        textColor: [40, 40, 40],
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: (pageWidth - 28) / 2 },
        1: { cellWidth: (pageWidth - 28) / 2 }
      },
      margin: { top: 40, left: 17, right: 14 }
    })

    const metaFinalY = (doc as any).lastAutoTable.finalY

    // Draw the luxury vertical gold accent bar next to the metadata block
    doc.setFillColor(201, 167, 81) // dorado institucional #bb973a
    doc.rect(14, 53, 1.5, metaFinalY - 53, 'F')

    const tableStartY = metaFinalY + 5

    // Build the modular columns
    // We display Mod 1, Mod 2, Mod 3, etc. based on modulesList order
    const modHeaders = modulesList.map((m: any, idx: number) => `MOD ${idx + 1}`)
    const tableHeaders = ['Nº', 'C.I.', 'APELLIDOS Y NOMBRES', 'GRUPO', ...modHeaders, 'PROM. GRAL.']

    // Helpers to calculate percentages
    const getModulePercentageVal = (tId: string, mId: string, att: any[]) => {
      const records = att.filter(a => a.tutor_id === tId && a.modulo_id === mId)
      if (records.length === 0) return null
      const valid = records.filter(r => r.dia >= 1 && r.dia <= 6)
      if (valid.length === 0) return null
      const present = valid.filter(r => ['asistio', 'atraso', 'permiso'].includes(r.estado)).length
      return (present / valid.length) * 100
    }

    const tableRows: any[] = []

    tutors.forEach((t: any, index: number) => {
      const row: any[] = []
      row.push(index + 1)
      row.push(t.ci || 'N/A')
      row.push(`${t.apellidos || ''}, ${t.nombre || ''}`.toUpperCase())
      row.push(t.grupo_name || 'N/A')

      let sum = 0
      let count = 0

      modulesList.forEach((m: any) => {
        const pct = getModulePercentageVal(t.id, m.id, allAtt)
        if (pct !== null) {
          sum += pct
          count++
          row.push(`${Math.round(pct)}%`)
        } else {
          row.push('-')
        }
      })

      const avg = count > 0 ? `${Math.round(sum / count)}%` : '0%'
      row.push(avg)
      tableRows.push(row)
    })

    // Dynamic columnStyles builder
    const colStyles: any = {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 15, halign: 'center' }
    }

    const modColsWidth = 15 // Width for each module column
    for (let i = 0; i < modulesList.length; i++) {
      colStyles[4 + i] = { cellWidth: modColsWidth, halign: 'center' }
    }
    colStyles[4 + modulesList.length] = { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [201, 167, 81] }

    autoTable(doc, {
      startY: tableStartY,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      willDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addPdfBackground(doc)
        }
      },
      headStyles: {
        fillColor: [201, 167, 81],
        textColor: 255,
        fontSize: 7,
        halign: 'center',
        lineWidth: 0.05,
        lineColor: [120, 100, 40],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [253, 252, 248]
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.3,
        textColor: [30, 30, 30],
        lineWidth: 0.05,
        lineColor: [200, 200, 200]
      },
      columnStyles: colStyles,
      margin: { top: 40, left: 14, right: 14 }
    })

    const finalY = (doc as any).lastAutoTable.finalY || 150

    const spaceNeededForEnding = 60
    let signatureY = finalY + 15

    if (pageHeight - finalY < spaceNeededForEnding) {
      doc.addPage()
      addPdfBackground(doc)
      signatureY = 40
    }

    const sigCenterX = pageWidth / 2

    doc.setDrawColor(40, 40, 40)
    doc.setLineWidth(0.3)
    doc.line(sigCenterX - 35, signatureY + 12, sigCenterX + 35, signatureY + 12)
    doc.setFillColor(201, 167, 81)
    doc.circle(sigCenterX, signatureY + 12, 1, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(201, 167, 81)
    doc.text('RESPONSABLE DEPARTAMENTAL', sigCenterX, signatureY + 17, { align: 'center' })

    addPdfFooter(doc)

    const areaFilenameText = currentModuleObj?.grupo === 1 ? 'Lenguaje' : currentModuleObj?.grupo === 2 ? 'Matematica' : ''
    const cleanFilename = `Asistencia_General_Tutores_${areaFilenameText ? areaFilenameText + '_' : ''}${deptName.replace(/\s+/g, '_')}.pdf`
    doc.save(cleanFilename)
    setLoading(false)
  }

  if (!mounted) return null

  return (
    <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '2.5rem' }}>

      {/* Panel de Registro */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* Selectores */}
        <div className="card glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', padding: '1.5rem' }}>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800 }}>Programa</label>
            <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} disabled={loading || saving}>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800 }}>Módulo</label>
            <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)} disabled={loading || saving || !selectedProgram}>
              <option value="">Seleccionar...</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>
                  {m.titulo_modulo} {m.grupo === 1 ? '(Lenguaje)' : m.grupo === 2 ? '(Matemática)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800 }}>Depto</label>
            <select value={selectedDepto} onChange={e => setSelectedDepto(e.target.value)} disabled={loading || saving}>
              <option value="">Seleccionar...</option>
              {departamentos.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {groups.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, margin: 0 }}>Filtrar por Grupos</label>
                {selectedFilterGroups.length > 0 && (
                  <button
                    onClick={() => setSelectedFilterGroups([])}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Limpiar Filtro
                  </button>
                )}
              </div>
              <style>{`
                .group-pill {
                  padding: 0.3rem 0.75rem;
                  font-size: 0.75rem;
                  border-radius: 2rem;
                  border: 1px solid var(--border);
                  background: var(--bg);
                  color: var(--foreground-2);
                  cursor: pointer;
                  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                  font-weight: 500;
                }
                .group-pill:hover:not(:disabled) {
                  border-color: var(--primary);
                  color: var(--primary);
                  background: var(--primary-light, rgba(59,130,246,0.1));
                  transform: translateY(-1px);
                }
                .group-pill.selected {
                  background: var(--primary);
                  color: #fff;
                  border-color: var(--primary);
                  font-weight: 700;
                  box-shadow: 0 4px 12px rgba(59,130,246, 0.35);
                }
                .group-pill:disabled {
                  opacity: 0.5;
                  cursor: not-allowed;
                }
              `}</style>
              <div
                className="custom-scrollbar"
                style={{
                  maxHeight: '130px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  padding: '0.75rem',
                  background: 'var(--bg)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                {groups.map(g => {
                  const isSelected = selectedFilterGroups.includes(g.id)
                  const shortName = g.name.replace(/^[A-Z]+-/, '')
                  return (
                    <button
                      key={g.id}
                      className={`group-pill ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedFilterGroups(prev => prev.filter(id => id !== g.id))
                        } else {
                          setSelectedFilterGroups(prev => [...prev, g.id])
                        }
                      }}
                      disabled={loading || saving}
                    >
                      {shortName}
                    </button>
                  )
                })}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--foreground-3)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                * Selecciona uno o más grupos (píldoras). Si no hay ninguno marcado, se mostrará todo el departamento.
              </div>
            </div>
          )}
        </div>

        {/* Listado de Tutores */}
        {selectedDepto && selectedModule ? (
          <div className="card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Tutores Registrados</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--foreground-3)' }}>Marque la asistencia para la jornada seleccionada</p>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 800 }}>
                  <span style={{ color: 'var(--success)', background: 'var(--success-light)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>A = Asistió</span>
                  <span style={{ color: 'var(--warning)', background: 'var(--warning-light)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>AT = Atraso</span>
                  <span style={{ color: 'var(--danger)', background: 'var(--danger-light)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>F = Falta</span>
                  <span style={{ color: '#6366f1', background: 'rgba(99,102,241,0.15)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>P = Permiso</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-outline" onClick={generateModularPDF} disabled={loading || saving || visibleTutors.length === 0} style={{ padding: '0.5rem 1rem' }}>
                  <FileText size={16} /> PDF Módulo
                </button>
                <button className="btn btn-outline" onClick={generateGeneralPDF} disabled={loading || saving || visibleTutors.length === 0} style={{ padding: '0.5rem 1rem' }}>
                  <FileText size={16} /> {currentModuleObj?.grupo === 1 ? 'PDF Lenguaje' : currentModuleObj?.grupo === 2 ? 'PDF Matemática' : 'PDF General'}
                </button>
                <button
                  className={`btn ${isDirty ? 'btn-primary' : 'btn-outline'}`}
                  onClick={saveAttendance}
                  disabled={loading || saving || !isDirty || isReadOnly}
                  style={{ padding: '0.5rem 1.25rem', fontWeight: 800, opacity: isReadOnly ? 0.5 : 1, cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                >
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <Clock className="animate-spin" size={24} color="var(--primary)" />
              </div>
            ) : visibleTutors.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border)', background: 'transparent' }}>
                <UsersIcon size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No hay tutores vinculados</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--foreground-3)' }}>Vaya a Migración para registrar tutores en este grupo.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 'auto' }}>Apellidos y Nombres</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Grupo</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>C.I.</th>
                      <th style={{ width: '160px', textAlign: 'center' }}>Asistencia</th>
                      <th style={{ width: '70px', textAlign: 'center' }}>Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTutors.map((t) => {
                      const currentStatus = attendanceData[t.id] || ''

                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {t.apellidos?.toUpperCase()}, {t.nombre?.toUpperCase()}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                            {t.grupo_name || 'N/A'}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--foreground-2)' }}>
                            {t.ci || 'N/A'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                className={`btn btn-sm ${currentStatus === 'asistio' ? 'btn-success' : ''}`}
                                onClick={() => handleStatusChange(t.id, 'asistio')}
                                disabled={isReadOnly}
                                title="Asistió"
                                style={{
                                  borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 500,
                                  background: currentStatus === 'asistio' ? 'var(--success)' : 'transparent',
                                  color: currentStatus === 'asistio' ? '#fff' : 'var(--foreground)',
                                  border: currentStatus === 'asistio' ? 'none' : '2px solid var(--border)',
                                  opacity: isReadOnly ? 0.6 : (currentStatus && currentStatus !== 'asistio' ? 0.4 : 1),
                                  transform: currentStatus === 'asistio' ? 'scale(1.15)' : 'scale(1)',
                                  boxShadow: currentStatus === 'asistio' ? '0 4px 12px rgba(34,197,94,0.4)' : 'none',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  cursor: isReadOnly ? 'not-allowed' : 'pointer'
                                }}
                              >
                                A
                              </button>
                              <button
                                className={`btn btn-sm ${currentStatus === 'atraso' ? 'btn-warning' : ''}`}
                                onClick={() => handleStatusChange(t.id, 'atraso')}
                                disabled={isReadOnly}
                                title="Atraso"
                                style={{
                                  borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 500,
                                  background: currentStatus === 'atraso' ? 'var(--warning)' : 'transparent',
                                  color: currentStatus === 'atraso' ? '#fff' : 'var(--foreground)',
                                  border: currentStatus === 'atraso' ? 'none' : '2px solid var(--border)',
                                  opacity: isReadOnly ? 0.6 : (currentStatus && currentStatus !== 'atraso' ? 0.4 : 1),
                                  transform: currentStatus === 'atraso' ? 'scale(1.15)' : 'scale(1)',
                                  boxShadow: currentStatus === 'atraso' ? '0 4px 12px rgba(234,179,8,0.4)' : 'none',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  cursor: isReadOnly ? 'not-allowed' : 'pointer'
                                }}
                              >
                                AT
                              </button>
                              <button
                                className={`btn btn-sm ${currentStatus === 'falta' ? 'btn-danger' : ''}`}
                                onClick={() => handleStatusChange(t.id, 'falta')}
                                disabled={isReadOnly}
                                title="Falta"
                                style={{
                                  borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 500,
                                  background: currentStatus === 'falta' ? 'var(--danger)' : 'transparent',
                                  color: currentStatus === 'falta' ? '#fff' : 'var(--foreground)',
                                  border: currentStatus === 'falta' ? 'none' : '2px solid var(--border)',
                                  opacity: isReadOnly ? 0.6 : (currentStatus && currentStatus !== 'falta' ? 0.4 : 1),
                                  transform: currentStatus === 'falta' ? 'scale(1.15)' : 'scale(1)',
                                  boxShadow: currentStatus === 'falta' ? '0 4px 12px rgba(239,68,68,0.4)' : 'none',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  cursor: isReadOnly ? 'not-allowed' : 'pointer'
                                }}
                              >
                                F
                              </button>
                              <button
                                className={`btn btn-sm ${currentStatus === 'permiso' ? '' : ''}`}
                                onClick={() => handleStatusChange(t.id, 'permiso')}
                                disabled={isReadOnly}
                                title="Permiso"
                                style={{
                                  borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 500,
                                  background: currentStatus === 'permiso' ? '#6366f1' : 'transparent',
                                  color: currentStatus === 'permiso' ? '#fff' : 'var(--foreground)',
                                  border: currentStatus === 'permiso' ? 'none' : '2px solid var(--border)',
                                  opacity: isReadOnly ? 0.6 : (currentStatus && currentStatus !== 'permiso' ? 0.4 : 1),
                                  transform: currentStatus === 'permiso' ? 'scale(1.15)' : 'scale(1)',
                                  boxShadow: currentStatus === 'permiso' ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  cursor: isReadOnly ? 'not-allowed' : 'pointer'
                                }}
                              >
                                P
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                setEditingTutorId(t.id)
                                setEditTutorData({
                                  nombre: t.nombre || '',
                                  apellidos: t.apellidos || '',
                                  ci: t.ci || '',
                                  correo: t.correo || t.email || ''
                                })
                              }}
                              disabled={isReadOnly}
                              style={{ padding: '0.25rem', color: 'var(--foreground-3)', opacity: isReadOnly ? 0.5 : 1, cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                              title="Editar datos"
                            >
                              <Edit2 size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="card glass" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <Zap size={36} color="var(--primary)" style={{ margin: '0 auto 1.5rem', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>Seleccione Departamento y Módulo</h3>
            <p style={{ color: 'var(--foreground-3)', fontSize: '0.9rem', maxWidth: '360px', margin: '0 auto' }}>
              Debe seleccionar un programa, un módulo en curso y un departamento para ver el listado de tutores.
            </p>
          </div>
        )}
      </div>

      {/* Panel de Control Lateral */}
      <div style={{ position: 'sticky', top: '2rem', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Selector de Jornada y Fecha */}
        {selectedDepto && selectedModule && (
          <div className="card glass animate-fade-up">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={18} color="var(--primary)" /> Control de Jornada
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--foreground-3)' }}>NÚMERO DE JORNADA</label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.4rem 0.75rem', marginTop: '0.25rem' }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'transparent', padding: '0.25rem' }}
                    onClick={() => setDayNumber(prev => Math.max(1, prev - 1))}
                    disabled={dayNumber <= 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Día {dayNumber}</span>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'transparent', padding: '0.25rem' }}
                    onClick={() => setDayNumber(prev => Math.min(6, prev + 1))}
                    disabled={dayNumber >= 6}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Historial de Jornadas Registradas */}
        {selectedDepto && selectedModule && (
          <div className="card glass animate-fade-up" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} color="var(--primary)" /> Resumen del Módulo
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.5rem', textAlign: 'center', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 900 }}>{stats.asistieron}</span> Asistieron
                </div>
                <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.5rem', textAlign: 'center', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 900 }}>{stats.faltas}</span> Faltas
                </div>
                <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '0.5rem', textAlign: 'center', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 900 }}>{stats.atrasos}</span> Atrasos
                </div>
                <div style={{ background: 'var(--info-light)', color: 'var(--info)', padding: '0.5rem', textAlign: 'center', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 900 }}>{stats.permisos}</span> Permisos
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', textAlign: 'center', color: 'var(--foreground-3)', marginTop: '0.5rem' }}>
                Total registrados Día {dayNumber}: <strong style={{ color: 'var(--foreground)' }}>{stats.asistieron + stats.faltas + stats.atrasos + stats.permisos}</strong> de <strong style={{ color: 'var(--foreground)' }}>{visibleTutors.length}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3, 4, 5, 6].map(day => {
                const hist = historyDays.find(h => h.dia === day)
                const isSelected = dayNumber === day
                const autoDateStr = getAutoDateForDay(day)

                return (
                  <div
                    key={day}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (!saving) {
                        setDayNumber(day)
                      }
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: isSelected ? 'var(--primary)' : 'var(--foreground)' }}>
                        Día {day}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {hist ? (
                        <span className="badge" style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}>
                          {hist.asistio}/{hist.total}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--foreground-3)', fontStyle: 'italic' }}>
                          Borrador
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
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

      {/* Modal de Edición de Tutor */}
      {editingTutorId && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(3, 4, 11, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '1.5rem'
        }} onClick={() => setEditingTutorId(null)}>
          <div
            className="animate-scale-in"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: '2rem',
              padding: '2.5rem',
              maxWidth: '500px',
              width: '100%',
              position: 'relative',
              boxShadow: '0 30px 60px -12px rgba(0,0,0,0.9), 0 0 30px rgba(79, 70, 229, 0.15)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--foreground)', letterSpacing: '-0.04em' }}>
              Editar Datos del Tutor
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800 }}>Nombres</label>
                  <input
                    type="text"
                    value={editTutorData.nombre}
                    onChange={e => setEditTutorData({ ...editTutorData, nombre: e.target.value })}
                    disabled={updatingTutor}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800 }}>Apellidos</label>
                  <input
                    type="text"
                    value={editTutorData.apellidos}
                    onChange={e => setEditTutorData({ ...editTutorData, apellidos: e.target.value })}
                    disabled={updatingTutor}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800 }}>C.I. (Cédula de Identidad)</label>
                <input
                  type="text"
                  value={editTutorData.ci}
                  onChange={e => setEditTutorData({ ...editTutorData, ci: e.target.value })}
                  disabled={updatingTutor}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800 }}>Correo Electrónico</label>
                <input
                  type="email"
                  value={editTutorData.correo}
                  onChange={e => setEditTutorData({ ...editTutorData, correo: e.target.value })}
                  disabled={updatingTutor}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => setEditingTutorId(null)}
                disabled={updatingTutor}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleSaveTutor(editingTutorId)}
                disabled={updatingTutor}
                style={{ padding: '0.75rem 2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {updatingTutor ? (
                  <>
                    <Clock className="animate-spin" size={16} /> Guardando...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
