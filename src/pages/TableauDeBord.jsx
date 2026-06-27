import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { journaliser } from '../lib/journal'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'

const aujourdhui = () => new Date().toISOString().slice(0, 10)
const COULEURS_QUARTIER = ['#E8500A', '#16A34A', '#0369A1', '#D97706', '#7C3AED', '#DB2777', '#0D9488']

export default function TableauDeBord() {
  const { boutiqueActive, user, isAdmin } = useAuth()
  const [chargement, setChargement] = useState(true)
  const [fondCaisse, setFondCaisse] = useState(null)
  const [depensesJour, setDepensesJour] = useState(0)
  const [venteGaz, setVenteGaz] = useState({ total: 0, parCategorie: {} })
  const [venteAcc, setVenteAcc] = useState({ total: 0, nb: 0 })
  const [achatsJour, setAchatsJour] = useState(0)
  const [margeJour, setMargeJour] = useState(0)
  const [showModalFond, setShowModalFond] = useState(false)
  const [nouveauFond, setNouveauFond] = useState('')

  // ── Données graphiques ──
  const [evolutionVentes, setEvolutionVentes] = useState([])
  const [repartitionQuartier, setRepartitionQuartier] = useState([])
  const [comparaisonGazAcc, setComparaisonGazAcc] = useState([])
  const [chargementGraphiques, setChargementGraphiques] = useState(true)

  const chargerDonnees = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)
    const jour = aujourdhui()

    let { data: fond } = await supabase
      .from('fonds_caisse')
      .select('*')
      .eq('boutique_id', boutiqueActive.id)
      .eq('date_jour', jour)
      .maybeSingle()

    setFondCaisse(fond || null)

    const { data: depenses } = await supabase
      .from('depenses')
      .select('montant')
      .eq('boutique_id', boutiqueActive.id)
      .eq('date_depense', jour)
    const totalDepenses = (depenses || []).reduce((s, d) => s + Number(d.montant), 0)
    setDepensesJour(totalDepenses)

    const { data: achats } = await supabase
      .from('achats')
      .select('total, created_at')
      .eq('boutique_id', boutiqueActive.id)
      .gte('created_at', jour)
    const totalAchats = (achats || []).reduce((s, a) => s + Number(a.total), 0)
    setAchatsJour(totalAchats)

    const { data: ventes } = await supabase
      .from('ventes')
      .select('id, valide_at, statut')
      .eq('boutique_id', boutiqueActive.id)
      .gte('valide_at', jour)
      .in('statut', ['validee', 'en_livraison'])

    const venteIds = (ventes || []).map((v) => v.id)

    if (venteIds.length > 0) {
      const { data: lignes } = await supabase
        .from('ventes_lignes')
        .select('quantite, prix_unitaire, liv_red, total_ligne, articles(classe, categorie, prix_achat)')
        .in('vente_id', venteIds)

      let gazTotal = 0
      let gazParCat = {}
      let accTotal = 0
      let accNb = 0
      let marge = 0

      for (const l of lignes || []) {
        const art = l.articles
        if (!art) continue
        const totalLigne = Number(l.total_ligne)
        const margeLigne = (Number(l.prix_unitaire) - Number(art.prix_achat)) * l.quantite
        marge += margeLigne

        if (art.classe === 'gaz') {
          gazTotal += totalLigne
          const cat = art.categorie || 'Autre'
          if (!gazParCat[cat]) gazParCat[cat] = { qte: 0, total: 0 }
          gazParCat[cat].qte += l.quantite
          gazParCat[cat].total += totalLigne
        } else {
          accTotal += totalLigne
          accNb += l.quantite
        }
      }

      setVenteGaz({ total: gazTotal, parCategorie: gazParCat })
      setVenteAcc({ total: accTotal, nb: accNb })
      setMargeJour(marge - totalDepenses)
    } else {
      setVenteGaz({ total: 0, parCategorie: {} })
      setVenteAcc({ total: 0, nb: 0 })
      setMargeJour(0 - totalDepenses)
    }

    setChargement(false)
  }, [boutiqueActive])

  const chargerGraphiques = useCallback(async () => {
    if (!boutiqueActive) return
    setChargementGraphiques(true)

    // ── Étape 1 : Évolution des ventes sur les 14 derniers jours ──
    const dateDebut = new Date()
    dateDebut.setDate(dateDebut.getDate() - 13)
    dateDebut.setHours(0, 0, 0, 0)

    const { data: ventesPeriode } = await supabase
      .from('ventes')
      .select('total, valide_at')
      .eq('boutique_id', boutiqueActive.id)
      .in('statut', ['validee', 'en_livraison'])
      .gte('valide_at', dateDebut.toISOString())

    const parJour = {}
    for (let i = 0; i < 14; i++) {
      const d = new Date(dateDebut)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      parJour[key] = 0
    }
    for (const v of ventesPeriode || []) {
      const key = new Date(v.valide_at).toISOString().slice(0, 10)
      if (parJour[key] !== undefined) parJour[key] += Number(v.total)
    }
    setEvolutionVentes(
      Object.entries(parJour).map(([date, total]) => ({
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        total,
      }))
    )

    // ── Étape 2 : Répartition des ventes par quartier (30 derniers jours) ──
    const dateDebut30 = new Date()
    dateDebut30.setDate(dateDebut30.getDate() - 30)

    const { data: ventesAvecClient } = await supabase
      .from('ventes')
      .select('total, clients(quartier)')
      .eq('boutique_id', boutiqueActive.id)
      .in('statut', ['validee', 'en_livraison'])
      .gte('valide_at', dateDebut30.toISOString())

    const parQuartier = {}
    for (const v of ventesAvecClient || []) {
      const q = v.clients?.quartier || 'Non renseigné'
      parQuartier[q] = (parQuartier[q] || 0) + Number(v.total)
    }
    setRepartitionQuartier(
      Object.entries(parQuartier)
        .map(([quartier, total]) => ({ quartier, total }))
        .sort((a, b) => b.total - a.total)
    )

    // ── Étape 3 : Comparaison Gaz vs Accessoires sur 7 jours ──
    const dateDebut7 = new Date()
    dateDebut7.setDate(dateDebut7.getDate() - 6)
    dateDebut7.setHours(0, 0, 0, 0)

    const { data: ventes7j } = await supabase
      .from('ventes')
      .select('id, valide_at')
      .eq('boutique_id', boutiqueActive.id)
      .in('statut', ['validee', 'en_livraison'])
      .gte('valide_at', dateDebut7.toISOString())

    const ids7j = (ventes7j || []).map((v) => v.id)
    const mapDateVente = {}
    for (const v of ventes7j || []) {
      mapDateVente[v.id] = new Date(v.valide_at).toISOString().slice(0, 10)
    }

    const parJourClasse = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(dateDebut7)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      parJourClasse[key] = { jour: d.toLocaleDateString('fr-FR', { weekday: 'short' }), gaz: 0, accessoire: 0 }
    }

    if (ids7j.length > 0) {
      const { data: lignes7j } = await supabase
        .from('ventes_lignes')
        .select('vente_id, total_ligne, articles(classe)')
        .in('vente_id', ids7j)

      for (const l of lignes7j || []) {
        const key = mapDateVente[l.vente_id]
        if (parJourClasse[key]) {
          if (l.articles?.classe === 'gaz') parJourClasse[key].gaz += Number(l.total_ligne)
          else parJourClasse[key].accessoire += Number(l.total_ligne)
        }
      }
    }
    setComparaisonGazAcc(Object.values(parJourClasse))

    setChargementGraphiques(false)
  }, [boutiqueActive])

  useEffect(() => {
    chargerDonnees()
    chargerGraphiques()
  }, [chargerDonnees, chargerGraphiques])

  async function validerFondCaisse() {
    const montant = parseFloat(nouveauFond)
    if (isNaN(montant) || montant < 0) return
    const ancienMontant = fondMontant

    const { data, error } = await supabase
      .from('fonds_caisse')
      .upsert(
        {
          boutique_id: boutiqueActive.id,
          date_jour: aujourdhui(),
          montant,
          defini_par: user.id,
          modifie_par: user.id,
          modifie_le: new Date().toISOString(),
        },
        { onConflict: 'boutique_id,date_jour' }
      )
      .select()
      .single()

    if (!error) {
      setFondCaisse(data)
      setShowModalFond(false)
      setNouveauFond('')
      await journaliser({
        boutiqueId: boutiqueActive.id,
        utilisateurId: user.id,
        action: 'modif_fond_caisse',
        cibleType: 'fond_caisse',
        cibleId: data.id,
        detail: `Fond de caisse modifié de ${ancienMontant.toLocaleString('fr-FR')} F à ${montant.toLocaleString('fr-FR')} F`,
      })
    }
  }

  const fondMontant = fondCaisse ? Number(fondCaisse.montant) : Number(boutiqueActive?.fond_caisse_defaut || 0)
  const etatCaisse = fondMontant + venteGaz.total + venteAcc.total - achatsJour - depensesJour

  if (chargement) {
    return (
      <>
        <Topbar titre="Tableau de bord" sub="Chargement…" />
        <div className="content"><p className="td-light">Chargement des données du jour…</p></div>
      </>
    )
  }

  return (
    <>
      <Topbar
        titre="Tableau de bord"
        sub={`Journée du ${new Date().toLocaleDateString('fr-FR')} · ${boutiqueActive?.nom || ''}`}
      />
      <div className="content">
        <div className="caisse-display">
          <div className="caisse-row">
            <div>
              <div className="caisse-label">État de caisse — aujourd'hui</div>
              <div className="caisse-amount">
                {etatCaisse.toLocaleString('fr-FR')} <span style={{ fontSize: 18, opacity: 0.6 }}>F</span>
              </div>
              <div className="caisse-sub">Fond de caisse + ventes − achats − dépenses</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="caisse-label">Fond de caisse ouverture</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Space Grotesk' }}>
                {fondMontant.toLocaleString('fr-FR')} F
              </div>
              {isAdmin ? (
                <button
                  className="btn btn-sm"
                  style={{ background: 'rgba(255,255,255,0.12)', color: 'white', marginTop: 6, border: 'none' }}
                  onClick={() => { setNouveauFond(String(fondMontant)); setShowModalFond(true) }}
                >
                  Modifier
                </button>
              ) : (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: 6 }}>
                  🔒 Modifiable par l'admin uniquement
                </span>
              )}
            </div>
          </div>

          <div className="caisse-grid">
            <div className="caisse-item">
              <div className="caisse-item-label">① Dépenses du jour</div>
              <div className="caisse-item-val red">− {depensesJour.toLocaleString('fr-FR')} F</div>
            </div>
            <div className="caisse-item">
              <div className="caisse-item-label">② Ventes Gaz</div>
              <div className="caisse-item-val green">+ {venteGaz.total.toLocaleString('fr-FR')} F</div>
            </div>
            <div className="caisse-item">
              <div className="caisse-item-label">③ Achats du jour</div>
              <div className="caisse-item-val red">− {achatsJour.toLocaleString('fr-FR')} F</div>
            </div>
            <div className="caisse-item">
              <div className="caisse-item-label">④ Ventes Accessoires ({venteAcc.nb})</div>
              <div className="caisse-item-val green">+ {venteAcc.total.toLocaleString('fr-FR')} F</div>
            </div>
            <div className="caisse-item">
              <div className="caisse-item-label">Marge du jour</div>
              <div className={'caisse-item-val ' + (margeJour >= 0 ? 'orange' : 'red')}>
                {margeJour >= 0 ? '+ ' : ''}{margeJour.toLocaleString('fr-FR')} F
              </div>
            </div>
            <div className="caisse-item">
              <div className="caisse-item-label">État = Fond+②+④−③−①</div>
              <div className="caisse-item-val green">{etatCaisse.toLocaleString('fr-FR')} F</div>
            </div>
          </div>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Ventes Gaz aujourd'hui</div>
              <span className="badge badge-orange">GAZ</span>
            </div>
            {Object.keys(venteGaz.parCategorie).length === 0 ? (
              <p className="td-light">Aucune vente Gaz enregistrée aujourd'hui.</p>
            ) : (
              <table style={{ width: '100%' }}>
                <thead><tr><th>Catégorie</th><th>Recharges vendues</th><th>Somme</th></tr></thead>
                <tbody>
                  {Object.entries(venteGaz.parCategorie).map(([cat, v]) => (
                    <tr key={cat}>
                      <td><span className={'tag-' + cat.toLowerCase()}>{cat}</span></td>
                      <td className="td-bold">{v.qte}</td>
                      <td className="td-bold">{v.total.toLocaleString('fr-FR')} F</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--bg)' }}>
                    <td className="td-bold">Total</td>
                    <td className="td-bold">{Object.values(venteGaz.parCategorie).reduce((s, v) => s + v.qte, 0)}</td>
                    <td className="td-bold" style={{ color: 'var(--primary)' }}>{venteGaz.total.toLocaleString('fr-FR')} F</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Ventes Accessoires aujourd'hui</div>
              <span className="badge badge-info">ACC</span>
            </div>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr style={{ background: 'var(--bg)' }}>
                  <td className="td-bold">Total accessoires vendus</td>
                  <td className="td-bold">{venteAcc.nb}</td>
                  <td className="td-bold" style={{ color: 'var(--primary)' }}>{venteAcc.total.toLocaleString('fr-FR')} F</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ══════════ GRAPHIQUES INTERACTIFS ══════════ */}
        <div className="section-title" style={{ marginTop: 24 }}>📊 Analyse visuelle</div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Évolution des ventes — 14 derniers jours</div>
          </div>
          {chargementGraphiques ? (
            <p className="td-light">Chargement du graphique…</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={evolutionVentes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8500A" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#E8500A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} F`, 'Ventes']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="total" stroke="#E8500A" strokeWidth={2} fill="url(#colorVentes)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Répartition par quartier</div>
              <span className="card-sub">30 derniers jours</span>
            </div>
            {chargementGraphiques ? (
              <p className="td-light">Chargement…</p>
            ) : repartitionQuartier.length === 0 ? (
              <p className="td-light">Pas encore assez de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={repartitionQuartier}
                    dataKey="total"
                    nameKey="quartier"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {repartitionQuartier.map((entry, index) => (
                      <Cell key={entry.quartier} fill={COULEURS_QUARTIER[index % COULEURS_QUARTIER.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString('fr-FR')} F`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Gaz vs Accessoires</div>
              <span className="card-sub">7 derniers jours</span>
            </div>
            {chargementGraphiques ? (
              <p className="td-light">Chargement…</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={comparaisonGazAcc} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString('fr-FR')} F`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="gaz" name="Gaz" fill="#E8500A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="accessoire" name="Accessoires" fill="#0369A1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {showModalFond && (
        <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && setShowModalFond(false)}>
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-header">
              <div className="modal-title">💵 Fond de caisse d'ouverture</div>
              <button className="modal-close" onClick={() => setShowModalFond(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Montant avec lequel vous ouvrez la caisse ce jour</label>
              <input
                className="form-input"
                type="number"
                value={nouveauFond}
                onChange={(e) => setNouveauFond(e.target.value)}
                style={{ fontSize: 18, fontWeight: 700, padding: 14 }}
                autoFocus
              />
              <span className="form-hint">Ce montant est inclus dans le calcul de l'état de caisse en fin de journée.</span>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModalFond(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={validerFondCaisse}>Valider le fond de caisse</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Topbar({ titre, sub }) {
  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{titre}</div>
        <div className="topbar-sub">{sub}</div>
      </div>
    </div>
  )
}
