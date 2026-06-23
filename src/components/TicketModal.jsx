export default function TicketModal({ vente, boutique, onClose }) {
  const client = vente.clients
  const lignes = vente.ventes_lignes || []
  const dateVente = new Date(vente.valide_at || vente.created_at)
  const dateStr = dateVente.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const heureStr = dateVente.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  function imprimer() {
    window.print()
  }

  return (
    <div className="modal-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 720 }}>
        <div className="modal-header">
          <div className="modal-title">🧾 Ticket & Souche livreur</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="two-col" id="zone-impression">
          <Ticket boutique={boutique} client={client} vente={vente} lignes={lignes} dateStr={dateStr} heureStr={heureStr} estSouche={false} />
          <Ticket boutique={boutique} client={client} vente={vente} lignes={lignes} dateStr={dateStr} heureStr={heureStr} estSouche={true} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={imprimer}>🖨 Imprimer</button>
        </div>
      </div>
    </div>
  )
}

function Ticket({ boutique, client, vente, lignes, dateStr, heureStr, estSouche }) {
  return (
    <div>
      <div className="section-title" style={{ textAlign: 'center', marginBottom: 10 }}>
        {estSouche ? 'SOUCHE LIVREUR' : 'TICKET CLIENT'}
      </div>
      <div className="ticket-wrap" style={estSouche ? { border: '2px dashed var(--primary)' } : {}}>
        {estSouche ? (
          <div className="ticket-center" style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--primary)', letterSpacing: 1 }}>
            — SOUCHE LIVREUR —
          </div>
        ) : (
          <>
            <div className="ticket-center ticket-bold" style={{ fontSize: 13 }}>🔥 {(boutique?.nom || 'BUTANE EXPRESS').toUpperCase()}</div>
            {boutique?.telephone && <div className="ticket-center" style={{ fontSize: 10 }}>Cel: {boutique.telephone}</div>}
            {boutique?.email && <div className="ticket-center" style={{ fontSize: 10 }}>Email: {boutique.email}</div>}
          </>
        )}

        <hr className="ticket-hr" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, fontSize: 10.5 }}>
          <div>Caisse: <strong>—</strong></div>
          <div>N° Client: <strong>{client?.numero_client}{boutique?.code}</strong></div>
          <div>N° reçu: <strong>{vente.numero_recu_complet}</strong></div>
          <div>Contact: <strong>{client?.contact || '—'}</strong></div>
          <div>Date: <strong>{dateStr} à {heureStr}</strong></div>
          <div>Quartier: <strong>{client?.quartier || '—'}</strong></div>
          <div>Conso: <strong>{client?.conso_totale ?? '—'}</strong></div>
          <div>Détail: <strong>{client?.detail || '—'}</strong></div>
        </div>

        <hr className="ticket-hr" />

        <div className="ticket-row-header" style={{ marginBottom: 4 }}>
          <span>Article</span><span>Cat.</span><span style={{ textAlign: 'right' }}>P/U</span><span style={{ textAlign: 'right' }}>L/R</span><span style={{ textAlign: 'center' }}>Qté</span><span style={{ textAlign: 'right' }}>Total</span>
        </div>
        <hr className="ticket-hr" style={{ marginTop: 0 }} />

        {lignes.map((l) => (
          <div className="ticket-row-4" key={l.id} style={{ marginBottom: 3 }}>
            <span>{l.articles?.designation}</span>
            <span>{l.articles?.categorie || ''}</span>
            <span style={{ textAlign: 'right' }}>{Number(l.prix_unitaire)}</span>
            <span style={{ textAlign: 'right' }}>{l.liv_red}</span>
            <span style={{ textAlign: 'center' }}>{l.quantite}</span>
            <span style={{ textAlign: 'right' }}><strong>{Number(l.total_ligne)}</strong></span>
          </div>
        ))}

        <hr className="ticket-hr" />

        <div className="ticket-row ticket-bold"><span></span><span>Total:</span><span>{Number(vente.total).toLocaleString('fr-FR')} CFA</span></div>
        {vente.somme_recue != null && (
          <>
            <div className="ticket-row"><span></span><span>Somme reçue:</span><span>{Number(vente.somme_recue).toLocaleString('fr-FR')} CFA</span></div>
            <div className="ticket-row ticket-bold"><span></span><span>Monnaie:</span><span>{Number(vente.monnaie).toLocaleString('fr-FR')} CFA</span></div>
          </>
        )}

        <hr className="ticket-hr" />

        {estSouche ? (
          <>
            <div style={{ fontSize: 10, textAlign: 'center', fontWeight: 'bold' }}>Livreur: {vente.livreurs?.nom || 'Retrait boutique'}</div>
            <div style={{ fontSize: 10, textAlign: 'center' }}>Signature: _______________</div>
          </>
        ) : (
          <>
            <div className="ticket-center" style={{ fontSize: 10, fontStyle: 'italic' }}>Merci de nous faire confiance 🙏</div>
            <div className="ticket-center" style={{ fontSize: 10 }}>{boutique?.nom} — Service rapide & fiable</div>
          </>
        )}
      </div>
    </div>
  )
}
