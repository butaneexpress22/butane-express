import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Utilisateurs() {
  const { boutiques } = useAuth()
  const [utilisateurs, setUtilisateurs] = useState([])
  const [chargement, setChargement] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const charger = useCallback(async () => {
    setChargement(true)
    const { data } = await supabase
      .from('utilisateurs')
      .select('*, boutiques(nom)')
      .order('role', { ascending: false })
      .order('created_at')
    setUtilisateurs(data || [])
    setChargement(false)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const admins = utilisateurs.filter((u) => u.role === 'admin')
  const caissiers = utilisateurs.filter((u) => u.role === 'caissier')

  async function toggleActif(u) {
    const { error } = await supabase.from('utilisateurs').update({ actif: !u.actif }).eq('id', u.id)
    if (!error) charger()
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Utilisateurs</div>
          <div className="topbar-sub">Gestion des accès à l'application</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouvel utilisateur</button>
      </div>

      <div className="content">
        <div className="alert alert-info">
          🔐 <div>Chaque utilisateur reçoit un code unique et un niveau d'accès. Les administrateurs voient toutes les boutiques ; les caissiers ne voient que la leur.</div>
        </div>

        {chargement ? (
          <p className="td-light">Chargement…</p>
        ) : (
          <>
            <div className="section-title">Administrateurs</div>
            {admins.length === 0 ? (
              <p className="td-light" style={{ marginBottom: 16 }}>Aucun administrateur.</p>
            ) : (
              admins.map((u) => <UserCard key={u.id} u={u} onToggle={() => toggleActif(u)} />)
            )}

            <div className="section-title" style={{ marginTop: 16 }}>Utilisateurs / Caissiers</div>
            {caissiers.length === 0 ? (
              <p className="td-light">Aucun caissier créé pour le moment.</p>
            ) : (
              caissiers.map((u) => <UserCard key={u.id} u={u} onToggle={() => toggleActif(u)} />)
            )}
          </>
        )}
      </div>

      {showModal && (
        <NouvelUtilisateurModal
          boutiques={boutiques}
          onClose={() => setShowModal(false)}
          onCree={() => { setShowModal(false); charger() }}
        />
      )}
    </>
  )
}

function UserCard({ u, onToggle }) {
  const couleurs = ['#0369A1', '#16A34A', '#D97706', '#7C3AED', '#DB2777']
  const couleur = couleurs[u.nom.length % couleurs.length]

  return (
    <div className="user-list-card">
      <div className="u-avatar" style={{ background: u.role === 'admin' ? 'var(--primary)' : couleur }}>
        {u.nom.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <div className="u-name">{u.nom}</div>
        <div className="u-role">
          {u.role === 'admin' ? 'Administrateur général · Toutes boutiques' : `Caissier · ${u.boutiques?.nom || '—'} uniquement`}
        </div>
      </div>
      <span className="u-code">{u.code}</span>
      <span className={'badge ' + (u.actif ? 'badge-success' : 'badge-warning')} style={{ marginLeft: 8 }}>
        {u.actif ? 'Actif' : 'Suspendu'}
      </span>
      <div className="u-actions">
        {u.role !== 'admin' && (
          <button className={'btn btn-sm ' + (u.actif ? 'btn-danger' : 'btn-primary')} onClick={onToggle}>
            {u.actif ? 'Suspendre' : 'Réactiver'}
          </button>
        )}
      </div>
    </div>
  )
}

function NouvelUtilisateurModal({ boutiques, onClose, onCree }) {
  const [nom, setNom] = useState('')
  const [role, setRole] = useState('caissier')
  const [boutiqueId, setBoutiqueId] = useState(boutiques[0]?.id || '')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [prochainCode, setProchainCode] = useState('…')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    async function calculerCode() {
      const boutique = boutiques.find((b) => b.id === boutiqueId)
      const prefix = role === 'admin' ? 'ADM' : `USR-${boutique?.code || 'XX'}`
      const { count } = await supabase
        .from('utilisateurs')
        .select('id', { count: 'exact', head: true })
        .like('code', `${prefix}%`)
      setProchainCode(`${prefix}${role === 'admin' ? '-' : ''}${String((count || 0) + 1).padStart(3, '0')}`)
    }
    calculerCode()
  }, [role, boutiqueId, boutiques])

  async function enregistrer() {
    setErreur('')
    if (!nom.trim()) {
      setErreur('Indiquez le nom complet.')
      return
    }
    if (motDePasse.length < 4) {
      setErreur('Le mot de passe doit contenir au moins 4 caractères.')
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les mots de passe ne correspondent pas.')
      return
    }

    setEnCours(true)
    const { error } = await supabase.from('utilisateurs').insert({
      code: prochainCode,
      nom,
      mot_de_passe_hash: motDePasse, // ⚠️ à remplacer par un hash sécurisé via Edge Function
      role,
      boutique_id: role === 'admin' ? null : boutiqueId,
    })
    setEnCours(false)
    if (!error) onCree()
    else setErreur("Erreur : ce code existe peut-être déjà.")
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">👤 Nouvel utilisateur</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Code (auto)</label>
            <input className="form-input ro" value={prochainCode} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">Nom complet</label>
            <input className="form-input" placeholder="Prénom Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Niveau d'accès</label>
            <select className="form-input form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="caissier">Caissier (boutique uniquement)</option>
              <option value="admin">Administrateur (toutes boutiques)</option>
            </select>
          </div>
          <div className="form-group" style={{ opacity: role === 'admin' ? 0.4 : 1 }}>
            <label className="form-label">Boutique affectée</label>
            <select className="form-input form-select" value={boutiqueId} onChange={(e) => setBoutiqueId(e.target.value)} disabled={role === 'admin'}>
              {boutiques.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input className="form-input" type="password" placeholder="••••••••" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmer mot de passe</label>
            <input className="form-input" type="password" placeholder="••••••••" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </div>
        </div>
        {erreur && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 10 }}>{erreur}</p>}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={enregistrer} disabled={enCours}>
            {enCours ? 'Création…' : "Créer l'utilisateur"}
          </button>
        </div>
      </div>
    </div>
  )
}
