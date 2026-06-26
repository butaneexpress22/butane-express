-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — MISE À JOUR : Numéro à contacter + Parrainage
-- À exécuter après les scripts précédents
-- ════════════════════════════════════════════════════════

-- Numéro à contacter sur chaque vente (différent du contact du client enregistré)
alter table ventes add column if not exists numero_a_contacter text;

-- Système de parrainage : chaque client peut avoir un parrain (un seul)
alter table clients add column if not exists parrain_id uuid references clients(id);

-- Marque si la première recharge du filleul a déjà généré le bonus au parrain (évite les doublons)
alter table clients add column if not exists bonus_parrainage_donne boolean default false;

-- ════════════════════════════════════════════════════════
-- FIN
-- ════════════════════════════════════════════════════════
