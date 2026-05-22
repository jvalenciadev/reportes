'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Building2, Users, GraduationCap, ChevronRight, Download,
  Database, Info, AlertTriangle, FileSpreadsheet, FileText, BarChart3, Award,
  BookOpen, Calculator, X, Search
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

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
  const [selectedModuleGroup, setSelectedModuleGroup] = useState<string>('1')
  const [showModuleGroupModal, setShowModuleGroupModal] = useState(false)

  // Facilitators for PDF Signature Selection
  const [facilitators, setFacilitators] = useState<{ name: string, depto: string }[]>([])
  const [selectedFacilitator, setSelectedFacilitator] = useState('')

  // Main States
  const [participants, setParticipants] = useState<any[]>([])
  const [searchStudent, setSearchStudent] = useState('')
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
      const sortedFacGroups = [...(facilitadorGroups || [])].sort((a: any, b: any) =>
        (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
      )
      setGroups(sortedFacGroups)
      if (sortedFacGroups.length > 0) {
        setSelectedGroup(sortedFacGroups[0].id)
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

      const sorted = (data || []).sort((a: any, b: any) =>
        (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
      )
      setGroups(sorted)
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
        .order('grupo', { ascending: true })
        .order('orden', { ascending: true })

      const sortedData = data || []
      setModules(sortedData)

      if (sortedData.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0]
        const currentModule = sortedData.find(m => todayStr >= m.fecha_inicio && todayStr <= m.fecha_fin)
        setSelectedModule(currentModule ? currentModule.id : sortedData[0].id)
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

      // Fetch all participants registered in this group (Only active 'inscritos')
      const { data: inscripcionesData, error: iErr } = await supabase
        .from('inscripciones')
        .select('estado, participantes(id, nombre, apellido, ci)')
        .eq('grupo_id', selectedGroup)
        .eq('estado', 'inscrito')

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

      // Map everything — asistencia siempre entero, ingresado manualmente
      const mappedList = list.map((p: any) => {
        const rowGrade = grades?.find((g: any) => g.participante_id === p.id)

        const savedAsistencia = rowGrade ? Math.round(Number(rowGrade.asistencia)) : 0

        return {
          id: p.id,
          nombre: p.nombre,
          apellido: p.apellido,
          ci: p.ci,
          autoformacion: rowGrade ? Number(rowGrade.autoformacion) : 0,
          practica_guiada: rowGrade ? Number(rowGrade.practica_guiada) : 0,
          asistencia: savedAsistencia,
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
      if (p.total >= 51) totalPassing++
    })
    averageScore = gradedCount > 0 ? Math.round(sum / gradedCount) : 0
  }

  // Filtered list for the table (search by name/CI). Stats always use the full participants array.
  const filteredParticipants = searchStudent.trim()
    ? participants.filter((p) => {
      const q = searchStudent.toLowerCase()
      return (
        p.nombre?.toLowerCase().includes(q) ||
        p.apellido?.toLowerCase().includes(q) ||
        `${p.apellido} ${p.nombre}`.toLowerCase().includes(q) ||
        String(p.ci).toLowerCase().includes(q)
      )
    })
    : participants

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
      // Asistencia como entero en Excel
      'Asistencia (10 pt)': p.asistencia,
      'Evaluación Módulo (30 pt)': p.hasGrade ? p.evaluacion : 'Sin Nota',
      'Total (100 pt)': p.hasGrade ? p.total : 'Sin Nota',
      'Estado': p.hasGrade ? (p.total >= 51 ? 'APROBADO' : 'REPROBADO') : 'Sin Registro'
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Calificaciones')

    // Add metadata/headers dynamically
    XLSX.utils.sheet_add_aoa(worksheet, [
      [`REPORTE DE CALIFICACIONES - GRUPO ${selectedGroupDetails?.name || ''}`],
      [`${selectedModuleDetails?.titulo_modulo || ''}`],
      [`Fecha de Reporte: ${new Date().toLocaleDateString('es-ES')}`],
      []
    ], { origin: 'A1' })

    XLSX.writeFile(workbook, `Calificaciones_${selectedGroupDetails?.name || 'Grupo'}_Mod.xlsx`)
  }

  const handleExportPDF = async (reportType: 'modulo' | 'grupo' | 'general', moduleGroupFilter?: number) => {
    setLoading(true)
    try {
      const orientation = (reportType === 'general') ? 'l' : 'p'
      const doc = new jsPDF(orientation, 'mm', orientation === 'l' ? [279, 216] : [216, 279])
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Full Page Background image (Landscape or Portrait depending on layout)
      const backgroundImage = (orientation === 'l')
        ? 'https://czdeexmxosivvpwwatsq.supabase.co/storage/v1/object/sign/logos/escudo.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85ZTAwNzJkNC00ZTNjLTQ1ZjMtYjZhNC0yZWJmZThkNGNkM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9lc2N1ZG8uanBnIiwiaWF0IjoxNzc5NDc1Nzg4LCJleHAiOjE4MTEwMTE3ODh9.J80uPhXdt8HjRMba6nT-7f5OIJ4vbiEEyQSiQB_CWFc'
        : 'https://czdeexmxosivvpwwatsq.supabase.co/storage/v1/object/sign/logos/fondo_doc.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85ZTAwNzJkNC00ZTNjLTQ1ZjMtYjZhNC0yZWJmZThkNGNkM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9mb25kb19kb2MuanBnIiwiaWF0IjoxNzc4NjgyNjkzLCJleHAiOjE4MTAyMTg2OTN9.Z6qEHAgrqYN04OWtGdZHdwZ0D10xrm1bVulbk-MWTxM'

      let bgBase64 = ''
      let imgWidth = 0
      let imgHeight = 0
      try {
        bgBase64 = await getBase64ImageFromUrl(backgroundImage)
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            imgWidth = img.naturalWidth
            imgHeight = img.naturalHeight
            resolve()
          }
          img.onerror = () => resolve()
          img.src = bgBase64
        })
      } catch (err) {
        console.warn("Failed to pre-load background image as base64", err)
      }

      const addPdfBackground = (pdfDoc: any) => {
        try {
          const w = pdfDoc.internal.pageSize.getWidth()
          const h = pdfDoc.internal.pageSize.getHeight()

          let drawW = w
          let drawH = h
          let x = 0
          let y = 0

          if (imgWidth > 0 && imgHeight > 0) {
            const imgRatio = imgWidth / imgHeight
            const pageRatio = w / h
            if (imgRatio > pageRatio) {
              drawW = h * imgRatio
              x = (w - drawW) / 2
            } else {
              drawH = w / imgRatio
              y = (h - drawH) / 2
            }
          }

          const imgData = bgBase64 || backgroundImage
          let format = 'JPEG'
          if (imgData.startsWith('data:image/png')) {
            format = 'PNG'
          } else if (imgData.startsWith('data:image/webp')) {
            format = 'WEBP'
          }
          pdfDoc.addImage(imgData, format, x, y, drawW, drawH)
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
          pdfDoc.setFontSize(6)
          pdfDoc.setFont('helvetica', 'italic')
          pdfDoc.setTextColor(150, 150, 150)
          pdfDoc.text(footerText, w / 2, h - 4, { align: 'center' })
        }
      }

      addPdfBackground(doc)

      const programName = programs.find((p: any) => p.id === selectedProgram)?.titulo || ''
      const currentFac = facilitators.find(f => f.name === selectedFacilitator)
      const deptoName = currentFac?.depto || selectedGroupDetails?.departamentos?.name || 'N/A'
      const groupName = selectedGroupDetails?.name || 'N/A'

      const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A'
        const parts = dateStr.split('-')
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`
        }
        return dateStr
      }

      if (reportType === 'modulo') {
        if (participants.length === 0) {
          setLoading(false)
          return
        }

        const moduleName = (selectedModuleDetails?.grupo === 1 ? 'LENGUAJE - ' : selectedModuleDetails?.grupo === 2 ? 'MATEMÁTICA - ' : '') + (selectedModuleDetails?.titulo_modulo || '')

        // --- TITULO PRINCIPAL (BANNER INSTITUCIONAL) ---
        doc.setFillColor(187, 151, 58)
        doc.rect(14, 40, pageWidth - 28, 10, 'F')
        doc.setFontSize(12)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text('CALIFICACIONES DE ESTUDIANTES / PARTICIPANTES', pageWidth / 2, 46.5, { align: 'center' })

        // --- BLOQUE DE METADATOS (TABLA DINÁMICA - AUTO AJUSTABLE) ---
        autoTable(doc, {
          startY: 53,
          body: [
            [
              { content: `DEPARTAMENTO: ${deptoName.toUpperCase()}`, styles: { fontStyle: 'bold' } },
              { content: `PERIODO: I/2026`, styles: { fontStyle: 'bold' } }
            ],
            [
              { content: `FACILITADOR(A): ${selectedFacilitator.toUpperCase() || 'N/A'}`, colSpan: 2, styles: { fontStyle: 'bold' } }
            ],
            [
              { content: `GRUPO: ${groupName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
            ],
            [
              { content: `PROGRAMA: ${programName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
            ],
            [
              { content: `${moduleName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
            ],
            [
              { content: `FECHA INICIO: ${formatDate(selectedModuleDetails?.fecha_inicio)}`, styles: { fontStyle: 'bold' } },
              { content: `FECHA FIN: ${formatDate(selectedModuleDetails?.fecha_fin)}`, styles: { fontStyle: 'bold' } }
            ]
          ],
          theme: 'plain',
          styles: { fontSize: 7, cellPadding: 1.3, textColor: [40, 40, 40], overflow: 'linebreak' },
          columnStyles: { 0: { cellWidth: 89.5 }, 1: { cellWidth: 89.5 } },
          margin: { left: 17, right: 14 }
        })

        const metaFinalY = (doc as any).lastAutoTable.finalY
        doc.setFillColor(187, 151, 58)
        doc.rect(14, 53, 1.5, metaFinalY - 53, 'F')

        const tableStartY = metaFinalY + 5

        // --- TABLA DE CALIFICACIONES --- (asistencia siempre entero)
        const tableData = participants.map((p, idx) => [
          idx + 1,
          p.ci,
          `${p.apellido.toUpperCase()}, ${p.nombre.toUpperCase()}`,
          p.hasGrade ? p.autoformacion : '-',
          p.hasGrade ? p.practica_guiada : '-',
          Math.round(p.asistencia),
          p.hasGrade ? p.evaluacion : '-',
          p.hasGrade ? p.total : 'S/R',
          p.hasGrade ? (p.total >= 51 ? 'APROBADO' : 'REPROBADO') : 'SIN REGISTRO'
        ])

        autoTable(doc, {
          startY: tableStartY,
          head: [['Nro', 'C.I.', 'APELLIDOS, NOMBRES', 'AUT. (40)', 'PRÁC. (20)', 'ASIST. (10)', 'EVAL. (30)', 'TOTAL', 'ESTADO']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [187, 151, 58],
            textColor: 255,
            fontSize: 7,
            halign: 'center',
            lineWidth: 0.05,
            lineColor: [120, 100, 40],
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [253, 252, 248] },
          styles: { fontSize: 7, cellPadding: 1.3, textColor: [30, 30, 30], lineWidth: 0.05, lineColor: [200, 200, 200] },
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
              if (data.column.index === 7) {
                const score = Number(data.cell.raw);
                if (!isNaN(score)) {
                  data.cell.styles.fontStyle = 'bold';
                  data.cell.styles.textColor = score >= 51 ? [16, 185, 129] : [239, 68, 68];
                }
              }
              if (data.column.index === 8) {
                const val = data.cell.raw;
                if (val === 'APROBADO') {
                  data.cell.styles.fillColor = [240, 253, 250];
                  data.cell.styles.textColor = [13, 148, 136];
                  data.cell.styles.fontStyle = 'bold';
                } else if (val === 'REPROBADO') {
                  data.cell.styles.fillColor = [254, 242, 242];
                  data.cell.styles.textColor = [220, 38, 38];
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

        const spaceNeededForEnding = 120
        let statsStartY = finalY + 4
        let hasAddedPageForEnding = false

        if (pageHeight - finalY < spaceNeededForEnding) {
          doc.addPage()
          addPdfBackground(doc)
          statsStartY = 40
          hasAddedPageForEnding = true
        }

        // --- INDICADORES ACADÉMICOS ---
        autoTable(doc, {
          startY: statsStartY,
          head: [[{ content: 'INDICADORES ACADÉMICOS', colSpan: 4, styles: { halign: 'center', fillColor: [245, 245, 245], fontSize: 7 } }]],
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
          styles: { fontSize: 7, cellPadding: 1.3, halign: 'center', lineWidth: 0.1, lineColor: [180, 180, 180], textColor: [0, 0, 0] },
          margin: { left: 14, right: 14 }
        })

        const statsFinalY = (doc as any).lastAutoTable.finalY || finalY + 22

        let signatureY = statsFinalY + 22
        if (signatureY > pageHeight - 68) {
          doc.addPage()
          addPdfBackground(doc)
          signatureY = 45
        }

        const sigCenterXLeft = pageWidth * 0.3
        const sigCenterXRight = pageWidth * 0.7

        doc.setDrawColor(40, 40, 40)
        doc.setLineWidth(0.3)
        doc.line(sigCenterXLeft - 25, signatureY + 12, sigCenterXLeft + 25, signatureY + 12)
        doc.setFillColor(187, 151, 58)
        doc.circle(sigCenterXLeft, signatureY + 12, 1, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(187, 151, 58)
        doc.text('FACILITADOR(A)', sigCenterXLeft, signatureY + 17, { align: 'center' })

        doc.setDrawColor(40, 40, 40)
        doc.setLineWidth(0.3)
        doc.line(sigCenterXRight - 25, signatureY + 12, sigCenterXRight + 25, signatureY + 12)
        doc.setFillColor(187, 151, 58)
        doc.circle(sigCenterXRight, signatureY + 12, 1, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(187, 151, 58)
        doc.text('RESPONSABLE DEPARTAMENTAL', sigCenterXRight, signatureY + 17, { align: 'center' })

        addPdfFooter(doc)
        doc.save(`CALIFICACIONES_MODULO_${groupName.replace(/\s+/g, '_')}_${moduleName.replace(/\s+/g, '_')}.pdf`)
      }

      else if (reportType === 'grupo') {
        // --- CONSOLIDADO POR GRUPO ---
        // 1. Fetch modules of the program ordered by 'orden'
        const { data: programModules, error: mErr } = await supabase
          .from('programa_modulos')
          .select('*')
          .eq('programa_id', selectedProgram)
          .eq('grupo', Number(moduleGroupFilter || 1))
          .order('orden', { ascending: true })
        if (mErr) throw mErr
        const sortedModules = programModules || []

        // 2. Fetch active participants of the selected group
        const { data: enrolled, error: eErr } = await supabase
          .from('inscripciones')
          .select('participantes(id, nombre, apellido, ci)')
          .eq('grupo_id', selectedGroup)
          .eq('estado', 'inscrito')
        if (eErr) throw eErr

        const list = enrolled?.map((e: any) => e.participantes).filter(Boolean)
          .sort((a: any, b: any) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)) || []

        if (list.length === 0) {
          setLoading(false)
          return
        }

        // 3. Fetch all grades of these participants in program modules
        const { data: grades, error: gErr } = await supabase
          .from('calificaciones')
          .select('*')
          .in('modulo_id', sortedModules.map((m: any) => m.id))
          .in('participante_id', list.map((p: any) => p.id))
        if (gErr) throw gErr

        // --- TITULO CONSOLIDADO ---
        doc.setFillColor(187, 151, 58)
        doc.rect(14, 40, pageWidth - 28, 10, 'F')
        doc.setFontSize(12)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        const specialtyName = moduleGroupFilter === 2 ? 'MATEMÁTICA' : 'LENGUAJE'
        doc.text(`CONSOLIDADO DE CALIFICACIONES - ${specialtyName}`, pageWidth / 2, 46.5, { align: 'center' })

        const firstModuleDate = sortedModules.length > 0 ? sortedModules[0].fecha_inicio : ''
        const lastModuleDate = sortedModules.length > 0 ? sortedModules[sortedModules.length - 1].fecha_fin : ''

        // Metadata block (No Module Name since it's consolidated)
        autoTable(doc, {
          startY: 53,
          body: [
            [
              { content: `DEPARTAMENTO: ${deptoName.toUpperCase()}`, styles: { fontStyle: 'bold' } },
              { content: `PERIODO: I/2026`, styles: { fontStyle: 'bold' } }
            ],
            [
              { content: `FACILITADOR(A): ${selectedFacilitator.toUpperCase() || 'N/A'}`, colSpan: 2, styles: { fontStyle: 'bold' } }
            ],
            [
              { content: `GRUPO: ${groupName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
            ],
            [
              { content: `PROGRAMA: ${programName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
            ],
            [
              { content: `FECHA INICIO: ${formatDate(firstModuleDate)}`, styles: { fontStyle: 'bold' } },
              { content: `FECHA FIN: ${formatDate(lastModuleDate)}`, styles: { fontStyle: 'bold' } }
            ]
          ],
          theme: 'plain',
          styles: { fontSize: 7, cellPadding: 1.3, textColor: [40, 40, 40], overflow: 'linebreak' },
          columnStyles: { 0: { cellWidth: (pageWidth - 28) / 2 }, 1: { cellWidth: (pageWidth - 28) / 2 } },
          margin: { left: 17, right: 14 }
        })

        const metaFinalY = (doc as any).lastAutoTable.finalY
        doc.setFillColor(187, 151, 58)
        doc.rect(14, 53, 1.5, metaFinalY - 53, 'F')

        const tableStartY = metaFinalY + 5

        // Build header row: Nro, C.I., Apellidos y Nombres, M1, M2... Promedio, Estado
        const headRow = ['Nro', 'C.I.', 'APELLIDOS, NOMBRES']
        sortedModules.forEach((m, idx) => {
          headRow.push(m.orden ? `MÓD. ${m.orden}` : `MÓD. ${idx + 1}`)
        })
        headRow.push('PROMEDIO', 'ESTADO')

        // Build body rows
        let sumAverages = 0
        let approvedAveragesCount = 0

        const tableData = list.map((p: any, idx: number) => {
          let totalScoreSum = 0
          const moduleScores = sortedModules.map(m => {
            const g = grades?.find((x: any) => x.participante_id === p.id && x.modulo_id === m.id)
            if (g) {
              totalScoreSum += Number(g.total)
              return Number(g.total)
            }
            return 0
          })

          const average = sortedModules.length > 0 ? (totalScoreSum / sortedModules.length) : 0
          sumAverages += average
          if (average >= 51) approvedAveragesCount++

          const formattedScores = sortedModules.map(m => {
            const g = grades?.find((x: any) => x.participante_id === p.id && x.modulo_id === m.id)
            return g ? g.total : '-'
          })

          return [
            idx + 1,
            p.ci,
            `${p.apellido.toUpperCase()}, ${p.nombre.toUpperCase()}`,
            ...formattedScores,
            average > 0 ? Math.round(average).toString() : '0',
            average >= 51 ? 'APROBADO' : 'REPROBADO'
          ]
        })

        // Column styles dynamically
        const colStyles: any = {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'center', cellWidth: 20 },
          2: { fontStyle: 'bold' }
        }
        sortedModules.forEach((_, idx) => {
          colStyles[idx + 3] = { halign: 'center', cellWidth: 15 }
        })
        colStyles[sortedModules.length + 3] = { halign: 'center', cellWidth: 16, fontStyle: 'bold' }
        colStyles[sortedModules.length + 4] = { halign: 'center', cellWidth: 22, fontStyle: 'bold' }

        autoTable(doc, {
          startY: tableStartY,
          head: [headRow],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [187, 151, 58],
            textColor: 255,
            fontSize: 7,
            halign: 'center',
            lineWidth: 0.05,
            lineColor: [120, 100, 40],
            fontStyle: 'bold'
          },
          alternateRowStyles: { fillColor: [253, 252, 248] },
          styles: { fontSize: 7, cellPadding: 1.3, textColor: [30, 30, 30], lineWidth: 0.05, lineColor: [200, 200, 200] },
          columnStyles: colStyles,
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            if (data.section === 'body') {
              const avgColIdx = sortedModules.length + 3
              const statusColIdx = sortedModules.length + 4
              if (data.column.index === avgColIdx) {
                const score = Number(data.cell.raw)
                if (!isNaN(score)) {
                  data.cell.styles.fontStyle = 'bold'
                  data.cell.styles.textColor = score >= 51 ? [16, 185, 129] : [239, 68, 68]
                }
              }
              if (data.column.index === statusColIdx) {
                const val = data.cell.raw
                if (val === 'APROBADO') {
                  data.cell.styles.fillColor = [240, 253, 250]
                  data.cell.styles.textColor = [13, 148, 136]
                  data.cell.styles.fontStyle = 'bold'
                } else if (val === 'REPROBADO') {
                  data.cell.styles.fillColor = [254, 242, 242]
                  data.cell.styles.textColor = [220, 38, 38]
                  data.cell.styles.fontStyle = 'bold'
                }
              }
            }
          }
        })

        const finalY = (doc as any).lastAutoTable.finalY || 150
        const groupAvgScore = list.length > 0 ? Math.round(sumAverages / list.length).toString() : '0'
        const pctPassing = list.length > 0 ? Math.round((approvedAveragesCount / list.length) * 100) : 0

        // Module Legend (Compact Table format to prevent overflow!)
        const legendData = sortedModules.map((m, idx) => [
          `M${m.orden || idx + 1}:`,
          (m.grupo === 1 ? 'LENGUAJE - ' : m.grupo === 2 ? 'MATEMÁTICA - ' : '') + m.titulo_modulo
        ])

        autoTable(doc, {
          startY: finalY + 4,
          body: [
            [{ content: 'LISTA DE MÓDULOS:', colSpan: 2, styles: { fontStyle: 'bold', textColor: [100, 100, 100], fontSize: 6 } as any }],
            ...legendData.map(([code, name]) => [
              { content: code, styles: { fontStyle: 'bold', textColor: [120, 120, 120], fontSize: 5.5 } as any },
              { content: name, styles: { textColor: [80, 80, 80], fontSize: 5.5 } as any }
            ])
          ],
          theme: 'plain',
          styles: { fontSize: 5.5, cellPadding: 0.3 },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: pageWidth - 36 }
          },
          margin: { left: 14, right: 14 }
        })

        const legendFinalY = (doc as any).lastAutoTable.finalY || finalY + 12

        const spaceNeededForEnding = 120
        let statsStartY = legendFinalY + 4
        let hasAddedPageForEnding = false

        if (pageHeight - legendFinalY < spaceNeededForEnding) {
          doc.addPage()
          addPdfBackground(doc)
          statsStartY = 40
          hasAddedPageForEnding = true
        }

        // --- INDICADORES ACADÉMICOS ---
        autoTable(doc, {
          startY: statsStartY,
          head: [[{ content: 'INDICADORES ACADÉMICOS', colSpan: 4, styles: { halign: 'center', fillColor: [245, 245, 245], fontSize: 7 } }]],
          body: [
            [
              { content: 'TOTAL PARTICIPANTES', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
              { content: 'PROMEDIO GENERAL', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
              { content: 'APROBADOS (%)', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
              { content: 'REPROBADOS (%)', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }
            ],
            [
              list.length,
              groupAvgScore,
              `${approvedAveragesCount} (${pctPassing}%)`,
              `${list.length - approvedAveragesCount} (${100 - pctPassing}%)`
            ]
          ],
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.3, halign: 'center', lineWidth: 0.1, lineColor: [180, 180, 180], textColor: [0, 0, 0] },
          margin: { left: 14, right: 14 }
        })

        const statsFinalY = (doc as any).lastAutoTable.finalY || finalY + 22

        let signatureY = statsFinalY + 22
        if (signatureY > pageHeight - 68) {
          doc.addPage()
          addPdfBackground(doc)
          signatureY = 45
        }

        const sigCenterXLeft = pageWidth * 0.3
        const sigCenterXRight = pageWidth * 0.7

        doc.setDrawColor(40, 40, 40)
        doc.setLineWidth(0.3)
        doc.line(sigCenterXLeft - 25, signatureY + 12, sigCenterXLeft + 25, signatureY + 12)
        doc.setFillColor(187, 151, 58)
        doc.circle(sigCenterXLeft, signatureY + 12, 1, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(187, 151, 58)
        doc.text('FACILITADOR(A)', sigCenterXLeft, signatureY + 17, { align: 'center' })

        doc.setDrawColor(40, 40, 40)
        doc.setLineWidth(0.3)
        doc.line(sigCenterXRight - 25, signatureY + 12, sigCenterXRight + 25, signatureY + 12)
        doc.setFillColor(187, 151, 58)
        doc.circle(sigCenterXRight, signatureY + 12, 1, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(187, 151, 58)
        doc.text('RESPONSABLE DEPARTAMENTAL', sigCenterXRight, signatureY + 17, { align: 'center' })

        addPdfFooter(doc)
        doc.save(`CALIFICACIONES_CONSOLIDADO_GRUPO_${groupName.replace(/\s+/g, '_')}.pdf`)
      }

      else if (reportType === 'general') {
        // --- GENERAL (TODO EN GENERAL POR DEPARTAMENTO/PROGRAMA - SEPARADOS POR GRUPO) ---
        // 1. Fetch modules
        const { data: programModules, error: mErr } = await supabase
          .from('programa_modulos')
          .select('*')
          .eq('programa_id', selectedProgram)
          .order('grupo', { ascending: true })
          .order('orden', { ascending: true })
        if (mErr) throw mErr
        const sortedModules = programModules || []

        // 2. Allowed groups (sorted naturally)
        const allowedGroups = [...(userRole === 'facilitador' ? facilitadorGroups : groups)]
          .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }))

        if (!allowedGroups || allowedGroups.length === 0) {
          setLoading(false)
          return
        }

        // Loop through each group to generate a separate PDF as a senior developer
        for (const grp of allowedGroups) {
          const doc = new jsPDF(orientation, 'mm', 'a4')
          const pageWidth = doc.internal.pageSize.getWidth()
          const pageHeight = doc.internal.pageSize.getHeight()

          addPdfBackground(doc)

          // Fetch enrolled participants for this specific group (Only active 'inscritos')
          const { data: enrolled, error: eErr } = await supabase
            .from('inscripciones')
            .select('participantes(id, nombre, apellido, ci)')
            .eq('grupo_id', grp.id)
            .eq('programa_id', selectedProgram)
            .eq('estado', 'inscrito')
          if (eErr) continue

          const list = enrolled?.map((e: any) => e.participantes).filter(Boolean)
            .sort((a: any, b: any) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)) || []

          if (list.length === 0) continue

          // Fetch grades of these participants in program modules
          const { data: grades, error: gErr } = await supabase
            .from('calificaciones')
            .select('*')
            .in('modulo_id', sortedModules.map((m: any) => m.id))
            .in('participante_id', list.map((p: any) => p.id))
          if (gErr) continue

          const grpDeptoName = grp.departamentos?.name || deptoName || 'N/A'

          // --- TITULO CONSOLIDADO ---
          doc.setFillColor(187, 151, 58)
          doc.rect(14, 40, pageWidth - 28, 10, 'F')
          doc.setFontSize(12)
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
          doc.text(`PLANILLA CONSOLIDADA - GRUPO ${grp.name.toUpperCase()}`, pageWidth / 2, 46.5, { align: 'center' })

          const firstModuleDate = sortedModules.length > 0 ? sortedModules[0].fecha_inicio : ''
          const lastModuleDate = sortedModules.length > 0 ? sortedModules[sortedModules.length - 1].fecha_fin : ''

          // Metadata block
          autoTable(doc, {
            startY: 53,
            body: [
              [
                { content: `DEPARTAMENTO: ${grpDeptoName.toUpperCase()}`, styles: { fontStyle: 'bold' } },
                { content: `PERIODO: I/2026`, styles: { fontStyle: 'bold' } }
              ],
              [
                { content: `FACILITADOR(A): ${(selectedFacilitator || currentUser || 'N/A').toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
              ],
              [
                { content: `GRUPO: ${grp.name.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
              ],
              [
                { content: `PROGRAMA: ${programName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
              ],
              [
                { content: `FECHA INICIO: ${formatDate(firstModuleDate)}`, styles: { fontStyle: 'bold' } },
                { content: `FECHA FIN: ${formatDate(lastModuleDate)}`, styles: { fontStyle: 'bold' } }
              ]
            ],
            theme: 'plain',
            styles: { fontSize: 7, cellPadding: 1.3, textColor: [40, 40, 40], overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: (pageWidth - 28) / 2 }, 1: { cellWidth: (pageWidth - 28) / 2 } },
            margin: { left: 17, right: 14 }
          })

          const metaFinalY = (doc as any).lastAutoTable.finalY
          doc.setFillColor(187, 151, 58)
          doc.rect(14, 53, 1.5, metaFinalY - 53, 'F')

          const tableStartY = metaFinalY + 5

          // Build header rows
          const grupo1Modules = sortedModules.filter((m: any) => m.grupo === 1)
          const grupo2Modules = sortedModules.filter((m: any) => m.grupo === 2)

          const headRow1: any[] = [
            { content: 'Nro', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: 'C.I.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: 'APELLIDOS, NOMBRES', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
          ]
          const headRow2: any[] = []

          if (grupo1Modules.length > 0) {
            headRow1.push({ content: 'LENGUAJE', colSpan: grupo1Modules.length, styles: { halign: 'center' } })
            grupo1Modules.forEach((m: any) => {
              headRow2.push(m.orden ? `M${m.orden}` : `M`)
            })
          }

          if (grupo2Modules.length > 0) {
            headRow1.push({ content: 'MATEMÁTICA', colSpan: grupo2Modules.length, styles: { halign: 'center' } })
            grupo2Modules.forEach((m: any) => {
              headRow2.push(m.orden ? `M${m.orden}` : `M`)
            })
          }

          headRow1.push(
            { content: 'PROMEDIO', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: 'ESTADO', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: '% ASIST.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
          )

          const headRows = [headRow1, headRow2]

          // Build body rows
          let sumAverages = 0
          let approvedAveragesCount = 0

          const tableData = list.map((p: any, idx: number) => {
            let totalScoreSum = 0
            sortedModules.forEach(m => {
              const g = grades?.find((x: any) => x.participante_id === p.id && x.modulo_id === m.id)
              if (g) totalScoreSum += Number(g.total)
            })

            const average = sortedModules.length > 0 ? (totalScoreSum / sortedModules.length) : 0
            sumAverages += average
            if (average >= 51) approvedAveragesCount++

            const formattedScores = sortedModules.map(m => {
              const g = grades?.find((x: any) => x.participante_id === p.id && x.modulo_id === m.id)
              return g ? g.total : '-'
            })

            // Calculate attendance percentage across all modules from the calificaciones grades (manual entry)
            const pGrades = grades?.filter((x: any) => x.participante_id === p.id) || []
            let attendancePctString = '-'
            if (pGrades.length > 0) {
              const sumAsist = pGrades.reduce((sum: number, g: any) => sum + (Number(g.asistencia) || 0), 0)
              const pct = Math.round((sumAsist / (pGrades.length * 10)) * 100)
              attendancePctString = `${pct}%`
            }

            return [
              idx + 1,
              p.ci,
              `${p.apellido.toUpperCase()}, ${p.nombre.toUpperCase()}`,
              ...formattedScores,
              average > 0 ? Math.round(average).toString() : '0',
              average >= 51 ? 'APROBADO' : 'REPROBADO',
              attendancePctString
            ]
          })

          // Column styles dynamically
          const colStyles: any = {
            0: { halign: 'center', cellWidth: 8 },
            1: { halign: 'center', cellWidth: 20 },
            2: { fontStyle: 'bold' }
          }
          sortedModules.forEach((_, idx) => {
            colStyles[idx + 3] = { halign: 'center', cellWidth: 12 }
          })
          colStyles[sortedModules.length + 3] = { halign: 'center', cellWidth: 14, fontStyle: 'bold' }
          colStyles[sortedModules.length + 4] = { halign: 'center', cellWidth: 20, fontStyle: 'bold' }
          colStyles[sortedModules.length + 5] = { halign: 'center', cellWidth: 16, fontStyle: 'bold' }

          autoTable(doc, {
            startY: tableStartY,
            head: headRows,
            body: tableData,
            theme: 'grid',
            headStyles: {
              fillColor: [187, 151, 58],
              textColor: 255,
              fontSize: 7,
              halign: 'center',
              lineWidth: 0.05,
              lineColor: [120, 100, 40],
              fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: [253, 252, 248] },
            styles: { fontSize: 7, cellPadding: 1.3, textColor: [30, 30, 30], lineWidth: 0.05, lineColor: [200, 200, 200] },
            columnStyles: colStyles,
            margin: { left: 14, right: 14 },
            didParseCell: (data: any) => {
              if (data.section === 'body') {
                const avgColIdx = sortedModules.length + 3
                const statusColIdx = sortedModules.length + 4
                const assistColIdx = sortedModules.length + 5
                if (data.column.index === avgColIdx) {
                  const score = Number(data.cell.raw)
                  if (!isNaN(score)) {
                    data.cell.styles.fontStyle = 'bold'
                    data.cell.styles.textColor = score >= 51 ? [16, 185, 129] : [239, 68, 68]
                  }
                }
                if (data.column.index === statusColIdx) {
                  const val = data.cell.raw
                  if (val === 'APROBADO') {
                    data.cell.styles.fillColor = [240, 253, 250]
                    data.cell.styles.textColor = [13, 148, 136]
                    data.cell.styles.fontStyle = 'bold'
                  } else if (val === 'REPROBADO') {
                    data.cell.styles.fillColor = [254, 242, 242]
                    data.cell.styles.textColor = [220, 38, 38]
                    data.cell.styles.fontStyle = 'bold'
                  }
                }
                if (data.column.index === assistColIdx) {
                  data.cell.styles.fontStyle = 'normal'
                }
              }
            }
          })

          const finalY = (doc as any).lastAutoTable.finalY || 150

          // Module Legend separated by specialities
          const legendBody: any[] = [
            [{ content: 'LISTA DE MÓDULOS:', colSpan: 2, styles: { fontStyle: 'bold', textColor: [100, 100, 100], fontSize: 6 } as any }]
          ]

          if (grupo1Modules.length > 0) {
            legendBody.push([{ content: 'LENGUAJE:', colSpan: 2, styles: { fontStyle: 'bold', textColor: [60, 60, 60], fontSize: 6 } as any }])
            grupo1Modules.forEach((m: any) => {
              legendBody.push([
                { content: `M${m.orden}:`, styles: { fontStyle: 'bold', textColor: [120, 120, 120], fontSize: 5.5 } as any },
                { content: 'LENGUAJE - ' + m.titulo_modulo, styles: { textColor: [80, 80, 80], fontSize: 5.5 } as any }
              ])
            })
          }

          if (grupo2Modules.length > 0) {
            legendBody.push([{ content: 'MATEMÁTICA:', colSpan: 2, styles: { fontStyle: 'bold', textColor: [60, 60, 60], fontSize: 6 } as any }])
            grupo2Modules.forEach((m: any) => {
              legendBody.push([
                { content: `M${m.orden}:`, styles: { fontStyle: 'bold', textColor: [120, 120, 120], fontSize: 5.5 } as any },
                { content: 'MATEMÁTICA - ' + m.titulo_modulo, styles: { textColor: [80, 80, 80], fontSize: 5.5 } as any }
              ])
            })
          }

          autoTable(doc, {
            startY: finalY + 4,
            body: legendBody,
            theme: 'plain',
            styles: { fontSize: 5.5, cellPadding: 0.3 },
            columnStyles: {
              0: { cellWidth: 8 },
              1: { cellWidth: pageWidth - 36 }
            },
            margin: { left: 14, right: 14 }
          })

          const legendFinalY = (doc as any).lastAutoTable.finalY || finalY + 12
          const groupAvgScore = list.length > 0 ? Math.round(sumAverages / list.length).toString() : '0'
          const pctPassing = list.length > 0 ? Math.round((approvedAveragesCount / list.length) * 100) : 0

          const spaceNeededForEnding = 100
          let statsStartY = legendFinalY + 4
          let hasAddedPageForEnding = false

          if (pageHeight - legendFinalY < spaceNeededForEnding) {
            doc.addPage()
            addPdfBackground(doc)
            statsStartY = 40
            hasAddedPageForEnding = true
          }

          // --- INDICADORES ACADÉMICOS ---
          autoTable(doc, {
            startY: statsStartY,
            head: [[{ content: 'INDICADORES ACADÉMICOS', colSpan: 4, styles: { halign: 'center', fillColor: [245, 245, 245], fontSize: 7 } }]],
            body: [
              [
                { content: 'TOTAL PARTICIPANTES', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
                { content: 'PROMEDIO GENERAL', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
                { content: 'APROBADOS (%)', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
                { content: 'REPROBADOS (%)', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }
              ],
              [
                list.length,
                groupAvgScore,
                `${approvedAveragesCount} (${pctPassing}%)`,
                `${list.length - approvedAveragesCount} (${100 - pctPassing}%)`
              ]
            ],
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1.3, halign: 'center', lineWidth: 0.1, lineColor: [180, 180, 180], textColor: [0, 0, 0] },
            margin: { left: 14, right: 14 }
          })

          const statsFinalY = (doc as any).lastAutoTable.finalY || statsStartY + 15

          let signatureY = statsFinalY + 18
          if (signatureY > pageHeight - 50) {
            doc.addPage()
            addPdfBackground(doc)
            signatureY = 45
          }

          const sigCenterXLeft = pageWidth * 0.2
          const sigCenterXCenter = pageWidth * 0.5
          const sigCenterXRight = pageWidth * 0.8

          doc.setDrawColor(40, 40, 40)
          doc.setLineWidth(0.3)
          doc.line(sigCenterXLeft - 25, signatureY + 12, sigCenterXLeft + 25, signatureY + 12)
          doc.setFillColor(187, 151, 58)
          doc.circle(sigCenterXLeft, signatureY + 12, 1, 'F')
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(187, 151, 58)
          doc.text('FACILITADOR(A)', sigCenterXLeft, signatureY + 17, { align: 'center' })

          doc.setDrawColor(40, 40, 40)
          doc.setLineWidth(0.3)
          doc.line(sigCenterXCenter - 25, signatureY + 12, sigCenterXCenter + 25, signatureY + 12)
          doc.setFillColor(187, 151, 58)
          doc.circle(sigCenterXCenter, signatureY + 12, 1, 'F')
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(187, 151, 58)
          doc.text('RESPONSABLE DEPARTAMENTAL', sigCenterXCenter, signatureY + 17, { align: 'center' })

          doc.setDrawColor(40, 40, 40)
          doc.setLineWidth(0.3)
          doc.line(sigCenterXRight - 30, signatureY + 12, sigCenterXRight + 30, signatureY + 12)
          doc.setFillColor(187, 151, 58)
          doc.circle(sigCenterXRight, signatureY + 12, 1, 'F')
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(187, 151, 58)
          doc.text('COORDINADOR DE PROGRAMAS EDUCATIVOS', sigCenterXRight, signatureY + 17, { align: 'center' })
          addPdfFooter(doc)
          doc.save(`CALIFICACIONES_CONSOLIDADO_GRUPO_${grp.name.replace(/\s+/g, '_')}.pdf`)
        }
      }
    } catch (error: any) {
      console.error("Error generating PDF:", error)
    } finally {
      setLoading(false)
    }
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
                <option key={m.id} value={m.id}>
                  {m.grupo === 1 ? 'LENGUAJE - ' : m.grupo === 2 ? 'MATEMÁTICA - ' : ''}{m.titulo_modulo}
                </option>
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
              flexWrap: 'wrap',
              gap: '1rem',
              background: 'linear-gradient(90deg, rgba(var(--primary-rgb), 0.05) 0%, transparent 100%)'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--foreground)' }}>Calificaciones Consolidadas</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.1rem 0 0 0' }}>
                  Resultados del módulo seleccionados.
                </p>
              </div>

              {participants.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>

                  {/* Student Search Bar */}
                  <div className="glass" style={{ padding: '0.35rem 0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Search size={13} color="var(--primary)" />
                    <input
                      type="text"
                      placeholder="Buscar estudiante..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', color: 'var(--foreground)', width: '120px' }}
                    />
                    {searchStudent && (
                      <button onClick={() => setSearchStudent('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 900 }}>×</button>
                    )}
                  </div>

                  {/* Facilitator Sign Selection dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>Firma:</span>
                    <select
                      value={selectedFacilitator}
                      onChange={(e) => setSelectedFacilitator(e.target.value)}
                      style={{
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                        outline: 'none',
                        cursor: 'pointer',
                        maxWidth: '280px'
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
                      onClick={() => handleExportPDF('modulo')}
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
                      <FileText size={14} /> PDF Módulo
                    </button>
                    <button
                      onClick={() => setShowModuleGroupModal(true)}
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
                      <Award size={14} /> PDF Grupo
                    </button>
                    <button
                      onClick={() => handleExportPDF('general')}
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
                      <Database size={14} /> PDF General
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Warning callout for Asistencia */}
            {!loading && participants.length > 0 && (
              <div className="animate-fade-in" style={{
                margin: '1.25rem 1.75rem 0 1.75rem',
                padding: '0.85rem 1.25rem',
                borderRadius: '0.75rem',
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <Info size={18} color="#d97706" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: '#d97706', fontSize: '0.8rem', display: 'block', marginBottom: '0.15rem' }}>
                    Nota Aclaratoria de Asistencia:
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--foreground-3)', lineHeight: 1.45 }}>
                    La nota reflejada en la columna de <strong>Asist. (10)</strong> es registrada manualmente tomando como referencia obligatoria los datos y porcentajes reportados en el <strong>PDF de Asistencia</strong> del respectivo módulo académico.
                  </p>
                </div>
              </div>
            )}

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
                      <th style={{ textAlign: 'center', width: '90px', background: 'rgba(245, 158, 11, 0.08)', color: '#b45309', borderBottom: '2px solid rgba(245, 158, 11, 0.25)' }}>Asist. (10)</th>
                      <th style={{ textAlign: 'center' }}>Evaluación (30)</th>
                      <th style={{ textAlign: 'center' }}>Total (100)</th>
                      <th style={{ textAlign: 'right' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                          No se encontraron estudiantes que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map((p) => {
                        const isPassing = p.total >= 51

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
                            <td style={{ textAlign: 'center', fontWeight: 700, background: 'rgba(245, 158, 11, 0.04)' }}>
                              {p.asistencia}
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
                      })
                    )}
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
                <li style={{ padding: '0.35rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(245, 158, 11, 0.08)', color: '#b45309' }}>
                  <strong>Asistencia (10 pt max)</strong>: Registro manual de la nota de asistencia obtenida del reporte de <strong>Asistencia PDF</strong>.
                </li>
                <li>Evaluación Final (30 pt max)</li>
                <li><strong>Suficiencia: 51 pt o superior</strong>.</li>
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
      {/* Modal para selección de Grupo de Módulos (al exportar PDF Grupo) */}
      {showModuleGroupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            position: 'relative',
            width: '580px',
            padding: '2.5rem 2rem 2.25rem 2rem',
            borderRadius: '1.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            background: '#ffffff',
            color: '#1f2937',
            textAlign: 'center',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowModuleGroupModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#111827';
                e.currentTarget.style.background = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9ca3af';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={18} />
            </button>

            {/* Title / Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#111827', marginBottom: '0.5rem' }}>
                Seleccionar Especialidad de Reporte
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5', maxWidth: '440px', margin: '0 auto' }}>
                Por favor, elija el área y grupo de módulos que desea incluir en el consolidado en formato vertical (Portrait).
              </p>
            </div>

            {/* Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* Card 1: Lenguaje */}
              <div
                onClick={() => {
                  setShowModuleGroupModal(false);
                  handleExportPDF('grupo', 1);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '2rem 1.5rem',
                  borderRadius: '1.25rem',
                  background: '#f9fafb',
                  border: '2px solid #e5e7eb',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#bb973a';
                  e.currentTarget.style.background = 'rgba(187, 151, 58, 0.04)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(187, 151, 58, 0.1), 0 4px 6px -2px rgba(187, 151, 58, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(187, 151, 58, 0.12)',
                  color: '#bb973a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}>
                  <BookOpen size={28} />
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
                  LENGUAJE
                </h4>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#bb973a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Grupo de Módulos 1
                </span>
              </div>

              {/* Card 2: Matemática */}
              <div
                onClick={() => {
                  setShowModuleGroupModal(false);
                  handleExportPDF('grupo', 2);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '2rem 1.5rem',
                  borderRadius: '1.25rem',
                  background: '#f9fafb',
                  border: '2px solid #e5e7eb',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#bb973a';
                  e.currentTarget.style.background = 'rgba(187, 151, 58, 0.04)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(187, 151, 58, 0.1), 0 4px 6px -2px rgba(187, 151, 58, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(187, 151, 58, 0.12)',
                  color: '#bb973a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}>
                  <Calculator size={28} />
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
                  MATEMÁTICA
                </h4>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#bb973a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Grupo de Módulos 2
                </span>
              </div>
            </div>

            {/* Cancel Button */}
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                onClick={() => setShowModuleGroupModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '0.5rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#111827';
                  e.currentTarget.style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
