import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TYPES_PROBLEME = [
  'Livraison non reçue',
  'Produit défectueux / fuite',
  'Erreur de facturation',
  'Mauvaise quantité livrée',
  'Autre',
]

export default function Sav() {
  const { boutiqueActive } = useAuth()
  const [tickets, setTickets] = useState([])
  const [chargement, setChargement] = useState(true)
  const [filtre, setFiltre] = useState('ouvert')
  const [showModal, setShowModal] = useState(false)
  const [ticketDetail, setTicketDetail] = useState(null)

  const charger = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)
    const { data } = await supabase
      .from('sav_tickets')
      .select('*, clients(numero_client, nom, contact), ventes(numero_recu_complet, livreur_id, livreurs(nom))')
      .eq('boutique_id', boutiqueActive.id)
      .order('created_at', { ascending: false })
    setTickets(data || [])
    setChargement(false)
  }, [boutiqueActive])

  useEffect(() => {
    charger()
  }, [charger])

  const ticketsFiltres = tickets.filter((t) => {
    if (filtre === 'all') return true
    return t.statut === filtre
  })

  const compteurs = {
    ouvert: tickets.filter((t) => t.statut === 'ouvert').length,
    en_traitement: tickets.filter((t) => t.statut === 'en_traitement').length,
    resolu: tickets.filter((t) => t.statut === 'resolu').length,
  }

  async function changerStatut(ticket, nouveauStatut) {
    const updates = { statut: nouveauStatut }
    if (nouveauStatut === 'resolu') updates.resolu_at = new Date().toISOString()
    const { error } = await supabase.from('sav_tickets').update(updates).eq('id', ticket.id)
    if (!error) {
      charger()
      setTicketDetail(null)
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Service Après-Vente</div>
          <div className="topbar-sub">{compteurs.ouvert} ticket{compteurs.ouvert !== 1 ? 's' : ''} ouvert{compteurs.ouvert !== 1 ? 's' : ''} · {boutiqueActive?.nom}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouveau ticket</button>
      </div>

      <div className="content">
        <div className="tabs">
          <button className={'tab-btn' + (filtre === 'all' ? ' active' : '')} onClick={() => setFiltre('all')}>Tous ({tickets.length})</button>
          <button className={'tab-btn' + (filtre === 'ouvert' ? ' active' : '')} onClick={() => setFiltre('ouvert')}>Ouverts ({compteurs.ouvert})</button>
          <button className={'tab-btn' + (filtre === 'en_traitement' ? ' active' : '')} onClick={() => setFiltre('en_traitement')}>En traitement ({compteurs.en_traitement})</button>
          <button className={'tab-btn' + (filtre === 'resolu' ? ' active' : '')} onClick={() => setFiltre('resolu')}>Résolus ({compteurs.resolu})</button>
        </div>

        {chargement ? (
          <p className="td-light">Chargement…</p>
        ) : ticketsFiltres.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">🔧</div>
              <div className="empty-title">Aucun ticket ici</div>
              <div className="empty-sub">Tout va bien — pas de réclamation dans cette catégorie.</div>
            </div>
          </div>
        ) : (
          ticketsFiltres.map((t) => (
            <SavCard key={t.id} ticket={t} onClick={() => setTicketDetail(t)} />
          ))
        )}
      </div>

      {showModal && (
        <NouveauTicketModal
          boutique={boutiqueActive}
          onClose={() => setShowModal(false)}
          onCree={() => { setShowModal(false); charger() }}
        />
      )}

      {ticketDetail && (
        <DetailTicketModal
          ticket={ticketDetail}
          onClose={() => setTicketDetail(null)}
          onChangerStatut={changerStatut}
        />
      )}
    </>
  )
}

function SavCard({ ticket, onClick }) {
  const dotColor = { ouvert: 'var(--danger)', en_traitement: 'var(--warning)', resolu: 'var(--success)' }[ticket.statut]
  const badge = {
    ouvert: { cls: 'badge-danger', label: 'Ouvert' },
    en_traitement: { cls: 'badge-warning', label: 'En traitement' },
    resolu: { cls: 'badge-success', label: 'Résolu' },
  }[ticket.statut]

  return (
    <div className="sav-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="sav-dot" style={{ background: dotColor }}></div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span className="sav-id">SAV-{ticket.numero}</span>
          <span className={'badge ' + badge.cls}>{badge.label}</span>
          {ticket.priorite === 'haute' && <span className="badge badge-warning">Priorité haute</span>}
          {ticket.priorite === 'urgente' && <span className="badge badge-danger">Urgente</span>}
        </div>
        <div className="sav-client">{ticket.clients?.nom || 'Client'} — {ticket.clients?.numero_client}</div>
        <div className="sav-desc">{ticket.type_probleme}{ticket.description ? ` — ${ticket.description}` : ''}</div>
        <div className="sav-meta">
          <span>📅 {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
          {ticket.ventes?.livreurs?.nom && <span>🏍️ {ticket.ventes.livreurs.nom}</span>}
          {ticket.ventes?.numero_recu_complet && <span>🧾 #{ticket.ventes.numero_recu_complet}</span>}
        </div>
      </div>
      <button className="btn btn-outline btn-sm">{ticket.statut === 'resolu' ? 'Voir' : 'Traiter'}</button>
    </div>
  )
}

function NouveauTicketModal({ boutique, onClose, onCree }) {
  const [numeroClient, setNumeroClient] = useState('')
  const [client, setClient] = useState(null)
  const [numeroRecu, setNumeroRecu] = useState('')
  const [typeProbleme, setTypeProbleme] = useState(TYPES_PROBLEME[0])
  const [priorite, setPriorite] = useState('normale')
  const [description, setDescription] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function chercherClient() {
    if (!numeroClient.trim()) return
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('numero_client', numeroClient.trim())
      .eq('boutique_id', boutique.id)
      .maybeSingle()
    setClient(data || null)
    if (!data) setErreur('Client introuvable.')
    else setErreur('')
  }

  async function enregistrer() {
    if (!client) {
      setErreur('Recherchez un client valide avant de continuer.')
      return
    }
    setEnCours(true)

    let venteId = null
    if (numeroRecu.trim()) {
      const { data: vente } = await supabase
        .from('ventes')
        .select('id')
        .eq('numero_recu_complet', numeroRecu.trim())
        .eq('boutique_id', boutique.id)
        .maybeSingle()
      venteId = vente?.id || null
    }

    const { count } = await supabase.from('sav_tickets').select('id', { count: 'exact', head: true })
    const numero = String((count || 0) + 1).padStart(4, '0')

    const { error } = await supabase.from('sav_tickets').insert({
      numero,
      boutique_id: boutique.id,
      client_id: client.id,
      vente_id: venteId,
      type_probleme: typeProbleme,
      priorite,
      description: description || null,
    })

    setEnCours(false)
    if (!error) onCree()
    else alert('Erreur lors de la création du ticket.')
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">🔧 Nouveau ticket SAV</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">N° Client</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" placeholder="0087" value={numeroClient} onChange={(e) => setNumeroClient(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && chercherClient()} />
              <button className="btn btn-outline btn-sm" onClick={chercherClient}>🔍</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">N° Reçu lié (optionnel)</label>
            <input className="form-input" placeholder="#R-XXXX" value={numeroRecu} onChange={(e) => setNumeroRecu(e.target.value)} />
          </div>
          {client && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ background: 'var(--success-light)', padding: 10, borderRadius: 8, fontSize: 13 }}>
                ✓ {client.nom || 'Client sans nom'} · {client.contact || '—'} · {client.quartier || '—'}
              </div>
            </div>
          )}
          {erreur && <div style={{ gridColumn: '1 / -1', color: 'var(--danger)', fontSize: 12 }}>{erreur}</div>}
          <div className="form-group">
            <label className="form-label">Type de problème</label>
            <select className="form-input form-select" value={typeProbleme} onChange={(e) => setTypeProbleme(e.target.value)}>
              {TYPES_PROBLEME.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priorité</label>
            <select className="form-input form-select" value={priorite} onChange={(e) => setPriorite(e.target.value)}>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} placeholder="Décrivez le problème du client…" value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
            {enCours ? 'Création…' : 'Ouvrir le ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailTicketModal({ ticket, onClose, onChangerStatut }) {
  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-header">
          <div className="modal-title">🔧 Ticket SAV-{ticket.numero}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          <div><strong>Client :</strong> {ticket.clients?.nom} — {ticket.clients?.numero_client}</div>
          <div><strong>Contact :</strong> {ticket.clients?.contact || '—'}</div>
          <div><strong>Type :</strong> {ticket.type_probleme}</div>
          {ticket.ventes?.numero_recu_complet && <div><strong>Reçu lié :</strong> #{ticket.ventes.numero_recu_complet}</div>}
          <div><strong>Priorité :</strong> {ticket.priorite}</div>
          <div><strong>Ouvert le :</strong> {new Date(ticket.created_at).toLocaleString('fr-FR')}</div>
        </div>
        {ticket.description && (
          <div style={{ marginBottom: 14 }}>
            <div className="section-title">Description</div>
            <p style={{ fontSize: 13 }}>{ticket.description}</p>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
          {ticket.statut === 'ouvert' && (
            <button className="btn btn-warning" onClick={() => onChangerStatut(ticket, 'en_traitement')}>Marquer en traitement</button>
          )}
          {ticket.statut !== 'resolu' && (
            <button className="btn btn-success" onClick={() => onChangerStatut(ticket, 'resolu')}>✓ Marquer résolu</button>
          )}
        </div>
      </div>
    </div>
  )
}
