-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — Désactiver TOUS les articles existants
-- (considérés comme articles de test à ce stade)
-- ════════════════════════════════════════════════════════
--
-- Ne supprime rien définitivement : les articles sont juste masqués
-- des nouvelles ventes/achats. Si un article a déjà été utilisé dans
-- une vraie vente, son historique reste consultable normalement.
--
-- Vous pourrez ensuite recréer vos vrais articles proprement
-- depuis l'application (Achats → + Créer un article).
-- ════════════════════════════════════════════════════════

update articles
set actif = false
where actif = true;

-- ════════════════════════════════════════════════════════
-- FIN — Allez dans Achats → onglet "Mes articles" pour
-- vérifier que la liste est maintenant vide, puis recréez
-- vos articles réels un par un.
-- ════════════════════════════════════════════════════════
