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

## 🆕 Mises à jour récentes (v9)

- **Impression — Correction majeure** : auparavant, lancer l'impression réelle (pas l'aperçu) affichait toute la page (sidebar, boutons, fond gris) en plus du ticket. Désormais, seul le contenu du ticket (reçu client + souche livreur, ou ticket d'inventaire stock) est imprimé — tout le reste de l'interface est automatiquement masqué au moment de l'impression.
- **Impression — Texte en gras** : le texte du ticket imprimé est maintenant en gras et en noir pur, pour une meilleure lisibilité sur papier thermique (l'aperçu à l'écran reste inchangé, cette modification ne s'applique qu'au moment de l'impression réelle).
- **Quartiers — Script alternatif sans pré-remplissage** : `supabase-quartiers-vide.sql` crée la table sans les 5 quartiers de démonstration, pour repartir d'une liste totalement vide.

## 🆕 Mises à jour précédentes (v8)

- **Stock — Correction d'affichage** : la page Stock et le ticket d'inventaire imprimé à l'ouverture de caisse ne montrent plus les articles désactivés (ils étaient affichés par erreur depuis la v7).
- **Stock de départ — Bouteilles vides** : nouvelle carte **🍾 Ajustement stock bouteilles vides** dans **Paramètres**, réservée à l'administrateur. Permet de définir le stock initial de bouteilles vides (B6/B12) au démarrage, ou de corriger un écart constaté lors d'un inventaire physique. Chaque ajustement est tracé dans le journal d'activité.

## 🆕 Mises à jour précédentes (v7)

- **Import CSV — Correction des coordonnées GPS** : le parseur gère maintenant correctement les fichiers à séparateur point-virgule (`;`) contenant des coordonnées avec virgule décimale (ex: `5,85974`). Avant cette correction, une ligne sans virgule dans le séparateur principal pouvait être mal découpée.
- **Articles — Modification** : nouveau bouton **✏️ Modifier** sur chaque article dans Achats → onglet "Mes articles" (désignation, classe, catégorie, prix d'achat/vente, seuil d'alerte). Accessible à tous les utilisateurs ; la désactivation reste réservée à l'admin.

### 🗄️ Scripts utilitaires fournis (à usage ponctuel selon votre situation)
- `supabase-reinitialiser-donnees-test.sql` — supprime toutes les ventes et tous les clients de test d'une boutique pour repartir propre avant le vrai démarrage (ne touche pas aux articles, stock, livreurs, quartiers, utilisateurs)
- `supabase-desactiver-tous-articles.sql` — désactive tous les articles actifs existants (utile si vos articles de test polluent la vue Stock) ; recréez ensuite vos vrais articles depuis l'app

## 🆕 Mises à jour précédentes (v6)

- **Fond de caisse sécurisé** : à sa toute première connexion de la journée, un caissier doit obligatoirement saisir le fond de caisse d'ouverture avant d'accéder à l'application. Un ticket d'inventaire est automatiquement préparé pour impression à ce moment-là. Ensuite, seul un **administrateur** peut modifier ce montant (bouton "Modifier" retiré pour les caissiers sur le Tableau de bord).
- **Clients — Modifier/Supprimer** : nouveaux boutons sur la fiche client, réservés à l'administrateur. La suppression est "douce" (le client est masqué mais l'historique des ventes reste intact).
- **Listes configurables étendues** : en plus des Quartiers, **Livreurs** et **Catégories de dépenses** sont maintenant gérables depuis **Paramètres**, sans toucher au code.
- **Achats — 2 types distincts pour le Gaz** :
  - **♻️ Recharge** (comportement existant) : échange de bouteilles vides contre des pleines, le total de bouteilles ne change pas.
  - **🆕 Bouteilles neuves** (nouveau) : achat de bouteilles neuves qui augmente le total du parc (pleines +X, vides inchangées).
- **Achats — Liste d'articles vide par défaut** : les 7 articles de démonstration ne sont plus créés automatiquement sur un nouveau déploiement. Un onglet "Mes articles" permet de voir tous les articles actifs et de les **désactiver** (réservé à l'admin) sans casser l'historique des ventes passées.
- **Clôture journalière manuelle** : nouveau bouton **📋 Clôture journalière** sur la page Ventes. Il affiche un résumé de la journée en cours et permet de l'archiver d'un clic. Un onglet "Historique" liste toutes les journées déjà clôturées (CA, marge, état de caisse, qui a clôturé).
- **Journal d'activité** : les actions sensibles (modification du fond de caisse, modification/suppression d'un client, désactivation d'un article, clôture journalière) sont désormais tracées dans une table dédiée pour la traçabilité (consultable directement dans Supabase pour l'instant — table `journal_activite`).

### ⚠️ Scripts SQL à exécuter (en plus des précédents, dans l'ordre)
1. `supabase-v6-securite-configuration.sql` — toutes les nouvelles tables/colonnes (journal d'activité, suppression douce clients/livreurs, clôture journalière, type d'achat recharge/neuve)
2. `supabase-vider-articles-demo.sql` — **optionnel**, désactive les 7 articles de démonstration (Simam, Dist, Total...) si vous voulez repartir sans eux. ⚠️ Ne l'exécutez que si vous n'avez pas encore de ventes/achats réels sur ces articles.

## 🆕 Mises à jour précédentes (v5)

- **Quartiers configurables** : la liste des quartiers n'est plus figée dans le code. Allez dans **Paramètres → 📍 Quartiers** pour ajouter ou retirer un quartier à tout moment, sans avoir besoin de redéployer le code. Cette liste alimente automatiquement le formulaire de création client, les filtres clients et les filtres ventes.

### ⚠️ Script SQL à exécuter (en plus des précédents)
`supabase-quartiers.sql` — crée la table des quartiers configurables et reprend les 5 quartiers existants (Centre, Marché, Résidentiel, Périphérie, Abbeykro) pour N'douci

### 📥 Comment préparer votre fichier Excel pour l'import CSV de clients
1. Ouvrez votre fichier Excel actuel
2. Organisez les colonnes dans cet ordre exact : **N° client, Nom, Contact, Quartier, Détail complémentaire, Latitude, Longitude, Consommation**
3. `Fichier` → `Enregistrer sous` → choisissez le format **CSV (séparateur point-virgule)** ou **CSV (Comma delimited)**
4. Dans l'application, allez dans **Clients → 📥 Importer (CSV)**, sélectionnez ce fichier
5. Vérifiez l'aperçu, puis cliquez Importer

## 📋 Ce qui est fonctionnel dans cette version

- ✅ Connexion par code utilisateur (admin / caissier), avec **saisie obligatoire du fond de caisse** à la première connexion du jour pour les caissiers + impression automatique du ticket d'inventaire
- ✅ Tableau de bord journalier avec graphiques interactifs (évolution, répartition quartier, comparaison gaz/accessoires) ; fond de caisse modifiable par l'admin uniquement
- ✅ Ventes : recherche client intelligente, sélection article par ID, flux Boutique/Domicile, 4 rubriques avec transitions guidées, filtres quartier/livreur, numéro à contacter, **clôture journalière manuelle avec historique**
- ✅ Clients : liste, recherche, filtres, création avec parrainage et quartier configurable, import CSV en masse, fiche détaillée avec historique, fidélité, ajout manuel de consommation, **modification et suppression réservées à l'admin**
- ✅ Stock : bouteilles vides par catégorie (B6/B12), recharges pleines par compagnie, accessoires, ticket d'inventaire imprimable
- ✅ Achats fournisseurs : **distinction Recharge / Bouteilles neuves**, mise à jour automatique du stock, gestion des articles avec désactivation admin
- ✅ Dépenses catégorisées avec répartition visuelle (catégories configurables dans Paramètres)
- ✅ Historique consommation, Suivi clients inactifs, SAV
- ✅ Mes Boutiques (admin), Tableau de bord général (admin), Utilisateurs (admin), Comptabilité (admin)
- ✅ Paramètres (admin) : configuration boutique + **gestion des Quartiers, Livreurs et Catégories de dépenses en autonomie** (aucun redéploiement requis pour ces listes)
- ✅ Journal d'activité pour les actions sensibles (traçabilité admin)
- ✅ Logique automatique : stock, bouteilles vides, fidélité, récompense au 10ème, bonus de parrainage à la 1ère recharge du filleul

## 🗄️ Avant de déployer — scripts SQL complémentaires (dans l'ordre)

1. `supabase-donnees-complementaires.sql` — 2 livreurs de test
2. `supabase-categories-depenses.sql` — catégories de dépenses
3. `supabase-statuts-ventes.sql` — nouveaux statuts de vente
4. `supabase-parrainage-contact.sql` — numéro à contacter + parrainage
5. `supabase-quartiers.sql` — quartiers configurables
6. `supabase-v6-securite-configuration.sql` — sécurité, clôture journalière, type d'achat, journal d'activité
7. `supabase-vider-articles-demo.sql` — **optionnel**, désactive les articles de démo

## ⚠️ Sécurité à renforcer avant usage réel

- Les mots de passe sont actuellement stockés et comparés en clair. Avant un usage en production avec de vraies données sensibles, il faudra ajouter une Supabase Edge Function pour hacher les mots de passe (bcrypt) plutôt que de les comparer côté client.
- Le RLS (Row Level Security) de Supabase n'est pas encore activé — chaque utilisateur de l'app peut techniquement requêter toutes les tables via la clé publique. À activer une fois les rôles bien testés.

## 🛠️ Pour les développeurs (si vous travaillez avec quelqu'un)

```bash
npm install
cp .env.example .env   # puis remplir avec vos clés Supabase
npm run dev
```
