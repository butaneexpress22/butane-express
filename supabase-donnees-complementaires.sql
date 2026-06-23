-- ════════════════════════════════════════════════════════
-- BUTANE EXPRESS — DONNÉES COMPLÉMENTAIRES
-- À exécuter après le script principal (schema.sql)
-- Ajoute des livreurs de test pour la boutique N'douci
-- ════════════════════════════════════════════════════════

insert into livreurs (boutique_id, nom, contact, vehicule)
select id, 'Kouamé Dosso', '07.11.22.33', 'Moto Bleue'
from boutiques where code = 'ND'
union all
select id, 'Yao Konan', '05.44.55.66', 'Moto Rouge'
from boutiques where code = 'ND';

-- Pour changer le mot de passe de l'administrateur (LAGO) :
-- update utilisateurs set mot_de_passe_hash = 'VotreNouveauMotDePasse' where code = 'ADM-001';

-- Pour ajouter un caissier :
-- insert into utilisateurs (code, nom, mot_de_passe_hash, role, boutique_id)
-- select 'USR-N001', 'Adjoua Koffi', 'motdepasse123', 'caissier', id
-- from boutiques where code = 'ND';
