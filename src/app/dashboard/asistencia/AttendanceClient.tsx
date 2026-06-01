'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/utils/supabase/client'
import {
  Save, Search, CalendarDays, ChevronLeft, ChevronRight,
  History, Users as UsersIcon, Clock, AlertCircle, FileText,
  CheckCircle, XCircle, Info, Zap,
  UserCheck,
  UserMinus,
  ShieldCheck,
  Edit2
} from 'lucide-react'
import StatusModal, { StatusType } from '../components/StatusModal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

  // Inline table row editing state
  const [editingRowDia, setEditingRowDia] = useState<number | null>(null)
  const [editRowNewDia, setEditRowNewDia] = useState<number>(1)
  const [editRowNewFecha, setEditRowNewFecha] = useState<string>('')

  const getChronologicalViolations = () => {
    const violations: { type: 'duplicate' | 'chronological', msg: string, affectedDays: number[] }[] = [];
    const rows = [...historyDays];
    const isNewDay = !historyDays.some(h => h.dia === dayNumber);
    if (isNewDay) {
      rows.push({
        dia: dayNumber,
        fecha: selectedDate,
        asistio: participants.filter(p => attendanceData[p.participante_id] === 'asistio').length,
        atraso: participants.filter(p => attendanceData[p.participante_id] === 'atraso').length,
        falta: participants.filter(p => attendanceData[p.participante_id] === 'falta').length,
        permiso: participants.filter(p => attendanceData[p.participante_id] === 'permiso').length,
        total: participants.length,
      } as any);
    }
    rows.sort((a, b) => a.dia - b.dia);

    // 1. Check for Duplicate Dates
    const seenDates = new Map<string, number[]>();
    rows.forEach(r => {
      if (!seenDates.has(r.fecha)) {
        seenDates.set(r.fecha, []);
      }
      seenDates.get(r.fecha)!.push(r.dia);
    });

    seenDates.forEach((dias, fecha) => {
      if (dias.length > 1) {
        const formattedDate = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        violations.push({
          type: 'duplicate',
          msg: `El ${dias.map(d => `Día ${d}`).join(' y el ')} están registrados con la misma fecha (${formattedDate}). Cada jornada debe tener una fecha distinta.`,
          affectedDays: dias
        });
      }
    });

    // 2. Check for Chronological Order Violations
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[i].fecha >= rows[j].fecha) {
          const dateI = new Date(rows[i].fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const dateJ = new Date(rows[j].fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
          violations.push({
            type: 'chronological',
            msg: `Inconsistencia: El Día ${rows[i].dia} (${dateI}) está registrado con una fecha posterior o igual al Día ${rows[j].dia} (${dateJ}). Las jornadas deben ser secuenciales y cronológicas.`,
            affectedDays: [rows[i].dia, rows[j].dia]
          });
        }
      }
    }

    return violations;
  };

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
      const { data } = await supabase
        .from('programa_modulos')
        .select('*')
        .eq('programa_id', selectedProgram)
        .order('grupo', { ascending: true })
        .order('orden', { ascending: true })

      const sortedData = data || []
      const todayStr = new Date().toISOString().split('T')[0]
      // Filtrar para mostrar solo el módulo actual e iniciados anteriormente (ocultar módulos futuros)
      const visibleData = sortedData.filter(m => todayStr >= m.fecha_inicio)
      setModules(visibleData)

      if (visibleData.length > 0) {
        // Seleccionar automáticamente el módulo en curso
        const currentModule = visibleData.find(m => todayStr >= m.fecha_inicio && todayStr <= m.fecha_fin)
        if (currentModule) {
          setSelectedModule(currentModule.id)
        } else {
          // Si no hay módulo en curso, seleccionar el más reciente de los iniciados
          setSelectedModule(visibleData[visibleData.length - 1].id)
        }
      } else {
        setSelectedModule('')
      }
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

    // Guard: Prevent day number greater than 6
    if (dayNumber > 6) {
      setDayNumber(6)
      setLoading(false)
      return
    }

    // A. Fetch Participants enrolled in this group/program (Only active 'inscritos')
    const { data: enrolled, error: pErr } = await supabase
      .from('inscripciones')
      .select('*, participantes(*)')
      .eq('grupo_id', selectedGroup)
      .eq('programa_id', selectedProgram)
      .eq('estado', 'inscrito')

    if (pErr) {
      console.error('Error cargando participantes:', pErr)
      showNotif('error', 'Fallo al Cargar Participantes', `No se pudieron cargar los estudiantes activos. Detalle técnico: ${pErr.message}`)
      setLoading(false)
      return
    }

    // B. Fetch Existing Attendance for this specific module and enrolled participants
    const enrolledIds = enrolled?.map((p: any) => p.participante_id) || []
    let groupAttendance: any[] = []

    if (enrolledIds.length > 0) {
      const { data: existing, error: aErr } = await supabase
        .from('asistencias')
        .select('*')
        .eq('modulo_id', selectedModule)
        .in('participante_id', enrolledIds)

      if (aErr) {
        console.error('Error cargando asistencias:', aErr)
        showNotif('error', 'Fallo al Cargar Asistencias', `No se pudieron recuperar los registros previos. Detalle técnico: ${aErr.message}`)
      } else {
        groupAttendance = existing || []
      }
    }

    // --- AUTO-SYNCHRONIZATION & AUDIT SYSTEM (SENIOR IMPLEMENTATION) ---
    if (enrolledIds.length > 0 && groupAttendance.length > 0) {
      let didChange = false

      // 1. Clean up invalid days (day > 6)
      const invalidRecords = groupAttendance.filter((a: any) => a.dia > 6)
      if (invalidRecords.length > 0) {
        const { error: deleteErr } = await supabase
          .from('asistencias')
          .delete()
          .eq('modulo_id', selectedModule)
          .gt('dia', 6)
          .in('participante_id', enrolledIds)
        if (deleteErr) {
          console.error('Error deleting invalid day records (>6):', deleteErr)
        } else {
          didChange = true
        }
      }

      // 2. Identify valid registered days (from 1 to 6)
      const registeredDays = Array.from(new Set(groupAttendance.map((a: any) => a.dia))).filter(d => d >= 1 && d <= 6)
      const missingRecords: any[] = []
      const daysToSyncDates: { dia: number; chosenDate: string }[] = []

      registeredDays.forEach((dia: number) => {
        const recordsForDay = groupAttendance.filter((a: any) => a.dia === dia)

        // A. Find the most common date for this day
        const dateCounts: Record<string, number> = {}
        recordsForDay.forEach((r: any) => {
          dateCounts[r.fecha] = (dateCounts[r.fecha] || 0) + 1
        })
        let chosenDate = selectedDate // fallback
        let maxCount = 0
        Object.entries(dateCounts).forEach(([dateStr, count]) => {
          if (count > maxCount) {
            maxCount = count
            chosenDate = dateStr
          }
        })

        // B. Check for date discrepancies
        const hasDateDiscrepancy = recordsForDay.some((r: any) => r.fecha !== chosenDate)
        if (hasDateDiscrepancy) {
          daysToSyncDates.push({ dia, chosenDate })
        }

        // C. Check for missing participants on this day
        enrolledIds.forEach((pId: string) => {
          const hasRecord = recordsForDay.some((r: any) => r.participante_id === pId)
          if (!hasRecord) {
            missingRecords.push({
              participante_id: pId,
              modulo_id: selectedModule,
              dia: dia,
              estado: 'falta', // Default missing status to 'falta'
              fecha: chosenDate
            })
          }
        })
      })

      // Perform inserts for missing participants to ensure equal total across all days
      if (missingRecords.length > 0) {
        const { error: insertErr } = await supabase
          .from('asistencias')
          .insert(missingRecords)
        if (insertErr) {
          console.error('Error auto-inserting missing attendance records:', insertErr)
        } else {
          didChange = true
        }
      }

      // Perform date updates for synchronization
      if (daysToSyncDates.length > 0) {
        for (const sync of daysToSyncDates) {
          const { error: updateErr } = await supabase
            .from('asistencias')
            .update({ fecha: sync.chosenDate })
            .eq('modulo_id', selectedModule)
            .eq('dia', sync.dia)
            .in('participante_id', enrolledIds)
          if (updateErr) {
            console.error(`Error auto-synchronizing dates for day ${sync.dia}:`, updateErr)
          } else {
            didChange = true
          }
        }
      }

      // If database changed, re-fetch records to have absolute source of truth
      if (didChange) {
        const { data: refreshed, error: aErr } = await supabase
          .from('asistencias')
          .select('*')
          .eq('modulo_id', selectedModule)
          .in('participante_id', enrolledIds)
        if (!aErr && refreshed) {
          groupAttendance = refreshed
        }
      }
    }

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

    // Auto-sync selectedDate to the actual registered date of this day if it exists
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
  }, [selectedGroup, selectedModule, dayNumber])

  // Sync dayNumber if date changes (Look for existing session on that date)
  useEffect(() => {
    if (!historyDays.length) return

    // Si la jornada actual ya coincide con la fecha seleccionada, no hacemos nada
    // Esto evita saltos automáticos cuando dos jornadas tienen la misma fecha
    const currentSession = historyDays.find(h => h.dia === dayNumber)
    if (currentSession && currentSession.fecha === selectedDate) return

    const session = historyDays.find(h => h.fecha === selectedDate)
    if (session && session.dia !== dayNumber) {
      setDayNumber(session.dia)
    }
  }, [selectedDate, historyDays, dayNumber])

  const handleStatusChange = (participantId: string, status: string) => {
    setAttendanceData(prev => ({ ...prev, [participantId]: status }))
  }

  const saveAttendance = async () => {
    if (!selectedModule || participants.length === 0) return
    setSaving(true)

    // Guard: Prevent day number greater than 6
    if (dayNumber > 6) {
      showNotif('error', 'Límite de Jornadas', 'No se puede registrar asistencia para un Día superior a 6.')
      setSaving(false)
      return false
    }

    // Check for chronological and duplicate date violations
    const violations = getChronologicalViolations();
    const duplicateViolation = violations.find(v => v.type === 'duplicate');
    if (duplicateViolation) {
      showNotif('error', 'Fechas Duplicadas', duplicateViolation.msg);
      setSaving(false);
      return false;
    }
    const chronoViolation = violations.find(v => v.type === 'chronological');
    if (chronoViolation) {
      showNotif('error', 'Inconsistencia Cronológica', chronoViolation.msg);
      setSaving(false);
      return false;
    }

    const participantIds = participants.map((p: any) => p.participante_id)
    if (participantIds.length === 0) {
      setSaving(false)
      return false
    }

    // 1. Fetch existing records for these participants in THIS module/day
    const { data: existingRecords } = await supabase
      .from('asistencias')
      .select('id, participante_id')
      .eq('modulo_id', selectedModule)
      .eq('dia', dayNumber)
      .in('participante_id', participantIds)

    // Senior Approach: Save entries for all enrolled participants.
    // Explicitly update the date for ALL of them to match the current selection.
    // If a participant doesn't have a status, default to 'falta'.
    const records = participants.map((p: any) => {
      const participantId = p.participante_id
      const estado = attendanceData[participantId] || 'falta'
      const existing = existingRecords?.find(r => r.participante_id === participantId)
      return {
        ...(existing ? { id: existing.id } : {}),
        participante_id: participantId,
        modulo_id: selectedModule,
        dia: dayNumber,
        estado: estado === '' ? 'falta' : estado,
        fecha: selectedDate
      }
    })

    // Now upserting with 'id' is safe because 'id' is the Primary Key 
    // and always has a unique constraint.
    const { error } = await supabase
      .from('asistencias')
      .upsert(records, { onConflict: 'id' })

    if (error) {
      let customMessage = `No se pudo guardar la asistencia: ${error.message}`;
      if (error.code === '23505' && error.message.includes('asistencias_unique_participante_dia')) {
        customMessage = `Conflicto de Duplicados: Algunos estudiantes ya tienen asistencia en el Día ${dayNumber}. Refresque la página para sincronizar los datos más recientes.`;
      }
      showNotif('error', 'Fallo en el Registro de Asistencia', customMessage);
      setSaving(false);
      return false;
    } else {
      showNotif('success', '¡Asistencia Guardada!', 'Se han registrado correctamente los datos.')
      const savedStates: Record<string, string> = {}
      records.forEach(r => {
        savedStates[r.participante_id] = r.estado
      })
      setAttendanceData(savedStates)
      setInitialAttendance(savedStates) // Reset dirty state
      setInitialDate(selectedDate)
      setEditingRowDia(null)
      loadAttendanceSession()
      setSaving(false)
      return true
    }
  }

  const handleUpdateRowJornada = async (oldDia: number) => {
    if (!selectedModule) return;
    setSaving(true);

    // Guard: Prevent day number greater than 6
    if (editRowNewDia > 6) {
      showNotif('error', 'Límite de Jornadas', 'No se puede cambiar la jornada a un Día superior a 6.');
      setSaving(false);
      return;
    }

    const isDraft = !historyDays.some(h => h.dia === oldDia);

    // 1. Temporarily build rows to validate before updating
    const simulatedRows = [...historyDays];
    if (isDraft) {
      simulatedRows.push({
        dia: editRowNewDia,
        fecha: editRowNewFecha,
        asistio: stats.asistieron,
        atraso: stats.atrasos,
        falta: stats.faltas,
        permiso: stats.permisos,
        total: participants.length
      } as any);
    } else {
      for (let i = 0; i < simulatedRows.length; i++) {
        if (simulatedRows[i].dia === oldDia) {
          simulatedRows[i] = { ...simulatedRows[i], dia: editRowNewDia, fecha: editRowNewFecha };
        }
      }
    }

    // Validate simulatedRows for duplicates
    const seenDates = new Map<string, number[]>();
    simulatedRows.forEach(r => {
      if (!seenDates.has(r.fecha)) seenDates.set(r.fecha, []);
      seenDates.get(r.fecha)!.push(r.dia);
    });

    let hasDuplicate = false;
    seenDates.forEach((dias, fecha) => {
      if (dias.length > 1) {
        const formattedDate = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        showNotif('error', 'Fechas Duplicadas', `No se pueden guardar los cambios: El ${dias.map(d => `Día ${d}`).join(' y el ')} tendrían la misma fecha (${formattedDate}).`);
        hasDuplicate = true;
      }
    });

    if (hasDuplicate) {
      setSaving(false);
      return;
    }

    // Validate simulatedRows for chronological order
    simulatedRows.sort((a, b) => a.dia - b.dia);
    let hasChronoError = false;
    for (let i = 0; i < simulatedRows.length; i++) {
      for (let j = i + 1; j < simulatedRows.length; j++) {
        if (simulatedRows[i].fecha >= simulatedRows[j].fecha) {
          const dateI = new Date(simulatedRows[i].fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const dateJ = new Date(simulatedRows[j].fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
          showNotif('error', 'Inconsistencia Cronológica', `No se pueden guardar los cambios: El Día ${simulatedRows[i].dia} (${dateI}) quedaría con una fecha posterior o igual al Día ${simulatedRows[j].dia} (${dateJ}).`);
          hasChronoError = true;
          break;
        }
      }
      if (hasChronoError) break;
    }

    if (hasChronoError) {
      setSaving(false);
      return;
    }

    if (isDraft) {
      setDayNumber(editRowNewDia);
      setSelectedDate(editRowNewFecha);
      setEditingRowDia(null);
      setSaving(false);
      showNotif('success', '¡Borrador Actualizado!', 'Se ha actualizado la fecha y jornada del borrador actual.');
      return;
    }

    const enrolledIds = participants.map((p: any) => p.participante_id);
    if (enrolledIds.length === 0) {
      showNotif('error', 'Sin Participantes', 'No hay participantes activos activos en este grupo para actualizar.');
      setSaving(false);
      return;
    }

    // 2. Perform the database update for this module / day number (only for active enrolled participants)
    const { error } = await supabase
      .from('asistencias')
      .update({ dia: editRowNewDia, fecha: editRowNewFecha })
      .eq('modulo_id', selectedModule)
      .eq('dia', oldDia)
      .in('participante_id', enrolledIds);

    if (error) {
      let customMessage = `Error de base de datos: ${error.message}`;
      if (error.code === '23505' && error.message.includes('asistencias_unique_participante_dia')) {
        customMessage = `Conflicto de Duplicados: El Día ${editRowNewDia} entra en conflicto con registros existentes para estos estudiantes. Revise que no haya cruce de jornadas.`;
      }
      showNotif('error', 'Fallo al Actualizar Jornada', customMessage);
    } else {
      showNotif('success', '¡Jornada Actualizada!', 'Se han guardado los cambios en la base de datos.');
      if (dayNumber === oldDia) {
        setDayNumber(editRowNewDia);
        setSelectedDate(editRowNewFecha);
      }
      setEditingRowDia(null);
      await loadAttendanceSession();
    }
    setSaving(false);
  };

  // Helper to check deadline status
  const checkModuleDeadline = (fechaFinStr: string) => {
    if (!fechaFinStr) return { isAllowed: true, showWarning: false, daysRemaining: 0, deadlineStr: '' };

    const fechaFin = new Date(fechaFinStr + 'T00:00:00');
    const today = new Date();

    // Set both to midnight to compare only calendar days
    const d1 = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // The deadline is 7 days after fecha_fin
    const deadlineDate = new Date(fechaFin.getTime() + 7 * 24 * 60 * 60 * 1000);
    const deadlineStr = deadlineDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const daysRemaining = 7 - diffDays;

    if (diffDays >= 7) {
      return {
        isAllowed: false,
        showWarning: false,
        daysRemaining: 0,
        deadlineStr
      };
    } else if (diffDays >= 1) {
      return {
        isAllowed: true,
        showWarning: true,
        daysRemaining: Math.max(0, daysRemaining),
        deadlineStr
      };
    } else {
      return {
        isAllowed: true,
        showWarning: false,
        daysRemaining,
        deadlineStr
      };
    }
  };

  const selectedModuleObj = modules.find(m => m.id === selectedModule);
  const deadlineStatus = selectedModuleObj ? checkModuleDeadline(selectedModuleObj.fecha_fin) : { isAllowed: true, showWarning: false, daysRemaining: 0, deadlineStr: '' };

  // Stats for current session
  // Stats for current session (calculated in every render)
  const stats = {
    asistieron: participants.filter(p => attendanceData[p.participante_id] === 'asistio').length,
    atrasos: participants.filter(p => attendanceData[p.participante_id] === 'atraso').length,
    faltas: participants.filter(p => attendanceData[p.participante_id] === 'falta').length,
    permisos: participants.filter(p => attendanceData[p.participante_id] === 'permiso').length,
  }

  const generatePDF = async () => {
    const enrolledIds = participants.map((p: any) => p.participante_id)
    if (enrolledIds.length === 0) return

    setLoading(true)
    const { data: allAtt, error: attErr } = await supabase
      .from('asistencias')
      .select('*')
      .eq('modulo_id', selectedModule)
      .in('participante_id', enrolledIds)

    if (attErr) {
      console.error('Error cargando asistencias para el PDF:', attErr)
      showNotif('error', 'Fallo al Generar PDF', `No se pudieron cargar los registros de asistencia del módulo. Detalle técnico: ${attErr.message}`)
      setLoading(false)
      return
    }

    const doc = new jsPDF('p', 'mm', [216, 279])
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // 1. Full Page Background
    const backgroundImage = 'https://czdeexmxosivvpwwatsq.supabase.co/storage/v1/object/sign/logos/hojas--muestra_horizontal.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85ZTAwNzJkNC00ZTNjLTQ1ZjMtYjZhNC0yZWJmZThkNGNkM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9ob2phcy0tbXVlc3RyYV9ob3Jpem9udGFsLmpwZyIsImlhdCI6MTc4MDM0MTM1MiwiZXhwIjoxODExODc3MzUyfQ.QTvwvlb1DTDSieAoBReBNE1_aFqCPXmMXwzQzKHMxP8'

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
        pdfDoc.text(footerText, w - 14, h - 7, { align: 'right' })
      }
    }

    addPdfBackground(doc)

    const group = groups.find(g => g.id === selectedGroup)
    const groupName = group?.name || 'GRUPO'
    const programName = programs.find(p => p.id === selectedProgram)?.titulo || ''
    const moduleName = modules.find(m => m.id === selectedModule)?.titulo_modulo || ''
    const deptoName = departamentos.find(d => d.id === selectedDepto)?.nombre || 'N/A'

    // --- TITULO PRINCIPAL (BANNER INSTITUCIONAL) ---
    doc.setFillColor(201, 167, 81) // Dorado institucional #bb973a
    doc.rect(14, 40, pageWidth - 28, 10, 'F')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORTE DE ASISTENCIA', pageWidth / 2, 46.5, { align: 'center' })

    const currentFac = facilitators.find(f => f.name === selectedFacilitator)
    const facilitatorDepto = currentFac?.depto || 'N/A'

    const currentModuleObj = modules.find(m => m.id === selectedModule)
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return 'N/A'
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
      return dateStr
    }

    // --- BLOQUE DE METADATOS (TABLA DINÁMICA - AUTO AJUSTABLE) ---
    autoTable(doc, {
      startY: 53,
      body: [
        [
          { content: `DEPARTAMENTO: ${facilitatorDepto.toUpperCase()}`, styles: { fontStyle: 'bold' } },
          { content: `PERIODO: I/2026`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `FACILITADOR(A): ${selectedFacilitator.toUpperCase() || 'N/A'}`, styles: { fontStyle: 'bold' } },
          { content: `TIPO DE REPORTE: MÓDULO (DÍAS 1 AL 6)`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `GRUPO: ${groupName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `${programName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `${moduleName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: `FECHA INICIO: ${formatDate(currentModuleObj?.fecha_inicio)}`, styles: { fontStyle: 'bold' } },
          { content: `FECHA FIN: ${formatDate(currentModuleObj?.fecha_fin)}`, styles: { fontStyle: 'bold' } }
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

    // Get list of registered days (1 to 6)
    const registeredDays = Array.from(new Set(allAtt.map((a: any) => a.dia))).filter(d => d >= 1 && d <= 6).sort((a, b) => a - b)

    // Build the table body data
    const tableData = participants.map((p, idx) => {
      const apellidos = p.participantes.apellido.toUpperCase()
      const nombres = p.participantes.nombre.toUpperCase()
      const fullName = `${apellidos}, ${nombres}`

      // For days 1 to 6, find status and calculate score
      let scoreSum = 0
      let count = 0

      const daysSymbols = [1, 2, 3, 4, 5, 6].map(d => {
        const record = allAtt.find(a => a.participante_id === p.participante_id && a.dia === d)

        // If day is registered, missing records are counted as 'falta'
        const isDayRegistered = registeredDays.includes(d)

        if (isDayRegistered) {
          count++
          const estado = record ? record.estado : 'falta'
          if (estado === 'asistio') scoreSum += 10
          else if (estado === 'permiso') scoreSum += 5
          else if (estado === 'atraso') scoreSum += 8
          else if (estado === 'falta') scoreSum += 0

          switch (estado) {
            case 'asistio': return 'A'
            case 'atraso': return 'AT'
            case 'falta': return 'F'
            case 'permiso': return 'P'
            default: return 'F'
          }
        }
        return '-' // Not registered yet
      })

      const average = count > 0 ? Math.round(scoreSum / count).toString() : '0'

      return [
        idx + 1,
        p.participantes.ci,
        fullName,
        ...daysSymbols,
        average
      ]
    })

    autoTable(doc, {
      startY: tableStartY,
      head: [['Nro', 'C.I.', 'APELLIDOS Y NOMBRES', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'PROM.']],
      body: tableData,
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
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 20 },
        2: { cellWidth: 64 },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'center', cellWidth: 12 },
        7: { halign: 'center', cellWidth: 12 },
        8: { halign: 'center', cellWidth: 12 },
        9: { halign: 'center', cellWidth: 18, fontStyle: 'bold', textColor: [201, 167, 81] }
      },
      margin: { top: 40, left: 14, right: 14 }
    })

    const finalY = (doc as any).lastAutoTable.finalY || 150

    // --- INDICADORES ACADÉMICOS Y SECCIÓN DE FIRMA ---
    const spaceNeededForEnding = 120
    let statsStartY = finalY + 4
    let hasAddedPageForEnding = false

    if (pageHeight - finalY < spaceNeededForEnding) {
      doc.addPage()
      addPdfBackground(doc)
      statsStartY = 40 // Safe margin on new page
      hasAddedPageForEnding = true
    }

    // --- LEYENDA Y FECHAS DE JORNADAS ---
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120)
    doc.text('SIMBOLOGÍA: A: ASISTIÓ (10 pts) | AT: ATRASO (8 pts) | F: FALTA (0 pts) | P: PERMISO (5 pts) | -: NO REGISTRADO', 14, statsStartY + 3)

    // Build dates legend for days 1 to 6
    const dateStrings: string[] = []
    for (let d = 1; d <= 6; d++) {
      const recordsForDay = allAtt.filter((a: any) => a.dia === d)
      if (recordsForDay.length > 0) {
        const dateStr = new Date(recordsForDay[0].fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
        dateStrings.push(`D${d}: ${dateStr}`)
      } else {
        dateStrings.push(`D${d}: -`)
      }
    }
    doc.text(`FECHAS REGISTRADAS: ${dateStrings.join(' | ')}`, 14, statsStartY + 6)

    // Calculate  stats
    let totalAsistio = 0
    let totalAtraso = 0
    let totalFalta = 0
    let totalPermiso = 0
    allAtt.forEach((a: any) => {
      if (a.estado === 'asistio') totalAsistio++
      if (a.estado === 'atraso') totalAtraso++
      if (a.estado === 'falta') totalFalta++
      if (a.estado === 'permiso') totalPermiso++
    })
    const totalRecords = allAtt.length
    const generalPct = totalRecords > 0 ? Math.round(((totalAsistio * 1.0 + totalPermiso * 0.5 + totalAtraso * 0.8) / totalRecords) * 100) : 0

    // Average score of the group
    let totalScoreSum = 0
    participants.forEach((p: any) => {
      let pScoreSum = 0
      let pCount = 0
      registeredDays.forEach(d => {
        const record = allAtt.find(a => a.participante_id === p.participante_id && a.dia === d)
        pCount++
        const status = record ? record.estado : 'falta'
        if (status === 'asistio') pScoreSum += 10
        else if (status === 'permiso') pScoreSum += 5
        else if (status === 'atraso') pScoreSum += 8
        else if (status === 'falta') pScoreSum += 0
      })
      const avg = pCount > 0 ? pScoreSum / pCount : 0
      totalScoreSum += avg
    })
    const groupAvgScore = participants.length > 0 ? Math.round(totalScoreSum / participants.length).toString() : '0'

    autoTable(doc, {
      startY: statsStartY + 9,
      head: [[{ content: 'INDICADORES ESTADÍSTICOS', colSpan: 5, styles: { halign: 'center', fillColor: [245, 245, 245], fontSize: 7 } }]],
      body: [
        [
          { content: 'TOTAL PARTICIPANTES', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'JORNADAS REGISTRADAS', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'PROMEDIO TOTAL', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'ASISTENCIA PROMEDIO', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
          { content: 'ESTADO MÓDULO', styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }
        ],
        [
          participants.length,
          `${registeredDays.length} de 6`,
          `${groupAvgScore} / 10 pts`,
          `${generalPct}%`,
          registeredDays.length >= 6 ? 'COMPLETADO' : 'EN DESARROLLO'
        ]
      ],
      theme: 'grid',
      willDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addPdfBackground(doc)
        }
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.3,
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [180, 180, 180],
        textColor: [0, 0, 0]
      },
      margin: { top: 40, left: 14, right: 14 }
    })

    const statsFinalY = (doc as any).lastAutoTable.finalY || finalY + 22

    // --- SECCIÓN DE FIRMA DEL FACILITADOR ---
    let signatureY = statsFinalY + 22
    if (signatureY > pageHeight - 68) {
      doc.addPage()
      addPdfBackground(doc)
      signatureY = 45 // Safe Y coordinates on fresh page
    }

    // Side-by-side Double Signature Layout
    const sigCenterXLeft = pageWidth * 0.3
    const sigCenterXRight = pageWidth * 0.7

    // Left Signature: FACILITADOR(A)
    doc.setDrawColor(40, 40, 40)
    doc.setLineWidth(0.3)
    doc.line(sigCenterXLeft - 25, signatureY + 12, sigCenterXLeft + 25, signatureY + 12)

    doc.setFillColor(201, 167, 81)
    doc.circle(sigCenterXLeft, signatureY + 12, 1, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(201, 167, 81)
    doc.text('FACILITADOR(A)', sigCenterXLeft, signatureY + 17, { align: 'center' })

    // Right Signature: RESPONSABLE DEPARTAMENTAL
    doc.setDrawColor(40, 40, 40)
    doc.setLineWidth(0.3)
    doc.line(sigCenterXRight - 25, signatureY + 12, sigCenterXRight + 25, signatureY + 12)

    doc.setFillColor(201, 167, 81)
    doc.circle(sigCenterXRight, signatureY + 12, 1, 'F')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(201, 167, 81)
    doc.text('RESPONSABLE DEPARTAMENTAL', sigCenterXRight, signatureY + 17, { align: 'center' })

    addPdfFooter(doc)
    doc.save(`ASISTENCIA_MODULO_${groupName.replace(/\s+/g, '_')}_${moduleName.replace(/\s+/g, '_')}.pdf`)
    setLoading(false)
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

          <div className="card glass" style={{ padding: '1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800 }}>Fecha de Registro</label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0' }}>
              <CalendarDays size={20} color="var(--primary)" />
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.4rem', fontStyle: 'italic' }}>
              La jornada se registrará con esta fecha oficial
            </div>
          </div>

          <div className="card glass" style={{ padding: '1.5rem' }}>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800, display: 'block', marginBottom: '0.5rem' }}>Programa & Módulo</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                {programs.map((p: any) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>
              <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.4rem', background: 'transparent', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                {modules.map((m: any) => <option key={m.id} value={m.id}>{m.grupo === 1 ? 'LENGUAJE - ' : m.grupo === 2 ? 'MATEMÁTICA - ' : ''}{m.titulo_modulo}</option>)}
              </select>
            </div>
          </div>

          <div className="card glass" style={{ padding: '1.5rem' }}>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800, display: 'block', marginBottom: '0.5rem' }}>
              {userRole === 'facilitador' ? 'Modo Facilitador' : 'Filtro de Grupo'}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {userRole !== 'facilitador' && (
                <select
                  value={selectedDepto}
                  onChange={(e) => {
                    setSelectedDepto(e.target.value)
                    setSelectedGroup('')
                  }}
                  disabled={!!userDeptId}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    borderRadius: '0.4rem',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--foreground)'
                  }}
                >
                  <option value="">Seleccionar Sede</option>
                  {departamentos.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
              <select
                value={selectedGroup}
                onChange={e => { setSelectedGroup(e.target.value); setSelectedFacilitator(''); }}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  borderRadius: '0.4rem',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--foreground)'
                }}
              >
                <option value="">Seleccionar Grupo</option>
                {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedGroup ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Deadline Banners */}
          {selectedModule && deadlineStatus.showWarning && (
            <div className="animate-fade-in" style={{
              padding: '1.25rem 1.75rem',
              borderRadius: '1rem',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'center',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#d97706',
                padding: '0.75rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 style={{ fontWeight: 900, color: 'var(--foreground)', fontSize: '0.95rem', margin: '0 0 0.25rem 0' }}>
                  Plazo de Registro de Asistencia Próximo a Vencer
                </h4>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                  El plazo límite de gracia para subir o editar la asistencia de este módulo vence el <strong>{deadlineStatus.deadlineStr}</strong>. Quedan <strong>{deadlineStatus.daysRemaining} días</strong> para finalizar el registro.
                </p>
              </div>
            </div>
          )}

          {selectedModule && !deadlineStatus.isAllowed && (
            <div className="animate-fade-in" style={{
              padding: '1.25rem 1.75rem',
              borderRadius: '1rem',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'center',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--danger)',
                padding: '0.75rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <XCircle size={24} />
              </div>
              <div>
                <h4 style={{ fontWeight: 900, color: 'var(--foreground)', fontSize: '0.95rem', margin: '0 0 0.25rem 0' }}>
                  Plazo de Registro de Asistencia Vencido
                </h4>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                  El plazo límite de gracia para este módulo venció el <strong>{deadlineStatus.deadlineStr}</strong>. El registro y la edición de asistencia están deshabilitados. Por favor, póngase en contacto con el administrador del departamento para cualquier consulta.
                </p>
              </div>
            </div>
          )}

          {/* Module Progress / Alert */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Clock size={14} /> Avance del Módulo: {historyDays.length} / 6 Jornadas
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: historyDays.length >= 6 ? 'var(--success)' : 'var(--info)' }}>
                {historyDays.length >= 6 ? '¡COMPLETADO!' : `${6 - historyDays.length} días restantes`}
              </div>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{
                width: `${Math.min(100, (historyDays.length / 6) * 100)}%`,
                height: '100%',
                background: historyDays.length >= 6 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #bb973a, #d5ad42)',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: historyDays.length >= 6 ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
              }}></div>
            </div>
          </div>

          {historyDays.length >= 6 && (
            <div className="animate-fade-up" style={{
              marginBottom: '1.5rem',
              padding: '1.25rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              color: '#10b981',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)'
            }}>
              <div style={{ background: '#10b981', color: '#000', padding: '0.5rem', borderRadius: '0.75rem' }}>
                <CheckCircle size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.15rem' }}>¡Módulo Finalizado!</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 500, lineHeight: '1.4' }}>
                  Has completado el ciclo de 6 jornadas para este módulo. <br />
                  <span style={{ fontWeight: 800 }}>Recomendación:</span> Selecciona el siguiente módulo en el panel superior para continuar el registro.
                </div>
              </div>
            </div>
          )}

          {/* Prominent History Table */}
          <div className="card glass" style={{ borderTop: `4px solid ${historyDays.length >= 6 ? 'var(--success)' : 'var(--info)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} color={historyDays.length >= 6 ? 'var(--success)' : 'var(--info)'} /> Jornadas Registradas para {groups.find(g => g.id === selectedGroup)?.name}
              </h3>
              {historyDays.length > 0 && (
                <button
                  className="btn btn-outline"
                  disabled={historyDays.length >= 6 || !deadlineStatus.isAllowed}
                  onClick={() => {
                    const action = () => {
                      const today = new Date().toISOString().split('T')[0];
                      setSelectedDate(today);
                      // Find first missing day between 1 and 6
                      let nextDay = 1;
                      for (let d = 1; d <= 6; d++) {
                        if (!historyDays.some(h => h.dia === d)) {
                          nextDay = d;
                          break;
                        }
                      }
                      setDayNumber(nextDay);
                      setEditingRowDia(nextDay);
                      setEditRowNewDia(nextDay);
                      setEditRowNewFecha(today);
                    };
                    if (isDirty) {
                      setPendingAction(() => action);
                      setShowDirtyModal(true);
                    } else {
                      action();
                    }
                  }}
                  style={{
                    borderColor: (historyDays.length >= 6 || !deadlineStatus.isAllowed) ? 'var(--border)' : 'var(--info)',
                    color: (historyDays.length >= 6 || !deadlineStatus.isAllowed) ? 'var(--muted)' : 'var(--info)',
                    opacity: (historyDays.length >= 6 || !deadlineStatus.isAllowed) ? 0.5 : 1,
                    cursor: deadlineStatus.isAllowed ? 'pointer' : 'not-allowed',
                    fontWeight: 700
                  }}
                >
                  {historyDays.length >= 6 ? 'Módulo Completado (6/6)' : '+ Nueva Jornada (Hoy)'}
                </button>
              )}
            </div>

            {(() => {
              const renderedRows = [...historyDays];
              const isNewDay = !historyDays.some(h => h.dia === dayNumber);
              if (isNewDay) {
                renderedRows.push({
                  dia: dayNumber,
                  fecha: selectedDate,
                  asistio: stats.asistieron,
                  atraso: stats.atrasos,
                  falta: stats.faltas,
                  permiso: stats.permisos,
                  total: participants.length,
                  isPreview: true
                } as any);
              }
              renderedRows.sort((a, b) => a.dia - b.dia);

              const violations = getChronologicalViolations();

              return renderedRows.length > 0 ? (
                <div>
                  {violations.map((v, idx) => (
                    <div key={idx} className="animate-fade-in" style={{
                      marginBottom: '1rem',
                      padding: '0.85rem 1.25rem',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      color: 'var(--danger)',
                      fontSize: '0.825rem',
                      fontWeight: 600
                    }}>
                      <span style={{ fontSize: '1.25rem', display: 'inline-flex', alignItems: 'center' }}>⚠️</span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                          {v.type === 'duplicate' ? 'Alerta: Fechas Duplicadas' : 'Alerta: Inconsistencia Cronológica'}
                        </strong>
                        <span style={{ opacity: 0.9 }}>{v.msg}</span>
                      </div>
                    </div>
                  ))}

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr style={{ background: 'transparent' }}>
                          <th>Jornada</th>
                          <th style={{ textAlign: 'center' }}>Fecha</th>
                          <th style={{ textAlign: 'center' }}>Asistió</th>
                          <th style={{ textAlign: 'center' }}>Atraso</th>
                          <th style={{ textAlign: 'center' }}>Falta</th>
                          <th style={{ textAlign: 'center' }}>Permiso</th>
                          <th style={{ textAlign: 'center' }}>Total</th>
                          <th style={{ textAlign: 'right' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderedRows.map(h => {
                          const isEditing = h.dia === dayNumber;
                          const isEditingRow = editingRowDia === h.dia;
                          const isPreview = (h as any).isPreview;
                          const rowViolations = violations.filter(v => v.affectedDays.includes(h.dia));
                          const hasViolation = rowViolations.length > 0;
                          return (
                            <tr key={h.dia} style={{ background: isEditing ? 'var(--primary-light)' : 'transparent', transition: 'all 0.2s' }}>
                              <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                                {isEditingRow ? (
                                  <select
                                    value={editRowNewDia}
                                    onChange={e => setEditRowNewDia(parseInt(e.target.value))}
                                    style={{
                                      background: 'var(--card-bg)',
                                      border: '1px solid var(--primary)',
                                      borderRadius: '0.4rem',
                                      color: 'var(--primary)',
                                      fontSize: '1rem',
                                      fontWeight: 900,
                                      padding: '0.2rem 0.4rem',
                                      outline: 'none'
                                    }}
                                  >
                                    {[1, 2, 3, 4, 5, 6].map(d => (
                                      <option key={d} value={d} style={{ background: 'var(--card-bg)', color: 'var(--foreground)' }}>Día {d}</option>
                                    ))}
                                  </select>
                                ) : (
                                  `Día ${h.dia}`
                                )}

                                {isPreview && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#10b981',
                                    padding: '0.15rem 0.35rem',
                                    borderRadius: '0.25rem',
                                    fontWeight: 800,
                                    marginLeft: '0.5rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                                    Agregando...
                                  </span>
                                )}

                                {isEditing && !isPreview && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    color: 'var(--info)',
                                    padding: '0.15rem 0.35rem',
                                    borderRadius: '0.25rem',
                                    fontWeight: 800,
                                    marginLeft: '0.5rem'
                                  }}>
                                    Editando...
                                  </span>
                                )}
                              </td>
                              <td style={{
                                textAlign: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                color: hasViolation ? 'var(--danger)' : 'var(--muted)',
                                background: hasViolation ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                                borderRadius: '0.4rem',
                                padding: '0.35rem 0.6rem',
                                border: hasViolation ? '1px dashed rgba(239, 68, 68, 0.3)' : 'none',
                                transition: 'all 0.2s'
                              }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                                  {hasViolation && (
                                    <span style={{ cursor: 'help', fontSize: '0.95rem' }} title={rowViolations.map(v => v.msg).join('\n')}>
                                      ⚠️
                                    </span>
                                  )}
                                  {isEditingRow ? (
                                    <input
                                      type="date"
                                      value={editRowNewFecha}
                                      onChange={e => setEditRowNewFecha(e.target.value)}
                                      style={{
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--primary)',
                                        borderRadius: '0.4rem',
                                        color: 'var(--foreground)',
                                        padding: '0.2rem 0.4rem',
                                        fontSize: '0.85rem',
                                        width: '130px',
                                        textAlign: 'center',
                                        outline: 'none'
                                      }}
                                    />
                                  ) : (
                                    new Date(h.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 800 }}>{h.asistio}</td>
                              <td style={{ textAlign: 'center', color: 'var(--warning)', fontWeight: 800 }}>{h.atraso}</td>
                              <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 800 }}>{h.falta}</td>
                              <td style={{ textAlign: 'center', color: 'var(--info)', fontWeight: 800 }}>{h.permiso}</td>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--muted)' }}>{h.total}</td>
                              <td style={{ textAlign: 'right' }}>
                                {isEditingRow ? (
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => handleUpdateRowJornada(h.dia)}
                                      disabled={saving}
                                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 }}
                                    >
                                      {saving ? 'Guardando...' : 'Actualizar'}
                                    </button>
                                    <button
                                      className="btn btn-ghost"
                                      onClick={() => setEditingRowDia(null)}
                                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', border: '1px solid var(--border)', fontWeight: 700 }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : isPreview ? (
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, fontStyle: 'italic', paddingRight: '0.5rem' }}>
                                      Borrador
                                    </span>
                                    <button
                                      className="btn btn-ghost"
                                      disabled={!deadlineStatus.isAllowed}
                                      onClick={() => {
                                        setEditingRowDia(h.dia);
                                        setEditRowNewDia(h.dia);
                                        setEditRowNewFecha(h.fecha);
                                      }}
                                      style={{
                                        padding: '0.4rem 0.8rem',
                                        fontSize: '0.8rem',
                                        border: '1px solid var(--border)',
                                        color: 'var(--info)',
                                        fontWeight: 700,
                                        opacity: deadlineStatus.isAllowed ? 1 : 0.5,
                                        cursor: deadlineStatus.isAllowed ? 'pointer' : 'not-allowed'
                                      }}
                                    >
                                      Editar Día
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button
                                      className={`btn ${isEditing ? 'btn-primary' : 'btn-ghost'}`}
                                      disabled={!deadlineStatus.isAllowed}
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
                                      style={{
                                        padding: '0.4rem 0.8rem',
                                        fontSize: '0.8rem',
                                        border: isEditing ? 'none' : '1px solid var(--border)',
                                        fontWeight: 700,
                                        opacity: deadlineStatus.isAllowed ? 1 : 0.5,
                                        cursor: deadlineStatus.isAllowed ? 'pointer' : 'not-allowed'
                                      }}
                                    >
                                      {isEditing ? 'Editando...' : 'Ver / Editar'}
                                    </button>
                                    <button
                                      className="btn btn-ghost"
                                      disabled={!deadlineStatus.isAllowed}
                                      onClick={() => {
                                        setEditingRowDia(h.dia);
                                        setEditRowNewDia(h.dia);
                                        setEditRowNewFecha(h.fecha);
                                      }}
                                      style={{
                                        padding: '0.4rem 0.8rem',
                                        fontSize: '0.8rem',
                                        border: '1px solid var(--border)',
                                        color: 'var(--info)',
                                        fontWeight: 700,
                                        opacity: deadlineStatus.isAllowed ? 1 : 0.5,
                                        cursor: deadlineStatus.isAllowed ? 'pointer' : 'not-allowed'
                                      }}
                                    >
                                      Editar Día
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in" style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  background: 'linear-gradient(180deg, rgba(var(--primary-rgb), 0.03) 0%, transparent 100%)',
                  borderRadius: '1rem',
                  border: '1px dashed rgba(var(--primary-rgb), 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1.25rem',
                  margin: '1rem 0'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '1rem',
                    background: 'rgba(var(--primary-rgb), 0.1)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(var(--primary-rgb), 0.15)'
                  }}>
                    <CalendarDays size={28} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '0.4rem' }}>Primera Jornada Lista</h4>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
                      Aún no hay asistencias registradas. La tabla de abajo ya está configurada para el <strong>Día 1</strong>. Simplemente marca la asistencia y guarda los cambios para registrarla.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      window.scrollTo({ top: window.scrollY + 400, behavior: 'smooth' });
                    }}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.6rem 1.25rem',
                      background: 'var(--primary)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '99px',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.3)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--primary-rgb), 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(var(--primary-rgb), 0.3)';
                    }}
                  >
                    Ir a Pasar Lista <ChevronRight size={14} />
                  </button>
                </div>
              );
            })()}
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
                            : current === 'permiso' ? 'rgba(187,151,58,0.05)'
                              : 'transparent'

                      const statusConfig = {
                        asistio: { label: '✓ Asistió', activeColor: '#10d98b', activeBg: 'rgba(16,217,139,0.15)', activeBorder: '#10d98b' },
                        atraso: { label: '⏱ Atraso', activeColor: '#f5a623', activeBg: 'rgba(245,166,35,0.15)', activeBorder: '#f5a623' },
                        falta: { label: '✗ Falta', activeColor: '#ef4444', activeBg: 'rgba(239,68,68,0.15)', activeBorder: '#ef4444' },
                        permiso: { label: '📋 Permiso', activeColor: '#bb973a', activeBg: 'rgba(187,151,58,0.15)', activeBorder: '#bb973a' },
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
                                  disabled={!deadlineStatus.isAllowed}
                                  style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '0.75rem',
                                    border: isActive ? `2px solid ${cfg.activeBorder}` : '1px solid var(--border)',
                                    background: isActive ? cfg.activeBg : 'transparent',
                                    color: isActive ? cfg.activeColor : 'var(--muted)',
                                    fontWeight: isActive ? 800 : 500,
                                    fontSize: '0.75rem',
                                    cursor: deadlineStatus.isAllowed ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    width: '100%',
                                    minWidth: '100px',
                                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                    boxShadow: isActive ? `0 4px 12px ${cfg.activeBg}` : 'none',
                                    opacity: deadlineStatus.isAllowed ? 1 : 0.6
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
                  style={{
                    flex: 2,
                    padding: '1.25rem',
                    fontSize: '1.1rem',
                    opacity: deadlineStatus.isAllowed ? 1 : 0.5,
                    cursor: deadlineStatus.isAllowed ? 'pointer' : 'not-allowed'
                  }}
                  onClick={() => setShowConfirm(true)}
                  disabled={saving || participants.length === 0 || !deadlineStatus.isAllowed}
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
        .btn-status-permiso { background: #bb973a; color: white; box-shadow: 0 4px 12px rgba(201, 167, 81, 0.3); }
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
      {mounted && showConfirm && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(3, 4, 11, 0.7)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
          overflowY: 'auto', padding: '1.5rem 1rem'
        }}>
          <div className="card glass animate-fade-up" style={{ maxWidth: '400px', width: '90%', padding: '2rem', borderTop: '4px solid var(--warning)', margin: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 900 }}>
              <AlertCircle size={24} /> Confirmar Asistencia
            </h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              ¿Estás seguro que los datos son correctos? <strong style={{ color: 'var(--foreground)' }}>Una vez finalizado, no se podrán editar fácilmente.</strong>
            </p>

            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span>Fecha de Asistencia:</span> <strong style={{ color: 'var(--primary)' }}>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span>Jornada / Día:</span> <strong style={{ color: 'var(--primary)' }}>Día {dayNumber}</strong></div>
              <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span>Total Activos:</span> <strong style={{ fontSize: '1.1rem' }}>{participants.length}</strong></div>
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
                style={{ flex: 1, background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000', fontWeight: 800 }}
                onClick={() => {
                  setShowConfirm(false);
                  saveAttendance();
                }}
              >
                Sí, Guardar Lista
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dirty State Warning Modal */}
      {mounted && showDirtyModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(3, 4, 11, 0.7)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
          overflowY: 'auto', padding: '1.5rem 1rem'
        }}>
          <div className="card glass animate-fade-up" style={{ maxWidth: '450px', width: '90%', padding: '2.5rem', borderTop: '5px solid #ef4444', textAlign: 'center', margin: 'auto' }}>
            <div style={{ color: '#ef4444', marginBottom: '1.5rem' }}>
              <AlertCircle size={64} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ marginBottom: '1rem', fontWeight: 900 }}>¡Cambios sin Guardar!</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
              Tienes modificaciones en el pase de lista de la jornada actual (Día {dayNumber}).
              Si continúas, estos cambios se **perderán permanentemente**.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, color: '#ef4444', borderColor: '#ef4444', padding: '1rem' }}
                onClick={() => {
                  if (pendingAction) pendingAction();
                  setShowDirtyModal(false);
                  setPendingAction(null);
                }}
              >
                No Guardar
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: 'var(--success)', borderColor: 'var(--success)', padding: '1rem', color: '#000', fontWeight: 800 }}
                onClick={async () => {
                  const success = await saveAttendance();
                  if (success && pendingAction) {
                    pendingAction();
                    setShowDirtyModal(false);
                    setPendingAction(null);
                  }
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
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
