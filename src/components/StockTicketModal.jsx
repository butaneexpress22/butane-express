export default function StockTicketModal({ articlesGaz, articlesAcc, stockVides, boutique, etatCaisse, fondCaisse, caissierNom, onClose }) {
  const maintenant = new Date()
  const dateStr = maintenant.toLocaleDateString('fr-FR')
  const heureStr = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  // Totaux par catégorie (pleines = stock article gaz, vides = stock_vides)
  function totalPleines(categorie) {
    return articlesGaz
      .filter((s) => s.articles?.categorie === categorie)
      .reduce((sum, s) => sum + s.quantite, 0)
  }

  function totalVides(categorie) {
    const v = stockVides.find((sv) => sv.categorie === categorie)
    return v ? v.quantite : 0
  }

  function imprimer() {
    window.print()
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-header">
          <div className="modal-title">🧾 Ticket d'inventaire stock</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ticket-wrap" style={{ maxWidth: 320 }} id="zone-impression">
          <div className="ticket-center ticket-bold">DÉTAIL STOCK GAZ</div>
          <hr className="ticket-hr" />
          <div>Date : {dateStr} à {heureStr}</div>
          <hr className="ticket-hr" />

          <div className="ticket-row-header" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
            <span>Article</span><span>Catég.</span><span style={{ textAlign: 'right' }}>Qté</span>
          </div>
          <hr className="ticket-hr" style={{ marginTop: 0 }} />

          {articlesGaz.map((s) => (
            <div className="ticket-row-4" style={{ gridTemplateColumns: '2fr 1fr 1fr', marginBottom: 3 }} key={s.id}>
              <span>{s.articles?.designation}</span>
              <span>{s.articles?.categorie}</span>
              <span style={{ textAlign: 'right' }}><strong>{s.quantite}</strong></span>
            </div>
          ))}

          <hr className="ticket-hr" />
          <div className="ticket-center" style={{ fontSize: 10 }}>------- Pleines ------- Vides -------</div>
          <div className="ticket-row"><span>Total B6 :</span><span>{totalPleines('B6')}</span><span>{totalVides('B6')}</span></div>
          <div className="ticket-row"><span>Total B12 :</span><span>{totalPleines('B12')}</span><span>{totalVides('B12')}</span></div>

          <hr className="ticket-hr" />
          <div className="ticket-center ticket-bold">DÉTAIL STOCK ACCESSOIRES</div>
          <hr className="ticket-hr" />
          <div className="ticket-row-header" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <span>Article</span><span style={{ textAlign: 'right' }}>Qté</span>
          </div>
          <hr className="ticket-hr" style={{ marginTop: 0 }} />
          {articlesAcc.map((s) => (
            <div className="ticket-row" key={s.id}>
              <span>{s.articles?.designation}</span>
              <span><strong>{s.quantite}</strong></span>
            </div>
          ))}

          <hr className="ticket-hr" />
          <div className="ticket-row"><span>Fond de caisse :</span><span>{fondCaisse.toLocaleString('fr-FR')} F</span></div>
          <div className="ticket-row ticket-bold"><span>État de caisse :</span><span>{etatCaisse.toLocaleString('fr-FR')} F</span></div>
          <div className="ticket-row"><span>Caissier :</span><span>{caissierNom}</span></div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={imprimer}>🖨 Imprimer</button>
        </div>
      </div>
    </div>
  )
}
