import { useState } from 'react'

// Composant générique pour gérer une liste configurable (ajout/suppression).
// items: tableau d'objets avec au moins {id, nom} (ou les champs passés via labelKey/extraFields)
// onAjouter(valeurs) doit retourner une Promise qui résout {success, message?}
// onSupprimer(item) doit retourner une Promise
export default function ListeConfigurable({
  titre,
  description,
  items,
  labelKey = 'nom',
  placeholder = 'Nom…',
  champsSupplementaires, // optionnel : fonction qui rend des champs additionnels (ex: contact pour livreur)
  onAjouter,
  onSupprimer,
  rendreLigne, // optionnel : fonction custom pour afficher chaque item (sinon affiche juste labelKey)
}) {
  const [valeur, setValeur] = useState('')
  const [valeursSupp, setValeursSupp] = useState({})
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function ajouter() {
    const propre = valeur.trim()
    setErreur('')
    if (!propre) return

    if (items.some((i) => (i[labelKey] || '').toLowerCase() === propre.toLowerCase())) {
      setErreur('Cet élément existe déjà.')
      return
    }

    setEnCours(true)
    const result = await onAjouter({ [labelKey]: propre, ...valeursSupp })
    setEnCours(false)

    if (result?.success === false) {
      setErreur(result.message || "Erreur lors de l'ajout.")
    } else {
      setValeur('')
      setValeursSupp({})
    }
  }

  async function supprimer(item) {
    if (!confirm(`Supprimer "${item[labelKey]}" ? Les éléments déjà liés garderont cette valeur en historique.`)) return
    await onSupprimer(item)
  }

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-header"><div className="card-title">{titre}</div></div>
      {description && <p className="td-light" style={{ marginBottom: 12 }}>{description}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          placeholder={placeholder}
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ajouter()}
          style={{ flex: 1, minWidth: 120 }}
        />
        {champsSupplementaires && champsSupplementaires(valeursSupp, setValeursSupp)}
        <button className="btn btn-primary btn-sm" onClick={ajouter} disabled={enCours || !valeur.trim()}>
          + Ajouter
        </button>
      </div>
      {erreur && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{erreur}</p>}

      {items.length === 0 ? (
        <p className="td-light">Aucun élément configuré pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
              {rendreLigne ? rendreLigne(item) : <span style={{ fontSize: 13, fontWeight: 500 }}>{item[labelKey]}</span>}
              <button className="btn btn-danger btn-xs" onClick={() => supprimer(item)}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
