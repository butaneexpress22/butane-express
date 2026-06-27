-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — MISE À JOUR v6 : Sécurité, configurabilité, clôture
-- À exécuter après les scripts précédents (dans l'ordre)
-- ════════════════════════════════════════════════════════

-- ── 1) Suppression logique pour clients (au lieu de suppression réelle) ──
alter table clients add column if not exists supprime boolean default false;
alter table clients add column if not exists modifie_le timestamptz;
alter table clients add column if not exists modifie_par uuid references utilisateurs(id);

-- ── 2) Journal d'activité (traçabilité des actions sensibles) ──
create table if not exists journal_activite (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid references boutiques(id),
  utilisateur_id uuid references utilisateurs(id),
  action text not null,              -- ex: 'suppression_client', 'modif_fond_caisse', 'desactivation_article'
  cible_type text,                   -- ex: 'client', 'article', 'fond_caisse'
  cible_id uuid,
  detail text,                       -- description libre de ce qui a changé
  created_at timestamptz default now()
);

-- ── 3) Historique des fonds de caisse : déjà couvert par la table fonds_caisse existante ──
-- On ajoute juste une trace de qui a modifié et quand pour la traçabilité admin
alter table fonds_caisse add column if not exists modifie_le timestamptz;
alter table fonds_caisse add column if not exists modifie_par uuid references utilisateurs(id);

-- ── 4) Livreurs configurables : ajout actif déjà présent, on ajoute juste un flag de suppression douce ──
alter table livreurs add column if not exists supprime boolean default false;

-- ── 5) Catégories de dépenses : ajout d'un flag actif (au lieu de suppression réelle) ──
alter table categories_depenses add column if not exists actif boolean default true;

-- ── 6) Clôture journalière : table d'archive des journées ──
create table if not exists journees_cloturees (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid references boutiques(id) not null,
  date_jour date not null,
  fond_caisse numeric not null default 0,
  total_ventes_gaz numeric not null default 0,
  total_ventes_acc numeric not null default 0,
  total_achats numeric not null default 0,
  total_depenses numeric not null default 0,
  marge numeric not null default 0,
  etat_caisse numeric not null default 0,
  nb_ventes int not null default 0,
  cloture_par uuid references utilisateurs(id),
  cloture_le timestamptz default now(),
  unique(boutique_id, date_jour)
);

-- ── 7) Achat de bouteilles neuves (distinct de la recharge) ──
-- On réutilise la table achats existante avec un nouveau champ type_achat
alter table achats add column if not exists type_achat text default 'recharge' check (type_achat in ('recharge', 'neuve'));

-- ── 8) Suppression logique des articles (au lieu du flag actif déjà existant, on garde actif mais on trace qui a désactivé) ──
alter table articles add column if not exists desactive_par uuid references utilisateurs(id);
alter table articles add column if not exists desactive_le timestamptz;

-- ════════════════════════════════════════════════════════
-- FIN
-- ════════════════════════════════════════════════════════
