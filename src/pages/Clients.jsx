import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const QUARTIERS = ['Centre', 'Marché', 'Résidentiel', 'Périphérie', 'Abbeykro']

export default function Clients() {
  const { boutiqueActive } = useAuth()
  const [clients, setClients] = useState([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [filtreQuartier, setFiltreQuartier] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [showNouveauClient, setShowNouveauClient] = useState(false)
  const [clientDetail, setClientDetail] = useState(null)
  const [page, setPage] = useState(1)
  const parPage = 20

  const chargerClients = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('boutique_id', boutiqueActive.id)
      .order('created_at', { ascending: false })

    if (!error) setClients(data || [])
    setChargement(false)
  }, [boutiqueActive])

  useEffect(() => {
    chargerClients()
  }, [chargerClients])

  const clientsFiltres = clients.filter((c) => {
    if (filtreQuartier && c.quartier !== filtreQuartier) return false
    if (filtreStatut && c.statut !== filtreStatut) return false
    if (recherche) {
      const r = recherche.toLowerCase()
      return (
        c.numero_client.toLowerCase().includes(r) ||
        (c.nom || '').toLowerCase().includes(r) ||
        (c.contact || '').includes(r)
      )
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(clientsFiltres.length / parPage))
  const clientsPage = clientsFiltres.slice((page - 1) * parPage, page * parPage)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Clients</div>
          <div className="topbar-sub">{clients.length} contacts enregistrés · {boutiqueActive?.nom}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNouveauClient(true)}>
          + Nouveau client
        </button>
      </div>

      <div className="content">
        <div className="filters-row">
          <div className="search-box" style={{ minWidth: 240 }}>
            🔍
            <input
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 13 }}
              placeholder="Nom, numéro, contact…"
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); setPage(1) }}
            />
          </div>
          <select className="f-select" value={filtreQuartier} onChange={(e) => { setFiltreQuartier(e.target.value); setPage(1) }}>
            <option value="">Tous les quartiers</option>
            {QUARTIERS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <select className="f-select" value={filtreStatut} onChange={(e) => { setFiltreStatut(e.target.value); setPage(1) }}>
            <option value="">Tous</option>
            <option value="actif">Actifs</option>
            <option value="prospect">Prospects</option>
          </select>
        </div>

        <div className="card">
          {chargement ? (
            <p className="td-light">Chargement des clients…</p>
          ) : clientsFiltres.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-title">Aucun client ne correspond</div>
              <div className="empty-sub">Essayez d'autres filtres, ou créez un nouveau client.</div>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>N° Client</th><th>Nom & Prénom</th><th>Contact</th><th>Quartier</th>
                      <th>Recharges</th><th>Fidélité</th><th>Dernière cmd.</th><th>Statut</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsPage.map((c) => (
                      <tr key={c.id}>
                        <td className="td-bold" style={{ color: 'var(--primary)' }}>
                          {c.numero_client}{boutiqueActive?.code}
                        </td>
                        <td className="td-bold">{c.nom || <span className="td-light">Sans nom</span>}</td>
                        <td className="td-light">{c.contact || '—'}</td>
                        <td>{c.quartier || '—'}</td>
                        <td>{c.conso_totale} total</td>
                        <td>
                          {c.statut === 'actif' ? (
                            <span style={{ fontWeight: 700, color: c.fidelite_compteur >= 9 ? 'var(--warning)' : 'var(--text-main)' }}>
                              {c.fidelite_compteur}/10 {c.fidelite_compteur >= 9 && '⭐'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="td-light">
                          {c.derniere_commande_at ? new Date(c.derniere_commande_at).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td>
                          <span className={'badge ' + (c.statut === 'actif' ? 'badge-success' : 'badge-neutral')}>
                            {c.statut === 'actif' ? 'Actif' : 'Prospect'}
                          </span>
                        </td>
                        <td><button className="btn btn-outline btn-sm" onClick={() => setClientDetail(c)}>Voir</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination-row">
                <span className="td-light">
                  Affichage {(page - 1) * parPage + 1}–{Math.min(page * parPage, clientsFiltres.length)} sur {clientsFiltres.length}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-outline btn-xs" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
                  <span style={{ padding: '4px 10px', fontSize: 12 }}>{page} / {totalPages}</span>
                  <button className="btn btn-outline btn-xs" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showNouveauClient && (
        <NouveauClientModal
          boutique={boutiqueActive}
          onClose={() => setShowNouveauClient(false)}
          onCree={() => {
            setShowNouveauClient(false)
            chargerClients()
          }}
        />
      )}

      {clientDetail && (
        <FicheClientModal client={clientDetail} boutique={boutiqueActive} onClose={() => setClientDetail(null)} />
      )}
    </>
  )
}

function NouveauClientModal({ boutique, onClose, onCree }) {
  const [nom, setNom] = useState('')
  const [contact, setContact] = useState('')
  const [quartier, setQuartier] = useState(QUARTIERS[0])
  const [detail, setDetail] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [prochainNumero, setProchainNumero] = useState('…')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    async function calculerProchainNumero() {
      const { count } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('boutique_id', boutique.id)
      setProchainNumero(String((count || 0) + 1).padStart(4, '0'))
    }
    if (boutique) calculerProchainNumero()
  }, [boutique])

  async function enregistrer() {
    setEnCours(true)
    const { error } = await supabase.from('clients').insert({
      numero_client: prochainNumero,
      boutique_id: boutique.id,
      nom: nom || null,
      contact: contact || null,
      quartier,
      detail: detail || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    })
    setEnCours(false)
    if (!error) onCree()
    else alert('Erreur lors de la création du client.')
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">👤 Nouveau client</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">N° Client (auto)</label>
            <input className="form-input ro" value={`${prochainNumero}${boutique?.code || ''}`} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">Nom & Prénom (facultatif)</label>
            <input className="form-input" placeholder="Koné Aminata" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Contact (facultatif)</label>
            <input className="form-input" placeholder="07 XX XX XX" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Quartier</label>
            <select className="form-input form-select" value={quartier} onChange={(e) => setQuartier(e.target.value)}>
              {QUARTIERS.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Détail complémentaire</label>
            <input className="form-input" placeholder="Près de l'école, maison bleue…" value={detail} onChange={(e) => setDetail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input className="form-input" placeholder="6.4281" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input className="form-input" placeholder="-4.4415" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Enregistrer le client'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FicheClientModal({ client, boutique, onClose }) {
  const [ventes, setVentes] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    async function charger() {
      setChargement(true)
      const { data } = await supabase
        .from('ventes')
        .select('*, ventes_lignes(*, articles(designation, categorie))')
        .eq('client_id', client.id)
        .in('statut', ['validee', 'en_livraison', 'livree'])
        .order('valide_at', { ascending: false })
        .limit(10)
      setVentes(data || [])
      setChargement(false)
    }
    charger()
  }, [client.id])

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">👤 {client.nom || 'Client sans nom'} — {client.numero_client}{boutique?.code}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="two-col" style={{ marginBottom: 16 }}>
          <div className="kpi-card">
            <div className="kpi-value">{client.conso_totale}</div>
            <div className="kpi-label">Total recharges depuis le début</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value" style={{ color: 'var(--warning)' }}>{client.fidelite_compteur}/10 ⭐</div>
            <div className="kpi-label">Progression fidélité actuelle</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
          <div><strong>Contact :</strong> {client.contact || '—'}</div>
          <div><strong>Quartier :</strong> {client.quartier || '—'} {client.detail && `· ${client.detail}`}</div>
          <div><strong>Statut :</strong> {client.statut === 'actif' ? 'Client actif' : 'Prospect (jamais commandé)'}</div>
        </div>

        <div className="section-title">Historique des 10 dernières ventes</div>
        {chargement ? (
          <p className="td-light">Chargement…</p>
        ) : ventes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">Aucune commande pour ce client</div>
            <div className="empty-sub">C'est encore un prospect — proposez-lui sa première recharge !</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>N° Reçu</th><th>Date</th><th>Articles</th><th>Total</th></tr></thead>
              <tbody>
                {ventes.map((v) => (
                  <tr key={v.id}>
                    <td>{v.numero_recu_complet}</td>
                    <td className="td-light">{new Date(v.valide_at).toLocaleDateString('fr-FR')}</td>
                    <td>{v.ventes_lignes.map((l) => `${l.articles?.designation} ${l.articles?.categorie || ''} ×${l.quantite}`).join(', ')}</td>
                    <td className="td-bold">{Number(v.total).toLocaleString('fr-FR')} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
