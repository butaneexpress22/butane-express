import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StockTicketModal from './StockTicketModal'

const aujourdhui = () => new Date().toISOString().slice(0, 10)

export default function FondCaisseOuvertureModal() {
  const { boutiqueActive, user, fondCaisseDefini } = useAuth()
  const [montant, setMontant] = useState(String(boutiqueActive?.fond_caisse_defaut || 50000))
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [showTicket, setShowTicket] = useState(false)
  const [donneesTicket, setDonneesTicket] = useState(null)

  async function valider() {
    const valeur = parseFloat(montant)
    if (isNaN(valeur) || valeur < 0) {
      setErreur('Indiquez un montant valide.')
      return
    }
    setEnCours(true)
    setErreur('')

    const { error } = await supabase.from('fonds_caisse').upsert(
      {
        boutique_id: boutiqueActive.id,
        date_jour: aujourdhui(),
        montant: valeur,
        defini_par: user.id,
      },
      { onConflict: 'boutique_id,date_jour' }
    )

    if (error) {
      setErreur("Erreur lors de l'enregistrement du fond de caisse.")
      setEnCours(false)
      return
    }

    // Prépare les données pour le ticket d'inventaire imprimé automatiquement
    const { data: stockData } = await supabase
      .from('stock')
      .select('*, articles(*)')
      .eq('boutique_id', boutiqueActive.id)

    const { data: vides } = await supabase
      .from('stock_vides')
      .select('*')
      .eq('boutique_id', boutiqueActive.id)

    const gaz = (stockData || []).filter((s) => s.articles?.classe === 'gaz')
    const acc = (stockData || []).filter((s) => s.articles?.classe === 'accessoire')

    setDonneesTicket({
      articlesGaz: gaz,
      articlesAcc: acc,
      stockVides: vides || [],
      etatCaisse: valeur,
      fondCaisse: valeur,
    })

    setEnCours(false)
    setShowTicket(true)
  }

  function terminer() {
    setShowTicket(false)
    fondCaisseDefini()
  }

  if (showTicket && donneesTicket) {
    return (
      <StockTicketModal
        articlesGaz={donneesTicket.articlesGaz}
        articlesAcc={donneesTicket.articlesAcc}
        stockVides={donneesTicket.stockVides}
        boutique={boutiqueActive}
        etatCaisse={donneesTicket.etatCaisse}
        fondCaisse={donneesTicket.fondCaisse}
        caissierNom={user?.nom || '—'}
        onClose={terminer}
      />
    )
  }

  return (
    <div className="modal-overlay show">
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-header">
          <div className="modal-title">💵 Ouverture de caisse</div>
        </div>
        <p className="td-light" style={{ marginBottom: 16 }}>
          Bonjour {user?.nom} 👋 Avant de commencer votre journée, indiquez le montant avec lequel vous ouvrez la caisse aujourd'hui.
        </p>
        <div className="form-group">
          <label className="form-label">Fond de caisse d'ouverture (F CFA)</label>
          <input
            className="form-input"
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            style={{ fontSize: 22, fontWeight: 700, padding: 14, textAlign: 'center' }}
            autoFocus
          />
        </div>
        {erreur && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 10 }}>{erreur}</p>}
        <p className="form-hint" style={{ marginTop: 10 }}>
          Une fois validé, un ticket d'inventaire sera automatiquement préparé pour impression. Seul un administrateur pourra modifier ce montant par la suite.
        </p>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={valider} disabled={enCours} style={{ width: '100%' }}>
            {enCours ? 'Enregistrement…' : 'Commencer la journée →'}
          </button>
        </div>
      </div>
    </div>
  )
}
