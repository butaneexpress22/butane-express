import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function SuiviClients() {
  const { boutiqueActive } = useAuth()
  const [clients, setClients] = useState([])
  const [chargement, setChargement] = useState(true)
  const [seuilJours, setSeuilJours] = useState(45)
  const [filtreQuartier, setFiltreQuartier] = useState('')

  const seuilEffectif = boutiqueActive?.seuil_inactivite_jours || 45

  const charger = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)

    const dateLimite = new Date()
    dateLimite.setDate(dateLimite.getDate() - seuilJours)

    // Clients actifs n'ayant pas commandé depuis le seuil, OU jamais commandé (prospects anciens)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('boutique_id', boutiqueActive.id)
      .eq('statut', 'actif')
      .lt('derniere_commande_at', dateLimite.toISOString())
      .order('derniere_commande_at', { ascending: true })

    setClients(data || [])
    setChargement(false)
  }, [boutiqueActive, seuilJours])

  useEffect(() => {
    charger()
  }, [charger])

  const clientsFiltres = clients.filter((c) => !filtreQuartier || c.quartier === filtreQuartier)
  const quartiersDisponibles = [...new Set(clients.map((c) => c.quartier).filter(Boolean))]

  function joursDepuis(date) {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Suivi clients inactifs</div>
          <div className="topbar-sub">{clientsFiltres.length} client{clientsFiltres.length !== 1 ? 's' : ''} sans commande depuis ≥ {seuilJours} jours</div>
        </div>
      </div>

      <div className="content">
        {clientsFiltres.length > 0 && (
          <div className="alert alert-danger">
            🚨 <div>
              <strong>{clientsFiltres.length} client{clientsFiltres.length !== 1 ? 's' : ''}</strong> n'{clientsFiltres.length !== 1 ? 'ont' : 'a'} pas commandé depuis au moins {seuilJours} jours. Relancez-les avant qu'ils ne passent chez la concurrence.
            </div>
          </div>
        )}

        <div className="filters-row">
          <select className="f-select" value={seuilJours} onChange={(e) => setSeuilJours(Number(e.target.value))}>
            <option value={seuilEffectif}>≥ {seuilEffectif} jours (seuil boutique)</option>
            <option value={60}>≥ 60 jours</option>
            <option value={90}>≥ 90 jours</option>
          </select>
          <select className="f-select" value={filtreQuartier} onChange={(e) => setFiltreQuartier(e.target.value)}>
            <option value="">Tous quartiers</option>
            {quartiersDisponibles.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>

        {chargement ? (
          <p className="td-light">Chargement…</p>
        ) : clientsFiltres.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <div className="empty-title">Aucun client inactif</div>
              <div className="empty-sub">Tous vos clients actifs ont commandé récemment. Bravo !</div>
            </div>
          </div>
        ) : (
          clientsFiltres.map((c) => (
            <div className="inactif-card" key={c.id}>
              <div className="inactif-days">
                {joursDepuis(c.derniere_commande_at)}
                <small>jours</small>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nom || 'Client sans nom'}</div>
                <div className="td-light">{c.numero_client}{boutiqueActive?.code} · {c.quartier || '—'} · {c.contact || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                  Dernière commande : {new Date(c.derniere_commande_at).toLocaleDateString('fr-FR')} · {c.conso_totale} recharges au total
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {c.contact && (
                  <a className="btn btn-outline btn-sm" href={`tel:${c.contact}`}>📞 Appeler</a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
