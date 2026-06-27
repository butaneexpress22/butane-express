import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function Boutiques() {
  const [boutiques, setBoutiques] = useState([])
  const [stats, setStats] = useState({})
  const [chargement, setChargement] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const charger = useCallback(async () => {
    setChargement(true)
    const { data } = await supabase.from('boutiques').select('*').order('created_at')
    setBoutiques(data || [])

    // Stats simples par boutique : ventes du mois + clients actifs
    const moisActuel = new Date().toISOString().slice(0, 7)
    const statsTmp = {}
    for (const b of data || []) {
      const { data: ventes } = await supabase
        .from('ventes')
        .select('total')
        .eq('boutique_id', b.id)
        .in('statut', ['validee', 'en_livraison', 'livree'])
        .gte('valide_at', `${moisActuel}-01`)

      const { count: nbClients } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('boutique_id', b.id)
        .eq('statut', 'actif')

      statsTmp[b.id] = {
        ca: (ventes || []).reduce((s, v) => s + Number(v.total), 0),
        nbVentes: (ventes || []).length,
        nbClients: nbClients || 0,
      }
    }
    setStats(statsTmp)
    setChargement(false)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Mes Boutiques</div>
          <div className="topbar-sub">Réseau Butane Express · {boutiques.length} boutique{boutiques.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Ajouter une boutique</button>
      </div>

      <div className="content">
        {chargement ? (
          <p className="td-light">Chargement…</p>
        ) : (
          <div className="two-col">
            {boutiques.map((b) => (
              <div className="boutique-card" key={b.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{b.nom}</div>
                    <div className="td-light">📍 {b.ville || '—'}</div>
                    <span className={'badge ' + (b.active ? 'badge-success' : 'badge-neutral')} style={{ marginTop: 6 }}>
                      {b.active ? '● Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div style={{ fontSize: 26 }}>🏪</div>
                </div>
                <div className="kpi-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
                  <div className="kpi-card" style={{ padding: 12 }}>
                    <div className="kpi-value" style={{ fontSize: 18 }}>{stats[b.id]?.nbVentes || 0}</div>
                    <div className="kpi-label">Ventes / mois</div>
                  </div>
                  <div className="kpi-card" style={{ padding: 12 }}>
                    <div className="kpi-value" style={{ fontSize: 18 }}>{(stats[b.id]?.ca || 0).toLocaleString('fr-FR')} F</div>
                    <div className="kpi-label">CA / mois</div>
                  </div>
                </div>
              </div>
            ))}

            <div
              className="boutique-card"
              style={{ borderStyle: 'dashed', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, cursor: 'pointer' }}
              onClick={() => setShowModal(true)}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>➕</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Ouvrir une nouvelle boutique</div>
                <div className="td-light" style={{ fontSize: 12, marginTop: 4 }}>Agrandissez votre réseau</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NouvelleBoutiqueModal onClose={() => setShowModal(false)} onCree={() => { setShowModal(false); charger() }} />
      )}
    </>
  )
}

function NouvelleBoutiqueModal({ onClose, onCree }) {
  const [nom, setNom] = useState('')
  const [code, setCode] = useState('')
  const [ville, setVille] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function enregistrer() {
    setErreur('')
    if (!nom.trim() || !code.trim()) {
      setErreur('Le nom et le code (initiales) sont obligatoires.')
      return
    }
    setEnCours(true)

    const { data: boutique, error } = await supabase
      .from('boutiques')
      .insert({
        nom,
        code: code.toUpperCase(),
        ville: ville || null,
        telephone: telephone || null,
        email: email || null,
      })
      .select()
      .single()

    if (error) {
      setErreur(error.code === '23505' ? 'Ce code boutique existe déjà.' : 'Erreur lors de la création.')
      setEnCours(false)
      return
    }

    // Initialise le stock vides B6/B12 pour la nouvelle boutique
    await supabase.from('stock_vides').insert([
      { boutique_id: boutique.id, categorie: 'B6', quantite: 0, seuil_alerte: 30 },
      { boutique_id: boutique.id, categorie: 'B12', quantite: 0, seuil_alerte: 20 },
    ])

    // Reprend tous les articles existants avec un stock à 0 pour la nouvelle boutique
    const { data: articles } = await supabase.from('articles').select('id').eq('actif', true)
    if (articles?.length) {
      await supabase.from('stock').insert(
        articles.map((a) => ({ boutique_id: boutique.id, article_id: a.id, quantite: 0 }))
      )
    }

    setEnCours(false)
    onCree()
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">🏪 Nouvelle boutique</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Nom de la boutique</label>
            <input className="form-input" placeholder="Ex : Yamoussoukro — Centre" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Code (initiales, 2-3 lettres)</label>
            <input className="form-input" placeholder="Ex : YK" value={code} onChange={(e) => setCode(e.target.value)} maxLength={4} />
            <span className="form-hint">Utilisé pour personnaliser les reçus (ex: 235YK)</span>
          </div>
          <div className="form-group">
            <label className="form-label">Ville</label>
            <input className="form-input" placeholder="Yamoussoukro" value={ville} onChange={(e) => setVille(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <input className="form-input" placeholder="01.XX.XX.XX.XX" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" placeholder="contact@..." value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        {erreur && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 10 }}>{erreur}</p>}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
            {enCours ? 'Création…' : 'Créer la boutique'}
          </button>
        </div>
      </div>
    </div>
  )
}
