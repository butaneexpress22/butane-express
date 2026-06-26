import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PanierModal from '../components/PanierModal'
import TicketModal from '../components/TicketModal'

export default function Ventes() {
  const { boutiqueActive } = useAuth()
  const [ventes, setVentes] = useState([])
  const [livreurs, setLivreurs] = useState([])
  const [filtre, setFiltre] = useState('attente_livraison')
  const [filtreQuartier, setFiltreQuartier] = useState('')
  const [filtreLivreur, setFiltreLivreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [showPanier, setShowPanier] = useState(false)
  const [venteAEncaisser, setVenteAEncaisser] = useState(null)
  const [venteImprimer, setVenteImprimer] = useState(null)

  const chargerVentes = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)
    const { data, error } = await supabase
      .from('ventes')
      .select(`
        *,
        clients(numero_client, nom, contact, quartier, conso_totale, fidelite_compteur),
        livreurs(nom),
        ventes_lignes(*, articles(designation, classe, categorie, id))
      `)
      .eq('boutique_id', boutiqueActive.id)
      .order('created_at', { ascending: false })
      .limit(150)

    if (!error) setVentes(data || [])
    setChargement(false)
  }, [boutiqueActive])

  const chargerLivreurs = useCallback(async () => {
    if (!boutiqueActive) return
    const { data } = await supabase.from('livreurs').select('*').eq('boutique_id', boutiqueActive.id).eq('actif', true)
    setLivreurs(data || [])
  }, [boutiqueActive])

  useEffect(() => {
    chargerVentes()
    chargerLivreurs()
  }, [chargerVentes, chargerLivreurs])

  // ── 4 rubriques ──
  const ventesAttenteLivraison = ventes.filter((v) => v.statut === 'attente_livraison')
  const ventesEnLivraison = ventes.filter((v) => v.statut === 'en_livraison')
  const ventesValidees = ventes.filter((v) => v.statut === 'validee')
  const ventesAVeniralider = ventes.filter((v) => v.statut === 'a_valider' || v.statut === 'panier_attente')

  const ventesFiltrees = ventes.filter((v) => {
    let passeStatut
    if (filtre === 'all') passeStatut = true
    else if (filtre === 'attente_livraison') passeStatut = v.statut === 'attente_livraison'
    else if (filtre === 'en_livraison') passeStatut = v.statut === 'en_livraison'
    else if (filtre === 'validee') passeStatut = v.statut === 'validee'
    else if (filtre === 'a_traiter') passeStatut = v.statut === 'a_valider' || v.statut === 'panier_attente'
    else passeStatut = true

    if (!passeStatut) return false

    // Filtre quartier (disponible sur "attente_livraison" et "validee")
    if (filtreQuartier && (filtre === 'attente_livraison' || filtre === 'validee')) {
      if (v.clients?.quartier !== filtreQuartier) return false
    }

    // Filtre livreur (disponible sur "en_livraison" et "validee")
    if (filtreLivreur && (filtre === 'en_livraison' || filtre === 'validee')) {
      if (v.livreur_id !== filtreLivreur) return false
    }

    return true
  })

  // Quartiers et livreurs disponibles pour les listes déroulantes de filtre
  const quartiersDisponibles = [...new Set(ventes.map((v) => v.clients?.quartier).filter(Boolean))]

  function changerRubrique(nouvelleRubrique) {
    setFiltre(nouvelleRubrique)
    setFiltreQuartier('')
    setFiltreLivreur('')
  }

  const caJour = ventesValidees
    .filter((v) => v.valide_at && new Date(v.valide_at).toDateString() === new Date().toDateString())
    .reduce((s, v) => s + Number(v.total), 0)

  async function annulerVente(vente) {
    if (!confirm(`Confirmer l'annulation de la vente #${vente.numero_recu_complet} ?`)) return
    const { error } = await supabase.from('ventes').update({ statut: 'annulee' }).eq('id', vente.id)
    if (!error) chargerVentes()
  }

  async function assignerLivreurEtAction(vente, livreurId, action) {
    const updates = { livreur_id: livreurId || null }

    if (action === 'en_livraison') {
      updates.statut = 'en_livraison'
    } else if (action === 'validee') {
      updates.statut = 'validee'
      if (!vente.valide_at) updates.valide_at = new Date().toISOString()
    } else if (action === 'annulee') {
      updates.statut = 'annulee'
    }

    const { data, error } = await supabase
      .from('ventes')
      .update(updates)
      .eq('id', vente.id)
      .select(`*, clients(numero_client, nom, contact, quartier, conso_totale, fidelite_compteur), ventes_lignes(*, articles(designation, classe, categorie, id))`)
      .single()

    if (!error && data) {
      // Si la commande vient d'être validée (et ne l'était pas avant), on applique les effets stock/fidélité
      if (action === 'validee' && vente.statut !== 'validee') {
        await appliquerEffetsVente(data, data.clients)
      }
      chargerVentes()
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Ventes</div>
          <div className="topbar-sub">
            Gestion des ventes · {boutiqueActive?.nom} · {new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPanier(true)}>
          + Nouvelle vente
        </button>
      </div>

      <div className="content">
        <div className="kpi-grid kpi-4" style={{ marginBottom: 16 }}>
          <Kpi icon="🟡" valeur={ventesAttenteLivraison.length} label="En attente de livraison" />
          <Kpi icon="🏍️" valeur={ventesEnLivraison.length} label="Livraison en cours" />
          <Kpi icon="✅" valeur={ventesValidees.length} label="Validées au total" />
          <Kpi icon="💰" valeur={`${caJour.toLocaleString('fr-FR')} F`} label="CA validé aujourd'hui" />
        </div>

        {ventesAVeniralider.length > 0 && (
          <div className="alert alert-warning">
            ⏳ <div>
              <strong>{ventesAVeniralider.length} commande{ventesAVeniralider.length > 1 ? 's' : ''}</strong> en attente de décision (encaissement non finalisé).
              <button className="btn btn-warning btn-xs" style={{ marginLeft: 10 }} onClick={() => changerRubrique('a_traiter')}>Voir</button>
            </div>
          </div>
        )}

        <div className="tabs">
          <TabBtn actif={filtre === 'all'} onClick={() => changerRubrique('all')}>Toutes ({ventes.length})</TabBtn>
          <TabBtn actif={filtre === 'attente_livraison'} onClick={() => changerRubrique('attente_livraison')}>
            ⏳ En attente de livraison ({ventesAttenteLivraison.length})
          </TabBtn>
          <TabBtn actif={filtre === 'en_livraison'} onClick={() => changerRubrique('en_livraison')}>
            🏍️ Livraison en cours ({ventesEnLivraison.length})
          </TabBtn>
          <TabBtn actif={filtre === 'validee'} onClick={() => changerRubrique('validee')}>
            ✅ Validées ({ventesValidees.length})
          </TabBtn>
        </div>

        {(filtre === 'attente_livraison' || filtre === 'en_livraison' || filtre === 'validee') && (
          <div className="filters-row">
            {(filtre === 'attente_livraison' || filtre === 'validee') && (
              <select className="f-select" value={filtreQuartier} onChange={(e) => setFiltreQuartier(e.target.value)}>
                <option value="">Tous les quartiers</option>
                {quartiersDisponibles.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            )}
            {(filtre === 'en_livraison' || filtre === 'validee') && (
              <select className="f-select" value={filtreLivreur} onChange={(e) => setFiltreLivreur(e.target.value)}>
                <option value="">Tous les livreurs</option>
                {livreurs.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            )}
          </div>
        )}

        {chargement ? (
          <p className="td-light">Chargement des ventes…</p>
        ) : ventesFiltrees.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">🛒</div>
              <div className="empty-title">Aucune vente ici</div>
              <div className="empty-sub">Les ventes apparaîtront dans cette liste dès qu'elles seront enregistrées.</div>
            </div>
          </div>
        ) : (
          ventesFiltrees.map((vente) => (
            <VenteCard
              key={vente.id}
              vente={vente}
              livreurs={livreurs}
              onAnnuler={() => annulerVente(vente)}
              onAssignerEtAction={(livreurId, action) => assignerLivreurEtAction(vente, livreurId, action)}
              onTraiterEncaissement={() => setVenteAEncaisser(vente)}
              onImprimer={() => setVenteImprimer(vente)}
            />
          ))
        )}
      </div>

      {showPanier && (
        <PanierModal
          onClose={() => setShowPanier(false)}
          onVenteCreee={(vente) => {
            setShowPanier(false)
            chargerVentes()
            if (vente.statut === 'a_valider') setVenteAEncaisser(vente)
          }}
        />
      )}

      {venteAEncaisser && (
        <EncaissementModal
          vente={venteAEncaisser}
          onClose={() => setVenteAEncaisser(null)}
          onValide={(venteMaj) => {
            setVenteAEncaisser(null)
            chargerVentes()
            setVenteImprimer(venteMaj)
          }}
        />
      )}

      {venteImprimer && (
        <TicketModal vente={venteImprimer} boutique={boutiqueActive} onClose={() => setVenteImprimer(null)} />
      )}
    </>
  )
}

function Kpi({ icon, valeur, label }) {
  return (
    <div className="kpi-card">
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div className="kpi-value">{valeur}</div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}

function TabBtn({ actif, onClick, children }) {
  return (
    <button className={'tab-btn' + (actif ? ' active' : '')} onClick={onClick}>
      {children}
    </button>
  )
}

function VenteCard({ vente, livreurs, onAnnuler, onAssignerEtAction, onTraiterEncaissement, onImprimer }) {
  const client = vente.clients
  const [livreurChoisi, setLivreurChoisi] = useState(vente.livreur_id || '')
  const [action, setAction] = useState('')

  const aTraiterEncaissement = vente.statut === 'a_valider' || vente.statut === 'panier_attente'

  const statutBadge = {
    a_valider: { cls: 'badge-warning', label: '⏳ Encaissement en attente' },
    panier_attente: { cls: 'badge-info', label: '📌 Panier en attente' },
    attente_livraison: { cls: 'badge-warning', label: '⏳ En attente de livraison' },
    en_livraison: { cls: 'badge-info', label: '🏍️ En livraison' },
    validee: { cls: 'badge-success', label: '✅ Validée' },
    annulee: { cls: 'badge-neutral', label: 'Annulée' },
  }[vente.statut] || { cls: 'badge-neutral', label: vente.statut }

  function appliquer() {
    if (!action) return
    onAssignerEtAction(livreurChoisi, action)
  }

  return (
    <div className="vente-card" style={{ opacity: vente.statut === 'annulee' ? 0.5 : 1 }}>
      <div className="vente-card-header">
        <div>
          <span className="vente-num">#{vente.numero_recu_complet}</span>
          <span className={'badge ' + statutBadge.cls} style={{ marginLeft: 8 }}>{statutBadge.label}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="vente-total">{Number(vente.total).toLocaleString('fr-FR')} F</span>
          <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
            {new Date(vente.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      <div className="vente-card-body">
        <div>
          <span className="vente-meta">Client : </span>
          <span className="vente-client">{client?.nom || 'Client sans nom'}</span>
          <span className="vente-meta"> · CLT-{client?.numero_client} · {client?.contact || '—'} · {client?.quartier || '—'}</span>
          {vente.numero_a_contacter && (
            <span className="vente-meta"> · 📞 À contacter : <strong>{vente.numero_a_contacter}</strong></span>
          )}
        </div>
        {vente.ventes_lignes?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <table style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left' }}>Article</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left' }}>Catég.</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right' }}>Prix/U</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right' }}>Liv/Red</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center' }}>Qté</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {vente.ventes_lignes.map((l) => (
                  <tr key={l.id}>
                    <td style={{ padding: '5px 8px' }}>{l.articles?.designation}</td>
                    <td style={{ padding: '5px 8px' }}>
                      {l.articles?.categorie && <span className={'tag-' + l.articles.categorie.toLowerCase()}>{l.articles.categorie}</span>}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{Number(l.prix_unitaire).toLocaleString('fr-FR')} F</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: l.liv_red >= 0 ? 'var(--primary)' : 'var(--success)' }}>
                      {l.liv_red >= 0 ? '+' : ''}{l.liv_red} F
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>{l.quantite}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>
                      {Number(l.total_ligne).toLocaleString('fr-FR')} F
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {vente.somme_recue != null && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            Somme reçue : <strong>{Number(vente.somme_recue).toLocaleString('fr-FR')} F</strong> · Monnaie : <strong>{Number(vente.monnaie).toLocaleString('fr-FR')} F</strong>
          </div>
        )}
      </div>
      <div className="vente-card-footer">
        {aTraiterEncaissement && (
          <>
            <button className="btn btn-danger btn-sm" onClick={onAnnuler}>❌ Annuler</button>
            <button className="btn btn-success btn-sm ml-auto" onClick={onTraiterEncaissement}>💵 Encaisser →</button>
          </>
        )}

        {vente.statut === 'attente_livraison' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <select className="f-select" style={{ fontSize: 12, padding: '5px 8px' }} value={livreurChoisi} onChange={(e) => setLivreurChoisi(e.target.value)}>
              <option value="">Assigner un livreur…</option>
              {livreurs.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
            <select className="f-select" style={{ fontSize: 12, padding: '5px 8px' }} value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Choisir une action…</option>
              <option value="en_livraison">🏍️ Livraison en cours</option>
              <option value="validee">✅ Validée</option>
              <option value="annulee">❌ Annuler</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={appliquer} disabled={!action}>Appliquer</button>
            <button className="btn btn-outline btn-sm ml-auto" onClick={onImprimer}>🧾 Reçu</button>
          </div>
        )}

        {vente.statut === 'en_livraison' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Livreur : <strong>{vente.livreurs?.nom || 'Non assigné'}</strong>
            </span>
            <select className="f-select" style={{ fontSize: 12, padding: '5px 8px', marginLeft: 8 }} value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Choisir une action…</option>
              <option value="validee">✅ Validée</option>
              <option value="annulee">❌ Annuler</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => onAssignerEtAction(vente.livreur_id, action)} disabled={!action}>Appliquer</button>
            <button className="btn btn-outline btn-sm ml-auto" onClick={onImprimer}>🧾 Reçu</button>
          </div>
        )}

        {vente.statut === 'validee' && (
          <button className="btn btn-outline btn-sm ml-auto" onClick={onImprimer}>🧾 Reçu</button>
        )}
      </div>
    </div>
  )
}

// ── Modal d'encaissement : Somme reçue + choix Boutique/Domicile ──
function EncaissementModal({ vente, onClose, onValide }) {
  const [sommeRecue, setSommeRecue] = useState('')
  const [modeLivraison, setModeLivraison] = useState('boutique')
  const [numeroAContacter, setNumeroAContacter] = useState(vente.clients?.contact || '')
  const [enCours, setEnCours] = useState(false)
  const total = Number(vente.total)
  const recue = parseFloat(sommeRecue) || 0
  const monnaie = recue - total
  const client = vente.clients

  async function valider() {
    if (recue < total) {
      alert('La somme reçue est inférieure au total. Vérifiez le montant.')
      return
    }
    setEnCours(true)

    const nouveauStatut = modeLivraison === 'boutique' ? 'validee' : 'attente_livraison'

    const { data, error } = await supabase
      .from('ventes')
      .update({
        statut: nouveauStatut,
        somme_recue: recue,
        monnaie: monnaie,
        mode_livraison: modeLivraison,
        numero_a_contacter: numeroAContacter || null,
        valide_at: nouveauStatut === 'validee' ? new Date().toISOString() : null,
      })
      .eq('id', vente.id)
      .select(`*, clients(numero_client, nom, contact, quartier, conso_totale, fidelite_compteur), livreurs(nom), ventes_lignes(*, articles(designation, classe, categorie, id))`)
      .single()

    if (error || !data) {
      setEnCours(false)
      alert("Erreur lors de l'encaissement.")
      return
    }

    // Si vente directement validée (boutique) : on applique les effets stock/fidélité tout de suite
    if (nouveauStatut === 'validee') {
      await appliquerEffetsVente(data, client)
    }

    setEnCours(false)
    onValide(data)
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-header">
          <div className="modal-title">💵 Encaissement</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>Client :</span>
            <strong>{client?.nom} · CLT-{client?.numero_client}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <span>TOTAL :</span>
            <span style={{ color: 'var(--primary)' }}>{total.toLocaleString('fr-FR')} F</span>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" style={{ fontSize: 13 }}>📍 Mode</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={'btn ' + (modeLivraison === 'boutique' ? 'btn-primary' : 'btn-outline')}
              style={{ flex: 1 }}
              onClick={() => setModeLivraison('boutique')}
            >
              🏪 Achat en boutique
            </button>
            <button
              className={'btn ' + (modeLivraison === 'domicile' ? 'btn-primary' : 'btn-outline')}
              style={{ flex: 1 }}
              onClick={() => setModeLivraison('domicile')}
            >
              🏍️ Livraison domicile
            </button>
          </div>
        </div>

        {modeLivraison === 'domicile' && (
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ fontSize: 13 }}>📞 Numéro à contacter pour la livraison</label>
            <input
              className="form-input"
              placeholder="Numéro du client ou d'une autre personne à contacter"
              value={numeroAContacter}
              onChange={(e) => setNumeroAContacter(e.target.value)}
            />
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" style={{ fontSize: 13 }}>💵 Somme reçue du client (F CFA)</label>
          <input
            className="form-input"
            type="number"
            value={sommeRecue}
            onChange={(e) => setSommeRecue(e.target.value)}
            style={{ fontSize: 22, fontWeight: 700, padding: 14, textAlign: 'center' }}
            autoFocus
          />
        </div>

        <div
          style={{
            background: monnaie < 0 ? 'var(--danger-light)' : 'var(--success-light)',
            borderRadius: 8,
            padding: 14,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 12, color: monnaie < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600, textTransform: 'uppercase' }}>
            Monnaie à rendre
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Space Grotesk', color: monnaie < 0 ? 'var(--danger)' : 'var(--success)' }}>
            {sommeRecue === '' ? '—' : monnaie < 0 ? 'Insuffisant' : `${monnaie.toLocaleString('fr-FR')} F`}
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12, textAlign: 'center' }}>
          {modeLivraison === 'boutique'
            ? 'Le reçu sera imprimé et la vente directement validée.'
            : 'La commande passera en "En attente de livraison" pour assignation d\'un livreur.'}
        </p>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={valider} disabled={enCours || recue < total}>
            {enCours ? 'Validation…' : '🖨 Confirmer →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Effets automatiques : stock, bouteilles vides, fidélité ──
async function appliquerEffetsVente(venteValidee, client) {
  const lignes = venteValidee.ventes_lignes || []
  let nbRecharges = 0

  for (const ligne of lignes) {
    const art = ligne.articles
    if (!art) continue

    const { data: stockRow } = await supabase
      .from('stock')
      .select('*')
      .eq('boutique_id', venteValidee.boutique_id)
      .eq('article_id', art.id)
      .maybeSingle()

    if (stockRow) {
      await supabase
        .from('stock')
        .update({ quantite: Math.max(0, stockRow.quantite - ligne.quantite) })
        .eq('id', stockRow.id)
    }

    if (art.classe === 'gaz' && art.categorie) {
      nbRecharges += ligne.quantite
      const { data: vides } = await supabase
        .from('stock_vides')
        .select('*')
        .eq('boutique_id', venteValidee.boutique_id)
        .eq('categorie', art.categorie)
        .maybeSingle()

      if (vides) {
        await supabase
          .from('stock_vides')
          .update({ quantite: vides.quantite + ligne.quantite })
          .eq('id', vides.id)
      }
    }
  }

  if (nbRecharges > 0 && client) {
    let nouveauCompteur = client.fidelite_compteur + nbRecharges
    let recompenseAttribuee = false

    if (nouveauCompteur >= 10) {
      recompenseAttribuee = true
      nouveauCompteur = nouveauCompteur % 10
    }

    await supabase
      .from('clients')
      .update({
        conso_totale: client.conso_totale + nbRecharges,
        fidelite_compteur: nouveauCompteur,
        statut: 'actif',
        derniere_commande_at: new Date().toISOString(),
      })
      .eq('id', client.id)

    if (recompenseAttribuee) {
      const { data: boutiqueInfo } = await supabase
        .from('boutiques')
        .select('fidelite_valeur')
        .eq('id', venteValidee.boutique_id)
        .single()

      await supabase.from('fidelite_recompenses').insert({
        client_id: client.id,
        boutique_id: venteValidee.boutique_id,
        valeur: boutiqueInfo?.fidelite_valeur || 700,
        vente_id: venteValidee.id,
      })
    }
  } else if (client) {
    await supabase
      .from('clients')
      .update({ statut: 'actif', derniere_commande_at: new Date().toISOString() })
      .eq('id', client.id)
  }
}
