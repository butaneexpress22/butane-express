import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { journaliser } from '../lib/journal'

export default function AjustementStockVidesCard() {
  const { boutiqueActive, user } = useAuth()
  const [stockVides, setStockVides] = useState([])
  const [chargement, setChargement] = useState(true)
  const [categorie, setCategorie] = useState('B6')
  const [nouvelleQuantite, setNouvelleQuantite] = useState('')
  const [motif, setMotif] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)
    const { data } = await supabase
      .from('stock_vides')
      .select('*')
      .eq('boutique_id', boutiqueActive.id)
      .order('categorie')
    setStockVides(data || [])
    setChargement(false)
  }, [boutiqueActive])

  useEffect(() => {
    charger()
  }, [charger])

  const ligneActuelle = stockVides.find((s) => s.categorie === categorie)
  const quantiteActuelle = ligneActuelle ? ligneActuelle.quantite : 0

  async function ajuster() {
    const valeur = parseInt(nouvelleQuantite)
    if (isNaN(valeur) || valeur < 0) {
      setMessage('Indiquez une quantité valide (0 ou plus).')
      return
    }
    setEnCours(true)
    setMessage('')

    const ancienneQuantite = quantiteActuelle

    let error
    if (ligneActuelle) {
      const res = await supabase.from('stock_vides').update({ quantite: valeur }).eq('id', ligneActuelle.id)
      error = res.error
    } else {
      const res = await supabase.from('stock_vides').insert({
        boutique_id: boutiqueActive.id,
        categorie,
        quantite: valeur,
        seuil_alerte: categorie === 'B6' ? 30 : 20,
      })
      error = res.error
    }

    setEnCours(false)

    if (error) {
      setMessage("Erreur lors de l'ajustement.")
      return
    }

    await journaliser({
      boutiqueId: boutiqueActive.id,
      utilisateurId: user.id,
      action: 'ajustement_stock_vides',
      cibleType: 'stock_vides',
      cibleId: ligneActuelle?.id,
      detail: `Stock de bouteilles ${categorie} vides ajusté de ${ancienneQuantite} à ${valeur}${motif ? ` — Motif : ${motif}` : ''}`,
    })

    setMessage(`✓ Stock ${categorie} vides mis à jour : ${valeur} bouteilles.`)
    setNouvelleQuantite('')
    setMotif('')
    charger()
  }

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-header"><div className="card-title">🍾 Ajustement stock bouteilles vides</div></div>
      <p className="td-light" style={{ marginBottom: 12 }}>
        Utilisez ceci pour définir votre stock de départ de bouteilles vides, ou pour corriger un écart constaté lors d'un inventaire physique.
      </p>

      {chargement ? (
        <p className="td-light">Chargement…</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            {stockVides.map((s) => (
              <div key={s.id} style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div className="td-light" style={{ fontSize: 11 }}>{s.categorie} vides actuellement</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Space Grotesk' }}>{s.quantite}</div>
              </div>
            ))}
            {stockVides.length === 0 && <p className="td-light">Aucune catégorie de bouteilles vides initialisée encore.</p>}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-input form-select" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                <option value="B6">B6 — 6kg</option>
                <option value="B12">B12 — 12kg</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nouvelle quantité (remplace l'actuelle : {quantiteActuelle})</label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder={String(quantiteActuelle)}
                value={nouvelleQuantite}
                onChange={(e) => setNouvelleQuantite(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Motif (optionnel)</label>
              <input
                className="form-input"
                placeholder="Ex : Stock de départ, correction inventaire physique…"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              />
            </div>
          </div>

          {message && (
            <p style={{ fontSize: 12, color: message.startsWith('✓') ? 'var(--success)' : 'var(--danger)', marginTop: 10 }}>{message}</p>
          )}

          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={ajuster} disabled={enCours || !nouvelleQuantite}>
            {enCours ? 'Enregistrement…' : 'Appliquer le nouveau stock'}
          </button>
        </>
      )}
    </div>
  )
}
