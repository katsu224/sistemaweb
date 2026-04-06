import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import GestionUsuarios from './GestionUsuarios'
import MapaCalor from './MapaCalor'
import ParteIncidencia from './ParteIncidencia'
import './App.css'

// ── Constantes UI ─────────────────────────────────────────────────────────────
const ESTADOS = {
  BORRADOR:    { label: 'Borrador',    color: '#94A3B8', bg: '#F1F5F9' },
  PENDIENTE:   { label: 'Pendiente',   color: '#F59E0B', bg: '#FEF3C7' },
  CONFIRMADO:  { label: 'Confirmado',  color: '#10B981', bg: '#D1FAE5' },
  CORREGIDO:   { label: 'Corregido',   color: '#8B5CF6', bg: '#EDE9FE' },
  ENVIADO_REO: { label: 'Enviado REO', color: '#3B82F6', bg: '#DBEAFE' },
  ARCHIVADO:   { label: 'Archivado',   color: '#64748B', bg: '#E2E8F0' },
}

const PRIORIDADES = {
  ALTA:  { label: 'ALTA',  color: '#EF4444', bg: '#FEE2E2' },
  MEDIA: { label: 'MEDIA', color: '#F59E0B', bg: '#FEF3C7' },
  BAJA:  { label: 'BAJA',  color: '#10B981', bg: '#D1FAE5' },
}

const TIPOS_ICON = {
  robo: '🚨', hurto: '🚨', accidente: '🚗', choque: '🚗',
  pelea: '⚠️', riña: '⚠️', disturbio: '⚠️', incendio: '🔥',
  sospechoso: '👁️', pandillaje: '👥', violencia: '🔴', persona: '🧑',
  vehículo: '🚗', daños: '🏚️', comercio: '🛒', abandono: '😢',
}

function getIconTipo(descripcion = '') {
  const t = descripcion.toLowerCase()
  const key = Object.keys(TIPOS_ICON).find(k => t.includes(k))
  return TIPOS_ICON[key] ?? '📋'
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Verificar sesión guardada en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('serenazgo_user')
    if (saved) {
      try {
        setUsuario(JSON.parse(saved))
      } catch { /* ignore */ }
    }
    setCheckingAuth(false)
  }, [])

  const handleLogin = (u) => {
    setUsuario(u)
  }

  const handleLogout = () => {
    localStorage.removeItem('serenazgo_user')
    setUsuario(null)
  }

  if (checkingAuth) {
    return <div className="root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  }

  if (!usuario) {
    return <Login onLogin={handleLogin} />
  }

  return <Dashboard usuario={usuario} onLogout={handleLogout} />
}

// ── Dashboard (post-login) ───────────────────────────────────────────────────
function Dashboard({ usuario, onLogout }) {
  const [tab, setTab] = useState('incidencias')
  const [incidencias, setIncidencias] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [detalleAbierto, setDetalleAbierto] = useState(null)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [mostrarDocumento, setMostrarDocumento] = useState(false)

  const municipioId = usuario.municipio_id
  const municipioNombre = usuario.municipios?.nombre || 'Mi Municipio'

  // Carga inicial filtrada por municipio
  useEffect(() => {
    supabase
      .from('incidencias')
      .select('*, usuarios(nombres, apellidos, telefono)')
      .eq('municipio_id', municipioId)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setIncidencias(data ?? [])
        setLoading(false)
      })
  }, [municipioId])

  // Realtime filtrado por municipio
  useEffect(() => {
    const channel = supabase
      .channel('incidencias-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidencias', filter: `municipio_id=eq.${municipioId}` },
        async ({ new: nueva }) => {
          const { data: conUsuario } = await supabase
            .from('incidencias')
            .select('*, usuarios(nombres, apellidos, telefono)')
            .eq('id', nueva.id)
            .single()
          setIncidencias(prev => [conUsuario || nueva, ...prev])
          mostrarToast(`🚨 Nueva incidencia: ${nueva.lugar_descripcion || 'Sin zona'} — ${nueva.prioridad}`)
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidencias', filter: `municipio_id=eq.${municipioId}` },
        ({ new: actualizada }) => {
          setIncidencias(prev =>
            prev.map(i => i.id === actualizada.id ? { ...i, ...actualizada } : i)
          )
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [municipioId])

  const mostrarToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  const cambiarEstado = async (id, nuevoEstado) => {
    await supabase.from('incidencias').update({ estado: nuevoEstado }).eq('id', id)
  }

  // Filtros
  const lista = incidencias.filter(i => {
    const okEstado = filtroEstado === 'todos' || i.estado === filtroEstado
    const okPrioridad = filtroPrioridad === 'todos' || i.prioridad === filtroPrioridad
    const okBusqueda = !busqueda ||
      [i.descripcion_original, i.lugar_descripcion, i.codigo_reo, i.descripcion_limpia]
        .join(' ').toLowerCase().includes(busqueda.toLowerCase())
    return okEstado && okPrioridad && okBusqueda
  })

  const conteos = {
    total: incidencias.length,
    CONFIRMADO: incidencias.filter(i => i.estado === 'CONFIRMADO').length,
    BORRADOR: incidencias.filter(i => i.estado === 'BORRADOR').length,
    ALTA: incidencias.filter(i => i.prioridad === 'ALTA').length,
  }

  return (
    <div className="root">
      {toast && <div className="toast">{toast}</div>}

      {/* ── Navbar ─────────────────────────────────────── */}
      <header className="header">
        <div className="header-left">
          <span style={{ fontSize: 28 }}>🛡️</span>
          <div>
            <h1 className="header-title">{municipioNombre}</h1>
            <p className="header-sub">Serenazgo IA — {usuario.nombres} ({usuario.rol})</p>
          </div>
        </div>
        <div className="header-right">
          <nav className="nav-tabs">
            <button className={`nav-tab ${tab === 'incidencias' ? 'active' : ''}`} onClick={() => setTab('incidencias')}>
              📋 Incidencias
            </button>
            <button className={`nav-tab ${tab === 'serenos' ? 'active' : ''}`} onClick={() => setTab('serenos')}>
              👮 Serenos
            </button>
            <button className={`nav-tab ${tab === 'mapa' ? 'active' : ''}`} onClick={() => setTab('mapa')}>
              🗺️ Mapa
            </button>
          </nav>
          <div className="live-badge">
            <span className="live-dot" />
            En vivo
          </div>
          <button className="btn-logout" onClick={onLogout}>Salir</button>
        </div>
      </header>

      <div className="body">
        {/* ── Tab: Serenos ──────────────────────────────── */}
        {tab === 'serenos' && (
          <GestionUsuarios municipioId={municipioId} municipioNombre={municipioNombre} />
        )}

        {/* ── Tab: Mapa ────────────────────────────────── */}
        {tab === 'mapa' && (
          <MapaCalor municipioId={municipioId} />
        )}

        {/* ── Tab: Incidencias ─────────────────────────── */}
        {tab === 'incidencias' && (
          <>
            {/* Tarjetas */}
            <div className="cards">
              {[
                { label: 'Total', value: conteos.total, color: '#64748B', icon: '📊' },
                { label: 'Confirmadas', value: conteos.CONFIRMADO, color: '#10B981', icon: '✅' },
                { label: 'Borradores', value: conteos.BORRADOR, color: '#94A3B8', icon: '📝' },
                { label: 'Prioridad Alta', value: conteos.ALTA, color: '#EF4444', icon: '🔴' },
              ].map(c => (
                <div key={c.label} className="card">
                  <div className="card-header">
                    <span>{c.icon}</span>
                    <span className="card-label">{c.label}</span>
                  </div>
                  <span className="card-num" style={{ color: c.color }}>{c.value}</span>
                </div>
              ))}
            </div>

            {/* Filtros */}
            <div className="toolbar">
              <input className="search" placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              <div className="filters">
                {['todos', 'BORRADOR', 'CONFIRMADO', 'CORREGIDO', 'ARCHIVADO'].map(e => (
                  <button key={e} className={`filter-btn ${filtroEstado === e ? 'active' : ''}`} onClick={() => setFiltroEstado(e)}>
                    {e === 'todos' ? 'Todos' : ESTADOS[e]?.label}
                  </button>
                ))}
              </div>
              <div className="filters">
                {['todos', 'ALTA', 'MEDIA', 'BAJA'].map(p => (
                  <button key={p} className={`filter-btn priority ${filtroPrioridad === p ? 'active' : ''}`} onClick={() => setFiltroPrioridad(p)}>
                    {p === 'todos' ? '⚡ Todo' : PRIORIDADES[p]?.label}
                  </button>
                ))}
              </div>
              {seleccionados.size > 0 && (
                <button className="btn-generar-parte" onClick={() => setMostrarDocumento(true)}>
                  📄 Generar Parte ({seleccionados.size})
                </button>
              )}
            </div>

            {/* Tabla */}
            {loading ? (
              <div className="empty"><div className="spinner" />Cargando...</div>
            ) : lista.length === 0 ? (
              <div className="empty">No hay incidencias{busqueda ? ' con ese criterio' : ''}.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{width: 40}}>
                        <input type="checkbox"
                          checked={lista.length > 0 && seleccionados.size === lista.length}
                          onChange={e => {
                            if (e.target.checked) setSeleccionados(new Set(lista.map(i => i.id)))
                            else setSeleccionados(new Set())
                          }}
                        />
                      </th>
                      {['Prioridad', 'Descripción', 'Zona', 'Sereno', 'Estado', 'Fecha', 'Acción'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map(i => {
                      const datosIA = (() => {
                        try { return typeof i.descripcion_limpia === 'string' ? JSON.parse(i.descripcion_limpia) : i.descripcion_limpia }
                        catch { return null }
                      })()
                      const tipoTexto = datosIA?.tipo_incidencia || 'Sin clasificar'

                      return (
                        <tr key={i.id} onClick={() => setDetalleAbierto(detalleAbierto === i.id ? null : i.id)}>
                          <td onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={seleccionados.has(i.id)} onChange={e => {
                              const s = new Set(seleccionados)
                              e.target.checked ? s.add(i.id) : s.delete(i.id)
                              setSeleccionados(s)
                            }} />
                          </td>
                          <td>
                            <span className="badge" style={{ background: PRIORIDADES[i.prioridad]?.bg, color: PRIORIDADES[i.prioridad]?.color }}>
                              {i.prioridad}
                            </span>
                            {i.requiere_pnp && <span className="pnp-badge" title="Requiere PNP">🚔</span>}
                          </td>
                          <td>
                            <div className="tipo-cell">{getIconTipo(tipoTexto)}&nbsp;<strong>{tipoTexto}</strong></div>
                            <div className="desc-cell">{i.descripcion_original?.slice(0, 80)}{i.descripcion_original?.length > 80 ? '...' : ''}</div>
                            {detalleAbierto === i.id && datosIA && (
                              <div className="detalle-expandido">
                                <div className="detalle-grid">
                                  {datosIA.lugar && datosIA.lugar !== 'no indicado' && <div><strong>📍 Lugar:</strong> {datosIA.lugar}</div>}
                                  {datosIA.numero_sujetos && datosIA.numero_sujetos !== 'no indicado' && <div><strong>👥 Sujetos:</strong> {datosIA.numero_sujetos}</div>}
                                  {datosIA.descripcion_sujetos && datosIA.descripcion_sujetos !== 'no indicado' && <div><strong>🧑 Desc:</strong> {datosIA.descripcion_sujetos}</div>}
                                  {datosIA.vehiculo_tipo && datosIA.vehiculo_tipo !== 'no indicado' && <div><strong>🚗 Vehículo:</strong> {datosIA.vehiculo_tipo} {datosIA.vehiculo_color || ''}</div>}
                                  {datosIA.tipo_arma && datosIA.tipo_arma !== 'no indicado' && <div><strong>⚠️ Arma:</strong> {datosIA.tipo_arma}</div>}
                                  {datosIA.victimas && datosIA.victimas !== 'no indicado' && <div><strong>🚑 Víctimas:</strong> {datosIA.victimas}</div>}
                                  {datosIA.accion_tomada && datosIA.accion_tomada !== 'no indicado' && <div><strong>✊ Acción:</strong> {datosIA.accion_tomada}</div>}
                                  {i.codigo_reo && <div><strong>📄 REO:</strong> {i.codigo_reo}</div>}
                                </div>
                                {datosIA.campos_faltantes?.length > 0 && (
                                  <div className="campos-faltantes">⚠️ Faltantes: {datosIA.campos_faltantes.join(', ')}</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td>{i.lugar_descripcion || <span className="text-muted">—</span>}</td>
                          <td>
                            {i.usuarios ? (
                              <div>
                                <div className="sereno-name">{i.usuarios.nombres} {i.usuarios.apellidos}</div>
                                <code className="sereno-phone">{i.usuarios.telefono}</code>
                              </div>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            <span className="badge" style={{ background: ESTADOS[i.estado]?.bg, color: ESTADOS[i.estado]?.color }}>
                              {ESTADOS[i.estado]?.label ?? i.estado}
                            </span>
                          </td>
                          <td className="fecha-cell">{formatFecha(i.created_at)}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <select value={i.estado} onChange={e => cambiarEstado(i.id, e.target.value)} className="select-estado">
                              <option value="BORRADOR">Borrador</option>
                              <option value="PENDIENTE">Pendiente</option>
                              <option value="CONFIRMADO">Confirmado</option>
                              <option value="CORREGIDO">Corregido</option>
                              <option value="ENVIADO_REO">Enviado REO</option>
                              <option value="ARCHIVADO">Archivado</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Documento Parte de Incidencia ────────────── */}
      {mostrarDocumento && (
        <ParteIncidencia
          incidencias={incidencias.filter(i => seleccionados.has(i.id))}
          municipioNombre={municipioNombre}
          onCerrar={() => setMostrarDocumento(false)}
        />
      )}
    </div>
  )
}
