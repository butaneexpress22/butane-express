import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useQuartiers } from '../hooks/useQuartiers'
import { useLivreurs } from '../hooks/useLivreurs'
import { useCategoriesDepenses } from '../hooks/useCategoriesDepenses'
import ListeConfigurable from '../components/ListeConfigurable'
import AjustementStockVidesCard from '../components/AjustementStockVidesCard'

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

  const { quartiers, rafraichir: rafraichirQuartiers } = useQuartiers(boutiqueActive?.id)
  const { livreurs, rafraichir: rafraichirLivreurs } = useLivreurs(boutiqueActive?.id)
  const { categories, rafraichir: rafraichirCategories } = useCategoriesDepenses()

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

  // ── Quartiers ──
  async function ajouterQuartier({ nom }) {
    const { error } = await supabase.from('quartiers').insert({ boutique_id: boutiqueActive.id, nom })
    if (!error) rafraichirQuartiers()
    return { success: !error }
  }
  async function supprimerQuartier(item) {
    const { error } = await supabase.from('quartiers').delete().eq('id', item.id)
    if (!error) rafraichirQuartiers()
  }

  // ── Livreurs ──
  async function ajouterLivreur({ nom, contact }) {
    const { error } = await supabase.from('livreurs').insert({ boutique_id: boutiqueActive.id, nom, contact: contact || null })
    if (!error) rafraichirLivreurs()
    return { success: !error }
  }
  async function supprimerLivreur(item) {
    // Suppression douce : on garde l'historique des ventes qui référencent ce livreur
    const { error } = await supabase.from('livreurs').update({ supprime: true, actif: false }).eq('id', item.id)
    if (!error) rafraichirLivreurs()
  }

  // ── Catégories de dépenses ──
  async function ajouterCategorie({ nom }) {
    const { error } = await supabase.from('categories_depenses').insert({ nom })
    if (!error) rafraichirCategories()
    return { success: !error, message: error?.code === '23505' ? 'Cette catégorie existe déjà.' : undefined }
  }
  async function supprimerCategorie(item) {
    const { error } = await supabase.from('categories_depenses').update({ actif: false }).eq('id', item.id)
    if (!error) rafraichirCategories()
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
                <span className="form-hint">Montant proposé chaque matin si non encore défini (demandé une seule fois par jour au caissier)</span>
              </div>
              {message && (
                <p style={{ fontSize: 13, color: message.includes('Erreur') ? 'var(--danger)' : 'var(--success)' }}>{message}</p>
              )}
              <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
                {enCours ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ListeConfigurable
              titre="📍 Quartiers"
              description="Utilisés à la création d'un client et dans les filtres de ventes/clients."
              items={quartiers}
              placeholder="Nom du nouveau quartier"
              onAjouter={ajouterQuartier}
              onSupprimer={supprimerQuartier}
            />

            <ListeConfigurable
              titre="🏍️ Livreurs"
              description="Utilisés pour assigner les livraisons et analyser leurs performances."
              items={livreurs}
              placeholder="Nom du livreur"
              onAjouter={ajouterLivreur}
              onSupprimer={supprimerLivreur}
              champsSupplementaires={(valeurs, setValeurs) => (
                <input
                  className="form-input"
                  placeholder="Contact (optionnel)"
                  value={valeurs.contact || ''}
                  onChange={(e) => setValeurs({ ...valeurs, contact: e.target.value })}
                  style={{ flex: 1, minWidth: 120 }}
                />
              )}
              rendreLigne={(item) => (
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {item.nom} {item.contact && <span className="td-light">· {item.contact}</span>}
                </span>
              )}
            />

            <ListeConfigurable
              titre="💸 Catégories de dépenses"
              description="Utilisées pour catégoriser et analyser vos dépenses."
              items={categories}
              placeholder="Nom de la catégorie"
              onAjouter={ajouterCategorie}
              onSupprimer={supprimerCategorie}
            />

            <AjustementStockVidesCard />

            <div className="card" style={{ marginBottom: 0 }}>
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
      </div>
    </>
  )
}
