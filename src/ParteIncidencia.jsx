import { useRef } from 'react'
import html2pdf from 'html2pdf.js'
import './ParteIncidencia.css'

// ── Tipos estandarizados ─────────────────────────────────────────────────────
const TIPOS_LABEL = {
  ROBO: 'Robo / Asalto', INCENDIO: 'Incendio', DISTURBIO: 'Pelea / Disturbio',
  ACCIDENTE: 'Accidente vehicular', SOSPECHOSO: 'Persona sospechosa',
  VANDALISMO: 'Vandalismo / Daños', DROGAS: 'Drogas / Consumo',
  RUIDO: 'Ruido excesivo', VEHICULO: 'Vehículo sospechoso',
  ANIMAL: 'Animal peligroso', SERVICIOS: 'Problema de servicios',
  PERSONA_RIESGO: 'Persona en riesgo', VIOLENCIA_DOM: 'Violencia doméstica',
  EMERGENCIA_MED: 'Emergencia médica', OTRO: 'Otro',
}

const SERVICIOS_LABEL = {
  patrulla: 'Patrulla de Serenazgo',
  bomberos: 'Cuerpo de Bomberos',
  ambulancia: 'Servicio de Ambulancia',
  pnp: 'Policía Nacional del Perú',
}

// ── Helper: get valor from datos format ──────────────────────────────────────
function val(datos, campo) {
  if (!datos) return null
  const d = datos[campo]
  if (!d) return null
  if (typeof d === 'object' && d.valor) return d.valor
  if (typeof d === 'string' && d !== 'no indicado' && d !== 'no indicada') return d
  return null
}

// ── Generar código ───────────────────────────────────────────────────────────
function generarCodigo(incidencia, index) {
  const fecha = new Date(incidencia.created_at)
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const correlativo = String(index + 1).padStart(6, '0')
  return `INC-${anio}-${mes}-${correlativo}`
}

function formatFechaCompleta(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ParteIncidencia({ incidencias, municipioNombre, onCerrar }) {
  const docRef = useRef(null)

  const descargarPDF = async () => {
    const element = docRef.current
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Partes_Incidencia_${municipioNombre}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    html2pdf().set(opt).from(element).save()
  }

  return (
    <div className="doc-overlay">
      <div className="doc-toolbar">
        <button onClick={onCerrar} className="doc-btn-cerrar">✕ Cerrar</button>
        <span className="doc-titulo-bar">
          📄 Vista Previa — {incidencias.length} parte{incidencias.length > 1 ? 's' : ''}
        </span>
        <button onClick={descargarPDF} className="doc-btn-imprimir">📥 Descargar PDF</button>
      </div>

      <div className="doc-scroll">
        <div ref={docRef}>
          {incidencias.map((inc, idx) => {
            const datosIA = parsearDatosIA(inc)
            const datos = datosIA?.datos || {}
            const codigo = generarCodigo(inc, idx)
            const tipoLabel = TIPOS_LABEL[datosIA?.tipo || inc.tipo] || datosIA?.tipo_incidencia || 'Incidente'
            const servicios = datosIA?.servicios_requeridos || inc.servicios_requeridos || []

            return (
              <div key={inc.id} className="parte-page">
                {/* ══════ 1. ENCABEZADO ══════ */}
                <div className="parte-encabezado">
                  <div className="parte-escudo">🛡️</div>
                  <div className="parte-titulo-bloque">
                    <h1 className="parte-municipio">{municipioNombre?.toUpperCase() || 'MUNICIPALIDAD'}</h1>
                    <h2 className="parte-area">GERENCIA DE SEGURIDAD CIUDADANA</h2>
                    <h2 className="parte-area">SUBGERENCIA DE SERENAZGO</h2>
                    <div className="parte-tipo-doc">PARTE DE INCIDENCIA</div>
                  </div>
                  <div className="parte-codigo-bloque">
                    <div className="parte-codigo">{codigo}</div>
                    <div className="parte-fecha-emision">Fecha: {formatFechaCompleta(inc.created_at)}</div>
                  </div>
                </div>

                <div className="parte-linea" />

                {/* ══════ 2. DATOS GENERALES ══════ */}
                <div className="parte-seccion">
                  <h3>I. DATOS GENERALES</h3>
                  <table className="parte-tabla">
                    <tbody>
                      <tr>
                        <td className="parte-label">Fecha del incidente:</td>
                        <td>{formatFechaCompleta(inc.created_at)}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Hora del reporte:</td>
                        <td>{formatHora(inc.created_at)} hrs</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Hora del incidente:</td>
                        <td>{val(datos, 'hora_incidente') || formatHora(inc.created_at)} hrs</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Lugar:</td>
                        <td>{inc.lugar_descripcion || val(datos, 'ubicacion') || datosIA?.lugar || '—'}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Referencia:</td>
                        <td>{val(datos, 'referencia') || datosIA?.referencia || '—'}</td>
                      </tr>
                      {inc.latitud && inc.longitud && (
                        <tr>
                          <td className="parte-label">Coordenadas GPS:</td>
                          <td>{inc.latitud.toFixed(6)}, {inc.longitud.toFixed(6)}</td>
                        </tr>
                      )}
                      {datosIA?.modo && (
                        <tr>
                          <td className="parte-label">Modo de ingreso:</td>
                          <td>{datosIA.modo === 'ALERTA' ? 'ALERTA — Situación activa en tiempo real' : 'REPORTE — Post-evento'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ══════ 3. CLASIFICACIÓN ══════ */}
                <div className="parte-seccion">
                  <h3>II. CLASIFICACIÓN DEL INCIDENTE</h3>
                  <table className="parte-tabla">
                    <tbody>
                      <tr>
                        <td className="parte-label">Tipo de incidente:</td>
                        <td className="parte-bold">{tipoLabel}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Prioridad:</td>
                        <td className={`parte-prioridad-${(inc.prioridad || 'media').toLowerCase()}`}>{inc.prioridad}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Requiere PNP:</td>
                        <td>{inc.requiere_pnp ? 'SÍ — Se requiere intervención de la Policía Nacional' : 'NO'}</td>
                      </tr>
                      {servicios.length > 0 && (
                        <tr>
                          <td className="parte-label">Servicios requeridos:</td>
                          <td>{servicios.map(s => SERVICIOS_LABEL[s] || s).join(', ')}</td>
                        </tr>
                      )}
                      {inc.despacho && (
                        <tr>
                          <td className="parte-label">Despacho inmediato:</td>
                          <td className="parte-bold">SÍ</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ══════ 4. PERSONAS INVOLUCRADAS ══════ */}
                <div className="parte-seccion">
                  <h3>III. PERSONAS INVOLUCRADAS</h3>
                  <table className="parte-tabla-completa">
                    <thead>
                      <tr>
                        <th>Condición</th>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Sospechoso(s)</td>
                        <td>{val(datos, 'descripcion_sospechosos') || val(datos, 'descripcion_persona') || datosIA?.descripcion_sujetos || 'No identificado'}</td>
                        <td>{val(datos, 'num_sospechosos') || val(datos, 'num_personas') || datosIA?.numero_sujetos || '—'}</td>
                      </tr>
                      <tr>
                        <td>Víctima(s)</td>
                        <td>{val(datos, 'victimas') || val(datos, 'heridos') || datosIA?.victimas || 'No identificada'}</td>
                        <td>—</td>
                      </tr>
                      <tr>
                        <td>Interviniente</td>
                        <td>{inc.usuarios ? `${inc.usuarios.nombres} ${inc.usuarios.apellidos}` : '—'}</td>
                        <td>1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ══════ 5. DESCRIPCIÓN DE LOS HECHOS ══════ */}
                <div className="parte-seccion">
                  <h3>IV. DESCRIPCIÓN DE LOS HECHOS</h3>
                  <div className="parte-narrativa">
                    <p>
                      Siendo las <strong>{formatHora(inc.created_at)} hrs</strong> del día{' '}
                      <strong>{formatFechaCompleta(inc.created_at)}</strong>, el personal de serenazgo{' '}
                      {inc.usuarios ? `(${inc.usuarios.nombres} ${inc.usuarios.apellidos})` : ''}{' '}
                      reportó la siguiente situación en{' '}
                      <strong>{inc.lugar_descripcion || val(datos, 'ubicacion') || 'la zona indicada'}</strong>:
                    </p>
                    <blockquote>"{inc.descripcion_original}"</blockquote>
                    {inc.transcripcion_audio && (
                      <p className="parte-nota"><em>* Reporte generado a partir de nota de voz transcrita mediante IA (Whisper).</em></p>
                    )}
                  </div>
                </div>

                {/* ══════ 6. DETALLES ESPECÍFICOS ══════ */}
                <SeccionDetallesEspecificos datos={datos} datosIA={datosIA} />

                {/* ══════ 7. ACCIONES REALIZADAS ══════ */}
                <div className="parte-seccion">
                  <h3>{tieneDetalles(datos, datosIA) ? 'VI' : 'V'}. ACCIONES REALIZADAS</h3>
                  <table className="parte-tabla">
                    <tbody>
                      <tr>
                        <td className="parte-label">Acción tomada:</td>
                        <td>{val(datos, 'accion_tomada') || datosIA?.accion_tomada || 'Reporte registrado vía WhatsApp'}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Derivado a:</td>
                        <td>
                          {val(datos, 'derivado_a') || datosIA?.derivado_a ||
                            (inc.requiere_pnp ? 'Policía Nacional del Perú (PNP)' :
                              servicios.length > 0 ? servicios.map(s => SERVICIOS_LABEL[s] || s).join(', ') : '—'
                            )
                          }
                        </td>
                      </tr>
                      <tr>
                        <td className="parte-label">Estado:</td>
                        <td>{inc.estado}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ══════ 8. UNIDAD ══════ */}
                <div className="parte-seccion">
                  <h3>{tieneDetalles(datos, datosIA) ? 'VII' : 'VI'}. UNIDAD INTERVINIENTE</h3>
                  <table className="parte-tabla">
                    <tbody>
                      <tr>
                        <td className="parte-label">Personal:</td>
                        <td>{inc.usuarios ? `${inc.usuarios.nombres} ${inc.usuarios.apellidos}` : '—'}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Teléfono:</td>
                        <td>{inc.usuarios?.telefono || '—'}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Fuente del reporte:</td>
                        <td>{inc.fuente || 'WHATSAPP'} {inc.transcripcion_audio ? '(Audio transcrito por IA)' : '(Texto)'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ══════ 9. OBSERVACIONES ══════ */}
                <div className="parte-seccion">
                  <h3>{tieneDetalles(datos, datosIA) ? 'VIII' : 'VII'}. OBSERVACIONES</h3>
                  <div className="parte-obs">
                    {val(datos, 'observaciones') || datosIA?.observaciones || 'Ninguna observación adicional.'}
                    {datosIA?.resumen_corto && (
                      <p style={{ fontStyle: 'italic', marginTop: 6 }}>Resumen IA: {datosIA.resumen_corto}</p>
                    )}
                  </div>
                </div>

                {/* ══════ 10. EVIDENCIAS ══════ */}
                {inc.evidencias && inc.evidencias.length > 0 && (
                  <div className="parte-seccion" style={{ pageBreakInside: 'avoid' }}>
                    <h3>{tieneDetalles(datos, datosIA) ? 'IX' : 'VIII'}. PANEL FOTOGRÁFICO Y ANEXOS</h3>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {inc.evidencias.map((ev, i) => (
                        <div key={ev.id} style={{ flex: '1 1 calc(50% - 10px)', textAlign: 'center', background: '#f5f5f5', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                          <img
                            src={ev.url_storage}
                            style={{
                              width: '100%',
                              maxHeight: inc.evidencias.length === 1 ? '400px' : '250px',
                              objectFit: 'contain',
                            }}
                            crossOrigin="anonymous"
                            alt={`Anexo ${i + 1}`}
                          />
                          <p style={{ fontSize: '8pt', color: '#666', marginTop: '6px', fontWeight: 'bold' }}>ANEXO {i + 1} — {new Date(ev.created_at).toLocaleString('es-PE')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ══════ BASE LEGAL ══════ */}
                <div className="parte-legal">
                  Documento generado en el marco de la <em>Ley Nº 27972, Ley Orgánica de Municipalidades</em>,
                  y la <em>Ley Nº 27933, Ley del Sistema Nacional de Seguridad Ciudadana</em> y sus modificatorias.
                  Clasificación según DS 009-2024-IN — Registro Estandarizado de Ocurrencias (REO) del MININTER.
                </div>

                {/* ══════ FIRMA ══════ */}
                <div className="parte-firma-bloque">
                  <div className="parte-firma">
                    <div className="parte-firma-linea" />
                    <div className="parte-firma-nombre">{inc.usuarios ? `${inc.usuarios.nombres} ${inc.usuarios.apellidos}` : '________________________'}</div>
                    <div className="parte-firma-cargo">Sereno — Seguridad Ciudadana</div>
                  </div>
                  <div className="parte-firma">
                    <div className="parte-firma-linea" />
                    <div className="parte-firma-nombre">________________________</div>
                    <div className="parte-firma-cargo">Supervisor de Turno</div>
                  </div>
                </div>

                <div className="parte-pie">
                  Sistema Serenazgo IA v2 — Documento generado automáticamente • {new Date().toLocaleString('es-PE')}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Sección de detalles específicos según tipo ──────────────────────────────
function SeccionDetallesEspecificos({ datos, datosIA }) {
  const detalles = []

  const camposDetalles = [
    { key: 'vehiculo_fuga', label: 'Vehículo de fuga' },
    { key: 'tipo_vehiculos', label: 'Tipo de vehículo' },
    { key: 'tipo_vehiculo', label: 'Tipo de vehículo' },
    { key: 'vehiculo_color', label: 'Color del vehículo' },
    { key: 'placas', label: 'Placa' },
    { key: 'armas', label: 'Tipo de arma' },
    { key: 'direccion_fuga', label: 'Dirección de fuga' },
    { key: 'objeto_robado', label: 'Objeto robado' },
    { key: 'personas_atrapadas', label: 'Personas atrapadas' },
    { key: 'magnitud', label: 'Magnitud del fuego' },
    { key: 'tipo_estructura', label: 'Tipo de estructura' },
    { key: 'propagacion', label: 'Propagación' },
    { key: 'humo_toxico', label: 'Humo tóxico' },
    { key: 'acceso_bomberos', label: 'Acceso bomberos' },
    { key: 'num_vehiculos', label: 'Número de vehículos' },
    { key: 'bloqueo_via', label: 'Bloqueo de vía' },
    { key: 'fuga_conductor', label: 'Fuga del conductor' },
    { key: 'derrame_combustible', label: 'Derrame de combustible' },
    { key: 'violencia', label: 'Violencia física' },
    { key: 'armas_drogas', label: 'Armas/drogas involucradas' },
    { key: 'danos_propiedad', label: 'Daños a la propiedad' },
    { key: 'menores_presentes', label: 'Menores presentes' },
    { key: 'consciente', label: '¿Consciente?' },
    { key: 'respirando', label: '¿Respirando?' },
    { key: 'sintomas', label: 'Síntomas' },
    { key: 'tipo_violencia', label: 'Tipo de violencia' },
    { key: 'agresor_presente', label: 'Agresor presente' },
    { key: 'tipo_dano', label: 'Tipo de daño' },
    { key: 'tipo_animal', label: 'Tipo de animal' },
    { key: 'comportamiento', label: 'Comportamiento del animal' },
    { key: 'tipo_problema', label: 'Tipo de problema' },
    { key: 'riesgo_peatonal', label: 'Riesgo peatonal' },
  ]

  for (const c of camposDetalles) {
    const v = val(datos, c.key)
    // Also check old flat format
    const vOld = datosIA?.[c.key]
    const value = v || (vOld && vOld !== 'no indicado' && vOld !== 'no indicada' ? vOld : null)
    if (value) {
      detalles.push({ label: c.label, value })
    }
  }

  if (detalles.length === 0) return null

  return (
    <div className="parte-seccion">
      <h3>V. ELEMENTOS RELEVANTES</h3>
      <table className="parte-tabla">
        <tbody>
          {detalles.map((d, i) => (
            <tr key={i}>
              <td className="parte-label">{d.label}:</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parsearDatosIA(inc) {
  try {
    return typeof inc.descripcion_limpia === 'string'
      ? JSON.parse(inc.descripcion_limpia)
      : inc.descripcion_limpia
  } catch { return null }
}

function tieneDetalles(datos, datosIA) {
  const keys = ['vehiculo_fuga', 'tipo_vehiculos', 'armas', 'placas', 'direccion_fuga',
    'personas_atrapadas', 'magnitud', 'propagacion', 'violencia', 'consciente',
    'respirando', 'tipo_violencia', 'tipo_dano', 'tipo_animal', 'tipo_problema']
  return keys.some(k => val(datos, k) || (datosIA?.[k] && datosIA[k] !== 'no indicado'))
}
