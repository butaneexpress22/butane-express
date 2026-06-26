# Butane Express — Application de gestion

Application web pour la gestion de Butane Express : ventes, stock, clients, fidélité, SAV, multi-boutiques.

## 🚀 Déploiement (gratuit, sans installer quoi que ce soit sur votre ordinateur)

### Étape 1 — Créer un compte GitHub (si vous n'en avez pas)
1. Allez sur **github.com** → **Sign up**
2. Créez votre compte gratuitement

### Étape 2 — Mettre le code sur GitHub
1. Sur github.com, cliquez **New repository**
2. Nom : `butane-express`
3. Laissez "Public" ou "Private" (au choix)
4. Cliquez **Create repository**
5. Sur la page suivante, cliquez **uploading an existing file**
6. Glissez TOUS les fichiers de ce dossier (gardez la structure des sous-dossiers `src/`, etc.)
7. Cliquez **Commit changes**

### Étape 3 — Déployer sur Vercel (gratuit)
1. Allez sur **vercel.com** → **Sign up** → connectez-vous avec votre compte GitHub
2. Cliquez **Add New Project**
3. Sélectionnez votre dépôt `butane-express`
4. Dans **Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL` = `https://oahlcgzxxkzekabwqjhz.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_OGuSaGqyHHuO3JUta64jDw_6y79lxN8`
5. Cliquez **Deploy**
6. Après 1-2 minutes → vous obtenez une adresse comme `butane-express.vercel.app`

🎉 **Votre application est en ligne et accessible depuis n'importe quel navigateur !**

---

## 🔐 Connexion par défaut

- **Code** : `ADM-001`
- **Mot de passe** : celui défini dans Supabase (table `utilisateurs`, colonne `mot_de_passe_hash`)

⚠️ **Important** : changez ce mot de passe rapidement après la première connexion (fonctionnalité à activer dans Paramètres).

## 🆕 Mises à jour récentes (v4)

- **Ventes** : filtres par Quartier (sur "En attente de livraison" et "Validées") et par Livreur (sur "Livraison en cours" et "Validées") ; champ "Numéro à contacter" ajouté à l'encaissement d'une livraison à domicile
- **Clients** : import en masse depuis un fichier CSV (colonnes : N° client, Nom, Contact, Quartier, Détail, Consommation) avec aperçu avant import et détection automatique des doublons ; système de parrainage (un client peut avoir un parrain, choisi par recherche) ; bouton "Ajouter une consommation" sur la fiche client pour corriger/compléter manuellement, avec déclenchement automatique du bonus parrainage à la première recharge du filleul

### ⚠️ Script SQL à exécuter (en plus des précédents)
`supabase-parrainage-contact.sql` — ajoute le numéro à contacter sur les ventes et les colonnes de parrainage sur les clients

### 📥 Comment préparer votre fichier Excel pour l'import
1. Ouvrez votre fichier Excel actuel
2. Organisez les colonnes dans cet ordre exact : **N° client, Nom, Contact, Quartier, Détail complémentaire, Consommation**
3. `Fichier` → `Enregistrer sous` → choisissez le format **CSV (séparateur point-virgule)** ou **CSV (Comma delimited)**
4. Dans l'application, allez dans **Clients → 📥 Importer (CSV)**, sélectionnez ce fichier
5. Vérifiez l'aperçu, puis cliquez Importer

## 📋 Ce qui est fonctionnel dans cette version

- ✅ Connexion par code utilisateur (admin / caissier)
- ✅ Tableau de bord journalier avec graphiques interactifs (évolution, répartition quartier, comparaison gaz/accessoires)
- ✅ Ventes : recherche client intelligente, sélection article par ID, flux Boutique/Domicile, 4 rubriques avec transitions guidées, filtres quartier/livreur, numéro à contacter
- ✅ Clients : liste, recherche, filtres, création avec parrainage, import CSV en masse, fiche détaillée avec historique, fidélité et ajout manuel de consommation
- ✅ Stock : bouteilles vides par catégorie (B6/B12), recharges pleines par compagnie, accessoires, ticket d'inventaire imprimable
- ✅ Achats fournisseurs : enregistrement, mise à jour automatique du stock + déduction des bouteilles vides
- ✅ Dépenses catégorisées avec répartition visuelle
- ✅ Historique consommation, Suivi clients inactifs, SAV
- ✅ Mes Boutiques (admin), Tableau de bord général (admin), Utilisateurs (admin), Comptabilité (admin), Paramètres (admin)
- ✅ Logique automatique : stock, bouteilles vides, fidélité, récompense au 10ème, bonus de parrainage à la 1ère recharge du filleul

## 🗄️ Avant de déployer — scripts SQL complémentaires (dans l'ordre)

1. `supabase-donnees-complementaires.sql` — 2 livreurs de test
2. `supabase-categories-depenses.sql` — catégories de dépenses
3. `supabase-statuts-ventes.sql` — nouveaux statuts de vente
4. `supabase-parrainage-contact.sql` — numéro à contacter + parrainage

## ⚠️ Sécurité à renforcer avant usage réel

- Les mots de passe sont actuellement stockés et comparés en clair. Avant un usage en production avec de vraies données sensibles, il faudra ajouter une Supabase Edge Function pour hacher les mots de passe (bcrypt) plutôt que de les comparer côté client.
- Le RLS (Row Level Security) de Supabase n'est pas encore activé — chaque utilisateur de l'app peut techniquement requêter toutes les tables via la clé publique. À activer une fois les rôles bien testés.

## 🛠️ Pour les développeurs (si vous travaillez avec quelqu'un)

```bash
npm install
cp .env.example .env   # puis remplir avec vos clés Supabase
npm run dev
```
