-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — MISE À JOUR : Quartiers configurables
-- À exécuter après les scripts précédents
-- ════════════════════════════════════════════════════════

create table if not exists quartiers (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid references boutiques(id) not null,
  nom text not null,
  created_at timestamptz default now(),
  unique(boutique_id, nom)
);

-- Reprend les 5 quartiers qui étaient codés en dur, pour la boutique N'douci
insert into quartiers (boutique_id, nom)
select id, q.nom
from boutiques b
cross join (values ('Centre'), ('Marché'), ('Résidentiel'), ('Périphérie'), ('Abbeykro')) as q(nom)
where b.code = 'ND'
on conflict (boutique_id, nom) do nothing;

-- ════════════════════════════════════════════════════════
-- FIN
-- ════════════════════════════════════════════════════════
