'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  LineChart, Line, ComposedChart, Scatter, LabelList, ReferenceLine,
  ScatterChart, ReferenceArea, ZAxis
} from 'recharts'
import {
  FileDown, LayoutDashboard, Users, CheckSquare, TrendingUp,
  Activity, Building2, Database, PieChart as PieIcon,
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight,
  Filter, Layers, Group, AlertTriangle, Zap, Target, MousePointer2
} from 'lucide-react'
import * as XLSX from 'xlsx'

// Custom Tooltip for Recharts to match our premium design
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // For ScatterChart, the name is in payload[0].payload.name
    const data = payload[0].payload;
    const title = data.name || label;

    return (
      <div className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)' }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--primary)' }}>
          {title}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: entry.color }} />
                <span style={{ color: 'var(--foreground-2)', fontWeight: 500 }}>{entry.name}:</span>
              </div>
              <span style={{ fontWeight: 800, color: 'var(--foreground)' }}>
                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}{entry.unit || ''}
              </span>
            </div>
          ))}
          {data.size && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.4rem', paddingTop: '0.4rem', fontSize: '0.65rem', color: 'var(--foreground-3)' }}>
              Población Base: <b>{data.size} inscritos</b>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

export default function ReportsClient({
  attendanceData = [],
  enrollmentData = []
}: {
  attendanceData: any[],
  enrollmentData: any[]
}) {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'resumen' | 'asistencia' | 'inscripcion' | 'analisis' | 'operativo'>('resumen')
  const [selectedDept, setSelectedDept] = useState('all')
  const [selectedDay, setSelectedDay] = useState<'all' | number>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [localCategory, setLocalCategory] = useState<'all' | 'asistencia' | 'inscripcion'>('all')

  useEffect(() => { setMounted(true) }, [])

  // --- DESIGN TOKENS ---
  const COLORS = {
    primary: '#4f8ef7',
    success: '#10d98b',
    warning: '#f5a623',
    danger: '#f74f6b',
    purple: '#a78bfa',
    info: '#0ea5e9',
    muted: '#7070a0',
    gold: '#fbbf24'
  }

  const GRADIENTS = {
    primary: ['#4f8ef7', '#2563eb'],
    success: ['#10d98b', '#059669'],
    warning: ['#f5a623', '#d97706']
  }

  // --- ADVANCED DATA DERIVATION ---
  const deptoList = useMemo(() => {
    const depts = [...new Set([...attendanceData.map(a => a.dept_name), ...enrollmentData.map(e => e.dept_name)])]
    return depts.filter(d => d && d !== 'S/D').sort()
  }, [attendanceData, enrollmentData])

  const dayList = useMemo(() => {
    return [...new Set(attendanceData.map(a => a.dia))].sort((a, b) => a - b)
  }, [attendanceData])

  const filteredAttendance = useMemo(() => {
    let data = selectedDept === 'all' ? attendanceData : attendanceData.filter(a => a.dept_name === selectedDept)
    if (selectedDay !== 'all') {
      data = data.filter(a => a.dia === selectedDay)
    }
    return data
  }, [attendanceData, selectedDept, selectedDay])

  const filteredEnrollment = useMemo(() => {
    if (selectedDept === 'all') return enrollmentData
    return enrollmentData.filter(e => e.dept_name === selectedDept)
  }, [enrollmentData, selectedDept])

  // --- SENIOR METRICS ENGINE ---
  const metrics = useMemo(() => {
    const att = filteredAttendance
    const enr = filteredEnrollment

    const total_inscritos = enr.reduce((acc, curr) => acc + (curr.total_inscritos || 0), 0)
    const total_confirmados = enr.reduce((acc, curr) => acc + (curr.total_confirmados || 0), 0)
    const total_docs_pre = enr.reduce((acc, curr) => acc + (curr.preinscritos_entrego || 0), 0)
    const total_docs_ins = enr.reduce((acc, curr) => acc + (curr.inscritos_entrego || 0), 0)

    const total_asistieron = att.reduce((acc, curr) => acc + (curr.asistieron || 0), 0)
    const total_atrasos = att.reduce((acc, curr) => acc + (curr.atraso || 0), 0)
    const total_faltas = att.reduce((acc, curr) => acc + (curr.falta || 0), 0)
    const total_permisos = att.reduce((acc, curr) => acc + (curr.permiso || 0), 0)

    const total_esperado = total_asistieron + total_atrasos + total_faltas + total_permisos
    const attendance_rate = total_esperado > 0 ? (total_asistieron / total_esperado) * 100 : 0
    const confirmation_rate = total_inscritos > 0 ? (total_confirmados / total_inscritos) * 100 : 0

    // Efficiency Index: Combines confirmation and attendance
    const efficiency_score = (confirmation_rate * (attendance_rate / 100))

    return {
      total_inscritos,
      total_confirmados,
      total_docs_pre,
      total_docs_ins,
      total_asistieron,
      total_atrasos,
      total_faltas,
      total_permisos,
      attendance_rate: attendance_rate.toFixed(1),
      confirmation_rate: confirmation_rate.toFixed(1),
      efficiency_score: efficiency_score.toFixed(1),
      dropout_rate: (100 - attendance_rate).toFixed(1),
      avg_per_day: selectedDay === 'all'
        ? Math.round(total_asistieron / (dayList.length || 1))
        : total_asistieron
    }
  }, [filteredAttendance, filteredEnrollment, selectedDay, dayList])

  // --- CHART DATA GENERATION ---

  // 1. Attendance Distribution (Pie)
  const attendanceDistribution = useMemo(() => [
    { name: 'Asistencias', value: metrics.total_asistieron },
    { name: 'Atrasos', value: metrics.total_atrasos },
    { name: 'Faltas', value: metrics.total_faltas },
    { name: 'Permisos', value: metrics.total_permisos }
  ].filter(i => i.value > 0), [metrics])

  // 2. Departmental Comparison (Stacked Bar)
  const departmentalComparison = useMemo(() => {
    return deptoList.map(dept => {
      const deptEnr = enrollmentData.filter(e => e.dept_name === dept)
      const inscritos = deptEnr.reduce((acc, curr) => acc + (curr.total_inscritos || 0), 0)
      const confirmados = deptEnr.reduce((acc, curr) => acc + (curr.total_confirmados || 0), 0)
      const docs_pre = deptEnr.reduce((acc, curr) => acc + (curr.preinscritos_entrego || 0), 0)
      const docs_ins = deptEnr.reduce((acc, curr) => acc + (curr.inscritos_entrego || 0), 0)
      return {
        name: dept,
        Inscritos: confirmados,
        Pendientes: Math.max(0, inscritos - confirmados),
        Docs_Pre: docs_pre,
        Docs_Ins: docs_ins
      }
    })
  }, [enrollmentData, deptoList])

  // 3. Daily Attendance Trend (Area Chart)
  const dailyTrend = useMemo(() => {
    const days = [...new Set(filteredAttendance.map(a => a.dia))].sort((a, b) => a - b)
    return days.map(dia => {
      const dayData = filteredAttendance.filter(a => a.dia === dia)
      return {
        name: `Día ${dia}`,
        Asistieron: dayData.reduce((acc, curr) => acc + (curr.asistieron || 0), 0),
        Atrasos: dayData.reduce((acc, curr) => acc + (curr.atraso || 0), 0),
        Total: dayData.reduce((acc, curr) => acc + (curr.asistieron + curr.atraso + curr.falta + curr.permiso), 0)
      }
    })
  }, [filteredAttendance])

  const funnelData = useMemo(() => [
    { name: 'Preinscritos', value: metrics.total_inscritos, fill: COLORS.primary, icon: Users },
    { name: 'Inscritos', value: metrics.total_confirmados, fill: COLORS.info, icon: TrendingUp },
    { name: 'Asistencia Prom.', value: metrics.avg_per_day, fill: COLORS.success, icon: CheckSquare }
  ], [metrics, COLORS])

  // --- ANOMALY DETECTION (Senior Feature) ---
  const anomalies = useMemo(() => {
    const groupStats = [...new Set(filteredAttendance.map(a => a.group_name))].map(gn => {
      const gData = filteredAttendance.filter(a => a.group_name === gn)
      const ok = gData.reduce((acc, curr) => acc + curr.asistieron, 0)
      const err = gData.reduce((acc, curr) => acc + curr.falta, 0)
      const total = ok + err || 1
      return { name: gn, rate: (ok / total) * 100, count: gData.length }
    })
    return groupStats.filter(g => g.rate < 60 && g.count > 0).sort((a, b) => a.rate - b.rate).slice(0, 5)
  }, [filteredAttendance])

  // --- COMPARATIVE PERFORMANCE (Scatter Plot) ---
  const performanceMatrix = useMemo(() => {
    return filteredEnrollment.map(g => {
      const gAtt = filteredAttendance.filter(a => a.group_name === g.group_name)
      const ok = gAtt.reduce((acc, curr) => acc + curr.asistieron, 0)
      const total = gAtt.reduce((acc, curr) => acc + (curr.asistieron + curr.atraso + curr.falta + curr.permiso), 0)
      return {
        name: g.group_name,
        inscripcion: g.total_inscritos > 0 ? Math.min((g.total_confirmados / g.total_inscritos) * 100, 100) : 0,
        asistencia: total > 0 ? Math.min((ok / total) * 100, 100) : 0,
        size: g.total_inscritos
      }
    })
  }, [filteredEnrollment, filteredAttendance])

  if (!mounted) return null

  const exportAll = () => {
    const ws1 = XLSX.utils.json_to_sheet(attendanceData)
    const ws2 = XLSX.utils.json_to_sheet(enrollmentData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, "Asistencias")
    XLSX.utils.book_append_sheet(wb, ws2, "Inscripciones")
    XLSX.writeFile(wb, `PROFE_Master_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Dynamic Navigation Bar */}
      <div className="glass card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--surface)', padding: '0.3rem', borderRadius: '0.85rem' }}>
          <TabBtn active={tab === 'resumen'} onClick={() => setTab('resumen')} icon={LayoutDashboard} label="Dashboard" />
          <TabBtn active={tab === 'analisis'} onClick={() => setTab('analisis')} icon={Zap} label="Análisis Estratégico" />
          <TabBtn active={tab === 'operativo'} onClick={() => setTab('operativo')} icon={Layers} label="Ficha Operativa" />
          <TabBtn active={tab === 'asistencia'} onClick={() => setTab('asistencia')} icon={Database} label="Data Source" />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)' }}>
            <Filter size={16} color="var(--primary)" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, outline: 'none', color: 'var(--foreground)' }}
            >
              <option value="all">Filtro Nacional</option>
              {deptoList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={exportAll}>
            <FileDown size={18} /> Master Export
          </button>
        </div>
      </div>

      {/* Main KPI Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <KPI title="Población Total" value={metrics.total_inscritos} icon={Users} color={COLORS.primary} subtitle="Preinscritos registrados" />
        <KPI title="Tasa de Inscripción" value={`${metrics.confirmation_rate}%`} icon={Target} color={COLORS.info} subtitle="Compromiso inicial" />
        <KPI title="Docs (Preinscritos)" value={metrics.total_docs_pre} icon={CheckSquare} color={COLORS.purple} subtitle="Entregados por preinscritos" />
        <KPI title="Docs (Inscritos)" value={metrics.total_docs_ins} icon={CheckSquare} color={COLORS.success} subtitle="Entregados por inscritos" />
        <KPI title="Efectividad de Asistencia" value={`${metrics.attendance_rate}%`} icon={Zap} color={COLORS.success} subtitle="Asistencia real vs esperada" />
        <KPI title="Score de Eficiencia" value={metrics.efficiency_score} icon={MousePointer2} color={COLORS.gold} subtitle="Cálculo algorítmico" />
        <KPI title="Tasa de Deserción" value={`${metrics.dropout_rate}%`} icon={AlertTriangle} color={COLORS.danger} subtitle="Faltas y permisos" />
      </div>

      {tab === 'resumen' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '2rem' }}>

          {/* Funnel Visualization */}
          <ChartCard
            title={`Embudo de Conversión (${selectedDay === 'all' ? 'Promedio' : `Día ${selectedDay}`})`}
            icon={TrendingUp}
            extra={
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <option value="all">Vista Promedio</option>
                {dayList.map(d => <option key={d} value={d}>Día {d}</option>)}
              </select>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
              {funnelData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '80px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--foreground-3)', textAlign: 'right', textTransform: 'uppercase' }}>{item.name}</div>
                  <div style={{ flex: 1, position: 'relative', height: '40px', background: 'var(--surface)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(item.value / metrics.total_inscritos) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${item.fill}, ${item.fill}88)`,
                      borderRadius: '8px',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                    <div style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', fontWeight: 900, color: 'white', fontSize: '0.9rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                      {item.value.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ width: '50px', fontSize: '0.8rem', fontWeight: 700, color: item.fill }}>
                    {i === 0 ? '100%' : `${((item.value / funnelData[i - 1].value) * 100).toFixed(0)}%`}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--foreground-2)' }}>
              <Zap size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              <b>Análisis Senior:</b> Los porcentajes se calculan sobre el <b>Promedio Diario</b> de asistencia para normalizar el flujo y evitar duplicados por jornadas.
            </div>
          </ChartCard>

          {/* Daily Trend with Anomaly Highlight */}
          <ChartCard title="Tendencia de Participación Diaria" icon={Activity}>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--chart-text)" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Total" fill={COLORS.primary} fillOpacity={0.05} stroke="transparent" />
                <Bar dataKey="Asistieron" fill={COLORS.success} radius={[4, 4, 0, 0]} barSize={30} />
                <Line type="monotone" dataKey="Atrasos" stroke={COLORS.warning} strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Anomaly Alerts Table */}
          <ChartCard title="Alertas de Deserción Crítica (Grupos < 60%)" icon={AlertTriangle}>
            <div className="table-container" style={{ maxHeight: '300px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Grupo Crítico</th>
                    <th>Asistencia %</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{a.name}</td>
                      <td style={{ color: COLORS.danger, fontWeight: 900 }}>{a.rate.toFixed(1)}%</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: COLORS.danger }}>ACCIÓN URGENTE</span>
                      </td>
                    </tr>
                  ))}
                  {anomalies.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--success)' }}>No se detectan anomalías críticas.</td></tr>}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* KPI Distribution */}
          <ChartCard title="Balance Operativo Global" icon={PieIcon}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={attendanceDistribution} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                  {attendanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % 8]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      ) : tab === 'analisis' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          {/* Strategic Insight Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="glass card" style={{ padding: '1.5rem', borderLeft: `6px solid ${COLORS.success}` }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--success-light)', color: COLORS.success, borderRadius: '0.5rem' }}><Zap size={20} /></div>
                <h4 style={{ margin: 0, fontWeight: 800 }}>Líder de Eficiencia</h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--foreground-2)' }}>
                El departamento de <b>{departmentalComparison[0]?.name}</b> lidera la conversión con un <b>{((departmentalComparison[0]?.Inscritos / metrics.total_inscritos) * 100).toFixed(1)}%</b> del total nacional.
              </p>
            </div>
            <div className="glass card" style={{ padding: '1.5rem', borderLeft: `6px solid ${COLORS.danger}` }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--danger-light)', color: COLORS.danger, borderRadius: '0.5rem' }}><AlertTriangle size={20} /></div>
                <h4 style={{ margin: 0, fontWeight: 800 }}>Zona de Riesgo</h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--foreground-2)' }}>
                Se detectan <b>{anomalies.length} grupos</b> en zona crítica. La correlación sugiere que una baja inscripción (&lt;40%) predice deserción masiva.
              </p>
            </div>
          </div>

          {/* Performance Bubble Chart (Senior Visualization) */}
          <ChartCard
            title="Matriz de Rendimiento Estratégico (Bubble View)"
            icon={Target}
            span={2}
            extra={
              <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <TrendingUp size={14} color="var(--primary)" />
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', fontWeight: 800, color: 'var(--foreground)' }}
                >
                  <option value="all">Consolidado Total</option>
                  {dayList.map(d => <option key={d} value={d}>Jornada Día {d}</option>)}
                </select>
              </div>
            }
          >
            <p style={{ fontSize: '0.85rem', color: 'var(--foreground-2)', marginBottom: '1.5rem', maxWidth: '600px' }}>
              El <b>tamaño</b> de la burbuja representa el volumen de inscritos. Se han filtrado etiquetas para resaltar solo grupos de alto impacto y anomalías críticas.
            </p>
            <div style={{ position: 'relative', background: 'var(--surface)', borderRadius: '1rem', padding: '1.5rem' }}>
              <ResponsiveContainer width="100%" height={500}>
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" opacity={0.4} />
                  <XAxis type="number" dataKey="inscripcion" name="Inscripción" unit="%" domain={[0, 100]} stroke="var(--chart-text)" fontSize={12} />
                  <YAxis type="number" dataKey="asistencia" name="Asistencia" unit="%" domain={[0, 100]} stroke="var(--chart-text)" fontSize={12} />
                  <ZAxis type="number" dataKey="size" range={[30, 400]} name="Población" />

                  {/* Strategic Quadrants */}
                  <ReferenceArea x1={75} x2={100} y1={75} y2={100} fill="rgba(16, 217, 139, 0.05)" />
                  <ReferenceArea x1={0} x2={75} y1={0} y2={75} fill="rgba(239, 68, 68, 0.05)" />
                  <ReferenceArea x1={75} x2={100} y1={0} y2={75} fill="rgba(245, 166, 35, 0.05)" />
                  <ReferenceArea x1={0} x2={75} y1={75} y2={100} fill="rgba(79, 142, 247, 0.05)" />

                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={75} stroke="var(--foreground-3)" strokeDasharray="5 5" label={{ position: 'top', value: 'META INSCR.', fill: 'var(--foreground-3)', fontSize: 9, fontWeight: 800 }} />
                  <ReferenceLine y={75} stroke="var(--foreground-3)" strokeDasharray="5 5" label={{ position: 'right', value: 'META ASIST.', fill: 'var(--foreground-3)', fontSize: 9, fontWeight: 800 }} />

                  <Scatter name="Grupos" data={performanceMatrix} fill={COLORS.primary}>
                    {performanceMatrix.map((entry, index) => {
                      // Logic for color based on strategic position
                      const isLeader = entry.asistencia >= 75 && entry.inscripcion >= 75;
                      const isRisk = entry.asistencia < 60 || entry.inscripcion < 40;

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isLeader ? COLORS.success : isRisk ? COLORS.danger : COLORS.info}
                          fillOpacity={0.6}
                          stroke={isLeader ? COLORS.success : isRisk ? COLORS.danger : COLORS.info}
                          strokeWidth={2}
                        />
                      )
                    })}
                    {/* Senior Filtering: Only show labels for outliers or high volume groups */}
                    <LabelList
                      dataKey="name"
                      content={(props: any) => {
                        const { x, y, value, payload } = props;
                        if (!payload) return null;
                        // Only show if in extreme quadrant or large group
                        const isHighImpact = payload.asistencia >= 85 || payload.asistencia <= 40 || payload.size > 20;
                        if (!isHighImpact) return null;
                        return (
                          <text x={x} y={y - 12} fill="var(--foreground)" fontSize="0.65rem" fontWeight="900" textAnchor="middle">
                            {value}
                          </text>
                        );
                      }}
                    />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Improved Legend Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '0.75rem', border: `1px solid ${COLORS.danger}44`, background: `${COLORS.danger}11` }}>
                <div style={{ fontWeight: 900, color: COLORS.danger, fontSize: '0.7rem', marginBottom: '0.2rem' }}>ZONA D: CRÍTICA</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-3)' }}>Baja asistencia general. Requiere intervención urgente.</div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '0.75rem', border: `1px solid ${COLORS.warning}44`, background: `${COLORS.warning}11` }}>
                <div style={{ fontWeight: 900, color: COLORS.warning, fontSize: '0.7rem', marginBottom: '0.2rem' }}>ZONA B: DESERCIÓN</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-3)' }}>Muchos inscritos que no llegan a las clases.</div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '0.75rem', border: `1px solid ${COLORS.info}44`, background: `${COLORS.info}11` }}>
                <div style={{ fontWeight: 900, color: COLORS.info, fontSize: '0.7rem', marginBottom: '0.2rem' }}>ZONA C: COMPROMISO</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-3)' }}>Pocos inscritos pero con asistencia perfecta.</div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '0.75rem', border: `1px solid ${COLORS.success}44`, background: `${COLORS.success}11` }}>
                <div style={{ fontWeight: 900, color: COLORS.success, fontSize: '0.7rem', marginBottom: '0.2rem' }}>ZONA A: LÍDERES</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-3)' }}>Alta Inscripción + Alta Asistencia. Grupos modelo.</div>
              </div>
            </div>
          </ChartCard>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            <ChartCard title="Benchmark Regional (Inscripciones y Docs)" icon={Building2}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={departmentalComparison} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="var(--chart-text)" fontSize={11} width={100} fontWeight={700} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '10px', marginBottom: '10px' }} />
                  <Bar dataKey="Inscritos" fill={COLORS.info} radius={[0, 4, 4, 0]} stackId="a">
                    <LabelList dataKey="Inscritos" position="right" style={{ fill: 'var(--foreground)', fontSize: '0.7rem', fontWeight: 800 }} />
                  </Bar>
                  <Bar dataKey="Docs_Ins" name="Docs (Inscritos)" fill={COLORS.success} radius={[0, 4, 4, 0]} stackId="b" />
                  <Bar dataKey="Docs_Pre" name="Docs (Preinscritos)" fill={COLORS.purple} radius={[0, 4, 4, 0]} stackId="b" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Ranking de Efectividad Operativa" icon={Activity}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deptoList.map(d => {
                  const att = attendanceData.filter(a => a.dept_name === d)
                  const ok = att.reduce((acc, curr) => acc + curr.asistieron, 0)
                  const total = att.reduce((acc, curr) => acc + (curr.asistieron + curr.retraso + curr.falta + curr.permiso), 0)
                  const rate = total > 0 ? (ok / total) * 100 : 0
                  return { name: d, rate }
                })
                  .sort((a, b) => b.rate - a.rate)
                  .slice(0, 6)
                  .map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '0.75rem' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: idx < 3 ? 'var(--primary-light)' : 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: idx < 3 ? 'var(--primary)' : 'var(--foreground-3)' }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem' }}>{item.name}</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: item.rate > 80 ? COLORS.success : item.rate > 60 ? COLORS.warning : COLORS.danger }}>{item.rate.toFixed(1)}%</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--foreground-3)', textTransform: 'uppercase' }}>Efectividad</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </ChartCard>
          </div>
        </div>
      ) : tab === 'operativo' ? (
        /* Ficha Operativa Detallada */
        <div className="glass card" style={{ padding: 0 }}>
          <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, var(--surface), transparent)' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Estatus Operativo de Grupos</h2>
            <p style={{ color: 'var(--foreground-3)', fontSize: '0.9rem' }}>Vista granulada para supervisores de campo</p>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Identificador Grupo</th>
                  <th>Sede</th>
                  <th>Preinscritos</th>
                  <th>Docs (Pre)</th>
                  <th>Inscritos</th>
                  <th>Docs (Ins)</th>
                  <th>Inscripción %</th>
                  <th>Asistencia Prom.</th>
                  <th>Score Final</th>
                </tr>
              </thead>
              <tbody>
                {/* Header Totals Row */}
                <tr style={{ background: 'var(--card-solid)', fontWeight: 900, borderBottom: '2px solid var(--border-strong)' }}>
                  <td colSpan={2} style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Resumen de Selección</td>
                  <td style={{ fontSize: '1rem' }}>{filteredEnrollment.reduce((acc, g) => acc + (g.total_inscritos || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.purple }}>{filteredEnrollment.reduce((acc, g) => acc + (g.preinscritos_entrego || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.info }}>{filteredEnrollment.reduce((acc, g) => acc + (g.total_confirmados || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.purple }}>{filteredEnrollment.reduce((acc, g) => acc + (g.inscritos_entrego || 0), 0).toLocaleString()}</td>
                  <td>{metrics.confirmation_rate}%</td>
                  <td style={{ color: COLORS.success }}>{metrics.avg_per_day}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
                      {metrics.efficiency_score}
                    </span>
                  </td>
                </tr>

                {filteredEnrollment.map((g, i) => {
                  const gAtt = filteredAttendance.filter(a => a.group_name === g.group_name)
                  const conf_rate = g.total_inscritos > 0 ? (g.total_confirmados / g.total_inscritos) * 100 : 0
                  const avg_att = gAtt.length > 0 ? (gAtt.reduce((acc, curr) => acc + curr.asistieron, 0) / gAtt.length) : 0
                  const score = (conf_rate * (avg_att / (g.total_confirmados || 1))).toFixed(1)

                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 800 }}>{g.group_name}</td>
                      <td style={{ color: 'var(--foreground-3)' }}>{g.dept_name}</td>
                      <td style={{ fontWeight: 700 }}>{g.total_inscritos}</td>
                      <td style={{ color: COLORS.purple, fontWeight: 700 }}>{g.preinscritos_entrego || 0}</td>
                      <td style={{ color: COLORS.info, fontWeight: 700 }}>{g.total_confirmados}</td>
                      <td style={{ color: COLORS.purple, fontWeight: 700 }}>{g.inscritos_entrego || 0}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '4px', background: 'var(--surface)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${conf_rate}%`, height: '100%', background: COLORS.info }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{conf_rate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ color: COLORS.success, fontWeight: 700 }}>{avg_att.toFixed(1)}</td>
                      <td>
                        <span className="badge" style={{
                          background: parseFloat(score) > 80 ? 'var(--success-light)' : parseFloat(score) > 50 ? 'var(--warning-light)' : 'var(--danger-light)',
                          color: parseFloat(score) > 80 ? 'var(--success)' : parseFloat(score) > 50 ? 'var(--warning)' : 'var(--danger)',
                          fontWeight: 900
                        }}>
                          {score}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                <tr style={{ background: 'var(--card-solid)', fontWeight: 900, borderTop: '2px solid var(--border-strong)' }}>
                  <td colSpan={2} style={{ textAlign: 'right', color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Totales de Selección</td>
                  <td style={{ fontSize: '1rem' }}>{filteredEnrollment.reduce((acc, g) => acc + (g.total_inscritos || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.purple }}>{filteredEnrollment.reduce((acc, g) => acc + (g.preinscritos_entrego || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.info }}>{filteredEnrollment.reduce((acc, g) => acc + (g.total_confirmados || 0), 0).toLocaleString()}</td>
                  <td style={{ fontSize: '1rem', color: COLORS.purple }}>{filteredEnrollment.reduce((acc, g) => acc + (g.inscritos_entrego || 0), 0).toLocaleString()}</td>
                  <td>{metrics.confirmation_rate}%</td>
                  <td style={{ color: COLORS.success }}>{metrics.avg_per_day}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
                      {metrics.efficiency_score}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* Data Source (Tabular) - Professional Explorer */
        <div className="glass card animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: '600px' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '0.8rem', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Database size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Explorador Maestro</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--foreground-3)' }}>Auditoría granular de registros brutos</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setLocalCategory('all')}
                  className={`btn ${localCategory === 'all' ? 'active' : ''}`}
                  style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid var(--border)', background: localCategory === 'all' ? 'var(--primary)' : 'transparent', color: localCategory === 'all' ? 'white' : 'var(--foreground-2)', cursor: 'pointer' }}
                >Todas</button>
                <button
                  onClick={() => setLocalCategory('asistencia')}
                  className={`btn ${localCategory === 'asistencia' ? 'active' : ''}`}
                  style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid var(--border)', background: localCategory === 'asistencia' ? 'var(--primary)' : 'transparent', color: localCategory === 'asistencia' ? 'white' : 'var(--foreground-2)', cursor: 'pointer' }}
                >Asistencias</button>
                <button
                  onClick={() => setLocalCategory('inscripcion')}
                  className={`btn ${localCategory === 'inscripcion' ? 'active' : ''}`}
                  style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid var(--border)', background: localCategory === 'inscripcion' ? 'var(--primary)' : 'transparent', color: localCategory === 'inscripcion' ? 'white' : 'var(--foreground-2)', cursor: 'pointer' }}
                >Inscripciones</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="glass" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem', borderRadius: '1rem', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-inner)' }}>
                <Activity size={18} color="var(--primary)" />
                <input
                  type="text"
                  placeholder="Filtrar por grupo, sede o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', color: 'var(--foreground)', fontWeight: 600 }}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 800 }}>LIMPIAR</button>
                )}
              </div>
              <div style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground-3)' }}>
                Mostrando <span style={{ color: 'var(--primary)' }}>
                  {[...filteredAttendance, ...filteredEnrollment]
                    .filter(x => {
                      const matchesSearch = x.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) || x.dept_name?.toLowerCase().includes(searchTerm.toLowerCase())
                      const matchesCat = localCategory === 'all' ? true : (localCategory === 'asistencia' ? 'asistieron' in x : !('asistieron' in x))
                      return matchesSearch && matchesCat
                    }).length
                  }
                </span> de {attendanceData.length + enrollmentData.length} registros
              </div>
            </div>
          </div>

          <div className="table-container" style={{ maxHeight: '600px' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Categoría</th>
                  <th>Atributo A</th>
                  <th>Atributo B</th>
                  <th style={{ textAlign: 'right' }}>Métrica / Conteo</th>
                  <th>Sede / Región</th>
                </tr>
              </thead>
              <tbody>
                {/* Header Summary Row */}
                <tr style={{ background: 'var(--card-solid)', fontWeight: 900, borderBottom: '2px solid var(--border-strong)' }}>
                  <td colSpan={3} style={{ color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.75rem', padding: '1rem' }}>Resumen de Vista Actual</td>
                  <td style={{ textAlign: 'right', fontSize: '1.1rem', color: 'var(--foreground)', padding: '1rem' }}>
                    {[...filteredAttendance, ...filteredEnrollment]
                      .filter(x => {
                        const matchesSearch = x.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) || x.dept_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        const matchesCat = localCategory === 'all' ? true : (localCategory === 'asistencia' ? 'asistieron' in x : !('asistieron' in x))
                        return matchesSearch && matchesCat
                      })
                      .reduce((acc, curr) => acc + (curr.asistieron || curr.total_inscritos || 0), 0).toLocaleString()}
                  </td>
                  <td style={{ color: 'var(--foreground-3)', fontSize: '0.7rem' }}>Auditado</td>
                </tr>

                {[...filteredAttendance, ...filteredEnrollment]
                  .filter(x => {
                    const matchesSearch = x.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) || x.dept_name?.toLowerCase().includes(searchTerm.toLowerCase())
                    const matchesCat = localCategory === 'all' ? true : (localCategory === 'asistencia' ? 'asistieron' in x : !('asistieron' in x))
                    return matchesSearch && matchesCat
                  })
                  .sort((a, b) => (a.group_name || '').localeCompare(b.group_name || '', undefined, { numeric: true }))
                  .map((row, i) => {
                    const isAsist = 'asistieron' in row
                    return (
                      <tr key={i} className="hover-row">
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isAsist ? <Activity size={12} color={COLORS.primary} /> : <Users size={12} color={COLORS.success} />}
                            <span className="badge" style={{
                              background: isAsist ? 'var(--primary-light)' : 'var(--success-light)',
                              color: isAsist ? 'var(--primary)' : 'var(--success)',
                              fontSize: '0.65rem',
                              fontWeight: 800
                            }}>
                              {isAsist ? 'ASISTENCIA' : 'INSCRIPCIÓN'}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--foreground-2)' }}>{isAsist ? `Jornada Día: ${row.dia}` : 'Población Objetivo'}</td>
                        <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{row.group_name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1rem' }}>
                          <span style={{ color: isAsist ? 'var(--foreground)' : COLORS.success }}>
                            {isAsist ? row.asistieron : row.total_inscritos}
                          </span>
                          <span style={{ fontSize: '0.65rem', marginLeft: '0.3rem', color: 'var(--foreground-3)' }}>{isAsist ? 'PRS' : 'REG'}</span>
                        </td>
                        <td style={{ color: 'var(--foreground-3)', fontWeight: 600 }}>{row.dept_name}</td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// --- SUB-COMPONENTS (Senior Optimized) ---

function KPI({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="glass card" style={{ position: 'relative', overflow: 'hidden', padding: '1.25rem 1.5rem', borderBottom: `4px solid ${color}` }}>
      <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, color: color }}>
        <Icon size={80} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--foreground-3)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
        <Icon size={14} /> {title}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '0.5rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--foreground-3)', fontWeight: 500 }}>{subtitle}</div>
    </div>
  )
}

function ChartCard({ title, icon: Icon, children, span = 1, extra }: any) {
  return (
    <div className="glass card" style={{ gridColumn: `span ${span}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '0.75rem', background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
            <Icon size={20} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{title}</h3>
        </div>
        {extra}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.6rem 1.25rem',
        borderRadius: '0.75rem',
        border: 'none',
        background: active ? 'var(--card-solid)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--foreground-3)',
        boxShadow: active ? 'var(--shadow-md)' : 'none',
        fontWeight: active ? '800' : '600',
        fontSize: '0.85rem',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: active ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}


