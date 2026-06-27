import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Comptabilite() {
  const { boutiqueActive, boutiques, isAdmin } = useAuth()
  const [boutiqueId, setBoutiqueId] = useState(boutiqueActive?.id || '')
  const [mois, setMois] = useState(new Date().toISOString().slice(0, 7))
  const [chiffres, setChiffres] = useState(null)
  const [chargement, setChargement] = useState(true)

  const idEffectif = isAdmin ? boutiqueId || boutiqueActive?.id : boutiqueActive?.id

  const charger = useCallback(async () => {
    if (!idEffectif) return
    setChargement(true)

    const debutMois = `${mois}-01`
    const finMoisDate = new Date(mois + '-01')
    finMoisDate.setMonth(finMoisDate.getMonth() + 1)
    const finMois = finMoisDate.toISOString().slice(0, 10)

    const { data: ventes } = await supabase
      .from('ventes')
      .select('total, valide_at, ventes_lignes(quantite, total_ligne, prix_unitaire, articles(classe, prix_achat))')
      .eq('boutique_id', idEffectif)
      .in('statut', ['validee', 'en_livraison', 'livree'])
      .gte('valide_at', debutMois)
      .lt('valide_at', finMois)

    const { data: achats } = await supabase
      .from('achats')
      .select('total, created_at')
      .eq('boutique_id', idEffectif)
      .gte('created_at', debutMois)
      .lt('created_at', finMois)

    const { data: depenses } = await supabase
      .from('depenses')
      .select('montant, date_depense')
      .eq('boutique_id', idEffectif)
      .gte('date_depense', debutMois)
      .lt('date_depense', finMois)

    const totalVentes = (ventes || []).reduce((s, v) => s + Number(v.total), 0)
    const totalAchats = (achats || []).reduce((s, a) => s + Number(a.total), 0)
    const totalDepenses = (depenses || []).reduce((s, d) => s + Number(d.montant), 0)

    let marge = 0
    for (const v of ventes || []) {
      for (const l of v.ventes_lignes || []) {
        if (l.articles) marge += (Number(l.prix_unitaire) - Number(l.articles.prix_achat)) * l.quantite
      }
    }
    const beneficeNet = marge - totalDepenses

    // Découpage par semaine
    const semaines = {}
    for (const v of ventes || []) {
      const jour = new Date(v.valide_at).getDate()
      const numSemaine = Math.ceil(jour / 7)
      if (!semaines[numSemaine]) semaines[numSemaine] = { ventes: 0, achats: 0, depenses: 0 }
      semaines[numSemaine].ventes += Number(v.total)
    }
    for (const a of achats || []) {
      const jour = new Date(a.created_at).getDate()
      const numSemaine = Math.ceil(jour / 7)
      if (!semaines[numSemaine]) semaines[numSemaine] = { ventes: 0, achats: 0, depenses: 0 }
      semaines[numSemaine].achats += Number(a.total)
    }
    for (const d of depenses || []) {
      const jour = new Date(d.date_depense).getDate()
      const numSemaine = Math.ceil(jour / 7)
      if (!semaines[numSemaine]) semaines[numSemaine] = { ventes: 0, achats: 0, depenses: 0 }
      semaines[numSemaine].depenses += Number(d.montant)
    }

    setChiffres({ totalVentes, totalAchats, totalDepenses, marge: beneficeNet, semaines })
    setChargement(false)
  }, [idEffectif, mois])

  useEffect(() => {
    charger()
  }, [charger])

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Comptabilité</div>
          <div className="topbar-sub">Résultats financiers consolidés</div>
        </div>
      </div>

      <div className="content">
        <div className="filters-row">
          <input className="f-select" type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
          {isAdmin && (
            <select className="f-select" value={boutiqueId} onChange={(e) => setBoutiqueId(e.target.value)}>
              {boutiques.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
          )}
        </div>

        {chargement || !chiffres ? (
          <p className="td-light">Chargement…</p>
        ) : (
          <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: 'var(--success)' }}>{chiffres.totalVentes.toLocaleString('fr-FR')} F</div>
                <div className="kpi-label">Total ventes</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: 'var(--danger)' }}>{(chiffres.totalAchats + chiffres.totalDepenses).toLocaleString('fr-FR')} F</div>
                <div className="kpi-label">Total achats + dépenses</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value" style={{ color: chiffres.marge >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                  {chiffres.marge.toLocaleString('fr-FR')} F
                </div>
                <div className="kpi-label">Bénéfice net du mois</div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Récapitulatif par semaine</div></div>
              <table style={{ width: '100%' }}>
                <thead><tr><th>Semaine</th><th>Ventes</th><th>Achats</th><th>Dépenses</th><th>Marge brute</th></tr></thead>
                <tbody>
                  {Object.entries(chiffres.semaines).sort(([a], [b]) => a - b).map(([num, s]) => {
                    const margeS = s.ventes - s.achats - s.depenses
                    return (
                      <tr key={num}>
                        <td>Semaine {num}</td>
                        <td>{s.ventes.toLocaleString('fr-FR')} F</td>
                        <td>{s.achats.toLocaleString('fr-FR')} F</td>
                        <td>{s.depenses.toLocaleString('fr-FR')} F</td>
                        <td className="td-bold" style={{ color: margeS >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {margeS >= 0 ? '+ ' : ''}{margeS.toLocaleString('fr-FR')} F
                        </td>
                      </tr>
                    )
                  })}
                  {Object.keys(chiffres.semaines).length === 0 && (
                    <tr><td colSpan={5} className="td-light" style={{ textAlign: 'center', padding: 20 }}>Aucune donnée pour ce mois.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
