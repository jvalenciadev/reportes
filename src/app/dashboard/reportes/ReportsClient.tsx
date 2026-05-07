'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Line
} from 'recharts'
import {
  FileDown, Table as TableIcon, LayoutDashboard,
  Users, CheckSquare, TrendingUp, Calendar, Filter,
  LayoutGrid, Activity, Building2, ChevronRight
} from 'lucide-react'
import * as XLSX from 'xlsx'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ReportsClient({
  attendanceData = [],
  enrollmentData = []
}: {
  attendanceData: any[],
  enrollmentData: any[]
}) {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'resumen' | 'asistencia' | 'inscripcion'>('resumen')
  const [selectedDept, setSelectedDept] = useState('all')
  const [viewMode, setViewMode] = useState<'charts' | 'table'>('charts')

  useEffect(() => { setMounted(true) }, [])

  // --- LOGICA DE FILTRADO ---
  const filteredAttendance = useMemo(() => {
    if (selectedDept === 'all') return attendanceData
    return attendanceData.filter(a => a.dept_name === selectedDept)
  }, [attendanceData, selectedDept])

  const filteredEnrollment = useMemo(() => {
    if (selectedDept === 'all') return enrollmentData
    return enrollmentData.filter(e => e.dept_name === selectedDept)
  }, [enrollmentData, selectedDept])

  const deptoList = useMemo(() => {
    return [...new Set(attendanceData.map(a => a.dept_name))].sort()
  }, [attendanceData])

  // --- CALCULOS DE KPIS ---
  const stats = useMemo(() => {
    const total_asistencias = filteredAttendance.reduce((acc, curr) => acc + curr.asistieron, 0)
    const total_retrasos = filteredAttendance.reduce((acc, curr) => acc + curr.retraso, 0)
    const total_faltas = filteredAttendance.reduce((acc, curr) => acc + curr.falta, 0)
    const total_inscritos = filteredEnrollment.reduce((acc, curr) => acc + curr.total_inscritos, 0)
    const total_confirmados = filteredEnrollment.reduce((acc, curr) => acc + curr.total_confirmados, 0)

    return {
      asistencia_avg: filteredAttendance.length > 0 ? (total_asistencias / filteredAttendance.length).toFixed(1) : 0,
      confirmacion_rate: total_inscritos > 0 ? ((total_confirmados / total_inscritos) * 100).toFixed(1) : 0,
      total_registros: filteredAttendance.length,
      puntualidad: (total_asistencias + total_retrasos) > 0 ? ((total_asistencias / (total_asistencias + total_retrasos)) * 100).toFixed(1) : 0
    }
  }, [filteredAttendance, filteredEnrollment])

  // --- DATOS PARA GRAFICOS ---
  const dailyTrend = useMemo(() => {
    const days = [...new Set(filteredAttendance.map(a => a.dia))].sort((a, b) => a - b)
    return days.map(dia => {
      const dayData = filteredAttendance.filter(a => a.dia === dia)
      return {
        name: `Día ${dia}`,
        Asistieron: dayData.reduce((acc, curr) => acc + curr.asistieron, 0),
        Retrasos: dayData.reduce((acc, curr) => acc + curr.retraso, 0),
        Faltas: dayData.reduce((acc, curr) => acc + curr.falta, 0)
      }
    })
  }, [filteredAttendance])

  const deptoComparison = useMemo(() => {
    return deptoList.map(dept => {
      const deptData = attendanceData.filter(a => a.dept_name === dept)
      return {
        name: dept,
        Asistencia: deptData.reduce((acc, curr) => acc + curr.asistieron, 0),
        Inscritos: enrollmentData.filter(e => e.dept_name === dept).reduce((acc, curr) => acc + curr.total_inscritos, 0)
      }
    })
  }, [attendanceData, enrollmentData, deptoList])

  const exportExcel = () => {
    const data = tab === 'asistencia' ? filteredAttendance : filteredEnrollment
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Reporte")
    XLSX.writeFile(wb, `Reporte_PROFE_${tab}_${selectedDept}.xlsx`)
  }

  if (!mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} suppressHydrationWarning>

      {/* Header & Main Filters */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'var(--primary)', padding: '0.75rem', borderRadius: '1rem', color: 'white' }}>
            <Activity size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Centro de Inteligencia</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Análisis multidepartamental de PROFE</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ padding: '0.6rem 1rem' }}>
              <option value="all">🌍 Todos los Departamentos</option>
              {deptoList.map(d => <option key={d} value={d}>📍 {d}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={exportExcel}>
            <FileDown size={18} /> <span>Exportar Data</span>
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <KPI title="Asistencia Promedio" value={stats.asistencia_avg} subtitle="Estudiantes por grupo" icon={Users} color="#3b82f6" />
        <KPI title="Tasa de Confirmación" value={`${stats.confirmacion_rate}%`} subtitle="Efectividad de registro" icon={TrendingUp} color="#10b981" />
        <KPI title="Índice de Puntualidad" value={`${stats.puntualidad}%`} subtitle="Asistencia vs Retrasos" icon={Activity} color="#f59e0b" />
        <KPI title="Registros Totales" value={stats.total_registros} subtitle="Jornadas evaluadas" icon={Calendar} color="#8b5cf6" />
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '1rem', width: 'fit-content' }}>
        <TabBtn active={tab === 'resumen'} onClick={() => setTab('resumen')} icon={LayoutDashboard} label="Resumen General" />
        <TabBtn active={tab === 'asistencia'} onClick={() => setTab('asistencia')} icon={CheckSquare} label="Detalle Asistencia" />
        <TabBtn active={tab === 'inscripcion'} onClick={() => setTab('inscripcion')} icon={Users} label="Detalle Inscripciones" />
      </div>

      {/* CONTENT VIEWS */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Main Trend Chart */}
          <div className="card glass" style={{ height: '450px' }}>
            <h3 style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Evolución Diaria de Asistencia</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Datos basados en {selectedDept === 'all' ? 'todos los deptos' : selectedDept}</span>
            </h3>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorAsist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid var(--border)', borderRadius: '1rem' }} />
                <Legend />
                <Area type="monotone" dataKey="Asistieron" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAsist)" />
                <Area type="monotone" dataKey="Retrasos" stroke="#f59e0b" strokeWidth={2} fill="transparent" />
                <Area type="monotone" dataKey="Faltas" stroke="#ef4444" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Grid Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            <div className="card glass" style={{ height: '400px' }}>
              <h3 style={{ marginBottom: '2rem' }}>Comparativa de Departamentos</h3>
              <ResponsiveContainer>
                <ComposedChart data={deptoComparison}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '1rem' }} />
                  <Legend />
                  <Bar dataKey="Asistencia" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Inscritos" stroke="#10b981" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="card glass" style={{ height: '400px' }}>
              <h3 style={{ marginBottom: '2rem' }}>Distribución de Asistencia Total</h3>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Asistieron', value: filteredAttendance.reduce((acc, curr) => acc + curr.asistieron, 0) },
                      { name: 'Retraso', value: filteredAttendance.reduce((acc, curr) => acc + curr.retraso, 0) },
                      { name: 'Falta', value: filteredAttendance.reduce((acc, curr) => acc + curr.falta, 0) },
                      { name: 'Permiso', value: filteredAttendance.reduce((acc, curr) => acc + curr.permiso, 0) }
                    ]}
                    cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value"
                  >
                    {COLORS.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED TABLES */}
      {(tab === 'asistencia' || tab === 'inscripcion') && (
        <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ textTransform: 'capitalize' }}>Listado Detallado de {tab}</h3>
            <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>{tab === 'asistencia' ? filteredAttendance.length : filteredEnrollment.length} Registros</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {tab === 'asistencia' ? (
                    <>
                      <th>Jornada</th>
                      <th>Grupo / Departamento</th>
                      <th>Asistieron</th>
                      <th>Retrasos</th>
                      <th>Faltas</th>
                      <th>Permisos</th>
                    </>
                  ) : (
                    <>
                      <th>Grupo</th>
                      <th>Departamento</th>
                      <th>Total Inscritos</th>
                      <th>Confirmados</th>
                      <th>% Avance</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(tab === 'asistencia' ? filteredAttendance : filteredEnrollment).map((row, i) => (
                  <tr key={i}>
                    {tab === 'asistencia' ? (
                      <>
                        <td style={{ fontWeight: '800', color: 'var(--primary)' }}>Día {row.dia}</td>
                        <td>
                          <div style={{ fontWeight: '700' }}>{row.group_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{row.dept_name}</div>
                        </td>
                        <td><b style={{ color: '#10b981' }}>{row.asistieron}</b></td>
                        <td><b style={{ color: '#f59e0b' }}>{row.retraso}</b></td>
                        <td><b style={{ color: '#ef4444' }}>{row.falta}</b></td>
                        <td>{row.permiso}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: '700' }}>{row.group_name}</td>
                        <td>{row.dept_name}</td>
                        <td>{row.total_inscritos}</td>
                        <td><span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>{row.total_confirmados}</span></td>
                        <td style={{ fontWeight: '800' }}>{row.total_inscritos > 0 ? ((row.total_confirmados / row.total_inscritos) * 100).toFixed(0) : 0}%</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function KPI({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="card glass" style={{ position: 'relative', overflow: 'hidden', borderBottom: `4px solid ${color}` }}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '0.75rem', background: `${color}15`, color: color, borderRadius: '1rem' }}>
        <Icon size={24} />
      </div>
      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '500' }}>{subtitle}</div>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.25rem', borderRadius: '0.8rem', border: 'none',
      background: active ? 'var(--primary)' : 'transparent',
      color: active ? 'white' : 'var(--muted)',
      fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease'
    }}>
      <Icon size={16} /> {label}
    </button>
  )
}
