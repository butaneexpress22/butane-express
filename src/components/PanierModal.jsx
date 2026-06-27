import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function PanierModal({ onClose, onVenteCreee }) {
  const { boutiqueActive, user } = useAuth()

  // ── Client ──
  const [rechercheClient, setRechercheClient] = useState('')
  const [resultatsClients, setResultatsClients] = useState([])
  const [client, setClient] = useState(null)
  const [chargementRecherche, setChargementRecherche] = useState(false)
  const [erreurClient, setErreurClient] = useState('')

  // ── Articles disponibles ──
  const [articles, setArticles] = useState([])
  const [idArticleSaisi, setIdArticleSaisi] = useState('')
  const [articleSelectionne, setArticleSelectionne] = useState(null)
  const [suggestionsArticles, setSuggestionsArticles] = useState([])
  const [erreurArticle, setErreurArticle] = useState('')
  const [livRed, setLivRed] = useState(0)
  const [quantite, setQuantite] = useState(1)

  // ── Panier ──
  const [panier, setPanier] = useState([])

  const [enregistrement, setEnregistrement] = useState(false)

  useEffect(() => {
    async function charger() {
      const { data: arts } = await supabase
        .from('articles')
        .select('*')
        .eq('actif', true)
        .order('designation')
      setArticles(arts || [])
    }
    if (boutiqueActive) charger()
  }, [boutiqueActive])

  // ── Recherche client par nom, contact, ou numéro ──
  useEffect(() => {
    const terme = rechercheClient.trim()
    if (terme.length < 2) {
      setResultatsClients([])
      return
    }
    const timeout = setTimeout(async () => {
      setChargementRecherche(true)
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('boutique_id', boutiqueActive.id)
        .or(`numero_client.ilike.%${terme}%,nom.ilike.%${terme}%,contact.ilike.%${terme}%`)
        .limit(8)
      setResultatsClients(data || [])
      setChargementRecherche(false)
    }, 350)
    return () => clearTimeout(timeout)
  }, [rechercheClient, boutiqueActive])

  function selectionnerClient(c) {
    setClient(c)
    setRechercheClient('')
    setResultatsClients([])
    setErreurClient('')
  }

  // ── Sélection article par ID ──
  useEffect(() => {
    const terme = idArticleSaisi.trim().toLowerCase()
    if (!terme) {
      setSuggestionsArticles([])
      setArticleSelectionne(null)
      return
    }
    const matches = articles.filter(
      (a) => a.code.toLowerCase().includes(terme) || a.designation.toLowerCase().includes(terme)
    )
    setSuggestionsArticles(matches.slice(0, 6))

    const exact = articles.find((a) => a.code.toLowerCase() === terme)
    if (exact) {
      setArticleSelectionne(exact)
      setErreurArticle('')
    } else {
      setArticleSelectionne(null)
    }
  }, [idArticleSaisi, articles])

  function selectionnerArticle(a) {
    setArticleSelectionne(a)
    setIdArticleSaisi(a.code)
    setSuggestionsArticles([])
    setErreurArticle('')
  }

  function ajouterAuPanier() {
    if (!articleSelectionne) {
      setErreurArticle('Sélectionnez un article valide par son identifiant.')
      return
    }
    const prix = Number(articleSelectionne.prix_vente)
    const lr = Number(livRed) || 0
    const qte = Number(quantite) || 1
    const total = (prix + lr) * qte

    setPanier((prev) => [
      ...prev,
      {
        key: Date.now(),
        article: articleSelectionne,
        prixUnitaire: prix,
        livRed: lr,
        quantite: qte,
        total,
      },
    ])

    // Réinitialise le formulaire d'ajout
    setIdArticleSaisi('')
    setArticleSelectionne(null)
    setLivRed(0)
    setQuantite(1)
  }

  function retirerDuPanier(key) {
    setPanier((prev) => prev.filter((p) => p.key !== key))
  }

  const totalPanier = panier.reduce((s, p) => s + p.total, 0)

  async function enregistrerVente(statutInitial) {
    if (!client) {
      setErreurClient('Sélectionnez un client valide avant de continuer.')
      return
    }
    if (panier.length === 0) {
      alert('Le panier est vide. Ajoutez au moins un article.')
      return
    }

    setEnregistrement(true)

    const { count } = await supabase
      .from('ventes')
      .select('id', { count: 'exact', head: true })
      .eq('boutique_id', boutiqueActive.id)

    const numeroSeq = String((count || 0) + 1).padStart(5, '0')
    const annee = String(new Date().getFullYear()).slice(-2)
    const numeroRecuComplet = `${numeroSeq}/${annee}/${boutiqueActive.code}`

    const { data: vente, error } = await supabase
      .from('ventes')
      .insert({
        numero_recu: numeroSeq,
        numero_recu_complet: numeroRecuComplet,
        boutique_id: boutiqueActive.id,
        client_id: client.id,
        caissier_id: user.id,
        total: totalPanier,
        statut: statutInitial,
        conso_client_au_moment: client.conso_totale,
      })
      .select()
      .single()

    if (error || !vente) {
      console.error(error)
      alert("Erreur lors de l'enregistrement de la vente. Veuillez réessayer.")
      setEnregistrement(false)
      return
    }

    const lignes = panier.map((p) => ({
      vente_id: vente.id,
      article_id: p.article.id,
      prix_unitaire: p.prixUnitaire,
      liv_red: p.livRed,
      quantite: p.quantite,
      total_ligne: p.total,
    }))

    await supabase.from('ventes_lignes').insert(lignes)

    setEnregistrement(false)
    onVenteCreee({ ...vente, clients: client })
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">🛒 Nouvelle vente — Panier</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="panier-wrap">
          <div className="panier-left">
            {/* CLIENT */}
            <div className="card" style={{ marginBottom: 0, padding: 16 }}>
              <div className="section-title">Client</div>

              {!client ? (
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder="Recherchez par nom, téléphone ou n° client…"
                    value={rechercheClient}
                    onChange={(e) => setRechercheClient(e.target.value)}
                    autoFocus
                  />
                  {chargementRecherche && <p className="form-hint" style={{ marginTop: 4 }}>Recherche…</p>}
                  {resultatsClients.length > 0 && (
                    <div className="suggestions-box">
                      {resultatsClients.map((c) => (
                        <div key={c.id} className="suggestion-item" onClick={() => selectionnerClient(c)}>
                          <strong>{c.nom || 'Sans nom'}</strong>
                          <span className="td-light">
                            {' '}— {c.numero_client}{boutiqueActive?.code} · {c.contact || '—'} · {c.quartier || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {rechercheClient.trim().length >= 2 && !chargementRecherche && resultatsClients.length === 0 && (
                    <p className="form-hint" style={{ marginTop: 6, color: 'var(--danger)' }}>Aucun client trouvé.</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">N° Client</label>
                      <input className="form-input ro" value={`${client.numero_client}${boutiqueActive?.code || ''}`} readOnly />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nom</label>
                      <input className="form-input ro" value={client.nom || '—'} readOnly />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact</label>
                      <input className="form-input ro" value={client.contact || '—'} readOnly />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quartier</label>
                      <input className="form-input ro" value={client.quartier || '—'} readOnly />
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                      ⭐ Fidélité : {client.fidelite_compteur}/10
                      {client.fidelite_compteur === 9 && ' — La prochaine recharge déclenche le cadeau !'}
                    </span>
                    <button className="btn btn-outline btn-xs" onClick={() => setClient(null)}>Changer de client</button>
                  </div>
                </div>
              )}
              {erreurClient && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{erreurClient}</p>}
            </div>

            {/* AJOUTER ARTICLE */}
            <div className="card" style={{ marginBottom: 0, padding: 16 }}>
              <div className="section-title">Ajouter un article au panier</div>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                  <label className="form-label">ID Article</label>
                  <input
                    className="form-input"
                    placeholder="Ex : sim6 (Simam B6), dist12…"
                    value={idArticleSaisi}
                    onChange={(e) => setIdArticleSaisi(e.target.value)}
                  />
                  {suggestionsArticles.length > 0 && !articleSelectionne && (
                    <div className="suggestions-box">
                      {suggestionsArticles.map((a) => (
                        <div key={a.id} className="suggestion-item" onClick={() => selectionnerArticle(a)}>
                          <strong>{a.code}</strong>
                          <span className="td-light"> — {a.designation} {a.categorie ? `(${a.categorie})` : ''} · {Number(a.prix_vente).toLocaleString('fr-FR')} F</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {erreurArticle && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{erreurArticle}</p>}
                </div>

                {articleSelectionne && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Article</label>
                      <input className="form-input ro" value={articleSelectionne.designation} readOnly />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Classe</label>
                      <input className="form-input ro" value={articleSelectionne.classe === 'gaz' ? 'GAZ' : 'Accessoire'} readOnly />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Catégorie</label>
                      <input className="form-input ro" value={articleSelectionne.categorie || '—'} readOnly />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Prix unitaire</label>
                      <input className="form-input ro" value={`${Number(articleSelectionne.prix_vente).toLocaleString('fr-FR')} F`} readOnly />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Liv/Red (F)</label>
                      <input className="form-input" type="number" value={livRed} onChange={(e) => setLivRed(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quantité</label>
                      <input className="form-input" type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sous-total</label>
                      <input
                        className="form-input ro"
                        value={`${((Number(articleSelectionne.prix_vente) + (Number(livRed) || 0)) * (Number(quantite) || 1)).toLocaleString('fr-FR')} F`}
                        readOnly
                      />
                    </div>
                  </>
                )}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={ajouterAuPanier} disabled={!articleSelectionne}>
                + Ajouter au panier
              </button>
            </div>
          </div>

          {/* PANIER À DROITE */}
          <div className="panier-right">
            <div className="panier-right-header">
              🧺 Panier <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 20, padding: '1px 8px', fontSize: 11, marginLeft: 6 }}>{panier.length}</span>
            </div>
            <div className="panier-items">
              {panier.length === 0 ? (
                <div className="panier-empty">Le panier est vide.<br />Ajoutez un article à gauche.</div>
              ) : (
                panier.map((p) => (
                  <div className="panier-item" key={p.key}>
                    <div className="panier-item-top">
                      <span className="panier-item-name">
                        {p.article.designation} {p.article.categorie && <span className={'tag-' + p.article.categorie.toLowerCase()} style={{ marginLeft: 4 }}>{p.article.categorie}</span>}
                      </span>
                      <button className="panier-item-remove" onClick={() => retirerDuPanier(p.key)}>×</button>
                    </div>
                    <div className="panier-item-detail">
                      <span>{p.prixUnitaire.toLocaleString('fr-FR')} F/U</span>
                      <span>Liv/Red : {p.livRed >= 0 ? '+' : ''}{p.livRed} F</span>
                      <span>Qté : {p.quantite}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <span className="panier-item-total">{p.total.toLocaleString('fr-FR')} F</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="panier-footer">
              <div className="panier-totaux">
                <div className="panier-totaux-row total">
                  <span>TOTAL</span>
                  <span>{totalPanier.toLocaleString('fr-FR')} F</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
                <button
                  className="btn btn-warning"
                  style={{ flex: 1 }}
                  onClick={() => enregistrerVente('panier_attente')}
                  disabled={enregistrement || !client || panier.length === 0}
                >
                  📌 Attente
                </button>
                <button
                  className="btn btn-success"
                  style={{ flex: 2 }}
                  onClick={() => enregistrerVente('a_valider')}
                  disabled={enregistrement || !client || panier.length === 0}
                >
                  {enregistrement ? 'Enregistrement…' : '✅ Valider →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
