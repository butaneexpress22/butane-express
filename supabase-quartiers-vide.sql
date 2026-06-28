-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — Création table Quartiers (VIDE, sans pré-remplissage)
-- ════════════════════════════════════════════════════════
--
-- Crée uniquement la structure de la table. Aucun quartier
-- n'est ajouté automatiquement — vous les créerez vous-même
-- depuis l'application (Paramètres → 📍 Quartiers).
-- ════════════════════════════════════════════════════════

create table if not exists quartiers (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid references boutiques(id) not null,
  nom text not null,
  created_at timestamptz default now(),
  unique(boutique_id, nom)
);

-- ════════════════════════════════════════════════════════
-- FIN — Allez dans Paramètres → 📍 Quartiers pour ajouter
-- vos premiers quartiers.
-- ════════════════════════════════════════════════════════
