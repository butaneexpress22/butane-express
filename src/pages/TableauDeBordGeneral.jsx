import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function TableauDeBordGeneral() {
  const [boutiques, setBoutiques] = useState([])
  const [stats, setStats] = useState({})
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    setChargement(true)
    const { data } = await supabase.from('boutiques').select('*').eq('active', true)
    setBoutiques(data || [])

    const moisActuel = new Date().toISOString().slice(0, 7)
    const statsTmp = {}
    for (const b of data || []) {
      const { data: ventes } = await supabase
        .from('ventes')
        .select('total')
        .eq('boutique_id', b.id)
        .in('statut', ['validee', 'en_livraison', 'livree'])
        .gte('valide_at', `${moisActuel}-01`)

      statsTmp[b.id] = {
        ca: (ventes || []).reduce((s, v) => s + Number(v.total), 0),
        nbVentes: (ventes || []).length,
      }
    }
    setStats(statsTmp)
    setChargement(false)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const caTotal = Object.values(stats).reduce((s, st) => s + st.ca, 0)
  const ventesTotal = Object.values(stats).reduce((s, st) => s + st.nbVentes, 0)
  const maxCa = Math.max(1, ...Object.values(stats).map((s) => s.ca))

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Tableau de bord général</div>
          <div className="topbar-sub">Vue administrative — Toutes boutiques · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      <div className="content">
        <div className="alert alert-info">
          🌐 <div>Vue réservée à l'administrateur. Comparaison des performances de toutes les boutiques du réseau.</div>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="kpi-value">{caTotal.toLocaleString('fr-FR')} F</div>
            <div className="kpi-label">CA total réseau (mois)</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{ventesTotal}</div>
            <div className="kpi-label">Ventes total réseau</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{boutiques.length}</div>
            <div className="kpi-label">Boutique{boutiques.length !== 1 ? 's' : ''} active{boutiques.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Comparaison des boutiques — ce mois</div></div>
          {chargement ? (
            <p className="td-light">Chargement…</p>
          ) : (
            <div>
              {boutiques.map((b) => {
                const ca = stats[b.id]?.ca || 0
                const pct = Math.round((ca / maxCa) * 100)
                return (
                  <div className="compare-bar" key={b.id}>
                    <span className="compare-label">{b.nom}</span>
                    <div className="compare-bg"><div className="compare-fill" style={{ width: pct + '%', background: 'var(--primary)' }}></div></div>
                    <span className="compare-val" style={{ color: 'var(--primary)' }}>{ca.toLocaleString('fr-FR')} F</span>
                  </div>
                )
              })}
              {boutiques.length <= 1 && (
                <p className="td-light" style={{ fontSize: 12, fontStyle: 'italic', marginTop: 8 }}>
                  Les prochaines boutiques apparaîtront ici automatiquement dès leur création.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
