-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — MISE À JOUR : Catégories de dépenses
-- À exécuter après les scripts précédents
-- ════════════════════════════════════════════════════════

-- Table des catégories de dépenses
create table if not exists categories_depenses (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  created_at timestamptz default now()
);

-- Ajoute la colonne catégorie + détail complémentaire à la table dépenses existante
alter table depenses add column if not exists categorie_id uuid references categories_depenses(id);
alter table depenses add column if not exists detail text;

-- Catégories de base
insert into categories_depenses (nom) values
('Carburant'),
('Électricité'),
('Entretien moto'),
('Impression / Fournitures'),
('Salaire'),
('Loyer'),
('Autre')
on conflict (nom) do nothing;

-- ════════════════════════════════════════════════════════
-- FIN
-- ════════════════════════════════════════════════════════
