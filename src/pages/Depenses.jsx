import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Depenses() {
  const { boutiqueActive, user } = useAuth()
  const [depenses, setDepenses] = useState([])
  const [categories, setCategories] = useState([])
  const [chargement, setChargement] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filtreCategorie, setFiltreCategorie] = useState('')

  const charger = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)
    const { data } = await supabase
      .from('depenses')
      .select('*, utilisateurs(nom), categories_depenses(nom)')
      .eq('boutique_id', boutiqueActive.id)
      .order('date_depense', { ascending: false })
      .limit(80)
    setDepenses(data || [])

    const { data: cats } = await supabase.from('categories_depenses').select('*').order('nom')
    setCategories(cats || [])

    setChargement(false)
  }, [boutiqueActive])

  useEffect(() => {
    charger()
  }, [charger])

  const depensesFiltrees = depenses.filter((d) => !filtreCategorie || d.categorie_id === filtreCategorie)

  const aujourdhui = new Date().toISOString().slice(0, 10)
  const moisActuel = aujourdhui.slice(0, 7)
  const totalJour = depenses.filter((d) => d.date_depense === aujourdhui).reduce((s, d) => s + Number(d.montant), 0)
  const totalMois = depenses.filter((d) => d.date_depense?.startsWith(moisActuel)).reduce((s, d) => s + Number(d.montant), 0)

  // Répartition par catégorie (mois en cours)
  const repartition = {}
  for (const d of depenses.filter((d) => d.date_depense?.startsWith(moisActuel))) {
    const nom = d.categories_depenses?.nom || 'Sans catégorie'
    repartition[nom] = (repartition[nom] || 0) + Number(d.montant)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Dépenses</div>
          <div className="topbar-sub">Suivi des sorties d'argent · {boutiqueActive?.nom}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Ajouter une dépense</button>
      </div>

      <div className="content">
        <div className="two-col" style={{ marginBottom: 16 }}>
          <div className="kpi-card">
            <div className="kpi-value" style={{ color: 'var(--danger)' }}>{totalJour.toLocaleString('fr-FR')} F</div>
            <div className="kpi-label">Total dépenses du jour</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value" style={{ color: 'var(--warning)' }}>{totalMois.toLocaleString('fr-FR')} F</div>
            <div className="kpi-label">Total dépenses de ce mois</div>
          </div>
        </div>

        {Object.keys(repartition).length > 0 && (
          <div className="card">
            <div className="card-header"><div className="card-title">Répartition par catégorie — ce mois</div></div>
            {Object.entries(repartition).sort(([, a], [, b]) => b - a).map(([nom, montant]) => {
              const pct = Math.round((montant / totalMois) * 100)
              return (
                <div className="compare-bar" key={nom}>
                  <span className="compare-label">{nom}</span>
                  <div className="compare-bg"><div className="compare-fill" style={{ width: pct + '%', background: 'var(--danger)' }}></div></div>
                  <span className="compare-val">{montant.toLocaleString('fr-FR')} F</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="filters-row">
          <select className="f-select" value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)}>
            <option value="">Toutes les catégories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <div className="card">
          {chargement ? (
            <p className="td-light">Chargement…</p>
          ) : depensesFiltrees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💸</div>
              <div className="empty-title">Aucune dépense enregistrée</div>
              <div className="empty-sub">Carburant, électricité, entretien… tout apparaîtra ici.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Catégorie</th><th>Détail</th><th>Montant</th><th>Enregistré par</th></tr></thead>
                <tbody>
                  {depensesFiltrees.map((d) => (
                    <tr key={d.id}>
                      <td className="td-light">{new Date(d.date_depense).toLocaleDateString('fr-FR')}</td>
                      <td><span className="badge badge-neutral">{d.categories_depenses?.nom || d.motif}</span></td>
                      <td>{d.detail || d.motif}</td>
                      <td className="td-bold" style={{ color: 'var(--danger)' }}>{Number(d.montant).toLocaleString('fr-FR')} F</td>
                      <td className="td-light">{d.utilisateurs?.nom || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <DepenseModal
          boutique={boutiqueActive}
          user={user}
          categories={categories}
          onClose={() => setShowModal(false)}
          onCree={() => { setShowModal(false); charger() }}
        />
      )}
    </>
  )
}

function DepenseModal({ boutique, user, categories, onClose, onCree }) {
  const [categorieId, setCategorieId] = useState(categories[0]?.id || '')
  const [detail, setDetail] = useState('')
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [heure, setHeure] = useState(new Date().toTimeString().slice(0, 5))
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function enregistrer() {
    setErreur('')
    if (!categorieId) {
      setErreur('Choisissez une nature de dépense.')
      return
    }
    if (!montant || parseFloat(montant) <= 0) {
      setErreur('Indiquez un montant valide.')
      return
    }
    setEnCours(true)

    const categorie = categories.find((c) => c.id === categorieId)

    const { error } = await supabase.from('depenses').insert({
      boutique_id: boutique.id,
      motif: categorie?.nom || 'Dépense',
      categorie_id: categorieId,
      detail: detail || null,
      montant: parseFloat(montant),
      enregistre_par: user.id,
      date_depense: date,
    })
    setEnCours(false)
    if (!error) onCree()
    else setErreur("Erreur lors de l'enregistrement.")
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 460 }}>
        <div className="modal-header">
          <div className="modal-title">💸 Ajouter une dépense</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Heure</label>
            <input className="form-input" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Nature de la dépense (catégorie)</label>
            <select className="form-input form-select" value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Détail complémentaire</label>
            <input className="form-input" placeholder="Ex : Moto A, Climatiseur boutique…" value={detail} onChange={(e) => setDetail(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Somme (F CFA)</label>
            <input className="form-input" type="number" placeholder="Ex : 5000" value={montant} onChange={(e) => setMontant(e.target.value)} autoFocus />
          </div>
        </div>
        {erreur && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 10 }}>{erreur}</p>}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Enregistrer la dépense'}
          </button>
        </div>
      </div>
    </div>
  )
}
