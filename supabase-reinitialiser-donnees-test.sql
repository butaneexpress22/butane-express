-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — RÉINITIALISATION COMPLÈTE DES DONNÉES DE TEST
-- Supprime toutes les ventes ET tous les clients de la boutique,
-- pour repartir sur une base propre avant le vrai démarrage.
-- ════════════════════════════════════════════════════════
--
-- ⚠️ ATTENTION : Action définitive et irréversible.
-- Ne touche pas aux articles, au stock, aux livreurs, aux quartiers,
-- aux utilisateurs ni aux paramètres de la boutique — uniquement
-- aux ventes et aux clients.
--
-- Remplacez 'ND' par le code de votre boutique si différent.
-- ════════════════════════════════════════════════════════

-- ── 1) Supprimer les lignes de vente (détail des paniers) ──
delete from ventes_lignes
where vente_id in (
  select id from ventes where boutique_id = (select id from boutiques where code = 'ND')
);

-- ── 2) Supprimer les tickets SAV liés à ces ventes ou clients ──
delete from sav_tickets
where boutique_id = (select id from boutiques where code = 'ND');

-- ── 3) Supprimer l'historique de fidélité lié à ces clients ──
delete from fidelite_recompenses
where boutique_id = (select id from boutiques where code = 'ND');

-- ── 4) Supprimer les ventes elles-mêmes ──
delete from ventes
where boutique_id = (select id from boutiques where code = 'ND');

-- ── 5) Supprimer tous les clients de la boutique ──
delete from clients
where boutique_id = (select id from boutiques where code = 'ND');

-- ── 6) (Optionnel) Remettre le stock de bouteilles vides à zéro,
--      puisqu'il a pu être modifié par les ventes de test.
--      Décommentez si vous voulez aussi repartir de zéro sur le stock.

-- update stock_vides set quantite = 0
-- where boutique_id = (select id from boutiques where code = 'ND');

-- update stock set quantite = 0
-- where boutique_id = (select id from boutiques where code = 'ND');

-- ════════════════════════════════════════════════════════
-- FIN — Vous pouvez maintenant relancer votre import CSV
-- des vrais clients sans risque de doublons.
-- ════════════════════════════════════════════════════════
