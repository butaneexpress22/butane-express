-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — MISE À JOUR : Nouveaux statuts de vente
-- À exécuter après les scripts précédents
-- ════════════════════════════════════════════════════════

-- Supprime l'ancienne contrainte de statut et la recrée avec les nouvelles valeurs
alter table ventes drop constraint if exists ventes_statut_check;

alter table ventes add constraint ventes_statut_check
  check (statut in (
    'panier_attente',     -- panier mis en attente avant encaissement
    'a_valider',          -- panier validé dans le formulaire, encaissement pas encore fait
    'attente_livraison',  -- encaissée, livraison à domicile, livreur pas encore en route
    'en_livraison',       -- livreur assigné et en route
    'validee',            -- vente finalisée (boutique directe, ou livraison terminée)
    'annulee'
  ));

-- ════════════════════════════════════════════════════════
-- FIN
-- ════════════════════════════════════════════════════════
