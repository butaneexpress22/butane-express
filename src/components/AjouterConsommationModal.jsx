import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AjouterConsommationModal({ client, boutique, onClose, onAjoute }) {
  const [quantite, setQuantite] = useState('1')
  const [motif, setMotif] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function enregistrer() {
    const qte = parseInt(quantite)
    if (!qte || qte <= 0) {
      setErreur('Indiquez une quantité valide.')
      return
    }
    setEnCours(true)
    setErreur('')

    const nouvelleConso = client.conso_totale + qte
    let nouveauCompteur = client.fidelite_compteur + qte
    let recompenseAttribuee = false

    if (nouveauCompteur >= 10) {
      recompenseAttribuee = true
      nouveauCompteur = nouveauCompteur % 10
    }

    const { error } = await supabase
      .from('clients')
      .update({
        conso_totale: nouvelleConso,
        fidelite_compteur: nouveauCompteur,
        statut: 'actif',
        derniere_commande_at: new Date().toISOString(),
      })
      .eq('id', client.id)

    if (error) {
      setErreur("Erreur lors de l'enregistrement.")
      setEnCours(false)
      return
    }

    if (recompenseAttribuee) {
      await supabase.from('fidelite_recompenses').insert({
        client_id: client.id,
        boutique_id: boutique.id,
        valeur: boutique.fidelite_valeur || 700,
      })
    }

    // ── Gestion du parrainage : si c'était la 1ère conso du client et qu'il a un parrain ──
    if (client.conso_totale === 0 && client.parrain_id && !client.bonus_parrainage_donne) {
      const { data: parrain } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client.parrain_id)
        .maybeSingle()

      if (parrain) {
        let compteurParrain = parrain.fidelite_compteur + 1
        let recompenseParrain = false
        if (compteurParrain >= 10) {
          recompenseParrain = true
          compteurParrain = compteurParrain % 10
        }

        await supabase
          .from('clients')
          .update({
            conso_totale: parrain.conso_totale + 1,
            fidelite_compteur: compteurParrain,
          })
          .eq('id', parrain.id)

        if (recompenseParrain) {
          await supabase.from('fidelite_recompenses').insert({
            client_id: parrain.id,
            boutique_id: boutique.id,
            valeur: boutique.fidelite_valeur || 700,
          })
        }
      }

      await supabase.from('clients').update({ bonus_parrainage_donne: true }).eq('id', client.id)
    }

    setEnCours(false)
    onAjoute()
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-header">
          <div className="modal-title">➕ Ajouter une consommation</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          <strong>{client.nom || 'Client sans nom'}</strong> — {client.numero_client}{boutique?.code}
          <div className="td-light">Conso actuelle : {client.conso_totale} · Fidélité : {client.fidelite_compteur}/10</div>
          {client.parrain_id && !client.bonus_parrainage_donne && client.conso_totale === 0 && (
            <div style={{ color: 'var(--warning)', marginTop: 6, fontSize: 12 }}>
              ⭐ Ce client a un parrain — sa première consommation déclenchera +1 conso pour son parrain.
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Quantité de recharges à ajouter</label>
          <input className="form-input" type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} autoFocus style={{ fontSize: 18, fontWeight: 700, padding: 12, textAlign: 'center' }} />
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Motif (optionnel)</label>
          <input className="form-input" placeholder="Ex : Vente non enregistrée le 12/06, correction…" value={motif} onChange={(e) => setMotif(e.target.value)} />
        </div>

        {erreur && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 10 }}>{erreur}</p>}

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
