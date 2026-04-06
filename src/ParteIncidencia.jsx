import { useRef } from 'react'
import html2pdf from 'html2pdf.js'
import './ParteIncidencia.css'

// ── Generar código profesional: INC-2026-04-000123 ───────────────────────────
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

// ── Componente principal ──────────────────────────────────────────────────────
export default function ParteIncidencia({ incidencias, municipioNombre, onCerrar }) {
  const docRef = useRef(null)

  const descargarPDF = async () => {
    const element = docRef.current
    
    const opt = {
      margin:       [10, 10, 10, 10], // top, left, bottom, right
      filename:     `Partes_Incidencia_${municipioNombre}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    // Si queremos el CSS exacto debemos agregarlo como estilo en html2canvas pero html2pdf ya copia el DOM con sus clases.
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
            const codigo = generarCodigo(inc, idx)

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
                        <td>{datosIA?.hora_incidente !== 'no indicada' && datosIA?.hora_incidente !== 'no indicado' ? datosIA.hora_incidente : formatHora(inc.created_at)} hrs</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Lugar:</td>
                        <td>{inc.lugar_descripcion || datosIA?.lugar || '—'}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Referencia:</td>
                        <td>{datosIA?.referencia !== 'no indicada' && datosIA?.referencia !== 'no indicado' ? datosIA.referencia : '—'}</td>
                      </tr>
                      {inc.latitud && inc.longitud && (
                        <tr>
                          <td className="parte-label">Coordenadas GPS:</td>
                          <td>{inc.latitud.toFixed(6)}, {inc.longitud.toFixed(6)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ══════ 3. TIPO DE INCIDENTE ══════ */}
                <div className="parte-seccion">
                  <h3>II. CLASIFICACIÓN DEL INCIDENTE</h3>
                  <table className="parte-tabla">
                    <tbody>
                      <tr>
                        <td className="parte-label">Tipo de incidente:</td>
                        <td className="parte-bold">{datosIA?.tipo_incidencia || '—'}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Código REO:</td>
                        <td>{inc.codigo_reo && inc.codigo_reo !== 'no indicado' ? inc.codigo_reo : '—'}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Prioridad:</td>
                        <td className={`parte-prioridad-${inc.prioridad?.toLowerCase()}`}>{inc.prioridad}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Requiere PNP:</td>
                        <td>{inc.requiere_pnp ? 'SÍ — Se requiere intervención de la Policía Nacional' : 'NO'}</td>
                      </tr>
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
                        <td>{datosIA?.descripcion_sujetos !== 'no indicada' && datosIA?.descripcion_sujetos !== 'no indicado' ? datosIA.descripcion_sujetos : 'No identificado'}</td>
                        <td>{datosIA?.numero_sujetos !== 'no indicado' ? datosIA.numero_sujetos : '—'}</td>
                      </tr>
                      <tr>
                        <td>Víctima(s)</td>
                        <td>{datosIA?.victimas !== 'no indicado' && datosIA?.victimas !== 'no indicada' ? datosIA.victimas : 'No identificada'}</td>
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
                      <strong>{inc.lugar_descripcion || datosIA?.lugar || 'la zona indicada'}</strong>:
                    </p>
                    <blockquote>"{inc.descripcion_original}"</blockquote>
                    {inc.transcripcion_audio && (
                      <p className="parte-nota"><em>* Reporte generado a partir de nota de voz transcrita mediante IA (Whisper).</em></p>
                    )}
                  </div>
                </div>

                {/* ══════ 6. ELEMENTOS RELEVANTES ══════ */}
                {(datosIA?.vehiculo_tipo !== 'no indicado' || datosIA?.tipo_arma !== 'no indicado') && (
                  <div className="parte-seccion">
                    <h3>V. ELEMENTOS RELEVANTES</h3>
                    <table className="parte-tabla">
                      <tbody>
                        {datosIA?.vehiculo_tipo && datosIA.vehiculo_tipo !== 'no indicado' && (
                          <tr>
                            <td className="parte-label">Vehículo:</td>
                            <td>{datosIA.vehiculo_tipo} {datosIA?.vehiculo_color !== 'no indicado' ? `— Color: ${datosIA.vehiculo_color}` : ''} {datosIA?.vehiculo_placa !== 'no indicada' && datosIA?.vehiculo_placa !== 'no indicado' ? `— Placa: ${datosIA.vehiculo_placa}` : ''}</td>
                          </tr>
                        )}
                        {datosIA?.tipo_arma && datosIA.tipo_arma !== 'no indicado' && (
                          <tr>
                            <td className="parte-label">Tipo de arma:</td>
                            <td className="parte-bold">{datosIA.tipo_arma}</td>
                          </tr>
                        )}
                        {datosIA?.danos && datosIA.danos !== 'no indicado' && (
                          <tr>
                            <td className="parte-label">Daños materiales:</td>
                            <td>{datosIA.danos}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ══════ 7. ACCIONES REALIZADAS ══════ */}
                <div className="parte-seccion">
                  <h3>{datosIA?.vehiculo_tipo !== 'no indicado' || datosIA?.tipo_arma !== 'no indicado' ? 'VI' : 'V'}. ACCIONES REALIZADAS</h3>
                  <table className="parte-tabla">
                    <tbody>
                      <tr>
                        <td className="parte-label">Acción tomada:</td>
                        <td>{datosIA?.accion_tomada !== 'no indicada' && datosIA?.accion_tomada !== 'no indicado' ? datosIA.accion_tomada : 'Reporte registrado vía WhatsApp'}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Derivado a:</td>
                        <td>{datosIA?.derivado_a !== 'no indicada' && datosIA?.derivado_a !== 'no indicado' ? datosIA.derivado_a : inc.requiere_pnp ? 'Policía Nacional del Perú (PNP)' : '—'}</td>
                      </tr>
                      <tr>
                        <td className="parte-label">Estado:</td>
                        <td>{inc.estado}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ══════ 8. UNIDAD / PERSONAL ══════ */}
                <div className="parte-seccion">
                  <h3>{getNumeroSeccion(datosIA, 7)}. UNIDAD INTERVINIENTE</h3>
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
                  <h3>{getNumeroSeccion(datosIA, 8)}. OBSERVACIONES</h3>
                  <div className="parte-obs">
                    {datosIA?.observaciones && datosIA.observaciones !== 'no indicada' && datosIA.observaciones !== 'no indicado'
                      ? datosIA.observaciones
                      : 'Ninguna observación adicional.'
                    }
                    {datosIA?.campos_faltantes?.length > 0 && (
                      <p className="parte-faltantes">
                        Campos no proporcionados en el reporte: {datosIA.campos_faltantes.join(', ')}.
                      </p>
                    )}
                  </div>
                </div>

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
                  Sistema Serenazgo IA — Documento generado automáticamente • {new Date().toLocaleString('es-PE')}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parsearDatosIA(inc) {
  try {
    return typeof inc.descripcion_limpia === 'string'
      ? JSON.parse(inc.descripcion_limpia)
      : inc.descripcion_limpia
  } catch { return null }
}

function getNumeroSeccion(datosIA, base) {
  const tieneElementos = datosIA?.vehiculo_tipo !== 'no indicado' || datosIA?.tipo_arma !== 'no indicado'
  return tieneElementos ? base + 1 : base
}

function getEstilosImpresion() {
  return `
    @page { size: A4; margin: 20mm 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }
    .parte-page { page-break-after: always; padding: 0; }
    .parte-page:last-child { page-break-after: auto; }
    .parte-encabezado { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
    .parte-escudo { font-size: 48px; }
    .parte-titulo-bloque { flex: 1; text-align: center; }
    .parte-municipio { font-size: 14pt; font-weight: bold; letter-spacing: 2px; margin: 0; }
    .parte-area { font-size: 10pt; font-weight: normal; margin: 2px 0; color: #444; }
    .parte-tipo-doc { font-size: 16pt; font-weight: bold; margin-top: 8px; padding: 6px 20px; border: 2px solid #1a1a1a; display: inline-block; letter-spacing: 3px; }
    .parte-codigo-bloque { text-align: right; }
    .parte-codigo { font-size: 12pt; font-weight: bold; font-family: 'Courier New', monospace; color: #B91C1C; }
    .parte-fecha-emision { font-size: 9pt; color: #666; margin-top: 4px; }
    .parte-linea { border-top: 2px solid #1a1a1a; margin: 10px 0 16px; }
    .parte-seccion { margin-bottom: 14px; }
    .parte-seccion h3 { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 6px; }
    .parte-tabla { width: 100%; }
    .parte-tabla td { padding: 3px 8px; vertical-align: top; }
    .parte-label { font-weight: bold; width: 180px; white-space: nowrap; }
    .parte-bold { font-weight: bold; }
    .parte-prioridad-alta { color: #B91C1C; font-weight: bold; }
    .parte-prioridad-media { color: #B45309; font-weight: bold; }
    .parte-prioridad-baja { color: #15803D; font-weight: bold; }
    .parte-tabla-completa { width: 100%; border-collapse: collapse; }
    .parte-tabla-completa th, .parte-tabla-completa td { border: 1px solid #999; padding: 4px 8px; text-align: left; }
    .parte-tabla-completa th { background: #f0f0f0; font-weight: bold; font-size: 10pt; }
    .parte-narrativa { padding: 8px; background: #fafafa; border-left: 3px solid #333; margin: 4px 0; }
    .parte-narrativa blockquote { font-style: italic; margin: 8px 0 4px 16px; color: #333; }
    .parte-nota { font-size: 9pt; color: #888; margin-top: 4px; }
    .parte-obs { padding: 6px 8px; min-height: 40px; }
    .parte-faltantes { font-size: 9pt; color: #888; margin-top: 6px; }
    .parte-legal { font-size: 8pt; color: #777; text-align: center; margin: 16px 0 10px; padding: 8px; border-top: 1px dashed #ccc; }
    .parte-firma-bloque { display: flex; justify-content: space-around; margin: 30px 0 10px; }
    .parte-firma { text-align: center; }
    .parte-firma-linea { width: 200px; border-bottom: 1px solid #333; margin: 0 auto 4px; height: 40px; }
    .parte-firma-nombre { font-weight: bold; font-size: 10pt; }
    .parte-firma-cargo { font-size: 9pt; color: #666; }
    .parte-pie { text-align: center; font-size: 8pt; color: #aaa; margin-top: 16px; padding-top: 8px; border-top: 1px solid #eee; }
  `
}
