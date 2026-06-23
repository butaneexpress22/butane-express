import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Achats() {
  const { boutiqueActive, user } = useAuth()
  const [achats, setAchats] = useState([])
  const [chargement, setChargement] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showArticleModal, setShowArticleModal] = useState(false)
  const [recherche, setRecherche] = useState('')

  const charger = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)
    const { data } = await supabase
      .from('achats')
      .select('*, articles(designation, classe, categorie)')
      .eq('boutique_id', boutiqueActive.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setAchats(data || [])
    setChargement(false)
  }, [boutiqueActive])

  useEffect(() => {
    charger()
  }, [charger])

  const achatsFiltres = achats.filter((a) => {
    if (!recherche) return true
    return a.articles?.designation?.toLowerCase().includes(recherche.toLowerCase()) || a.fournisseur?.toLowerCase().includes(recherche.toLowerCase())
  })

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Achats</div>
          <div className="topbar-sub">Approvisionnements fournisseurs · {boutiqueActive?.nom}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowArticleModal(true)}>+ Créer un article</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Enregistrer un achat</button>
        </div>
      </div>

      <div className="content">
        <div className="filters-row">
          <div className="search-box" style={{ minWidth: 220 }}>
            🔍
            <input
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 13 }}
              placeholder="Article, fournisseur…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Historique des achats fournisseurs</div></div>
          {chargement ? (
            <p className="td-light">Chargement…</p>
          ) : achatsFiltres.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛍️</div>
              <div className="empty-title">Aucun achat enregistré</div>
              <div className="empty-sub">Vos approvisionnements fournisseurs apparaîtront ici.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Article</th><th>Classe</th><th>Catég.</th><th>Qté</th><th>Prix achat/U</th><th>Total</th><th>Fournisseur</th></tr></thead>
                <tbody>
                  {achatsFiltres.map((a) => (
                    <tr key={a.id}>
                      <td className="td-light">{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                      <td className="td-bold">{a.articles?.designation}</td>
                      <td><span className={'tag-' + (a.articles?.classe === 'gaz' ? 'gaz' : 'acc')}>{a.articles?.classe === 'gaz' ? 'GAZ' : 'ACC'}</span></td>
                      <td>{a.articles?.categorie && <span className={'tag-' + a.articles.categorie.toLowerCase()}>{a.articles.categorie}</span>}</td>
                      <td>{a.quantite}</td>
                      <td>{Number(a.prix_achat_unitaire).toLocaleString('fr-FR')} F</td>
                      <td className="td-bold">{Number(a.total).toLocaleString('fr-FR')} F</td>
                      <td className="td-light">{a.fournisseur || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <AchatModal
          boutique={boutiqueActive}
          user={user}
          onClose={() => setShowModal(false)}
          onCree={() => { setShowModal(false); charger() }}
        />
      )}

      {showArticleModal && (
        <CreerArticleModal
          boutique={boutiqueActive}
          onClose={() => setShowArticleModal(false)}
          onCree={() => setShowArticleModal(false)}
        />
      )}
    </>
  )
}

function AchatModal({ boutique, user, onClose, onCree }) {
  const [articles, setArticles] = useState([])
  const [articleId, setArticleId] = useState('')
  const [quantite, setQuantite] = useState('')
  const [prixAchat, setPrixAchat] = useState('')
  const [fournisseur, setFournisseur] = useState('')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    async function charger() {
      const { data } = await supabase.from('articles').select('*').eq('actif', true).order('designation')
      setArticles(data || [])
      if (data && data.length > 0) {
        setArticleId(data[0].id)
        setPrixAchat(String(data[0].prix_achat))
      }
    }
    charger()
  }, [])

  const articleSelectionne = articles.find((a) => a.id === articleId)

  useEffect(() => {
    if (articleSelectionne) setPrixAchat(String(articleSelectionne.prix_achat))
  }, [articleId])

  const total = (parseFloat(prixAchat) || 0) * (parseInt(quantite) || 0)

  async function enregistrer() {
    if (!articleSelectionne || !quantite || parseInt(quantite) <= 0) {
      alert('Vérifiez l\'article et la quantité.')
      return
    }
    setEnCours(true)

    const qte = parseInt(quantite)
    const prixU = parseFloat(prixAchat) || 0

    const { error: errAchat } = await supabase.from('achats').insert({
      boutique_id: boutique.id,
      article_id: articleSelectionne.id,
      quantite: qte,
      prix_achat_unitaire: prixU,
      total: prixU * qte,
      fournisseur: fournisseur || null,
      enregistre_par: user.id,
    })

    if (errAchat) {
      alert('Erreur lors de l\'enregistrement de l\'achat.')
      setEnCours(false)
      return
    }

    // Met à jour le stock : on incrémente la quantité de l'article pour cette boutique
    const { data: stockExistant } = await supabase
      .from('stock')
      .select('*')
      .eq('boutique_id', boutique.id)
      .eq('article_id', articleSelectionne.id)
      .maybeSingle()

    if (stockExistant) {
      await supabase
        .from('stock')
        .update({ quantite: stockExistant.quantite + qte })
        .eq('id', stockExistant.id)
    } else {
      await supabase.from('stock').insert({ boutique_id: boutique.id, article_id: articleSelectionne.id, quantite: qte })
    }

    // Si c'est du GAZ, on déduit les bouteilles vides correspondantes (échangées contre les pleines)
    if (articleSelectionne.classe === 'gaz' && articleSelectionne.categorie) {
      const { data: vides } = await supabase
        .from('stock_vides')
        .select('*')
        .eq('boutique_id', boutique.id)
        .eq('categorie', articleSelectionne.categorie)
        .maybeSingle()

      if (vides) {
        const nouvelleQte = Math.max(0, vides.quantite - qte)
        await supabase.from('stock_vides').update({ quantite: nouvelleQte }).eq('id', vides.id)
      }
    }

    setEnCours(false)
    onCree()
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">🛍️ Enregistrer un achat fournisseur</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Article / Compagnie</label>
            <select className="form-input form-select" value={articleId} onChange={(e) => setArticleId(e.target.value)}>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.designation} {a.categorie ? `— ${a.categorie}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quantité</label>
            <input className="form-input" type="number" placeholder="50" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Prix d'achat unitaire (F)</label>
            <input className="form-input" type="number" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Total</label>
            <input className="form-input ro" value={`${total.toLocaleString('fr-FR')} F`} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">Fournisseur</label>
            <input className="form-input" placeholder="GESTOCI, Simam, Dist…" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} />
          </div>
        </div>
        {articleSelectionne?.classe === 'gaz' && (
          <div style={{ background: 'var(--info-light)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#075985', marginTop: 12 }}>
            ℹ️ Cet achat ajoutera {quantite || 0} recharges {articleSelectionne.categorie} pleines au stock, et déduira la même quantité du stock de bouteilles {articleSelectionne.categorie} vides.
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Mettre à jour le stock'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreerArticleModal({ boutique, onClose, onCree }) {
  const [designation, setDesignation] = useState('')
  const [classe, setClasse] = useState('gaz')
  const [categorie, setCategorie] = useState('B6')
  const [prixAchat, setPrixAchat] = useState('')
  const [prixVente, setPrixVente] = useState('')
  const [seuilAlerte, setSeuilAlerte] = useState('10')
  const [enCours, setEnCours] = useState(false)

  async function enregistrer() {
    if (!designation.trim()) {
      alert('Indiquez une désignation.')
      return
    }
    setEnCours(true)
    const { count } = await supabase.from('articles').select('id', { count: 'exact', head: true })
    const code = 'ART-' + String((count || 0) + 1).padStart(3, '0')

    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        code,
        designation,
        classe,
        categorie: classe === 'gaz' ? categorie : null,
        prix_achat: parseFloat(prixAchat) || 0,
        prix_vente: parseFloat(prixVente) || 0,
        seuil_alerte: parseInt(seuilAlerte) || 10,
      })
      .select()
      .single()

    if (!error && article && boutique) {
      await supabase.from('stock').insert({ boutique_id: boutique.id, article_id: article.id, quantite: 0 })
    }
    setEnCours(false)
    onCree()
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">📦 Créer un article</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Désignation / Compagnie</label>
            <input className="form-input" placeholder="Ex : Simam, Dist, Total, Détendeur…" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Classe</label>
            <select className="form-input form-select" value={classe} onChange={(e) => setClasse(e.target.value)}>
              <option value="gaz">GAZ</option>
              <option value="accessoire">Accessoires</option>
            </select>
          </div>
          <div className="form-group" style={{ opacity: classe === 'gaz' ? 1 : 0.4 }}>
            <label className="form-label">Catégorie</label>
            <select className="form-input form-select" value={categorie} onChange={(e) => setCategorie(e.target.value)} disabled={classe !== 'gaz'}>
              <option value="B6">B6 — 6kg</option>
              <option value="B12">B12 — 12kg</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Prix d'achat (F CFA)</label>
            <input className="form-input" type="number" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Prix de vente (F CFA)</label>
            <input className="form-input" type="number" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Seuil alerte</label>
            <input className="form-input" type="number" value={seuilAlerte} onChange={(e) => setSeuilAlerte(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
            {enCours ? 'Création…' : "Créer l'article"}
          </button>
        </div>
      </div>
    </div>
  )
}
