'use client'

import { useState } from 'react'
import { 
  UserPlus, Trash2, Shield, Building, Mail, 
  Lock, User as UserIcon, Edit2, X, Save 
} from 'lucide-react'
import { createSystemUser, deleteSystemUser, updateSystemUser } from './actions'
import StatusModal, { StatusType } from '../components/StatusModal'

export default function UserManagementClient({ 
  users = [], 
  roles = [], 
  departamentos = [] 
}: { 
  users: any[], 
  roles: any[], 
  departamentos: any[] 
}) {
  const [loading, setLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [notif, setNotif] = useState({ show: false, type: 'info' as StatusType, title: '', message: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    try {
      if (editingUser) {
        await updateSystemUser(editingUser.id, formData)
        setNotif({ show: true, type: 'success', title: 'Actualizado', message: 'Los datos del usuario han sido actualizados.' })
        setEditingUser(null)
      } else {
        await createSystemUser(formData)
        setNotif({ show: true, type: 'success', title: 'Creado', message: 'La cuenta ha sido creada exitosamente.' })
      }
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      setNotif({ show: true, type: 'error', title: 'Error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente a ${email}?`)) return
    
    try {
      await deleteSystemUser(userId)
      setNotif({ show: true, type: 'success', title: 'Eliminado', message: 'El usuario ha sido removido del sistema.' })
    } catch (err: any) {
      setNotif({ show: true, type: 'error', title: 'Error', message: err.message })
    }
  }

  const startEdit = (user: any) => {
    setEditingUser(user)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
      
      {/* Formulario Dinámico */}
      <div className="card glass" style={{ height: 'fit-content', borderTop: `4px solid ${editingUser ? 'var(--warning)' : 'var(--primary)'}` }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                padding: '0.5rem', 
                background: editingUser ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                borderRadius: '0.75rem', 
                color: editingUser ? 'var(--warning)' : 'var(--primary)' 
              }}>
                {editingUser ? <Edit2 size={24} /> : <UserPlus size={24} />}
              </div>
              {editingUser ? 'Editar Usuario' : 'Registrar Usuario'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {editingUser ? `Modificando acceso de ${editingUser.email}` : 'Crea una nueva cuenta administrativa.'}
            </p>
          </div>
          {editingUser && (
            <button 
              className="btn btn-outline" 
              onClick={() => setEditingUser(null)}
              style={{ padding: '0.5rem', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserIcon size={14} /> Nombre(s)</label>
              <input 
                name="nombre" type="text" required placeholder="Ej: Juan" 
                defaultValue={editingUser?.nombre || ''}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserIcon size={14} /> Apellido(s)</label>
              <input 
                name="apellidos" type="text" required placeholder="Ej: Perez" 
                defaultValue={editingUser?.apellidos || ''}
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={14} /> CI</label>
              <input 
                name="ci" type="text" required placeholder="1234567 LP" 
                defaultValue={editingUser?.ci || ''}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14} /> Correo</label>
              <input 
                name="email" type="email" required placeholder="ejemplo@profe.gob.bo" 
                defaultValue={editingUser?.email || ''}
                disabled={!!editingUser}
                style={{ opacity: editingUser ? 0.6 : 1 }}
              />
            </div>
          </div>

          {!editingUser && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={14} /> Contraseña Inicial</label>
              <input name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" />
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building size={14} /> Departamento</label>
              <select name="departamento_id" required defaultValue={editingUser?.departamento_id || ''}>
                <option value="">Seleccionar...</option>
                {departamentos?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={14} /> Rol</label>
              <select name="role" required defaultValue={editingUser?.roles?.name || ''}>
                <option value="">Seleccionar...</option>
                {roles?.map(r => (
                  <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            className={`btn ${editingUser ? 'btn-warning' : 'btn-primary'}`} 
            type="submit" disabled={loading} 
            style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (editingUser ? <Save size={18} /> : <UserPlus size={18} />)}
            {loading ? 'Procesando...' : (editingUser ? 'Guardar Cambios' : 'Crear Cuenta de Usuario')}
          </button>
        </form>
      </div>

      {/* Lista de Usuarios */}
      <div className="card glass" style={{ borderTop: '4px solid #10b981' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Personal Autorizado</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Gestión de accesos y roles del sistema.</p>
        </div>

        <div className="table-container">
          <table style={{ borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
            <thead>
              <tr>
                <th style={{ border: 'none', background: 'transparent' }}>Identidad</th>
                <th style={{ border: 'none', background: 'transparent' }}>Acceso</th>
                <th style={{ border: 'none', background: 'transparent', textAlign: 'right' }}>Control</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <td style={{ borderRadius: '0.75rem 0 0 0.75rem', padding: '1rem' }}>
                    <div style={{ fontWeight: '700' }}>{u.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Mail size={10} /> {u.email}
                    </div>
                  </td>
                  <td>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.4rem', 
                      fontSize: '0.7rem', 
                      fontWeight: '800', 
                      padding: '0.25rem 0.6rem',
                      borderRadius: '2rem',
                      background: u.roles?.name === 'administrador' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: u.roles?.name === 'administrador' ? 'var(--primary)' : 'var(--success)'
                    }}>
                      <Shield size={12} /> {u.roles?.name?.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      {u.departamentos?.name || 'Acceso Global'}
                    </div>
                  </td>
                  <td style={{ borderRadius: '0 0.75rem 0.75rem 0', textAlign: 'right', padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => startEdit(u)}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem', color: 'var(--primary)', borderColor: 'transparent' }}
                        title="Editar Usuario"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id, u.email)}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem', color: '#ef4444', borderColor: 'transparent' }}
                        title="Eliminar Usuario"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <StatusModal 
        show={notif.show}
        type={notif.type}
        title={notif.title}
        message={notif.message}
        onClose={() => setNotif({ ...notif, show: false })}
      />
    </div>
  )
}

const Loader2 = ({ className, size }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)
