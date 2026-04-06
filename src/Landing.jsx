import './Landing.css'

export default function Landing() {
  const gotoApp = () => {
    window.location.href = '/'
  }

  return (
    <div className="landing-root">
      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">🛡️</div>
          <span>Serenazgo<strong>IA</strong></span>
        </div>
        <div className="nav-links">
          <a href="#solucion">La Solución</a>
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#futuro">El Futuro</a>
        </div>
        <button className="nav-cta" onClick={gotoApp}>Ingresar al Sistema</button>
      </nav>

      <header className="hero">
        <div className="hero-bg-glow"></div>
        <div className="hero-content">
          <div className="badge">🚀 Seguridad de nueva generación</div>
          <h1>El primer sistema de Serenazgo impulsado por <span className="gradient-text">Inteligencia Artificial</span></h1>
          <p>Transformamos reportes engorrosos en análisis en tiempo real. Un Bot de WhatsApp para despliegue instantáneo en el terreno, y un Dashboard Analítico Predictivo para la central de comando.</p>
          <div className="hero-ctas">
            <button className="btn-primary" onClick={gotoApp}>Ver Sistema en Acción</button>
            <button className="btn-secondary">Arquitectura PDF</button>
          </div>
        </div>
        <div className="hero-mockups">
          <div className="mockup-web">
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" alt="Dashboard Serenazgo" />
          </div>
          <div className="mockup-mobile">
            <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=300" alt="WhatsApp Bot Serenazgo" />
          </div>
        </div>
      </header>

      <section id="funcionalidades" className="features-section">
        <div className="section-title">
          <h2>¿Qué hemos construido?</h2>
          <p>Una plataforma operativa y analítica, lista para gobernar la seguridad ciudadana con cero fricción técnica para los serenos.</p>
        </div>

        <div className="bento-grid">
          <div className="bento-item b-large">
            <div className="bento-icon">🎙️</div>
            <h3>Reporte Libre por Audio (Cero Formularios)</h3>
            <p>El sereno en estado de emergencia no tiene tiempo para lidiar con 20 campos de un formulario ni apps pesadas. Envía un simple audio por WhatsApp ("Robo en progreso en Av. Perú, 2 sospechosos, un arma blanca"). La IA lo transcribe instantáneamente, clasifica su urgencia, extrae todos los datos estructurales y solo pide, como una charla natural, aquello crítico que haya faltado.</p>
          </div>
          
          <div className="bento-item">
            <div className="bento-icon">🤖</div>
            <h3>Sistema Anti-Caos</h3>
            <p>Identificación algorítmica de duplicados. Si 3 vecinos reportan o 2 serenos declaran el mismo accidente, nuestra base de datos inteligente fusiona el evento impidiendo el ruido operativo en la central.</p>
          </div>

          <div className="bento-item b-dark">
            <div className="bento-icon">⏱️</div>
            <h3>Generación Inmediata de Partes PDF</h3>
            <p>Los partes de incidencia manuscritos quedaron en el pasado, ahorrando miles de horas cívicas al año. Con un clic en el dashboard, la Inteligencia Artificial redacta un parte pulcro, listo para juzgado o comisaría, en formato oficial A4.</p>
          </div>

          <div className="bento-item b-large b-map">
            <div className="map-overlay">
              <div className="bento-icon">🗺️</div>
              <h3>Inteligencia Geoespacial Predictiva</h3>
              <p>Un mapa interactivo que ya no solo "dibuja puntitos". El motor analiza densidades (Hot Zones) en tiempo real, agrupa incidencias con lógica matemática y <strong>le indica exactamente al municipio en qué intersecciones hay que colocar vigilancia o cámaras de seguridad</strong> basándose en el "centro de gravedad delictivo".</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ai-consultant">
        <div className="ai-content">
          <h2>Tu Asesor Experto, 24/7</h2>
          <p>Integrado directamente dentro del mapa de comando, el sistema procesa toda la data histórica al momento y puedes pedirle al poderoso motor LLaMA 3.1: <em>"Recomiéndame una acción estratégica"</em>. Al segundo, el panel entregará directrices de patrullaje hiper-localizadas para erradicar las zonas reincidentes.</p>
        </div>
        <div className="ai-visual">
          <div className="glass-prompt">
            <div className="dot red"></div>
            <div className="dot yellow"></div>
            <div class="dot green"></div>
            <p><strong>Comandante:</strong> Generar estrategia de seguridad para cuadrante Norte 2.</p>
            <div className="ai-reply">
              <strong>Serenazgo IA:</strong> 
              Analizando densidad... Existen 12 incidencias de arrebato focalizadas a las 19:00 hrs. <br/><br/>👉 <em>Recomendación:</em> Desplegar unidad táctica sombra entre Mza. B y Parque Kennedy de 18:30 a 20:30 e instalar un domo PTZ en la intersección Grau/Colón.
            </div>
          </div>
        </div>
      </section>

      <section id="futuro" className="future-section">
        <h2>¿Hacia dónde puede llegar?</h2>
        <div className="future-grid">
          <div className="f-card">
            <div className="f-icon">👁️</div>
            <h4>Visión Computacional</h4>
            <p>Conexión a las cámaras del municipio. Reconocimiento de rostros, captura automática de placas de autos sospechosos e ingreso instantáneo al reporte sin intervención humana.</p>
          </div>
          <div className="f-card">
            <div className="f-icon">🧠</div>
            <h4>Patrullaje Predictivo</h4>
            <p>Algoritmos de Deep Learning que, leyendo clima, fechas cívicas y data histórica, tracen rutas sugeridas en el GPS de las patrullas minutos antes de que ocurra una alta probabilidad de delito.</p>
          </div>
          <div className="f-card">
            <div className="f-icon">🛡️</div>
            <h4>Bot Ciudadano Anti-Pánico</h4>
            <p>Abrir la línea de WhatsApp a todo vecindario. La IA detectaría llamadas falsas por análisis emocional o triangulación de reportes masivos para movilizar patrullas de inmediato en una emergencia real.</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-ctas">
          <h2>Implementa el sistema del mañana, hoy.</h2>
          <button className="btn-primary" onClick={gotoApp}>Empieza Tu Prueba</button>
        </div>
        <div className="footer-copyright">
          <p>© 2026 Serenazgo Inteligente. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
