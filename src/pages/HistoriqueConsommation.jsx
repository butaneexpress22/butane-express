import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function HistoriqueConsommation() {
  const { boutiqueActive } = useAuth()
  const [numeroClient, setNumeroClient] = useState('')
  const [client, setClient] = useState(null)
  const [ventes, setVentes] = useState([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [periode, setPeriode] = useState(6)

  async function chercher() {
    if (!numeroClient.trim()) return
    setChargement(true)
    setErreur('')

    const { data: clientData, error } = await supabase
      .from('clients')
      .select('*')
      .eq('numero_client', numeroClient.trim())
      .eq('boutique_id', boutiqueActive.id)
      .maybeSingle()

    if (error || !clientData) {
      setClient(null)
      setVentes([])
      setErreur('Client introuvable.')
      setChargement(false)
      return
    }

    setClient(clientData)

    const dateLimite = new Date()
    dateLimite.setMonth(dateLimite.getMonth() - periode)

    const { data: ventesData } = await supabase
      .from('ventes')
      .select('*, ventes_lignes(*, articles(designation, classe, categorie))')
      .eq('client_id', clientData.id)
      .in('statut', ['validee', 'en_livraison', 'livree'])
      .gte('valide_at', dateLimite.toISOString())
      .order('valide_at', { ascending: false })

    setVentes(ventesData || [])
    setChargement(false)
  }

  // Construit la liste des lignes "recharge" pour l'affichage détaillé
  const lignesRecharges = []
  for (const v of ventes) {
    for (const l of v.ventes_lignes || []) {
      if (l.articles?.classe === 'gaz') {
        lignesRecharges.push({ vente: v, ligne: l })
      }
    }
  }

  const nbRecharges = lignesRecharges.reduce((s, item) => s + item.ligne.quantite, 0)
  const moisCouverts = Math.max(1, periode)
  const freqMoyenne = (nbRecharges / moisCouverts).toFixed(1)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Historique consommation</div>
          <div className="topbar-sub">Suivi personnalisé par client · {boutiqueActive?.nom}</div>
        </div>
      </div>

      <div className="content">
        <div className="filters-row">
          <div className="search-box" style={{ minWidth: 240 }}>
            🔍
            <input
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 13 }}
              placeholder="N° client, ex: 0087"
              value={numeroClient}
              onChange={(e) => setNumeroClient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && chercher()}
            />
          </div>
          <select className="f-select" value={periode} onChange={(e) => setPeriode(Number(e.target.value))}>
            <option value={3}>3 derniers mois</option>
            <option value={6}>6 derniers mois</option>
            <option value={12}>1 an</option>
          </select>
          <button className="btn btn-primary" onClick={chercher} disabled={chargement}>
            {chargement ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>

        {erreur && (
          <div className="alert alert-danger">⚠️ <div>{erreur}</div></div>
        )}

        {!client && !erreur && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <div className="empty-title">Recherchez un client</div>
              <div className="empty-sub">Entrez son numéro client pour voir son historique de consommation.</div>
            </div>
          </div>
        )}

        {client && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">{client.nom || 'Client sans nom'} — {client.numero_client}{boutiqueActive?.code}</div>
              <span className={'badge ' + (client.statut === 'actif' ? 'badge-success' : 'badge-neutral')}>
                {client.statut === 'actif' ? 'Actif' : 'Prospect'}
              </span>
            </div>

            <div className="two-col" style={{ marginBottom: 16 }}>
              <div className="kpi-card">
                <div className="kpi-value">{client.conso_totale}</div>
                <div className="kpi-label">Total recharges depuis le début</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-value">~{freqMoyenne}/mois</div>
                <div className="kpi-label">Fréquence moyenne (période sélectionnée)</div>
              </div>
            </div>

            {lignesRecharges.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <div className="empty-title">Aucune recharge sur cette période</div>
                <div className="empty-sub">Essayez une période plus longue.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>N° Reçu</th><th>Date</th><th>Article</th><th>Classe</th><th>Catégorie</th><th>Montant</th></tr></thead>
                  <tbody>
                    {lignesRecharges.map(({ vente, ligne }) => (
                      <tr key={ligne.id}>
                        <td>{vente.numero_recu_complet}</td>
                        <td className="td-light">{new Date(vente.valide_at).toLocaleDateString('fr-FR')}</td>
                        <td className="td-bold">{ligne.articles.designation}</td>
                        <td><span className="tag-gaz">GAZ</span></td>
                        <td><span className={'tag-' + (ligne.articles.categorie || '').toLowerCase()}>{ligne.articles.categorie}</span></td>
                        <td>{Number(ligne.total_ligne).toLocaleString('fr-FR')} F</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
