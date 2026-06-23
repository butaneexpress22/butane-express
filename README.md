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

## 🆕 Mises à jour récentes (v3)

- **Ventes** : nouveau flux complet — recherche client par nom/téléphone/numéro avec suggestions, sélection d'article par identifiant (ex: `sim6`) qui auto-remplit tous les détails, choix Boutique/Domicile à l'encaissement, 4 rubriques (Toutes / En attente de livraison / Livraison en cours / Validées) avec actions de transition (assigner livreur, passer en livraison, valider, annuler)
- **Dépenses** : catégorisation (Carburant, Électricité, Entretien…) + champ détail complémentaire + répartition visuelle par catégorie
- **Stock** : bouton d'impression d'un ticket d'inventaire complet (gaz pleines/vides par catégorie + accessoires + état de caisse du jour)
- **Tableau de bord** : 3 nouveaux graphiques interactifs — évolution des ventes (14j), répartition par quartier (30j, camembert), comparaison Gaz vs Accessoires (7j)

### ⚠️ Scripts SQL à exécuter (dans l'ordre, en plus des précédents)
1. `supabase-categories-depenses.sql` — ajoute les catégories de dépenses
2. `supabase-statuts-ventes.sql` — met à jour les statuts de vente possibles (nouveau flux Boutique/Domicile)

## 📋 Ce qui est fonctionnel dans cette version

- ✅ Connexion par code utilisateur (admin / caissier)
- ✅ Tableau de bord journalier avec graphiques interactifs (évolution, répartition quartier, comparaison gaz/accessoires)
- ✅ Ventes : recherche client intelligente, sélection article par ID, flux Boutique/Domicile, 4 rubriques avec transitions guidées
- ✅ Clients : liste, recherche, filtres, création, fiche détaillée avec historique et fidélité
- ✅ Stock : bouteilles vides par catégorie (B6/B12), recharges pleines par compagnie, accessoires, ticket d'inventaire imprimable
- ✅ Achats fournisseurs : enregistrement, mise à jour automatique du stock + déduction des bouteilles vides
- ✅ Dépenses catégorisées avec répartition visuelle
- ✅ Historique consommation : recherche client, détail des recharges sur une période
- ✅ Suivi clients inactifs : liste automatique des clients sans commande depuis le seuil défini
- ✅ SAV : création de tickets, suivi par statut
- ✅ Mes Boutiques (admin), Tableau de bord général (admin), Utilisateurs (admin), Comptabilité (admin), Paramètres (admin)
- ✅ Logique automatique à la validation d'une vente : stock, bouteilles vides, fidélité, récompense au 10ème

**🎉 Tous les écrans du cahier des charges sont construits, avec les ajustements de personnalisation demandés !**

## 🗄️ Avant de déployer — scripts SQL complémentaires

En plus du script principal déjà exécuté, lancez dans l'ordre :
1. `supabase-donnees-complementaires.sql` — 2 livreurs de test
2. `supabase-categories-depenses.sql` — catégories de dépenses
3. `supabase-statuts-ventes.sql` — nouveaux statuts de vente

## ⚠️ Sécurité à renforcer avant usage réel

- Les mots de passe sont actuellement stockés et comparés en clair. Avant un usage en production avec de vraies données sensibles, il faudra ajouter une Supabase Edge Function pour hacher les mots de passe (bcrypt) plutôt que de les comparer côté client.
- Le RLS (Row Level Security) de Supabase n'est pas encore activé — chaque utilisateur de l'app peut techniquement requêter toutes les tables via la clé publique. À activer une fois les rôles bien testés.

## 🛠️ Pour les développeurs (si vous travaillez avec quelqu'un)

```bash
npm install
cp .env.example .env   # puis remplir avec vos clés Supabase
npm run dev
```
