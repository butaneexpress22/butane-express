import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [code, setCode] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur('')
    setEnCours(true)
    const result = await login(code, motDePasse)
    setEnCours(false)
    if (!result.success) {
      setErreur(result.message)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-icon">🔥</div>
          <h2>Butane Express</h2>
          <p>Connectez-vous à votre espace</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <label className="login-label">Code utilisateur</label>
            <input
              className="login-input"
              placeholder="Ex : ADM-001 ou USR-N001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="login-label">Mot de passe</label>
            <input
              className="login-input"
              type="password"
              placeholder="••••••••"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>

          {erreur && <div className="login-error">{erreur}</div>}

          <button className="login-btn" type="submit" disabled={enCours}>
            {enCours ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
