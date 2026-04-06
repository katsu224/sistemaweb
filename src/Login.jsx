import { useState } from 'react'
import { supabase } from './supabaseClient'
import './Login.css'

export default function Login({ onLogin }) {
  const [telefono, setTelefono] = useState('')
  const [dni, setDni] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Formatear teléfono: agregar 51 si solo son 9 dígitos
    let tel = telefono.replace(/\D/g, '')
    if (tel.length === 9) tel = '51' + tel

    // Buscar usuario en la tabla directamente
    const { data, error: dbError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('telefono', tel)
      .eq('dni', dni.trim())
      .eq('activo', true)
      .limit(1)

    if (dbError) {
      console.error('Error de BD:', dbError)
      setError(`Error: ${dbError.message || dbError.details || 'No se pudo conectar'}`)
      setLoading(false)
      return
    }

    const usuario = data?.[0]

    if (!usuario) {
      setError('Teléfono o DNI incorrecto, o tu cuenta está desactivada.')
      setLoading(false)
      return
    }

    if (!['ADMIN', 'SUPERVISOR', 'ANALISTA'].includes(usuario.rol)) {
      setError('Solo supervisores y administradores pueden acceder al panel.')
      setLoading(false)
      return
    }

    // Guardar en localStorage para persistir sesión
    localStorage.setItem('serenazgo_user', JSON.stringify(usuario))
    onLogin(usuario)
    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-bg-pattern" />
      <form className="login-card" onSubmit={handleLogin}>
        <div className="login-header">
          <span className="login-icon">🛡️</span>
          <h1>Serenazgo IA</h1>
          <p>Centro de Control Municipal</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="login-field">
          <label>Número de Celular</label>
          <input
            type="tel"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="920585300"
            required
          />
        </div>

        <div className="login-field">
          <label>DNI</label>
          <input
            type="password"
            value={dni}
            onChange={e => setDni(e.target.value)}
            placeholder="Tu DNI de 8 dígitos"
            maxLength={8}
            required
          />
        </div>

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? (
            <><span className="login-spinner" /> Verificando...</>
          ) : (
            'Ingresar al Sistema'
          )}
        </button>

        <p className="login-footer">Ingresa con tu número de celular y DNI registrado</p>
      </form>
    </div>
  )
}
