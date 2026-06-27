-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — OPTIONNEL : Vider les articles de démo
-- ⚠️ N'exécutez ce script QUE si vous voulez repartir sans
-- les 7 articles de démonstration (Simam, Dist, Total, etc.)
-- et les recréer vous-même au fil de l'eau dans Achats.
--
-- Si vous avez déjà des ventes ou achats enregistrés sur ces
-- articles, NE PAS exécuter ce script (ça casserait l'historique).
-- Dans ce cas, désactivez-les plutôt depuis l'application
-- (Achats → liste des articles → Désactiver).
-- ════════════════════════════════════════════════════════

-- Désactive (ne supprime pas) les articles de démo pour les masquer des nouvelles ventes/achats
update articles set actif = false
where code in ('ART-001', 'ART-002', 'ART-003', 'ART-004', 'ART-005', 'ART-006', 'ART-007');

-- ════════════════════════════════════════════════════════
-- FIN
-- ════════════════════════════════════════════════════════
