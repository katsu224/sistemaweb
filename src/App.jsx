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
  CRITICA: { label: 'CRÍTICA', color: '#DC2626', bg: '#FEE2E2', border: '#EF4444' },
  ALTA:    { label: 'ALTA',    color: '#EF4444', bg: '#FEE2E2' },
  MEDIA:   { label: 'MEDIA',   color: '#F59E0B', bg: '#FEF3C7' },
  BAJA:    { label: 'BAJA',    color: '#10B981', bg: '#D1FAE5' },
}

// ── 15 Tipos estandarizados ─────────────────────────────────────────────────
const TIPOS = {
  ROBO:           { label: 'Robo / Asalto',       icon: '🚨', color: '#EF4444' },
  INCENDIO:       { label: 'Incendio',             icon: '🔥', color: '#DC2626' },
  DISTURBIO:      { label: 'Pelea / Disturbio',    icon: '⚠️', color: '#F59E0B' },
  ACCIDENTE:      { label: 'Accidente vehicular',  icon: '🚗', color: '#F97316' },
  SOSPECHOSO:     { label: 'Persona sospechosa',   icon: '👁️', color: '#8B5CF6' },
  VANDALISMO:     { label: 'Vandalismo / Daños',   icon: '🏚️', color: '#6366F1' },
  DROGAS:         { label: 'Drogas / Consumo',     icon: '💊', color: '#A855F7' },
  RUIDO:          { label: 'Ruido excesivo',        icon: '🔊', color: '#3B82F6' },
  VEHICULO:       { label: 'Vehículo sospechoso',  icon: '🚙', color: '#64748B' },
  ANIMAL:         { label: 'Animal peligroso',      icon: '🐕', color: '#059669' },
  SERVICIOS:      { label: 'Problema de servicios', icon: '🔧', color: '#0EA5E9' },
  PERSONA_RIESGO: { label: 'Persona en riesgo',     icon: '🧑', color: '#EC4899' },
  VIOLENCIA_DOM:  { label: 'Violencia doméstica',   icon: '🔴', color: '#BE123C' },
  EMERGENCIA_MED: { label: 'Emergencia médica',     icon: '🚑', color: '#DC2626' },
  OTRO:           { label: 'Otro',                   icon: '📋', color: '#94A3B8' },
}

const SERVICIOS_ICONS = {
  patrulla:   '🚔',
  bomberos:   '🚒',
  ambulancia: '🚑',
  pnp:        '👮',
}

function getTipo(datosIA, incidencia) {
  // Intentar tipo de la incidencia directamente (nueva columna)
  if (incidencia.tipo && TIPOS[incidencia.tipo]) return TIPOS[incidencia.tipo]
  // Intentar desde datos IA
  if (datosIA?.tipo && TIPOS[datosIA.tipo]) return TIPOS[datosIA.tipo]
  return TIPOS.OTRO
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Helper: get valor from new datos format { campo: { valor, confianza } }
function val(datos, campo) {
  if (!datos) return null
  const d = datos[campo]
  if (!d) return null
  if (typeof d === 'object' && d.valor) return d.valor
  if (typeof d === 'string' && d !== 'no indicado' && d !== 'no indicada') return d
  return null
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('serenazgo_user')
    if (saved) {
      try {
        setUsuario(JSON.parse(saved))
      } catch { /* ignore */ }
    }
    setCheckingAuth(false)
  }, [])

  const handleLogin = (u) => setUsuario(u)

  const handleLogout = () => {
    localStorage.removeItem('serenazgo_user')
    setUsuario(null)
  }

  if (checkingAuth) {
    return <div className="root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  }

  if (!usuario) return <Login onLogin={handleLogin} />

  return <Dashboard usuario={usuario} onLogout={handleLogout} />
}

// ── Dashboard (post-login) ───────────────────────────────────────────────────
function Dashboard({ usuario, onLogout }) {
  const [tab, setTab] = useState('incidencias')
  const [incidencias, setIncidencias] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [detalleAbierto, setDetalleAbierto] = useState(null)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [mostrarDocumento, setMostrarDocumento] = useState(false)
  const [lightboxImg, setLightboxImg] = useState(null)

  const municipioId = usuario.municipio_id
  const municipioNombre = usuario.municipios?.nombre || 'Mi Municipio'

  // Carga inicial
  useEffect(() => {
    supabase
      .from('incidencias')
      .select('*, usuarios(nombres, apellidos, telefono), evidencias(*)')
      .eq('municipio_id', municipioId)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setIncidencias(data ?? [])
        setLoading(false)
      })
  }, [municipioId])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('incidencias-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidencias', filter: `municipio_id=eq.${municipioId}` },
        async ({ new: nueva }) => {
          const { data: conUsuario } = await supabase
            .from('incidencias')
            .select('*, usuarios(nombres, apellidos, telefono), evidencias(*)')
            .eq('id', nueva.id)
            .single()
          setIncidencias(prev => [conUsuario || nueva, ...prev])
          const prioLabel = PRIORIDADES[nueva.prioridad]?.label || nueva.prioridad
          mostrarToast(`🚨 Nueva incidencia: ${nueva.lugar_descripcion || 'Sin zona'} — ${prioLabel}`)
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
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'evidencias' },
        ({ new: nuevaFoto }) => {
          setIncidencias(prev => prev.map(i => {
            if (i.id === nuevaFoto.incidencia_id) {
               const evid = i.evidencias || []
               if (!evid.find(e => e.id === nuevaFoto.id)) {
                 return { ...i, evidencias: [...evid, nuevaFoto] }
               }
            }
            return i
          }))
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'incidencias' },
        ({ old: eliminada }) => {
          setIncidencias(prev => prev.filter(i => i.id !== eliminada.id))
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

  const borrarIncidencia = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('¿Estás seguro de eliminar esta incidencia permanentemente?')) return
    
    // Liberar sesiones_bot para no violar la Foreign Key ("sesiones_bot_incidencia_id_pendiente_fkey")
    await supabase.from('sesiones_bot').update({ incidencia_id_pendiente: null }).eq('incidencia_id_pendiente', id)

    // Primero borramos las evidencias relacionadas para no violar FK (si no hay CASCADE)
    await supabase.from('evidencias').delete().eq('incidencia_id', id)
    // Luego borramos el timeline
    await supabase.from('incidencia_timeline').delete().eq('incidencia_id', id)
    // Finalmente eliminamos la incidencia
    const { error } = await supabase.from('incidencias').delete().eq('id', id)
    
    if (error) {
       mostrarToast('❌ Error eliminando incidencia: ' + error.message)
    } else {
       mostrarToast('🗑️ Incidencia eliminada')
       setIncidencias(prev => prev.filter(i => i.id !== id))
    }
  }

  // Filtros
  const lista = incidencias.filter(i => {
    const okEstado = filtroEstado === 'todos' || i.estado === filtroEstado
    const okPrioridad = filtroPrioridad === 'todos' || i.prioridad === filtroPrioridad
    const okTipo = filtroTipo === 'todos' || i.tipo === filtroTipo
    const okBusqueda = !busqueda ||
      [i.descripcion_original, i.lugar_descripcion, i.descripcion_limpia]
        .join(' ').toLowerCase().includes(busqueda.toLowerCase())
    return okEstado && okPrioridad && okTipo && okBusqueda
  })

  const conteos = {
    total: incidencias.length,
    CONFIRMADO: incidencias.filter(i => i.estado === 'CONFIRMADO').length,
    BORRADOR: incidencias.filter(i => i.estado === 'BORRADOR').length,
    ALTA: incidencias.filter(i => i.prioridad === 'ALTA').length,
    CRITICA: incidencias.filter(i => i.prioridad === 'CRITICA').length,
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
            <p className="header-sub">Serenazgo IA v2 — {usuario.nombres} ({usuario.rol})</p>
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
        {tab === 'serenos' && (
          <GestionUsuarios municipioId={municipioId} municipioNombre={municipioNombre} />
        )}

        {tab === 'mapa' && (
          <MapaCalor municipioId={municipioId} />
        )}

        {tab === 'incidencias' && (
          <>
            {/* Tarjetas */}
            <div className="cards">
              {[
                { label: 'Total', value: conteos.total, color: '#64748B', icon: '📊' },
                { label: 'Confirmadas', value: conteos.CONFIRMADO, color: '#10B981', icon: '✅' },
                { label: 'Borradores', value: conteos.BORRADOR, color: '#94A3B8', icon: '📝' },
                { label: 'P. Alta', value: conteos.ALTA, color: '#EF4444', icon: '🔴' },
                { label: 'P. Crítica', value: conteos.CRITICA, color: '#DC2626', icon: '🆘' },
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
                {['todos', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map(p => (
                  <button key={p} className={`filter-btn priority ${filtroPrioridad === p ? 'active' : ''}`} onClick={() => setFiltroPrioridad(p)}>
                    {p === 'todos' ? '⚡ Todo' : PRIORIDADES[p]?.label}
                  </button>
                ))}
              </div>
              <div className="filters">
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="select-estado" style={{ minWidth: 140 }}>
                  <option value="todos">📋 Todos los tipos</option>
                  {Object.entries(TIPOS).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
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
                      {['Prioridad', 'Tipo / Descripción', 'Zona', 'Sereno', 'Estado', 'Fecha', 'Acción'].map(h => (
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
                      const tipoInfo = getTipo(datosIA, i)
                      const datos = datosIA?.datos || {}

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
                            <span className="badge" style={{
                              background: PRIORIDADES[i.prioridad]?.bg,
                              color: PRIORIDADES[i.prioridad]?.color,
                              border: i.prioridad === 'CRITICA' ? '2px solid #DC2626' : undefined,
                              fontWeight: i.prioridad === 'CRITICA' ? 'bold' : undefined,
                              animation: i.prioridad === 'CRITICA' ? 'pulse 1.5s infinite' : undefined,
                            }}>
                              {PRIORIDADES[i.prioridad]?.label || i.prioridad}
                            </span>
                            {i.requiere_pnp && <span className="pnp-badge" title="Requiere PNP">🚔</span>}
                            {i.despacho && <span className="pnp-badge" title="Despacho inmediato">⚡</span>}
                          </td>
                          <td>
                            <div className="tipo-cell">
                              <span style={{ fontSize: 16 }}>{tipoInfo.icon}</span>&nbsp;
                              <strong style={{ color: tipoInfo.color }}>{tipoInfo.label}</strong>
                              {datosIA?.modo === 'ALERTA' && (
                                <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 10, marginLeft: 6, padding: '1px 6px' }}>
                                  ALERTA
                                </span>
                              )}
                            </div>
                            <div className="desc-cell">{i.descripcion_original?.slice(0, 80)}{i.descripcion_original?.length > 80 ? '...' : ''}</div>

                            {/* Detalle expandido */}
                            {detalleAbierto === i.id && datosIA && (
                              <DetalleExpandido datosIA={datosIA} datos={datos} incidencia={i} onOpenImage={setLightboxImg} />
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
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <select value={i.estado} onChange={e => cambiarEstado(i.id, e.target.value)} className="select-estado">
                                <option value="BORRADOR">Borrador</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="CONFIRMADO">Confirmado</option>
                                <option value="CORREGIDO">Corregido</option>
                                <option value="ENVIADO_REO">Enviado REO</option>
                                <option value="ARCHIVADO">Archivado</option>
                              </select>
                              <button onClick={(e) => borrarIncidencia(i.id, e)} className="btn-borrar" title="Eliminar Incidencia">
                                🗑️
                              </button>
                            </div>
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

      {/* ── Documento Parte de Incidencia */}
      {mostrarDocumento && (
        <ParteIncidencia
          incidencias={incidencias.filter(i => seleccionados.has(i.id))}
          municipioNombre={municipioNombre}
          onCerrar={() => setMostrarDocumento(false)}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxImg(null)}>×</button>
            <img src={lightboxImg} alt="Evidencia ampliada" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Detalle Expandido — Renderizado dinámico por tipo con confianza
// ═══════════════════════════════════════════════════════════════════════════════
function DetalleExpandido({ datosIA, datos, incidencia, onOpenImage }) {
  // Definir qué campos mostrar en orden lógico
  const camposRender = [
    { key: 'ubicacion', label: '📍 Ubicación' },
    { key: 'referencia', label: '📌 Referencia' },
    { key: 'hora_incidente', label: '⏰ Hora' },
    { key: 'num_sospechosos', label: '👥 Sospechosos' },
    { key: 'num_personas', label: '👥 Personas involucradas' },
    { key: 'descripcion_sospechosos', label: '🧑 Desc. sospechosos' },
    { key: 'descripcion_persona', label: '🧑 Desc. persona' },
    { key: 'armas', label: '⚠️ Arma' },
    { key: 'heridos', label: '🚑 Heridos' },
    { key: 'victimas', label: '🚑 Víctimas' },
    { key: 'vehiculo_fuga', label: '🚗 Vehículo fuga' },
    { key: 'tipo_vehiculos', label: '🚗 Tipo vehículo' },
    { key: 'tipo_vehiculo', label: '🚗 Tipo vehículo' },
    { key: 'vehiculo_color', label: '🎨 Color vehículo' },
    { key: 'placas', label: '🔢 Placa' },
    { key: 'direccion_fuga', label: '➡️ Dirección fuga' },
    { key: 'objeto_robado', label: '📦 Objeto robado' },
    { key: 'personas_atrapadas', label: '🆘 Personas atrapadas' },
    { key: 'magnitud', label: '🔥 Magnitud' },
    { key: 'tipo_estructura', label: '🏠 Estructura' },
    { key: 'propagacion', label: '📈 Propagación' },
    { key: 'violencia', label: '👊 Violencia' },
    { key: 'menores_presentes', label: '👶 Menores' },
    { key: 'estado_persona', label: '🏥 Estado persona' },
    { key: 'estado_paciente', label: '🏥 Estado paciente' },
    { key: 'consciente', label: '👀 Consciente' },
    { key: 'respirando', label: '🫁 Respirando' },
    { key: 'sintomas', label: '🩺 Síntomas' },
    { key: 'tipo_violencia', label: '⚠️ Tipo violencia' },
    { key: 'agresor_presente', label: '⚠️ Agresor presente' },
    { key: 'tipo_dano', label: '💥 Tipo daño' },
    { key: 'tipo_animal', label: '🐕 Animal' },
    { key: 'comportamiento', label: '⚡ Comportamiento' },
    { key: 'tipo_problema', label: '🔧 Problema' },
    { key: 'riesgo_peatonal', label: '⚠️ Riesgo peatonal' },
    { key: 'accion_tomada', label: '✊ Acción tomada' },
    { key: 'derivado_a', label: '📋 Derivado a' },
    { key: 'observaciones', label: '📝 Observaciones' },
  ]

  const camposConValor = camposRender.filter(c => val(datos, c.key))

  return (
    <div className="detalle-expandido">
      <div className="detalle-grid">
        {camposConValor.map(c => {
          const valor = val(datos, c.key)
          const confianza = datos[c.key]?.confianza
          return (
            <div key={c.key} className="detalle-campo">
              <strong>{c.label}:</strong>{' '}
              <span>{valor}</span>
              {confianza === 'inferido' && (
                <span className="badge-confianza inferido" title="Inferido por IA">~</span>
              )}
              {confianza === 'confirmado' && (
                <span className="badge-confianza confirmado" title="Confirmado por sereno">✓</span>
              )}
            </div>
          )
        })}

        {/* Compat: mostrar campos viejos si no hay datos nuevos */}
        {camposConValor.length === 0 && datosIA && (
          <>
            {datosIA.lugar && datosIA.lugar !== 'no indicado' && <div><strong>📍 Lugar:</strong> {datosIA.lugar}</div>}
            {datosIA.numero_sujetos && datosIA.numero_sujetos !== 'no indicado' && <div><strong>👥 Sujetos:</strong> {datosIA.numero_sujetos}</div>}
            {datosIA.descripcion_sujetos && datosIA.descripcion_sujetos !== 'no indicado' && <div><strong>🧑 Desc:</strong> {datosIA.descripcion_sujetos}</div>}
            {datosIA.vehiculo_tipo && datosIA.vehiculo_tipo !== 'no indicado' && <div><strong>🚗 Vehículo:</strong> {datosIA.vehiculo_tipo} {datosIA.vehiculo_color || ''}</div>}
            {datosIA.tipo_arma && datosIA.tipo_arma !== 'no indicado' && <div><strong>⚠️ Arma:</strong> {datosIA.tipo_arma}</div>}
            {datosIA.victimas && datosIA.victimas !== 'no indicado' && <div><strong>🚑 Víctimas:</strong> {datosIA.victimas}</div>}
            {datosIA.accion_tomada && datosIA.accion_tomada !== 'no indicado' && <div><strong>✊ Acción:</strong> {datosIA.accion_tomada}</div>}
          </>
        )}
      </div>

      {/* Servicios requeridos */}
      {datosIA?.servicios_requeridos?.length > 0 && (
        <div className="servicios-badges">
          <strong>Servicios:</strong>{' '}
          {datosIA.servicios_requeridos.map(s => (
            <span key={s} className="badge-servicio">
              {SERVICIOS_ICONS[s] || '•'} {s}
            </span>
          ))}
        </div>
      )}

      {/* Evidencias */}
      {incidencia.evidencias && incidencia.evidencias.length > 0 && (
        <div className="evidencias-galeria">
          <p style={{margin: '0 0 8px 0', fontSize: 13, color: '#94A3B8'}}>
            <strong>📸 Evidencias Gráficas ({incidencia.evidencias.length}):</strong>
          </p>
          <div className="galeria-grid">
            {incidencia.evidencias.map(ev => (
              <div 
                key={ev.id} 
                className="evidencia-thumb" 
                onClick={(e) => { e.stopPropagation(); onOpenImage(ev.url_storage); }}
              >
                <img src={ev.url_storage} alt="Evidencia" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen corto */}
      {datosIA?.resumen_corto && (
        <div style={{marginTop: 12, fontSize: 13, color: '#94A3B8', fontStyle: 'italic', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 12}}>
          💬 {datosIA.resumen_corto}
        </div>
      )}
    </div>
  )
}
