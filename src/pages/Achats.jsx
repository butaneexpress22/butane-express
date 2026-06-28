import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { journaliser } from '../lib/journal'

export default function Achats() {
  const { boutiqueActive, user, isAdmin } = useAuth()
  const [achats, setAchats] = useState([])
  const [articles, setArticles] = useState([])
  const [onglet, setOnglet] = useState('historique')
  const [chargement, setChargement] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showArticleModal, setShowArticleModal] = useState(false)
  const [articleAModifier, setArticleAModifier] = useState(null)
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

    const { data: arts } = await supabase.from('articles').select('*').eq('actif', true).order('designation')
    setArticles(arts || [])

    setChargement(false)
  }, [boutiqueActive])

  useEffect(() => {
    charger()
  }, [charger])

  const achatsFiltres = achats.filter((a) => {
    if (!recherche) return true
    return a.articles?.designation?.toLowerCase().includes(recherche.toLowerCase()) || a.fournisseur?.toLowerCase().includes(recherche.toLowerCase())
  })

  async function desactiverArticle(article) {
    if (!confirm(`Désactiver l'article "${article.designation}${article.categorie ? ' — ' + article.categorie : ''}" ? Il n'apparaîtra plus dans les nouvelles ventes/achats, mais l'historique existant est conservé.`)) return

    const { error } = await supabase
      .from('articles')
      .update({ actif: false, desactive_par: user.id, desactive_le: new Date().toISOString() })
      .eq('id', article.id)

    if (!error) {
      await journaliser({
        boutiqueId: boutiqueActive.id,
        utilisateurId: user.id,
        action: 'desactivation_article',
        cibleType: 'article',
        cibleId: article.id,
        detail: `Article ${article.code} (${article.designation}) désactivé`,
      })
      charger()
    }
  }

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
        <div className="tabs">
          <button className={'tab-btn' + (onglet === 'historique' ? ' active' : '')} onClick={() => setOnglet('historique')}>Historique des achats</button>
          <button className={'tab-btn' + (onglet === 'articles' ? ' active' : '')} onClick={() => setOnglet('articles')}>Mes articles ({articles.length})</button>
        </div>

        {onglet === 'historique' ? (
          <>
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
                    <thead><tr><th>Date</th><th>Article</th><th>Type</th><th>Classe</th><th>Catég.</th><th>Qté</th><th>Prix achat/U</th><th>Total</th><th>Fournisseur</th></tr></thead>
                    <tbody>
                      {achatsFiltres.map((a) => (
                        <tr key={a.id}>
                          <td className="td-light">{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="td-bold">{a.articles?.designation}</td>
                          <td>
                            {a.articles?.classe === 'gaz' ? (
                              <span className={'badge ' + (a.type_achat === 'neuve' ? 'badge-info' : 'badge-orange')}>
                                {a.type_achat === 'neuve' ? '🆕 Bouteille neuve' : '♻️ Recharge'}
                              </span>
                            ) : '—'}
                          </td>
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
          </>
        ) : (
          <div className="card">
            <div className="card-header"><div className="card-title">Articles actifs</div></div>
            {articles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <div className="empty-title">Aucun article créé</div>
                <div className="empty-sub">Créez vos articles au fil de l'eau avec le bouton "+ Créer un article".</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Désignation</th><th>Classe</th><th>Catég.</th><th>Prix achat</th><th>Prix vente</th><th>Seuil alerte</th><th></th></tr></thead>
                  <tbody>
                    {articles.map((a) => (
                      <tr key={a.id}>
                        <td className="td-light">{a.code}</td>
                        <td className="td-bold">{a.designation}</td>
                        <td><span className={'tag-' + (a.classe === 'gaz' ? 'gaz' : 'acc')}>{a.classe === 'gaz' ? 'GAZ' : 'ACC'}</span></td>
                        <td>{a.categorie && <span className={'tag-' + a.categorie.toLowerCase()}>{a.categorie}</span>}</td>
                        <td>{Number(a.prix_achat).toLocaleString('fr-FR')} F</td>
                        <td>{Number(a.prix_vente).toLocaleString('fr-FR')} F</td>
                        <td className="td-light">{a.seuil_alerte}</td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-xs" onClick={() => setArticleAModifier(a)}>✏️ Modifier</button>
                          {isAdmin && (
                            <button className="btn btn-danger btn-xs" onClick={() => desactiverArticle(a)}>🗑️ Désactiver</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!isAdmin && <p className="td-light" style={{ marginTop: 12, fontSize: 11 }}>🔒 La désactivation d'un article est réservée à l'administrateur.</p>}
          </div>
        )}
      </div>

      {showModal && (
        <AchatModal
          boutique={boutiqueActive}
          user={user}
          articles={articles}
          onClose={() => setShowModal(false)}
          onCree={() => { setShowModal(false); charger() }}
        />
      )}

      {showArticleModal && (
        <CreerArticleModal
          boutique={boutiqueActive}
          onClose={() => setShowArticleModal(false)}
          onCree={() => { setShowArticleModal(false); charger() }}
        />
      )}

      {articleAModifier && (
        <CreerArticleModal
          mode="modification"
          article={articleAModifier}
          boutique={boutiqueActive}
          onClose={() => setArticleAModifier(null)}
          onCree={() => { setArticleAModifier(null); charger() }}
        />
      )}
    </>
  )
}

function AchatModal({ boutique, user, articles, onClose, onCree }) {
  const [typeAchat, setTypeAchat] = useState('recharge')
  const [articleId, setArticleId] = useState(articles[0]?.id || '')
  const [quantite, setQuantite] = useState('')
  const [prixAchat, setPrixAchat] = useState(articles[0] ? String(articles[0].prix_achat) : '')
  const [fournisseur, setFournisseur] = useState('')
  const [enCours, setEnCours] = useState(false)

  const articleSelectionne = articles.find((a) => a.id === articleId)
  const estGaz = articleSelectionne?.classe === 'gaz'

  useEffect(() => {
    if (articleSelectionne) setPrixAchat(String(articleSelectionne.prix_achat))
    if (!articleSelectionne?.classe === 'gaz') setTypeAchat('recharge')
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
    const typeFinal = estGaz ? typeAchat : 'recharge'

    const { error: errAchat } = await supabase.from('achats').insert({
      boutique_id: boutique.id,
      article_id: articleSelectionne.id,
      quantite: qte,
      prix_achat_unitaire: prixU,
      total: prixU * qte,
      fournisseur: fournisseur || null,
      enregistre_par: user.id,
      type_achat: typeFinal,
    })

    if (errAchat) {
      alert('Erreur lors de l\'enregistrement de l\'achat.')
      setEnCours(false)
      return
    }

    // Met à jour le stock de l'article (pleines) : toujours +qte, que ce soit recharge ou neuve
    const { data: stockExistant } = await supabase
      .from('stock')
      .select('*')
      .eq('boutique_id', boutique.id)
      .eq('article_id', articleSelectionne.id)
      .maybeSingle()

    if (stockExistant) {
      await supabase.from('stock').update({ quantite: stockExistant.quantite + qte }).eq('id', stockExistant.id)
    } else {
      await supabase.from('stock').insert({ boutique_id: boutique.id, article_id: articleSelectionne.id, quantite: qte })
    }

    // Logique des bouteilles vides selon le type d'achat (uniquement pour le GAZ)
    if (estGaz && articleSelectionne.categorie) {
      const { data: vides } = await supabase
        .from('stock_vides')
        .select('*')
        .eq('boutique_id', boutique.id)
        .eq('categorie', articleSelectionne.categorie)
        .maybeSingle()

      if (vides) {
        if (typeFinal === 'recharge') {
          // Recharge : on échange des vides contre des pleines → le total de bouteilles ne change pas
          const nouvelleQte = Math.max(0, vides.quantite - qte)
          await supabase.from('stock_vides').update({ quantite: nouvelleQte }).eq('id', vides.id)
        }
        // Si "neuve" : on ne touche pas aux vides, le total de bouteilles augmente bien de +qte
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

        {articles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">Aucun article disponible</div>
            <div className="empty-sub">Créez d'abord un article avec le bouton "+ Créer un article".</div>
          </div>
        ) : (
          <>
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

              {estGaz && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Type d'achat</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={'btn ' + (typeAchat === 'recharge' ? 'btn-primary' : 'btn-outline')}
                      style={{ flex: 1 }}
                      onClick={() => setTypeAchat('recharge')}
                    >
                      ♻️ Recharge (échange vides → pleines)
                    </button>
                    <button
                      className={'btn ' + (typeAchat === 'neuve' ? 'btn-primary' : 'btn-outline')}
                      style={{ flex: 1 }}
                      onClick={() => setTypeAchat('neuve')}
                    >
                      🆕 Bouteilles neuves (augmente le parc)
                    </button>
                  </div>
                </div>
              )}

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

            {estGaz && (
              <div style={{ background: 'var(--info-light)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#075985', marginTop: 12 }}>
                {typeAchat === 'recharge' ? (
                  <>ℹ️ Cet achat ajoutera {quantite || 0} recharges {articleSelectionne?.categorie} pleines au stock, et déduira la même quantité du stock de bouteilles {articleSelectionne?.categorie} vides. Le total de bouteilles reste inchangé.</>
                ) : (
                  <>ℹ️ Cet achat ajoutera {quantite || 0} <strong>nouvelles</strong> bouteilles {articleSelectionne?.categorie} pleines au stock, sans toucher aux bouteilles vides. Le total de bouteilles {articleSelectionne?.categorie} augmentera de {quantite || 0}.</>
                )}
              </div>
            )}
          </>
        )}

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={enregistrer} disabled={enCours || articles.length === 0}>
            {enCours ? 'Enregistrement…' : 'Mettre à jour le stock'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreerArticleModal({ mode = 'creation', article, boutique, onClose, onCree }) {
  const estModification = mode === 'modification'
  const [designation, setDesignation] = useState(article?.designation || '')
  const [classe, setClasse] = useState(article?.classe || 'gaz')
  const [categorie, setCategorie] = useState(article?.categorie || 'B6')
  const [prixAchat, setPrixAchat] = useState(article ? String(article.prix_achat) : '')
  const [prixVente, setPrixVente] = useState(article ? String(article.prix_vente) : '')
  const [seuilAlerte, setSeuilAlerte] = useState(article ? String(article.seuil_alerte) : '10')
  const [enCours, setEnCours] = useState(false)

  async function enregistrer() {
    if (!designation.trim()) {
      alert('Indiquez une désignation.')
      return
    }
    setEnCours(true)

    if (estModification) {
      const { error } = await supabase
        .from('articles')
        .update({
          designation,
          classe,
          categorie: classe === 'gaz' ? categorie : null,
          prix_achat: parseFloat(prixAchat) || 0,
          prix_vente: parseFloat(prixVente) || 0,
          seuil_alerte: parseInt(seuilAlerte) || 10,
        })
        .eq('id', article.id)

      setEnCours(false)
      if (!error) onCree()
      else alert("Erreur lors de la modification de l'article.")
    } else {
      const { count } = await supabase.from('articles').select('id', { count: 'exact', head: true })
      const code = 'ART-' + String((count || 0) + 1).padStart(3, '0')

      const { data: nouvelArticle, error } = await supabase
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

      if (!error && nouvelArticle && boutique) {
        await supabase.from('stock').insert({ boutique_id: boutique.id, article_id: nouvelArticle.id, quantite: 0 })
      }
      setEnCours(false)
      onCree()
    }
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{estModification ? '✏️ Modifier l\'article' : '📦 Créer un article'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {estModification && (
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
            ID : <strong>{article.code}</strong> — Les ventes déjà enregistrées avec cet article ne seront pas modifiées rétroactivement.
          </div>
        )}
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
            {enCours ? (estModification ? 'Enregistrement…' : 'Création…') : estModification ? 'Enregistrer les modifications' : "Créer l'article"}
          </button>
        </div>
      </div>

    </div>
  )
}
