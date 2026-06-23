import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StockTicketModal from '../components/StockTicketModal'

export default function Stock() {
  const { boutiqueActive, isAdmin, user } = useAuth()
  const [onglet, setOnglet] = useState('gaz')
  const [articlesGaz, setArticlesGaz] = useState([])
  const [articlesAcc, setArticlesAcc] = useState([])
  const [stockVides, setStockVides] = useState([])
  const [chargement, setChargement] = useState(true)
  const [showNouvelArticle, setShowNouvelArticle] = useState(false)
  const [showTicket, setShowTicket] = useState(false)
  const [etatCaisse, setEtatCaisse] = useState(0)
  const [fondCaisse, setFondCaisse] = useState(0)

  const charger = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)

    const { data: stockData } = await supabase
      .from('stock')
      .select('*, articles(*)')
      .eq('boutique_id', boutiqueActive.id)

    const gaz = (stockData || []).filter((s) => s.articles?.classe === 'gaz')
    const acc = (stockData || []).filter((s) => s.articles?.classe === 'accessoire')
    setArticlesGaz(gaz)
    setArticlesAcc(acc)

    const { data: vides } = await supabase
      .from('stock_vides')
      .select('*')
      .eq('boutique_id', boutiqueActive.id)
    setStockVides(vides || [])

    // Calcul rapide de l'état de caisse du jour (même logique que le tableau de bord)
    const jour = new Date().toISOString().slice(0, 10)
    const { data: fond } = await supabase
      .from('fonds_caisse')
      .select('montant')
      .eq('boutique_id', boutiqueActive.id)
      .eq('date_jour', jour)
      .maybeSingle()
    const montantFond = fond ? Number(fond.montant) : Number(boutiqueActive.fond_caisse_defaut || 0)
    setFondCaisse(montantFond)

    const { data: depenses } = await supabase
      .from('depenses')
      .select('montant')
      .eq('boutique_id', boutiqueActive.id)
      .eq('date_depense', jour)
    const totalDepenses = (depenses || []).reduce((s, d) => s + Number(d.montant), 0)

    const { data: achats } = await supabase
      .from('achats')
      .select('total')
      .eq('boutique_id', boutiqueActive.id)
      .gte('created_at', jour)
    const totalAchats = (achats || []).reduce((s, a) => s + Number(a.total), 0)

    const { data: ventesJour } = await supabase
      .from('ventes')
      .select('total')
      .eq('boutique_id', boutiqueActive.id)
      .gte('valide_at', jour)
      .in('statut', ['validee', 'en_livraison'])
    const totalVentes = (ventesJour || []).reduce((s, v) => s + Number(v.total), 0)

    setEtatCaisse(montantFond + totalVentes - totalAchats - totalDepenses)

    setChargement(false)
  }, [boutiqueActive])

  useEffect(() => {
    charger()
  }, [charger])

  const videsCritiques = stockVides.filter((v) => v.quantite < v.seuil_alerte)
  const articlesAccCritiques = articlesAcc.filter((s) => s.quantite < (s.articles?.seuil_alerte || 0))

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Stock</div>
          <div className="topbar-sub">Inventaire en temps réel · {boutiqueActive?.nom}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowTicket(true)}>🧾 Imprimer l'inventaire</button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowNouvelArticle(true)}>+ Nouvel article</button>
          )}
        </div>
      </div>

      <div className="content">
        {(videsCritiques.length > 0 || articlesAccCritiques.length > 0) && (
          <div className="alert alert-warning">
            ⚠️ <div>
              <strong>Stock critique :</strong>{' '}
              {videsCritiques.map((v) => `Bouteilles ${v.categorie} vides (${v.quantite})`).join(', ')}
              {videsCritiques.length > 0 && articlesAccCritiques.length > 0 && ' · '}
              {articlesAccCritiques.map((s) => `${s.articles.designation} (${s.quantite})`).join(', ')}
              {' '}— pensez à réapprovisionner.
            </div>
          </div>
        )}

        <div className="tabs">
          <button className={'tab-btn' + (onglet === 'gaz' ? ' active' : '')} onClick={() => setOnglet('gaz')}>Gaz (Bouteilles)</button>
          <button className={'tab-btn' + (onglet === 'acc' ? ' active' : '')} onClick={() => setOnglet('acc')}>Accessoires</button>
        </div>

        {chargement ? (
          <p className="td-light">Chargement du stock…</p>
        ) : onglet === 'gaz' ? (
          <>
            <div className="section-title">📦 Bouteilles vides disponibles pour rechargement</div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Catégorie</th><th>Bouteilles vides en stock</th><th>Seuil alerte</th><th>Niveau</th></tr></thead>
                  <tbody>
                    {stockVides.map((v) => {
                      const pct = Math.min(100, Math.round((v.quantite / Math.max(v.seuil_alerte * 2, 1)) * 100))
                      const niveau = v.quantite < v.seuil_alerte ? 'red' : pct < 60 ? 'orange' : 'green'
                      return (
                        <tr key={v.id}>
                          <td><span className={'tag-' + v.categorie.toLowerCase()}>{v.categorie} — {v.categorie === 'B6' ? '6kg' : '12kg'}</span></td>
                          <td className="td-bold" style={{ color: `var(--${niveau === 'red' ? 'danger' : niveau === 'orange' ? 'primary' : 'success'})` }}>
                            {v.quantite} bouteilles vides
                          </td>
                          <td className="td-light">{v.seuil_alerte}</td>
                          <td>
                            <div className="stock-bar-wrap">
                              <div className="stock-bar-bg"><div className={'stock-bar-fill fill-' + niveau} style={{ width: pct + '%' }}></div></div>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{v.quantite}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="alert alert-info">
              ℹ️ <div>Chaque recharge vendue (B6 ou B12) génère automatiquement <strong>+1 bouteille vide</strong> dans le stock correspondant. Lors d'un achat fournisseur, les bouteilles vides sont envoyées en échange de recharges pleines.</div>
            </div>

            <div className="section-title" style={{ marginTop: 20 }}>🔥 Recharges pleines disponibles à la vente (par compagnie)</div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Compagnie</th><th>Catégorie</th><th>Prix achat</th><th>Prix vente</th><th>Stock pleines</th><th>Seuil</th><th>Niveau</th></tr></thead>
                  <tbody>
                    {articlesGaz.map((s) => {
                      const seuil = s.articles?.seuil_alerte || 10
                      const pct = Math.min(100, Math.round((s.quantite / Math.max(seuil * 2, 1)) * 100))
                      const niveau = s.quantite < seuil ? 'red' : pct < 60 ? 'orange' : 'green'
                      return (
                        <tr key={s.id}>
                          <td className="td-light">{s.articles?.code}</td>
                          <td className="td-bold">{s.articles?.designation}</td>
                          <td><span className={'tag-' + (s.articles?.categorie || '').toLowerCase()}>{s.articles?.categorie}</span></td>
                          <td>{Number(s.articles?.prix_achat).toLocaleString('fr-FR')} F</td>
                          <td>{Number(s.articles?.prix_vente).toLocaleString('fr-FR')} F</td>
                          <td className="td-bold" style={{ color: `var(--${niveau === 'red' ? 'danger' : niveau === 'orange' ? 'primary' : 'success'})` }}>{s.quantite}</td>
                          <td className="td-light">{seuil}</td>
                          <td>
                            <div className="stock-bar-wrap">
                              <div className="stock-bar-bg"><div className={'stock-bar-fill fill-' + niveau} style={{ width: pct + '%' }}></div></div>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{s.quantite}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Désignation</th><th>Prix achat</th><th>Prix vente</th><th>Stock</th><th>Seuil</th><th>Niveau</th></tr></thead>
                <tbody>
                  {articlesAcc.map((s) => {
                    const seuil = s.articles?.seuil_alerte || 10
                    const pct = Math.min(100, Math.round((s.quantite / Math.max(seuil * 2, 1)) * 100))
                    const niveau = s.quantite < seuil ? 'red' : pct < 60 ? 'orange' : 'green'
                    return (
                      <tr key={s.id}>
                        <td className="td-light">{s.articles?.code}</td>
                        <td className="td-bold">{s.articles?.designation}</td>
                        <td>{Number(s.articles?.prix_achat).toLocaleString('fr-FR')} F</td>
                        <td>{Number(s.articles?.prix_vente).toLocaleString('fr-FR')} F</td>
                        <td className="td-bold" style={{ color: `var(--${niveau === 'red' ? 'danger' : niveau === 'orange' ? 'primary' : 'success'})` }}>{s.quantite}</td>
                        <td className="td-light">{seuil}</td>
                        <td>
                          <div className="stock-bar-wrap">
                            <div className="stock-bar-bg"><div className={'stock-bar-fill fill-' + niveau} style={{ width: pct + '%' }}></div></div>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{s.quantite}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNouvelArticle && (
        <NouvelArticleModal
          boutique={boutiqueActive}
          onClose={() => setShowNouvelArticle(false)}
          onCree={() => { setShowNouvelArticle(false); charger() }}
        />
      )}

      {showTicket && (
        <StockTicketModal
          articlesGaz={articlesGaz}
          articlesAcc={articlesAcc}
          stockVides={stockVides}
          boutique={boutiqueActive}
          etatCaisse={etatCaisse}
          fondCaisse={fondCaisse}
          caissierNom={user?.nom || '—'}
          onClose={() => setShowTicket(false)}
        />
      )}
    </>
  )
}

function NouvelArticleModal({ boutique, onClose, onCree }) {
  const [designation, setDesignation] = useState('')
  const [classe, setClasse] = useState('gaz')
  const [categorie, setCategorie] = useState('B6')
  const [stockInitial, setStockInitial] = useState('0')
  const [seuilAlerte, setSeuilAlerte] = useState('10')
  const [prixAchat, setPrixAchat] = useState('')
  const [prixVente, setPrixVente] = useState('')
  const [prochainCode, setProchainCode] = useState('…')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    async function calculerCode() {
      const { count } = await supabase.from('articles').select('id', { count: 'exact', head: true })
      setProchainCode('ART-' + String((count || 0) + 1).padStart(3, '0'))
    }
    calculerCode()
  }, [])

  async function enregistrer() {
    if (!designation.trim()) {
      alert('Indiquez une désignation pour l\'article.')
      return
    }
    setEnCours(true)

    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        code: prochainCode,
        designation,
        classe,
        categorie: classe === 'gaz' ? categorie : null,
        prix_achat: parseFloat(prixAchat) || 0,
        prix_vente: parseFloat(prixVente) || 0,
        seuil_alerte: parseInt(seuilAlerte) || 10,
      })
      .select()
      .single()

    if (!error && article) {
      // Crée la ligne de stock pour la boutique active avec le stock initial fourni
      await supabase.from('stock').insert({
        boutique_id: boutique.id,
        article_id: article.id,
        quantite: parseInt(stockInitial) || 0,
      })
      onCree()
    } else {
      alert('Erreur lors de la création de l\'article.')
    }
    setEnCours(false)
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">📦 Nouvel article</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">ID Article (auto)</label>
            <input className="form-input ro" value={prochainCode} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">Désignation</label>
            <input className="form-input" placeholder="Ex : Simam, Détendeur haute pression…" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Classe</label>
            <select className="form-input form-select" value={classe} onChange={(e) => setClasse(e.target.value)}>
              <option value="gaz">GAZ</option>
              <option value="accessoire">Accessoires</option>
            </select>
          </div>
          <div className="form-group" style={{ opacity: classe === 'gaz' ? 1 : 0.4 }}>
            <label className="form-label">Catégorie (GAZ uniquement)</label>
            <select className="form-input form-select" value={categorie} onChange={(e) => setCategorie(e.target.value)} disabled={classe !== 'gaz'}>
              <option value="B6">B6 — 6kg</option>
              <option value="B12">B12 — 12kg</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Stock initial</label>
            <input className="form-input" type="number" value={stockInitial} onChange={(e) => setStockInitial(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Seuil alerte</label>
            <input className="form-input" type="number" value={seuilAlerte} onChange={(e) => setSeuilAlerte(e.target.value)} />
            <span className="form-hint">Alerte si stock &lt; seuil</span>
          </div>
          <div className="form-group">
            <label className="form-label">Prix d'achat (F CFA)</label>
            <input className="form-input" type="number" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Prix de vente (F CFA)</label>
            <input className="form-input" type="number" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} />
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
