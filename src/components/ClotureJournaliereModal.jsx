import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { journaliser } from '../lib/journal'

const aujourdhui = () => new Date().toISOString().slice(0, 10)

export default function ClotureJournaliereModal({ onClose, onCloture }) {
  const { boutiqueActive, user } = useAuth()
  const [onglet, setOnglet] = useState('cloturer')
  const [dejaClôturee, setDejaClôturee] = useState(false)
  const [resume, setResume] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState(false)
  const [historique, setHistorique] = useState([])
  const [chargementHistorique, setChargementHistorique] = useState(true)

  const chargerResumeJour = useCallback(async () => {
    if (!boutiqueActive) return
    setChargement(true)
    const jour = aujourdhui()

    const { data: dejaFait } = await supabase
      .from('journees_cloturees')
      .select('id')
      .eq('boutique_id', boutiqueActive.id)
      .eq('date_jour', jour)
      .maybeSingle()
    setDejaClôturee(!!dejaFait)

    const { data: fond } = await supabase
      .from('fonds_caisse')
      .select('montant')
      .eq('boutique_id', boutiqueActive.id)
      .eq('date_jour', jour)
      .maybeSingle()
    const fondMontant = fond ? Number(fond.montant) : Number(boutiqueActive.fond_caisse_defaut || 0)

    const { data: depenses } = await supabase
      .from('depenses')
      .select('montant')
      .eq('boutique_id', boutiqueActive.id)
      .eq('date_depense', jour)
    const totalDepenses = (depenses || []).reduce((s, d) => s + Number(d.montant), 0)

    const { data: achats } = await supabase
      .from('achats')
      .select('total')
      .eq('boutique_id', boutiqueActive.id)
      .gte('created_at', jour)
    const totalAchats = (achats || []).reduce((s, a) => s + Number(a.total), 0)

    const { data: ventes } = await supabase
      .from('ventes')
      .select('id, total')
      .eq('boutique_id', boutiqueActive.id)
      .gte('valide_at', jour)
      .in('statut', ['validee', 'en_livraison'])

    const venteIds = (ventes || []).map((v) => v.id)
    let gazTotal = 0
    let accTotal = 0
    let marge = 0

    if (venteIds.length > 0) {
      const { data: lignes } = await supabase
        .from('ventes_lignes')
        .select('quantite, prix_unitaire, total_ligne, articles(classe, prix_achat)')
        .in('vente_id', venteIds)

      for (const l of lignes || []) {
        const art = l.articles
        if (!art) continue
        const totalLigne = Number(l.total_ligne)
        marge += (Number(l.prix_unitaire) - Number(art.prix_achat)) * l.quantite
        if (art.classe === 'gaz') gazTotal += totalLigne
        else accTotal += totalLigne
      }
    }

    const etatCaisse = fondMontant + gazTotal + accTotal - totalAchats - totalDepenses

    setResume({
      fondCaisse: fondMontant,
      totalVentesGaz: gazTotal,
      totalVentesAcc: accTotal,
      totalAchats,
      totalDepenses,
      marge: marge - totalDepenses,
      etatCaisse,
      nbVentes: (ventes || []).length,
    })
    setChargement(false)
  }, [boutiqueActive])

  const chargerHistorique = useCallback(async () => {
    if (!boutiqueActive) return
    setChargementHistorique(true)
    const { data } = await supabase
      .from('journees_cloturees')
      .select('*, utilisateurs(nom)')
      .eq('boutique_id', boutiqueActive.id)
      .order('date_jour', { ascending: false })
      .limit(60)
    setHistorique(data || [])
    setChargementHistorique(false)
  }, [boutiqueActive])

  useEffect(() => {
    chargerResumeJour()
    chargerHistorique()
  }, [chargerResumeJour, chargerHistorique])

  async function cloturer() {
    if (!resume) return
    if (!confirm("Confirmer la clôture de la journée ? Les ventes du jour seront archivées dans l'historique.")) return
    setEnCours(true)

    const { error } = await supabase.from('journees_cloturees').insert({
      boutique_id: boutiqueActive.id,
      date_jour: aujourdhui(),
      fond_caisse: resume.fondCaisse,
      total_ventes_gaz: resume.totalVentesGaz,
      total_ventes_acc: resume.totalVentesAcc,
      total_achats: resume.totalAchats,
      total_depenses: resume.totalDepenses,
      marge: resume.marge,
      etat_caisse: resume.etatCaisse,
      nb_ventes: resume.nbVentes,
      cloture_par: user.id,
    })

    setEnCours(false)
    if (!error) {
      await journaliser({
        boutiqueId: boutiqueActive.id,
        utilisateurId: user.id,
        action: 'cloture_journaliere',
        cibleType: 'journee',
        detail: `Journée du ${new Date().toLocaleDateString('fr-FR')} clôturée — état de caisse : ${resume.etatCaisse.toLocaleString('fr-FR')} F`,
      })
      setDejaClôturee(true)
      chargerHistorique()
      if (onCloture) onCloture()
    } else {
      alert('Erreur lors de la clôture (peut-être déjà clôturée).')
    }
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">📋 Clôture journalière</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tabs">
          <button className={'tab-btn' + (onglet === 'cloturer' ? ' active' : '')} onClick={() => setOnglet('cloturer')}>Clôturer aujourd'hui</button>
          <button className={'tab-btn' + (onglet === 'historique' ? ' active' : '')} onClick={() => setOnglet('historique')}>Historique ({historique.length})</button>
        </div>

        {onglet === 'cloturer' ? (
          chargement ? (
            <p className="td-light">Chargement du résumé du jour…</p>
          ) : dejaClôturee ? (
            <div className="alert alert-success" style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid #BBF7D0' }}>
              ✅ <div>La journée d'aujourd'hui a déjà été clôturée. Consultez l'onglet Historique pour le détail.</div>
            </div>
          ) : (
            <>
              <div className="alert alert-warning">
                ⚠️ <div>Cette action archive le résumé de la journée. Les ventes restent visibles dans leur historique normal, mais ce résumé sera figé pour consultation future.</div>
              </div>
              <div className="kpi-grid kpi-3" style={{ marginBottom: 16 }}>
                <div className="kpi-card"><div className="kpi-value">{resume.nbVentes}</div><div className="kpi-label">Ventes validées</div></div>
                <div className="kpi-card"><div className="kpi-value" style={{ color: 'var(--success)' }}>{(resume.totalVentesGaz + resume.totalVentesAcc).toLocaleString('fr-FR')} F</div><div className="kpi-label">CA du jour</div></div>
                <div className="kpi-card"><div className="kpi-value" style={{ color: resume.marge >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{resume.marge.toLocaleString('fr-FR')} F</div><div className="kpi-label">Marge nette</div></div>
              </div>
              <table style={{ width: '100%', marginBottom: 16 }}>
                <tbody>
                  <tr><td>Fond de caisse</td><td className="td-bold" style={{ textAlign: 'right' }}>{resume.fondCaisse.toLocaleString('fr-FR')} F</td></tr>
                  <tr><td>Ventes Gaz</td><td className="td-bold" style={{ textAlign: 'right', color: 'var(--success)' }}>+ {resume.totalVentesGaz.toLocaleString('fr-FR')} F</td></tr>
                  <tr><td>Ventes Accessoires</td><td className="td-bold" style={{ textAlign: 'right', color: 'var(--success)' }}>+ {resume.totalVentesAcc.toLocaleString('fr-FR')} F</td></tr>
                  <tr><td>Achats</td><td className="td-bold" style={{ textAlign: 'right', color: 'var(--danger)' }}>− {resume.totalAchats.toLocaleString('fr-FR')} F</td></tr>
                  <tr><td>Dépenses</td><td className="td-bold" style={{ textAlign: 'right', color: 'var(--danger)' }}>− {resume.totalDepenses.toLocaleString('fr-FR')} F</td></tr>
                  <tr style={{ borderTop: '2px solid var(--border)' }}><td className="td-bold">État de caisse final</td><td className="td-bold" style={{ textAlign: 'right', color: 'var(--primary)', fontSize: 16 }}>{resume.etatCaisse.toLocaleString('fr-FR')} F</td></tr>
                </tbody>
              </table>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={cloturer} disabled={enCours}>
                {enCours ? 'Clôture en cours…' : '📋 Clôturer la journée maintenant'}
              </button>
            </>
          )
        ) : (
          <>
            {chargementHistorique ? (
              <p className="td-light">Chargement de l'historique…</p>
            ) : historique.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">Aucune journée clôturée pour l'instant</div>
                <div className="empty-sub">Les journées archivées apparaîtront ici.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Ventes</th><th>CA</th><th>Marge</th><th>État caisse</th><th>Clôturé par</th></tr></thead>
                  <tbody>
                    {historique.map((j) => (
                      <tr key={j.id}>
                        <td className="td-bold">{new Date(j.date_jour).toLocaleDateString('fr-FR')}</td>
                        <td>{j.nb_ventes}</td>
                        <td>{(Number(j.total_ventes_gaz) + Number(j.total_ventes_acc)).toLocaleString('fr-FR')} F</td>
                        <td style={{ color: Number(j.marge) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{Number(j.marge).toLocaleString('fr-FR')} F</td>
                        <td className="td-bold">{Number(j.etat_caisse).toLocaleString('fr-FR')} F</td>
                        <td className="td-light">{j.utilisateurs?.nom || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
