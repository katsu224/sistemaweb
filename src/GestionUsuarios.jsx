import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './GestionUsuarios.css'

export default function GestionUsuarios({ municipioId, municipioNombre }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({
    nombres: '', apellidos: '', dni: '', telefono: '', rol: 'SERENO', codigo_sereno: '', zona_asignada: ''
  })

  // Cargar usuarios
  useEffect(() => {
    cargarUsuarios()
  }, [municipioId])

  async function cargarUsuarios() {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('municipio_id', municipioId)
      .order('created_at', { ascending: false })
    setUsuarios(data ?? [])
    setLoading(false)
  }

  const mostrarToast = (msg, tipo = 'success') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  const abrirModal = (usuario = null) => {
    if (usuario) {
      setEditando(usuario.id)
      setForm({
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        dni: usuario.dni,
        telefono: usuario.telefono,
        rol: usuario.rol,
        codigo_sereno: usuario.codigo_sereno || '',
        zona_asignada: usuario.zona_asignada || '',
      })
    } else {
      setEditando(null)
      setForm({ nombres: '', apellidos: '', dni: '', telefono: '', rol: 'SERENO', codigo_sereno: '', zona_asignada: '' })
    }
    setModalAbierto(true)
  }

  const guardarUsuario = async (e) => {
    e.preventDefault()

    // Asegurar formato teléfono: 51 + 9 dígitos
    let tel = form.telefono.replace(/\D/g, '')
    if (tel.length === 9) tel = '51' + tel
    if (tel.length !== 11 || !tel.startsWith('51')) {
      mostrarToast('Teléfono inválido. Debe ser 9 dígitos (ej: 920585300)', 'error')
      return
    }

    if (form.dni.length !== 8) {
      mostrarToast('DNI debe tener exactamente 8 dígitos', 'error')
      return
    }

    const datos = { ...form, telefono: tel, municipio_id: municipioId }

    if (editando) {
      const { error } = await supabase.from('usuarios').update(datos).eq('id', editando)
      if (error) {
        mostrarToast(`Error: ${error.message}`, 'error')
        return
      }
      mostrarToast('✅ Sereno actualizado correctamente')
    } else {
      const { error } = await supabase.from('usuarios').insert(datos)
      if (error) {
        if (error.message.includes('duplicate')) {
          mostrarToast('Ya existe un usuario con ese DNI o teléfono', 'error')
        } else {
          mostrarToast(`Error: ${error.message}`, 'error')
        }
        return
      }
      mostrarToast('✅ Sereno registrado. Ya puede usar el bot.')
    }

    setModalAbierto(false)
    cargarUsuarios()
  }

  const toggleActivo = async (usuario) => {
    const nuevo = !usuario.activo
    await supabase.from('usuarios').update({ activo: nuevo }).eq('id', usuario.id)
    mostrarToast(nuevo ? '✅ Sereno activado' : '🚫 Sereno desactivado')
    cargarUsuarios()
  }

  const ROLES = { SERENO: '👮', SUPERVISOR: '⭐', ADMIN: '🔑', ANALISTA: '📊' }

  return (
    <div className="gestion">
      {toast && <div className={`gestion-toast ${toast.tipo}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="gestion-header">
        <div>
          <h2>Gestión de Serenos</h2>
          <p>{municipioNombre} — {usuarios.filter(u => u.activo).length} activos</p>
        </div>
        <button className="btn-agregar" onClick={() => abrirModal()}>
          + Agregar Sereno
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="gestion-empty"><div className="spinner" />Cargando...</div>
      ) : (
        <div className="gestion-table-wrap">
          <table className="gestion-table">
            <thead>
              <tr>
                <th>Sereno</th>
                <th>Teléfono</th>
                <th>DNI</th>
                <th>Rol</th>
                <th>Zona</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className={!u.activo ? 'row-inactivo' : ''}>
                  <td>
                    <div className="user-info">
                      <span className="user-avatar">{ROLES[u.rol] || '👮'}</span>
                      <div>
                        <div className="user-name">{u.nombres} {u.apellidos}</div>
                        {u.codigo_sereno && <code className="user-code">{u.codigo_sereno}</code>}
                      </div>
                    </div>
                  </td>
                  <td><code className="phone-badge">{u.telefono}</code></td>
                  <td>{u.dni}</td>
                  <td><span className="rol-badge">{u.rol}</span></td>
                  <td>{u.zona_asignada || <span className="text-muted">—</span>}</td>
                  <td>
                    <span className={`estado-badge ${u.activo ? 'activo' : 'inactivo'}`}>
                      {u.activo ? '● Activo' : '○ Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="acciones">
                      <button className="btn-sm btn-edit" onClick={() => abrirModal(u)} title="Editar">✏️</button>
                      <button className="btn-sm btn-toggle" onClick={() => toggleActivo(u)} title={u.activo ? 'Desactivar' : 'Activar'}>
                        {u.activo ? '🚫' : '✅'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={guardarUsuario}>
            <h3>{editando ? '✏️ Editar Sereno' : '➕ Nuevo Sereno'}</h3>

            <div className="modal-grid">
              <div className="field">
                <label>Nombres *</label>
                <input value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })} required />
              </div>
              <div className="field">
                <label>Apellidos *</label>
                <input value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} required />
              </div>
              <div className="field">
                <label>DNI (8 dígitos) *</label>
                <input value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} maxLength={8} required />
              </div>
              <div className="field">
                <label>Celular (9 dígitos) *</label>
                <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="920585300" required />
              </div>
              <div className="field">
                <label>Rol</label>
                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                  <option value="SERENO">Sereno</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="ANALISTA">Analista</option>
                </select>
              </div>
              <div className="field">
                <label>Código Sereno</label>
                <input value={form.codigo_sereno} onChange={e => setForm({ ...form, codigo_sereno: e.target.value })} placeholder="SRN-002" />
              </div>
              <div className="field full-width">
                <label>Zona Asignada</label>
                <input value={form.zona_asignada} onChange={e => setForm({ ...form, zona_asignada: e.target.value })} placeholder="Zona Norte" />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setModalAbierto(false)}>Cancelar</button>
              <button type="submit" className="btn-save">{editando ? 'Guardar Cambios' : 'Registrar Sereno'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
