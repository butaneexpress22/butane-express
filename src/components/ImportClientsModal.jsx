import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Parseur CSV simple : gère les guillemets et les virgules ou points-virgules comme séparateur
function parseCSV(text) {
  const separateur = text.includes(';') && !text.includes(',') ? ';' : ','
  const lignes = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  return lignes.map((ligne) => {
    const valeurs = []
    let courant = ''
    let dansGuillemets = false
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i]
      if (c === '"') {
        dansGuillemets = !dansGuillemets
      } else if (c === separateur && !dansGuillemets) {
        valeurs.push(courant.trim())
        courant = ''
      } else {
        courant += c
      }
    }
    valeurs.push(courant.trim())
    return valeurs
  })
}

export default function ImportClientsModal({ boutique, onClose, onTermine }) {
  const [fichier, setFichier] = useState(null)
  const [apercu, setApercu] = useState([])
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [resultat, setResultat] = useState(null)

  function lireFichier(file) {
    setFichier(file)
    setErreur('')
    setResultat(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const lignes = parseCSV(e.target.result)
        if (lignes.length < 2) {
          setErreur('Le fichier semble vide ou mal formaté.')
          return
        }
        setApercu(lignes)
      } catch (err) {
        setErreur('Impossible de lire ce fichier. Vérifiez son format.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  // Détecte si la 1ère ligne est un en-tête (texte) ou déjà des données
  function ligneEstEntete(ligne) {
    const conso = ligne[5]
    return conso === undefined || isNaN(parseInt(conso))
  }

  async function lancerImport() {
    if (apercu.length === 0) return
    setEnCours(true)
    setErreur('')

    let depart = ligneEstEntete(apercu[0]) ? 1 : 0
    const lignesAImporter = apercu.slice(depart)

    let succes = 0
    let echecs = 0
    let ignores = 0

    // Récupère le numéro client max existant pour ne pas créer de doublon de séquence
    for (const ligne of lignesAImporter) {
      const [numeroClient, nom, contact, quartier, detail, consoStr] = ligne
      if (!numeroClient || !numeroClient.trim()) {
        ignores++
        continue
      }

      const conso = parseInt(consoStr) || 0
      const numeroPropre = numeroClient.trim()

      // Vérifie si le client existe déjà (même numéro dans cette boutique)
      const { data: existant } = await supabase
        .from('clients')
        .select('id')
        .eq('boutique_id', boutique.id)
        .eq('numero_client', numeroPropre)
        .maybeSingle()

      if (existant) {
        ignores++
        continue
      }

      const { error } = await supabase.from('clients').insert({
        numero_client: numeroPropre,
        boutique_id: boutique.id,
        nom: nom?.trim() || null,
        contact: contact?.trim() || null,
        quartier: quartier?.trim() || null,
        detail: detail?.trim() || null,
        conso_totale: conso,
        fidelite_compteur: conso % 10,
        statut: conso > 0 ? 'actif' : 'prospect',
        derniere_commande_at: conso > 0 ? new Date().toISOString() : null,
      })

      if (error) echecs++
      else succes++
    }

    setEnCours(false)
    setResultat({ succes, echecs, ignores, total: lignesAImporter.length })
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">📥 Importer des clients depuis un fichier CSV</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!resultat ? (
          <>
            <div className="alert alert-info">
              ℹ️ <div>
                Le fichier doit contenir les colonnes dans cet ordre : <strong>N° client, Nom, Contact, Quartier, Détail complémentaire, Consommation</strong>.
                Si votre fichier est en Excel (.xlsx), ouvrez-le et faites <strong>Fichier → Enregistrer sous → format CSV (séparateur point-virgule ou virgule)</strong>, puis sélectionnez-le ici.
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Fichier CSV ou TXT</label>
              <input
                className="form-input"
                type="file"
                accept=".csv,.txt"
                onChange={(e) => e.target.files[0] && lireFichier(e.target.files[0])}
              />
            </div>

            {erreur && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erreur}</p>}

            {apercu.length > 0 && (
              <>
                <div className="section-title">Aperçu ({apercu.length} ligne{apercu.length > 1 ? 's' : ''} détectée{apercu.length > 1 ? 's' : ''})</div>
                <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr><th>N° client</th><th>Nom</th><th>Contact</th><th>Quartier</th><th>Détail</th><th>Consommation</th></tr>
                    </thead>
                    <tbody>
                      {apercu.slice(0, 8).map((ligne, i) => (
                        <tr key={i}>
                          {ligne.slice(0, 6).map((v, j) => <td key={j} className={i === 0 && ligneEstEntete(apercu[0]) ? 'td-bold' : ''}>{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {apercu.length > 8 && <p className="td-light" style={{ marginTop: 8 }}>… et {apercu.length - 8} ligne(s) supplémentaire(s).</p>}
              </>
            )}
          </>
        ) : (
          <div className="alert alert-success" style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid #BBF7D0' }}>
            ✅ <div>
              <strong>Import terminé !</strong> {resultat.succes} client{resultat.succes !== 1 ? 's' : ''} importé{resultat.succes !== 1 ? 's' : ''} avec succès.
              {resultat.ignores > 0 && ` ${resultat.ignores} ligne(s) ignorée(s) (déjà existant ou vide).`}
              {resultat.echecs > 0 && ` ${resultat.echecs} échec(s).`}
            </div>
          </div>
        )}

        <div className="modal-footer">
          {!resultat ? (
            <>
              <button className="btn btn-outline" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={lancerImport} disabled={apercu.length === 0 || enCours}>
                {enCours ? 'Import en cours…' : `Importer ${apercu.length > 0 ? (ligneEstEntete(apercu[0]) ? apercu.length - 1 : apercu.length) : ''} client(s)`}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onTermine}>Terminer</button>
          )}
        </div>
      </div>
    </div>
  )
}
