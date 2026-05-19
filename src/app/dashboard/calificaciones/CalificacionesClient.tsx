'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Building2, Users, GraduationCap, ChevronRight, Download,
  Database, Info, AlertTriangle, FileSpreadsheet, FileText, BarChart3, Award
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function CalificacionesClient({
  departamentos,
  userDeptId,
  userRole,
  facilitadorGroups,
  currentUser
}: any) {
  const supabase = createClient()

  // Dropdown States
  const [selectedDept, setSelectedDept] = useState(userDeptId || '')
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [programs, setPrograms] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState('')
  const [modules, setModules] = useState<any[]>([])
  const [selectedModule, setSelectedModule] = useState('')

  // Facilitators for PDF Signature Selection
  const [facilitators, setFacilitators] = useState<{ name: string, depto: string }[]>([])
  const [selectedFacilitator, setSelectedFacilitator] = useState('')

  // Main States
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isTableMissing, setIsTableMissing] = useState(false)
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<any>(null)
  const [selectedModuleDetails, setSelectedModuleDetails] = useState<any>(null)

  // 1. Initial table existence check
  useEffect(() => {
    const checkTable = async () => {
      const { error } = await supabase.from('calificaciones').select('id').limit(1)
      if (error && error.code === 'PGRST205') {
        setIsTableMissing(true)
      } else {
        setIsTableMissing(false)
      }
    }
    checkTable()
  }, [])

  // 2. Load Groups based on selected department (for non-facilitadores)
  useEffect(() => {
    if (userRole === 'facilitador') {
      setGroups(facilitadorGroups)
      if (facilitadorGroups.length > 0) {
        setSelectedGroup(facilitadorGroups[0].id)
      }
      return
    }

    const fetchGroups = async () => {
      if (!selectedDept) {
        setGroups([])
        return
      }
      const { data } = await supabase
        .from('grupos')
        .select('*, departamentos(name)')
        .eq('departamento_id', selectedDept)
        .order('name')
      setGroups(data || [])
    }
    fetchGroups()
  }, [selectedDept, userRole, facilitadorGroups])

  // 3. Load Programs
  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase
        .from('programas')
        .select('*')
        .order('titulo')
      setPrograms(data || [])
      if (data && data.length > 0) {
        setSelectedProgram(data[0].id)
      }
    }
    fetchPrograms()
  }, [])

  // 4. Load Modules when Program is selected
  useEffect(() => {
    const fetchModules = async () => {
      if (!selectedProgram) {
        setModules([])
        return
      }
      const { data } = await supabase
        .from('programa_modulos')
        .select('*')
        .eq('programa_id', selectedProgram)
        .order('titulo_modulo')
      setModules(data || [])
      if (data && data.length > 0) {
        setSelectedModule(data[0].id)
      } else {
        setSelectedModule('')
      }
    }
    fetchModules()
  }, [selectedProgram])

  // 5. Load Participants and their Grades
  const loadGradesData = async () => {
    if (!selectedGroup || !selectedModule) return
    setLoading(true)

    try {
      // Get detailed metadata
      const { data: gInfo } = await supabase.from('grupos').select('*, departamentos(name)').eq('id', selectedGroup).single()
      const { data: mInfo } = await supabase.from('programa_modulos').select('*').eq('id', selectedModule).single()
      setSelectedGroupDetails(gInfo)
      setSelectedModuleDetails(mInfo)

      // Fetch Facilitators for this group to select "Responsable" in PDF
      const { data: facs } = await supabase
        .from('facilitador_grupos')
        .select('profiles(full_name, departamentos(name))')
        .eq('grupo_id', selectedGroup)

      const facObjects = facs?.map((f: any) => ({
        name: f.profiles?.full_name || '',
        depto: f.profiles?.departamentos?.name || 'N/A'
      })).filter(f => f.name) || []

      setFacilitators(facObjects)
      if (facObjects.length > 0) {
        setSelectedFacilitator(facObjects[0].name)
      } else {
        setSelectedFacilitator(currentUser || 'N/A')
      }

      // Fetch all participants registered in this group and program
      const { data: inscripcionesData, error: iErr } = await supabase
        .from('inscripciones')
        .select('estado, participantes(id, nombre, apellido, ci)')
        .eq('grupo_id', selectedGroup)
        .eq('programa_id', selectedProgram)

      if (iErr) throw iErr

      const list = inscripcionesData
        ?.map((i: any) => i.participantes)
        .filter(Boolean)
        .sort((a: any, b: any) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)) || []

      if (list.length === 0) {
        setParticipants([])
        setLoading(false)
        return
      }

      const participantIds = list.map((p: any) => p.id)

      // Fetch existing grades
      const { data: grades, error: gErr } = await supabase
        .from('calificaciones')
        .select('*')
        .eq('modulo_id', selectedModule)
        .in('participante_id', participantIds)

      if (gErr) throw gErr

      // Map everything
      const mappedList = list.map((p: any) => {
        const rowGrade = grades?.find((g: any) => g.participante_id === p.id)
        return {
          id: p.id,
          nombre: p.nombre,
          apellido: p.apellido,
          ci: p.ci,
          autoformacion: rowGrade ? Number(rowGrade.autoformacion) : 0,
          practica_guiada: rowGrade ? Number(rowGrade.practica_guiada) : 0,
          asistencia: rowGrade ? Number(rowGrade.asistencia) : 0,
          evaluacion: rowGrade ? Number(rowGrade.evaluacion) : 0,
          total: rowGrade ? Number(rowGrade.total) : 0,
          hasGrade: !!rowGrade
        }
      })

      setParticipants(mappedList)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Load when selections change
  useEffect(() => {
    loadGradesData()
  }, [selectedGroup, selectedModule])

  // Statistics calculations
  const totalStudents = participants.length
  let totalPassing = 0
  let averageScore = 0
  let gradedCount = 0

  if (totalStudents > 0) {
    let sum = 0
    participants.forEach(p => {
      if (p.hasGrade) gradedCount++
      sum += p.total
      if (p.total >= 61) totalPassing++
    })
    averageScore = gradedCount > 0 ? Math.round((sum / gradedCount) * 10) / 10 : 0
  }

  // ----------------------------------------------------
  // EXPORTS
  // ----------------------------------------------------
  const handleExportExcel = () => {
    if (participants.length === 0) return

    const dataRows = participants.map((p, idx) => ({
      'Nº': idx + 1,
      'Apellidos y Nombres': `${p.apellido}, ${p.nombre}`,
      'C.I.': p.ci,
      'Autoformación (40 pt)': p.hasGrade ? p.autoformacion : 'Sin Nota',
      'Prácticas Guiadas (20 pt)': p.hasGrade ? p.practica_guiada : 'Sin Nota',
      'Asistencia (10 pt)': p.hasGrade ? p.asistencia : 'Sin Nota',
      'Evaluación Módulo (30 pt)': p.hasGrade ? p.evaluacion : 'Sin Nota',
      'Total (100 pt)': p.hasGrade ? p.total : 'Sin Nota',
      'Estado': p.hasGrade ? (p.total >= 61 ? 'APROBADO' : 'REPROBADO') : 'Sin Registro'
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Calificaciones')

    // Add metadata/headers dynamically
    XLSX.utils.sheet_add_aoa(worksheet, [
      [`REPORTE DE CALIFICACIONES - GRUPO ${selectedGroupDetails?.name || ''}`],
      [`Módulo: ${selectedModuleDetails?.titulo_modulo || ''}`],
      [`Fecha de Reporte: ${new Date().toLocaleDateString('es-ES')}`],
      []
    ], { origin: 'A1' })

    XLSX.writeFile(workbook, `Calificaciones_${selectedGroupDetails?.name || 'Grupo'}_Mod.xlsx`)
  }

  const handleExportPDF = () => {
    if (participants.length === 0) return

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // 1. Full Page Background image
    const backgroundImage = 'https://czdeexmxosivvpwwatsq.supabase.co/storage/v1/object/sign/logos/fondo_doc.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85ZTAwNzJkNC00ZTNjLTQ1ZjMtYjZhNC0yZWJmZThkNGNkM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9mb25kb19kb2MuanBnIiwiaWF0IjoxNzc4NjgyNjkzLCJleHAiOjE4MTAyMTg2OTN9.Z6qEHAgrqYN04OWtGdZHdwZ0D10xrm1bVulbk-MWTxM'

    try {
      doc.addImage(backgroundImage, 'JPEG', 0, 0, pageWidth, pageHeight)
    } catch (e) {
      console.warn("Background image not found")
    }

    const groupName = selectedGroupDetails?.name || 'N/A'
    const programName = programs.find(p => p.id === selectedProgram)?.titulo || ''
    const moduleName = selectedModuleDetails?.titulo_modulo || ''
    const currentFac = facilitators.find(f => f.name === selectedFacilitator)
    const deptoName = currentFac?.depto || selectedGroupDetails?.departamentos?.name || 'N/A'

    // --- TITULO PRINCIPAL (BANNER INSTITUCIONAL) ---
    doc.setFillColor(187, 151, 58) // Dorado institucional #bb973a
    doc.rect(14, 40, 182, 10, 'F')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('CALIFICACIONES DE ESTUDIANTES / PARTICIPANTES', pageWidth / 2, 46.5, { align: 'center' })

    // --- BLOQUE DE METADATOS (TABLA DINÁMICA - AUTO AJUSTABLE) ---
    autoTable(doc, {
      startY: 53,
      body: [
        [
          { content: `DEPARTAMENTO: ${deptoName.toUpperCase()}`, styles: { cellWidth: 91 } },
          { content: `PERIODO: I/2026`, styles: { cellWidth: 91 } }
        ],
        [
          { content: `FACILITADOR: ${selectedFacilitator.toUpperCase() || 'N/A'}` },
          { content: `FECHA: ${new Date().toLocaleDateString('es-ES')}` }
        ],
        [
          { content: `MÓDULO: ${moduleName.toUpperCase()}` },
          { content: `PROGRAMA: ${programName.toUpperCase()}` }
        ],
        [
          { content: `GRUPO: ${groupName.toUpperCase()}` }
        ]
      ],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [20, 20, 20],
        lineWidth: 0.1,
        lineColor: [100, 100, 100],
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    })

    const metaFinalY = (doc as any).lastAutoTable.finalY + 5

    // --- TABLA DE CALIFICACIONES ---
    const tableData = participants.map((p, idx) => [
      idx + 1,
      p.ci,
      `${p.apellido.toUpperCase()}, ${p.nombre.toUpperCase()}`,
      p.hasGrade ? p.autoformacion : '-',
      p.hasGrade ? p.practica_guiada : '-',
      p.hasGrade ? p.asistencia : '-',
      p.hasGrade ? p.evaluacion : '-',
      p.hasGrade ? p.total : 'S/R',
      p.hasGrade ? (p.total >= 61 ? 'APROBADO' : 'REPROBADO') : 'SIN REGISTRO'
    ])

    autoTable(doc, {
      startY: metaFinalY,
      head: [['Nro', 'C.I.', 'APELLIDOS, NOMBRES', 'AUT. (40)', 'PRÁC. (20)', 'ASIST. (10)', 'EVAL. (30)', 'TOTAL', 'ESTADO']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [187, 151, 58], // Elegant institutional gold
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
        cellPadding: 2,
        textColor: [30, 30, 30],
        lineWidth: 0.05,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 20 },
        2: { fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
        6: { halign: 'center', cellWidth: 15 },
        7: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
        8: { halign: 'center', cellWidth: 25, fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          // Highlight TOTAL grade cell with gold/green accent color
          if (data.column.index === 7) {
            const score = Number(data.cell.raw);
            if (!isNaN(score)) {
              data.cell.styles.fontStyle = 'bold';
              if (score >= 61) {
                data.cell.styles.textColor = [16, 185, 129]; // Elite green
              } else {
                data.cell.styles.textColor = [239, 68, 68]; // Failed red
              }
            }
          }
          // Premium badge-style highlighting for ESTADO cell
          if (data.column.index === 8) {
            const val = data.cell.raw;
            if (val === 'APROBADO') {
              data.cell.styles.fillColor = [240, 253, 250]; // Soft mint background
              data.cell.styles.textColor = [13, 148, 136]; // Dark green-teal text
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'REPROBADO') {
              data.cell.styles.fillColor = [254, 242, 242]; // Soft rose background
              data.cell.styles.textColor = [220, 38, 38]; // Deep crimson red text
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [100, 100, 100];
            }
          }
        }
      }
    })

    const finalY = (doc as any).lastAutoTable.finalY || 150
    const pctPassing = totalStudents > 0 ? Math.round((totalPassing / totalStudents) * 100) : 0

    // Prevent page break repeating the header by starting indicators on new page if space is too narrow
    let statsStartY = finalY + 8
    if (pageHeight - finalY < 65) {
      doc.addPage()
      try {
        doc.addImage(backgroundImage, 'JPEG', 0, 0, pageWidth, pageHeight)
      } catch (e) {
        console.warn("Background image not found")
      }
      statsStartY = 40 // Safe margin on new page
    }

    // --- INDICADORES ACADÉMICOS ---
    autoTable(doc, {
      startY: statsStartY,
      head: [[{ content: 'INDICADORES ACADÉMICOS DEL MÓDULO', colSpan: 4, styles: { halign: 'center', fillColor: [245, 245, 245], fontSize: 7 } }]],
      body: [
        [
          { content: 'TOTAL PARTICIPANTES', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'PROMEDIO GRUPAL', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'APROBADOS (%)', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'REPROBADOS (%)', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }
        ],
        [
          totalStudents,
          averageScore,
          `${totalPassing} (${pctPassing}%)`,
          `${totalStudents - totalPassing} (${100 - pctPassing}%)`
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

    const statsFinalY = (doc as any).lastAutoTable.finalY || finalY + 30

    // --- SECCIÓN DE FIRMA DEL FACILITADOR ---
    // Reserve 35mm space for high-end styling
    let signatureY = statsFinalY + 30
    if (signatureY > pageHeight - 40) {
      doc.addPage()
      try {
        doc.addImage(backgroundImage, 'JPEG', 0, 0, pageWidth, pageHeight)
      } catch (e) {
        console.warn("Background image not found")
      }
      signatureY = 45 // Safe Y coordinates on fresh page
    }

    // Centered Facilitator Signature Block with premium design detailing
    const sigCenterX = pageWidth / 2

    // Smooth dark grey signature line
    doc.setDrawColor(40, 40, 40)
    doc.setLineWidth(0.3)
    doc.line(sigCenterX - 35, signatureY + 12, sigCenterX + 35, signatureY + 12)

    // Beautiful institutional gold dot centered on the line for high-end detail
    doc.setFillColor(187, 151, 58)
    doc.circle(sigCenterX, signatureY + 12, 1, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(187, 151, 58) // Gold Accent Title
    doc.text('FACILITADOR(A)', sigCenterX, signatureY + 17, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(40, 40, 40)
    doc.text(selectedFacilitator.toUpperCase(), sigCenterX, signatureY + 21, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(120, 120, 120)
    doc.text('Programa de Formación Académica y Especialización Continua', sigCenterX, signatureY + 25, { align: 'center' })

    // Pie de página institucional
    doc.setFontSize(6)
    doc.setTextColor(150)
    doc.text(`Documento generado por el Sistema de Gestión PROFE v2.1 el ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' })

    doc.save(`CALIFICACIONES_${groupName.replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <div>
      {/* Fallback missing table alert */}
      {isTableMissing && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                Falta Configuración de Base de Datos
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                La tabla de <strong>calificaciones</strong> aún no está creada en Supabase. Para habilitar este módulo, por favor ejecuta la sentencia SQL provista en la sección <strong>Subir Calificación</strong> en tu panel de SQL Editor de Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selectors Panel */}
      <div className="card shadow-lg animate-fade-in" style={{ padding: '1.75rem', borderRadius: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>

          {/* Department Selection (For non-facilitadores) */}
          {userRole !== 'facilitador' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--foreground-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                <Building2 size={14} /> Departamento
              </label>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value)
                  setSelectedGroup('')
                }}
                disabled={!!userDeptId}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none', fontWeight: 600 }}
              >
                <option value="">Selecciona un departamento</option>
                {departamentos.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Group Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--foreground-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              <Users size={14} /> Grupo Académico
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none', fontWeight: 600 }}
            >
              {userRole !== 'facilitador' && <option value="">Selecciona un grupo</option>}
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.departamentos?.name ? `(${g.departamentos.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Program Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--foreground-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              <GraduationCap size={14} /> Programa
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => {
                setSelectedProgram(e.target.value)
                setSelectedModule('')
              }}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none', fontWeight: 600 }}
            >
              {programs.map((p: any) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
            </select>
          </div>

          {/* Module Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--foreground-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              <ChevronRight size={14} /> Módulo del Programa
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', outline: 'none', fontWeight: 600 }}
            >
              {modules.length === 0 && <option value="">No hay módulos</option>}
              {modules.map((m: any) => (
                <option key={m.id} value={m.id}>{m.titulo_modulo}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main Content grid */}
      {selectedGroup && selectedModule && !isTableMissing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>

          {/* Main Planilla Card */}
          <div className="card shadow-lg" style={{ borderRadius: '1.25rem', overflow: 'hidden', padding: 0 }}>
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(90deg, rgba(var(--primary-rgb), 0.05) 0%, transparent 100%)'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--foreground)' }}>Calificaciones Consolidadas</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.1rem 0 0 0' }}>
                  Resultados del módulo seleccionados.
                </p>
              </div>

              {participants.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

                  {/* Facilitator Sign Selection dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>Firma:</span>
                    <select
                      value={selectedFacilitator}
                      onChange={(e) => setSelectedFacilitator(e.target.value)}
                      style={{
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {facilitators.length === 0 ? (
                        <option value={currentUser}>{currentUser.toUpperCase()}</option>
                      ) : (
                        facilitators.map((f: any) => (
                          <option key={f.name} value={f.name}>{f.name.toUpperCase()}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={handleExportExcel}
                      className="btn btn-ghost"
                      style={{
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        color: '#10b981'
                      }}
                    >
                      <FileSpreadsheet size={14} /> Excel
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="btn btn-ghost"
                      style={{
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        color: 'var(--danger)'
                      }}
                    >
                      <FileText size={14} /> PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700 }}>Cargando planilla de calificaciones...</span>
              </div>
            ) : participants.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <h4 style={{ fontWeight: 800, color: 'var(--foreground)' }}>No hay participantes</h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '300px', margin: '0.5rem auto' }}>
                  No se encontraron estudiantes inscritos.
                </p>
              </div>
            ) : (
              <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr style={{ background: 'transparent' }}>
                      <th>Participante</th>
                      <th style={{ textAlign: 'center' }}>Autoform. (40)</th>
                      <th style={{ textAlign: 'center' }}>Prácticas (20)</th>
                      <th style={{ textAlign: 'center' }}>Asistencia (10)</th>
                      <th style={{ textAlign: 'center' }}>Evaluación (30)</th>
                      <th style={{ textAlign: 'center' }}>Total (100)</th>
                      <th style={{ textAlign: 'right' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => {
                      const isPassing = p.total >= 61

                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>{p.apellido}, {p.nombre}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>CI: {p.ci}</div>
                          </td>

                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {p.hasGrade ? p.autoformacion : '-'}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {p.hasGrade ? p.practica_guiada : '-'}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {p.hasGrade ? p.asistencia : '-'}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {p.hasGrade ? p.evaluacion : '-'}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '55px',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '0.4rem',
                              fontWeight: 900,
                              fontSize: '0.9rem',
                              background: p.hasGrade ? (isPassing ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)') : 'var(--border)',
                              color: p.hasGrade ? (isPassing ? '#10b981' : 'var(--danger)') : 'var(--muted)',
                            }}>
                              {p.hasGrade ? p.total : 'S/R'}
                            </div>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            {p.hasGrade ? (
                              <span style={{
                                fontSize: '0.7rem',
                                background: isPassing ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: isPassing ? '#10b981' : 'var(--danger)',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '99px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                {isPassing ? 'Aprobado' : 'Reprobado'}
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.7rem',
                                background: 'rgba(var(--foreground-rgb), 0.05)',
                                color: 'var(--muted)',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '99px',
                                fontWeight: 800
                              }}>
                                Sin Registrar
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Statistics Summary panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Stat Box: Summary */}
            <div className="card shadow-lg" style={{ borderRadius: '1.25rem', padding: '1.5rem' }}>
              <h4 style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BarChart3 size={15} /> Estadísticas del Módulo
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700 }}>PROMEDIO GENERAL</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--primary)' }}>
                      {averageScore}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 800 }}>/ 100</span>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.25rem 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>APROBADOS</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981' }}>
                      {totalPassing}
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, marginLeft: '0.2rem' }}>
                        ({totalStudents > 0 ? Math.round((totalPassing / totalStudents) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>REGISTRADOS</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--info)' }}>
                      {gradedCount}
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, marginLeft: '0.2rem' }}>
                        ({totalStudents > 0 ? Math.round((gradedCount / totalStudents) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Rules card */}
            <div className="card shadow-lg" style={{ borderRadius: '1.25rem', padding: '1.5rem', background: 'linear-gradient(180deg, rgba(var(--primary-rgb), 0.02) 0%, transparent 100%)' }}>
              <h4 style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-3)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={15} /> Criterio Académico
              </h4>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                <li>Autoformación (40 pt max)</li>
                <li>Prácticas Guiadas (20 pt max)</li>
                <li>Asistencia Académica (10 pt max)</li>
                <li>Evaluación Final (30 pt max)</li>
                <li><strong>Suficiencia: 61 pt o superior</strong>.</li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* Select instructions */}
      {(!selectedGroup || !selectedModule) && !isTableMissing && (
        <div className="animate-fade-in" style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          background: 'linear-gradient(180deg, rgba(var(--primary-rgb), 0.02) 0%, transparent 100%)',
          borderRadius: '1.25rem',
          border: '1px dashed var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          marginTop: '1rem'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '1.25rem',
            background: 'rgba(var(--primary-rgb), 0.1)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(var(--primary-rgb), 0.1)'
          }}>
            <Award size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
              Planilla de Calificaciones del Módulo
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
              Selecciona un **Grupo Académico**, **Programa** y **Módulo** en el panel superior para cargar la planilla de notas del curso y generar los reportes.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
