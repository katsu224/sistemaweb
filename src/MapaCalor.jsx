import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapaCalor.css'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const incidenciaIcon = new L.DivIcon({
  html: '🔴',
  className: 'incidencia-marker',
  iconSize: [25, 25],
  iconAnchor: [12, 12],
})

const camaraIcon = new L.DivIcon({
  html: '📸',
  className: 'camara-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const PRIORIDAD_PESO = { CRITICA: 1.5, ALTA: 1.0, MEDIA: 0.6, BAJA: 0.3 }

export default function MapaCalor({ municipioId }) {
  const [incidencias, setIncidencias] = useState([])
  const [hotzones, setHotzones] = useState([])
  const [camaras, setCamaras] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReport, setAiReport] = useState('')
  const mapRef = useRef(null)

  useEffect(() => {
    supabase
      .from('incidencias')
      .select('id, latitud, longitud, prioridad, estado, lugar_descripcion, descripcion_original, created_at')
      .eq('municipio_id', municipioId)
      .not('latitud', 'is', null)
      .not('longitud', 'is', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const d = data ?? []
        setIncidencias(d)
        if (d.length > 0) procesarGeoDatos(d)
        setLoading(false)
      })
  }, [municipioId])

  function procesarGeoDatos(datos) {
    const celdas = {}
    const precision = 0.002 // ~200m
    
    // Agrupar
    datos.forEach(d => {
      const key = `${Math.round(d.latitud / precision) * precision},${Math.round(d.longitud / precision) * precision}`
      if (!celdas[key]) celdas[key] = { lat: 0, lng: 0, count: 0, peso: 0, lugares: [] }
      celdas[key].lat += d.latitud
      celdas[key].lng += d.longitud
      celdas[key].count++
      celdas[key].peso += PRIORIDAD_PESO[d.prioridad] || 0.5
      if (d.lugar_descripcion) celdas[key].lugares.push(d.lugar_descripcion)
    })

    const agrupado = Object.values(celdas).map(c => {
      const freq = {}
      c.lugares.forEach(l => freq[l] = (freq[l] || 0) + 1)
      const nombreZona = Object.keys(freq).sort((a,b) => freq[b]-freq[a])[0] || 'Zona sin nombre'
      
      return {
        lat: c.lat / c.count,
        lng: c.lng / c.count,
        incidencias: c.count,
        pesoTotal: c.peso.toFixed(1),
        nombre: nombreZona
      }
    })

    const topZonas = agrupado.filter(c => c.count >= 2 || c.incidencias >= 1).sort((a, b) => b.pesoTotal - a.pesoTotal)
    setHotzones(topZonas.slice(0, 10))
    setCamaras(topZonas.filter(c => c.incidencias >= 2).slice(0, 5)) // Solo donde hay >= 2 (Cameras logic restored)
  }

  const generarReporteIA = async () => {
    if (hotzones.length === 0) return
    setAiLoading(true)
    try {
      const prompt = `Actúa como un experto en seguridad ciudadana y criminología ambiental. Analiza estas zonas críticas del municipio y dales recomendaciones rápidas de patrullaje o soluciones preventivas.\nZonas Calientes actuales:\n${hotzones.map((h, i) => `${i+1}. ${h.nombre} (${h.incidencias} incidentes recientes)`).join('\n')}\n\nResponde en menos de 100 palabras. Sé directo y profesional.`

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 200
        })
      })
      const json = await res.json()
      setAiReport(json.choices[0].message.content)
    } catch (e) {
      setAiReport('Error al conectar con la IA de Groq. ¿Agregaste la VITE_GROQ_API_KEY en tu .env?')
    }
    setAiLoading(false)
  }

  const irAZona = (lat, lng) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 17, { animate: true })
    }
  }

  const center = incidencias.length > 0 ? [incidencias[0].latitud, incidencias[0].longitud] : [-9.19, -75.01]

  return (
    <div className="mapa-container">
      <div className="mapa-header">
        <div>
          <h2>Inteligencia Geoespacial</h2>
          <p>{incidencias.length} reportes geolocalizados analizados en tiempo real.</p>
        </div>
      </div>

      {loading ? (
        <div className="mapa-empty"><div className="spinner" />Cargando mapa...</div>
      ) : (
        <div className="mapa-body">
          {/* Mapa principal */}
          <MapContainer
            center={center}
            zoom={incidencias.length > 0 ? 14 : 5}
            style={{ width: '100%', height: '600px', borderRadius: '14px', zIndex: 0 }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            
            <MarkerClusterGroup chunkedLoading maxClusterRadius={40} showCoverageOnHover={false}>
              {incidencias.map((inc) => (
                <Marker key={inc.id} position={[inc.latitud, inc.longitud]} icon={incidenciaIcon}>
                  <Popup>
                    <div style={{ fontSize: '13px', maxWidth: '250px' }}>
                      <strong style={{ color: inc.prioridad === 'ALTA' ? '#EF4444' : inc.prioridad === 'MEDIA' ? '#F59E0B' : '#10B981' }}>
                        {inc.prioridad}
                      </strong> — {inc.lugar_descripcion || 'Sin zona'}<br />
                      <em style={{ display: 'block', margin: '4px 0', color: '#444' }}>
                        {inc.descripcion_original?.slice(0, 100)}...
                      </em>
                      <small style={{ color: '#888' }}>{new Date(inc.created_at).toLocaleString('es-PE')}</small>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>

            {camaras.map((c, i) => (
              <Marker key={'cam'+i} position={[c.lat, c.lng]} icon={camaraIcon}>
                <Popup>
                  <div style={{ fontSize: '13px' }}>
                    <strong>📸 Cámara Estratégica Sugerida #{i+1}</strong><br/>
                    Centro de gravedad de {c.incidencias} incidentes.<br/>
                    {c.nombre}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Panel Lateral */}
          <div className="mapa-sidebar">
            <div className="panel-card">
              <h3>📍 Zonas Calientes (Hot Zones)</h3>
              {hotzones.length === 0 ? <p style={{color: '#64748B', fontSize: 13}}>No hay datos suficientes.</p> : (
                <div className="lista-hotzones">
                  {hotzones.slice(0, 5).map((hz, idx) => (
                    <div key={idx} className="hotzone-item" onClick={() => irAZona(hz.lat, hz.lng)}>
                      <span className="hz-num">{hz.incidencias}</span>
                      <div>
                        <div className="hz-info">{hz.nombre}</div>
                        <span className="hz-coords">{hz.lat.toFixed(4)}, {hz.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {camaras.length > 0 && (
              <div className="panel-card">
                <h3>📸 Ubicación de Cámaras Sugeridas</h3>
                <div className="lista-hotzones">
                  {camaras.map((c, idx) => (
                    <div key={idx} className="hotzone-item" onClick={() => irAZona(c.lat, c.lng)}>
                      <span className="hz-cam">#{idx+1}</span>
                      <div>
                        <div className="hz-info">{c.nombre}</div>
                        <span className="hz-coords">Prevenir {c.incidencias} incidentes</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="panel-card" style={{ padding: 0, background: 'transparent', border: 'none' }}>
              <button className="btn-ai" onClick={generarReporteIA} disabled={aiLoading || hotzones.length === 0}>
                {aiLoading ? <div className="spinner" style={{width:16,height:16,borderWidth:2,margin:0}} /> : '✨'}
                {aiLoading ? 'Analizando zonas...' : 'Recomendaciones con IA'}
              </button>

              {aiReport && (
                <div className="ai-recommendation">
                  {aiReport}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
