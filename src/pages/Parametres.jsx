import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Parametres() {
  const { boutiqueActive } = useAuth()
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [seuilInactivite, setSeuilInactivite] = useState(45)
  const [fideliteValeur, setFideliteValeur] = useState(700)
  const [fideliteSeuil, setFideliteSeuil] = useState(10)
  const [fondDefaut, setFondDefaut] = useState(50000)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (boutiqueActive) {
      setNom(boutiqueActive.nom || '')
      setTelephone(boutiqueActive.telephone || '')
      setSeuilInactivite(boutiqueActive.seuil_inactivite_jours || 45)
      setFideliteValeur(boutiqueActive.fidelite_valeur || 700)
      setFideliteSeuil(boutiqueActive.fidelite_seuil || 10)
      setFondDefaut(boutiqueActive.fond_caisse_defaut || 50000)
    }
  }, [boutiqueActive])

  async function enregistrer() {
    setEnCours(true)
    setMessage('')
    const { error } = await supabase
      .from('boutiques')
      .update({
        nom,
        telephone,
        seuil_inactivite_jours: Number(seuilInactivite),
        fidelite_valeur: Number(fideliteValeur),
        fidelite_seuil: Number(fideliteSeuil),
        fond_caisse_defaut: Number(fondDefaut),
      })
      .eq('id', boutiqueActive.id)

    setEnCours(false)
    setMessage(error ? 'Erreur lors de la sauvegarde.' : 'Paramètres enregistrés ✓')
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Paramètres</div>
          <div className="topbar-sub">Configuration de l'application</div>
        </div>
      </div>

      <div className="content">
        <div className="two-col">
          <div className="card">
            <div className="card-header"><div className="card-title">⚙️ Paramètres boutique</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nom boutique</label>
                <input className="form-input" value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Téléphone boutique</label>
                <input className="form-input" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Seuil inactivité client (jours)</label>
                <input className="form-input" type="number" value={seuilInactivite} onChange={(e) => setSeuilInactivite(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Valeur cadeau fidélité (F CFA)</label>
                <input className="form-input" type="number" value={fideliteValeur} onChange={(e) => setFideliteValeur(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre de recharges pour fidélité</label>
                <input className="form-input" type="number" value={fideliteSeuil} onChange={(e) => setFideliteSeuil(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Fond de caisse par défaut</label>
                <input className="form-input" type="number" value={fondDefaut} onChange={(e) => setFondDefaut(e.target.value)} />
                <span className="form-hint">Montant proposé chaque matin si non encore défini</span>
              </div>
              {message && (
                <p style={{ fontSize: 13, color: message.includes('Erreur') ? 'var(--danger)' : 'var(--success)' }}>{message}</p>
              )}
              <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
                {enCours ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">🏪 Info réseau</div></div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <div><strong>Version app :</strong> Butane Express v1.0</div>
              <div><strong>Boutique :</strong> {boutiqueActive?.nom}</div>
              <div><strong>Code boutique :</strong> {boutiqueActive?.code}</div>
              <div><strong>Ville :</strong> {boutiqueActive?.ville || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
