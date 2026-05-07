# LIBITEX — Document Complet de Projet

## Plateforme ERP, POS & E-Commerce Nouvelle Generation

**Version** : 1.0
**Date** : 7 avril 2026

---

## Table des matieres

1. [Resume Executif](#1-resume-executif)
2. [Problematique du Marche](#2-problematique-du-marche)
3. [Vision et Objectifs](#3-vision-et-objectifs)
4. [Description Generale de la Solution](#4-description-generale-de-la-solution)
5. [Architecture Technique](#5-architecture-technique)
6. [Module Catalogue & Produits](#6-module-catalogue--produits)
7. [Module Achats & Importation (Landed Cost)](#7-module-achats--importation-landed-cost)
8. [Module Stock & Logistique (WMS)](#8-module-stock--logistique-wms)
9. [Module Vente au Detail (POS)](#9-module-vente-au-detail-pos)
10. [Module Vente en Gros (B2B)](#10-module-vente-en-gros-b2b)
11. [Module E-Commerce (Marketplace & Boutiques)](#11-module-e-commerce-marketplace--boutiques)
12. [Module Back-Office Commercant](#12-module-back-office-commercant)
13. [Module Administration Plateforme](#13-module-administration-plateforme)
14. [Securite, RBAC & Audit](#14-securite-rbac--audit)
15. [Synchronisation Offline-First](#15-synchronisation-offline-first)
16. [Pilotage & Tableaux de Bord](#16-pilotage--tableaux-de-bord)
17. [Comptabilite & Conformite Fiscale](#17-comptabilite--conformite-fiscale)
18. [Impressions & Documents](#18-impressions--documents)
19. [Migration & Onboarding](#19-migration--onboarding)
20. [Multi-Tenancy & SaaS](#20-multi-tenancy--saas)
21. [Strategie de Tests](#21-strategie-de-tests)
22. [Deploiement & Infrastructure](#22-deploiement--infrastructure)
23. [Roadmap de Developpement](#23-roadmap-de-developpement)
24. [Opportunite d'Investissement](#24-opportunite-dinvestissement)

---

## 1. Resume Executif

Le projet LIBITEX vise la conception et le deploiement d'une plateforme ERP commerciale integree, articulee autour de **3 acteurs principaux** :

- **Administrateurs Plateforme** : gestion globale de la plateforme SaaS (web, desktop si besoin natif sinon PWA)
- **Commercants & leurs equipes** : ERP + POS unifies dans une seule application (web, desktop si besoin natif sinon PWA, + version mobile allegee)
- **Consommateurs (Clients)** : acces a la marketplace et aux boutiques e-commerce (web uniquement)

La plateforme couvre la vente de gros, semi-gros et detail, avec un focus sur les marches africains ou la connectivite Internet est instable.

**Chaine de valeur couverte** :

```
Achats internationaux (Europe, Chine)
    -> Importation & Calcul du cout reel (Landed Cost)
        -> Gestion centralisee des stocks (entrepot -> boutiques)
            -> Vente multi-canal (POS, B2B, E-commerce)
                -> Pilotage strategique en temps reel
```

---

## 2. Problematique du Marche

Les acteurs du commerce generaliste font face a plusieurs difficultes structurelles :

| Probleme | Impact |
|----------|--------|
| Logiciels de caisse limites | Pas de gestion globale de l'activite |
| ERP internationaux couteux et complexes | Mal adaptes au contexte local |
| Couts d'importation mal maitrises | Pas de visibilite sur les marges reelles |
| Mauvaise gestion des stocks | Pertes financieres (vols, avaries, peremption) |
| Gros et detail dans le meme commerce | Regles tarifaires et logistiques differentes |
| Absence de canal e-commerce | Marche limite a la zone geographique physique |
| Connectivite instable | Impossibilite d'utiliser des solutions 100% cloud |

**Constat** : il existe un vide sur le marche pour une solution intermediaire — puissante mais accessible, adaptee au terrain, et capable de fonctionner offline.

---

## 3. Vision et Objectifs

### Vision

Creer la plateforme technologique de reference permettant aux commercants africains de gerer efficacement leur activite, de la source d'approvisionnement jusqu'au client final, y compris en ligne.

### Objectifs strategiques

1. **Centraliser** toutes les operations commerciales dans un seul systeme
2. **Reduire les pertes** et ameliorer la rentabilite grace a la tracabilite
3. **Offrir une visibilite en temps reel** aux dirigeants (mobile, desktop, web)
4. **Ouvrir un canal e-commerce** pour chaque commercant (marketplace + boutique individuelle)
5. **Accompagner la croissance** : d'une boutique unique a un reseau multi-sites
6. **Garantir la continuite** des operations meme sans Internet

---

## 4. Description Generale de la Solution

La solution est un **ERP modulaire** compose de plusieurs modules interconnectes mais deployables progressivement.

### Les 3 acteurs et leurs applications

| Acteur | Application | Technologie | Usage |
|--------|-------------|-------------|-------|
| **Admin Plateforme** | App Admin | Next.js (PWA) + Tauri si besoin natif | Gestion globale SaaS, tenants, monitoring |
| **Commercant & equipe** | App Commercant (ERP+POS) | Next.js (PWA) + Tauri si besoin natif | ERP complet + POS unifie, tout-en-un |
| **Commercant & equipe** | App Mobile Commercant | React Native | Version allegee : pilotage, notifications, validations |
| **Consommateur (Client)** | App E-Commerce | Next.js (SSR/SSG) | Marketplace + boutiques individuelles |

**Principe cle** : le POS et l'ERP (back-office) sont une **seule et meme application** pour le commercant. Pas de separation entre "caisse" et "gestion" — tout est integre dans une interface unifiee.

### Strategie Desktop : PWA-first, Tauri si necessaire

- **Par defaut** : l'application web (Next.js) est une **PWA** installable sur desktop, avec Service Workers pour le cache et le mode offline basique
- **Tauri** : deploye uniquement si des fonctionnalites natives sont indispensables et impossibles en PWA :
  - Impression directe ESC/POS (imprimantes thermiques via USB/reseau)
  - Acces au systeme de fichiers (import/export massif)
  - SQLite local pour un offline robuste
  - Controle du tiroir-caisse via port serie
- **Decision** : la PWA couvre 80% des cas. Tauri est un "upgrade" pour les commercants qui ont besoin du materiel POS physique

### Partage du code frontend

```
packages/
  ui/                  # Composants UI partages (React)
  shared/              # Types, utils, constantes partagees

apps/
  web-merchant/        # Next.js — App Commercant (ERP + POS unifie)
  web-marketplace/     # Next.js — E-Commerce (Marketplace + Boutiques)
  web-admin/           # Next.js — Admin Plateforme
  desktop-merchant/    # Tauri — Wrapper App Commercant (si besoin natif)
  mobile-merchant/     # React Native — App Mobile Commercant (allegee)
```

**Principe Tauri** : Tauri embarque une WebView qui charge l'application Next.js. Le meme code frontend sert pour le web et le desktop, avec des hooks conditionnels pour les fonctionnalites natives (impression, acces fichiers, SQLite local via le bridge Rust de Tauri).

---

## 5. Architecture Technique

### 5.1 Stack Technologique

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Backend API principal** | NestJS (TypeScript) | DDD, modularite, ecosystem mature, guards RBAC |
| **Backend haute performance** | Rust (Axum) | Sync engine, calculs financiers, operations critiques en perf |
| **Frontend Web (3 apps)** | Next.js (React) | App Commercant (ERP+POS), E-Commerce, Admin |
| **Desktop (si besoin natif)** | Tauri (Rust + WebView) | Wrapper App Commercant, acces peripheriques POS |
| **Mobile Commercant** | React Native | Version allegee : pilotage, notifications, validations |
| **Base de donnees cloud** | PostgreSQL | Robustesse, requetes complexes, JSONB |
| **Base de donnees locale** | IndexedDB (PWA) / SQLite (Tauri) | Offline POS et desktop |
| **File de messages** | Redis (BullMQ) -> Kafka a l'echelle | Evenements metier, sync offline |
| **Cache** | Redis | Sessions, cache catalogue, rate limiting |
| **Stockage fichiers** | S3-compatible (MinIO / AWS S3) | Images produits, documents, factures PDF |
| **Recherche** | Meilisearch | Recherche produits e-commerce, catalogue POS |

### 5.2 Repartition NestJS / Rust (Axum)

Le backend est divise en deux services complementaires :

**NestJS — Orchestrateur metier** :
- Authentification et autorisation (JWT, RBAC)
- CRUD et logique metier des modules (catalogue, achats, ventes, clients)
- API REST / GraphQL pour les frontends
- Webhooks et integrations tierces
- Gestion des fichiers et medias

**Rust (Axum) — Moteur de performance** :
- **Sync Engine** : resolution des conflits offline, merge des evenements, reconciliation des stocks
- **Calculs financiers** : Landed Cost, CUMP, marges, valorisation de stock
- **Moteur de regles tarifaires** : grilles de prix, promotions, remises conditionnelles
- **Traitement batch** : imports massifs, recalcul de stock, generation de rapports lourds
- **Gestion des evenements** : consommation/production Kafka/BullMQ a haut debit
- **Bridge Tauri** : fonctions natives pour l'application desktop (impression, fichiers, SQLite)

**Principe** : NestJS gere la logique metier et l'API, Rust gere tout ce qui demande performance, fiabilite et concurrence.

### 5.3 Communication inter-services

```
┌─────────────────────────────────────────────────────────┐
│                     Clients                              │
│  App Commercant (Next.js/Tauri)  |  E-Com  |  Admin   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / WebSocket
                       ▼
              ┌─────────────────┐
              │   API Gateway    │  (rate limiting, auth)
              │   (NestJS)       │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌────────┐ ┌──────────┐
   │  NestJS    │ │  Rust  │ │  Redis   │
   │  Modules   │ │  Axum  │ │  Cache   │
   │  Metier    │ │  Perf  │ │  Queue   │
   └─────┬──────┘ └───┬────┘ └──────────┘
         │            │
         ▼            ▼
   ┌──────────────────────────┐
   │      PostgreSQL           │
   │  (DB principale cloud)    │
   └──────────────────────────┘
```

**Communication NestJS <-> Rust** :
- **Appels synchrones** : HTTP interne (Axum expose une API REST interne, non publique)
- **Appels asynchrones** : via BullMQ/Redis (NestJS publie un job, Rust le consomme et repond)
- **Contrat partage** : schemas JSON valides des deux cotes (JSON Schema ou protobuf a terme)

### 5.4 Modele de donnees — Principes

- **Event Sourcing pour le stock** : le stock n'est jamais modifie directement, tout passe par des evenements (`STOCK_IN`, `STOCK_OUT`, `TRANSFER_OUT`, `TRANSFER_IN`, `ADJUSTMENT`). Le stock courant est une vue materialisee.
- **Soft Delete partout** : aucune suppression physique, chaque entite a un champ `deleted_at`.
- **Audit trail** : chaque mutation sensible est loggee avec `who`, `when`, `what`, `before`, `after`.
- **Multi-tenant** : chaque table possede un `tenant_id` (voir section Multi-Tenancy).
- **Horodatage UTC** : toutes les dates en UTC, conversion en local cote client.

---

## 6. Module Catalogue & Produits

### 6.1 Polymorphisme Produit

Le systeme supporte 4 comportements d'articles distincts via une **Type Strategy** :

```
product_type: SIMPLE | VARIANT | SERIALIZED | PERISHABLE
```

| Type | Description | Exemple | Gestion Stock |
|------|-------------|---------|---------------|
| **SIMPLE** | Produit standard | Chaises, stylos | Quantite |
| **VARIANT** | Produit a declinaisons (taille, couleur, matiere) | Vetements, chaussures | Quantite par variante (SKU distinct) |
| **SERIALIZED** | Produit unique par numero de serie | Telephones, ordinateurs | 1 par 1, IMEI/SN obligatoire |
| **PERISHABLE** | Produit a date de peremption | Alimentaire | Par lot, regle FEFO |

**Schema de base** :

```
products (produit parent)
  ├── id, tenant_id, name, description, product_type
  ├── category_id, brand_id, supplier_id
  ├── images[], barcode_ean13, barcode_internal
  ├── tax_rate, weight, dimensions
  └── is_active, created_at, updated_at, deleted_at

variants (SKU — existe pour tous les types)
  ├── id, product_id, sku
  ├── attributes (JSONB: {taille: "M", couleur: "Bleu"})
  ├── price_purchase, price_landed, price_retail, price_wholesale, price_vip
  └── barcode, is_active

batches (lots — produits PERISHABLE)
  ├── id, variant_id, batch_number
  ├── expiry_date, quantity_remaining
  └── received_at

serials (numeros de serie — produits SERIALIZED)
  ├── id, variant_id, serial_number
  ├── status (IN_STOCK | SOLD | RETURNED | DEFECTIVE)
  └── purchase_order_id, sale_id
```

### 6.2 Algorithme de vente selon le type

```
1. Scanner SKU / code-barres
2. Charger le product_type
3. Switch :
   SIMPLE     -> decrementer quantite
   VARIANT    -> decrementer la variante scannee
   SERIALIZED -> exiger saisie/scan IMEI, marquer le serial SOLD
   PERISHABLE -> sortie automatique FEFO (lot le plus proche de l'expiration)
```

**Avantage** : un seul moteur de vente, pas 4 systemes differents.

### 6.3 Gestion Tarifaire

- **Multi-tarifs par article** : Prix Achat, Prix Revient (Landed), Prix Public, Prix Gros, Prix VIP
- **Grilles tarifaires** : regles conditionnelles (quantite minimum, type client, periode)
- **Codes-barres multiples** : EAN13 international + code interne genere pour les produits sans etiquette
- **Le moteur de regles tarifaires tourne dans Rust (Axum)** pour la performance

### 6.4 Recherche Produits

- **Meilisearch** pour la recherche full-text (nom, SKU, code-barres, attributs)
- **Indexation en temps reel** via evenements lors de la creation/modification de produits
- **Recherche tolerante aux fautes** pour le POS (scan rapide, recherche texte approximative)

---

## 7. Module Achats & Importation (Landed Cost)

### 7.1 Objectif

Calculer la **rentabilite reelle** de chaque produit en integrant tous les frais d'approche, pas seulement le prix fournisseur.

### 7.2 Gestion des Fournisseurs

- Fiche fournisseur complete (local et international)
- Historique des commandes et performances (delais, qualite)
- Contacts multiples par fournisseur
- Devises par defaut et conditions de paiement

### 7.3 Commandes Fournisseurs (Purchase Orders)

- Creation de bons de commande
- **Multi-devises** : saisie en USD, EUR, CNY avec taux de change **fige a la validation de la commande**
- Gestion des **ecarts de change** : lors de la reception, si le taux a bouge significativement, le systeme enregistre un ecart de change (gain ou perte) dans un compte dedie
- Suivi des statuts : Brouillon -> Validee -> Partiellement Recue -> Recue -> Cloturee
- Gestion des **reliquats** (backorders) : si le fournisseur ne livre pas tout

### 7.4 Calcul du Landed Cost

**Formule** :

```
Cout Unitaire Debarque = Prix Achat Unitaire + (Frais Totaux / Quantite Totale)

Frais Totaux = Transport + Douanes + Transit + Assurance + Manutention + Divers
```

**Ventilation des frais** : proportionnelle a la quantite (ou au poids/volume selon configuration).

**Algorithme** (execute par Rust/Axum) :

```
pour chaque article dans la reception:
    part = article.quantite / quantite_totale_reception
    article.cout_debarque = prix_achat + (frais_totaux * part)

recalcul du CUMP:
    nouveau_cump = (stock_existant * ancien_cump + quantite_recue * cout_debarque)
                   / (stock_existant + quantite_recue)
```

### 7.5 Reception Marchandise

- Confrontation **Commande vs Reception** (ecarts signales)
- Saisie des numeros de serie (produits SERIALIZED) a la reception
- Saisie des numeros de lot et DLC (produits PERISHABLE) a la reception
- **Generation d'etiquettes code-barres** a l'arrivee pour l'etiquetage
- Photos des marchandises (constat avaries)

---

## 8. Module Stock & Logistique (WMS)

### 8.1 Principe Fondamental

**Le stock n'est jamais modifie directement.** Tout passe par des evenements :

| Evenement | Description |
|-----------|-------------|
| `STOCK_IN` | Entree de stock (reception fournisseur) |
| `STOCK_OUT` | Sortie de stock (vente) |
| `TRANSFER_OUT` | Sortie pour transfert inter-sites |
| `TRANSFER_IN` | Entree par transfert inter-sites |
| `ADJUSTMENT` | Ajustement d'inventaire (+ ou -) |
| `RETURN_IN` | Retour client |
| `DEFECTIVE_OUT` | Sortie vers stock defectueux |
| `WRITE_OFF` | Sortie pour perte / destruction |

**Architecture** :
- Table `stock_movements` : journal immuable de tous les mouvements
- Vue materialisee `current_stock` : stock courant calcule a partir des mouvements
- **Avantage** : audit parfait, reconstruction possible a tout moment

### 8.2 Architecture Multi-Depots

```
Hierarchie :
  Entrepot Principal
    ├── Zone Stockage A
    ├── Zone Stockage B
    └── Zone Quarantaine / Defectueux

  Boutique Paris
    └── Stock Boutique

  Boutique Dakar
    └── Stock Boutique
```

- Visibilite du stock en temps reel **par emplacement**
- Chaque mouvement est associe a un `location_id`

### 8.3 Transferts Inter-Sites

**Workflow securise** :

```
1. Boutique cree une demande de transfert
2. Entrepot valide la demande
3. Preparation de la commande interne
4. Sortie stock entrepot (TRANSFER_OUT) — scan des articles
5. Expedition (numero de suivi optionnel)
6. Reception boutique (TRANSFER_IN) — scan de verification
7. Ecarts signales si difference entre envoye et recu
```

Chaque etape = changement d'etat, jamais suppression.

### 8.4 Inventaires

- **Mode "Inventaire Aveugle"** : l'employe compte sans voir le stock theorique
- Comparaison automatique avec le stock systeme
- **Justification obligatoire** par le manager pour chaque ecart
- Inventaire total ou partiel (par zone, par categorie)
- Verrouillage des mouvements pendant l'inventaire d'une zone

### 8.5 Alertes

- Notification automatique si **Stock < Seuil Minimum**
- Alerte **DLC proche** (produits perissables a X jours de l'expiration)
- Alerte **stock dormant** (produits sans mouvement depuis X jours)
- Alerte **ecart anormal** (mouvement inhabituel)

---

## 9. Module Vente au Detail (POS)

### 9.1 Application

- **Integre dans l'App Commercant** (Next.js) — POS et ERP dans la meme application
- Interface tactile optimisee pour la vitesse (mode POS plein ecran)
- **PWA** : fonctionne offline via Service Workers + IndexedDB
- **Tauri** (si besoin natif) : SQLite local + acces imprimante thermique + tiroir-caisse
- Fonctionne sur tablette, ecran tactile ou PC standard

### 9.2 Fonctionnalites de Vente

- **Recherche intelligente** : scan code-barres, recherche texte, selection visuelle par categorie
- **Panier mixte** : dans un meme ticket, vendre un T-shirt (variante), un telephone (scan IMEI obligatoire) et un jus (sortie FEFO automatique)
- **Park/Hold** : mettre un panier en attente pour encaisser le client suivant
- **Remises** : pourcentage ou montant, sur ligne ou sur ticket (selon permissions)
- **Retours et echanges** : avec reference au ticket original

### 9.3 Paiements & Caisse

- **Multi-reglements** sur un ticket (ex: 50% especes + 50% mobile money)
- Moyens de paiement : especes, carte bancaire, mobile money, virement, credit client
- **Fond de caisse** : ouverture avec montant initial, fermeture avec comptage des billets
- Impression ticket (thermique 80mm) ou envoi par SMS/email
- **Ouverture tiroir-caisse** journalisee (meme sans vente)

### 9.4 Mode Deconnecte

- Toutes les fonctionnalites de vente restent disponibles hors ligne
- **PWA** : ventes enregistrees dans **IndexedDB**, Service Workers interceptent les requetes
- **Tauri** : ventes enregistrees dans **SQLite local** via le bridge Rust
- Les evenements sont mis en file d'attente (queue locale)
- Synchronisation automatique des que la connexion revient (voir section Sync)

---

## 10. Module Vente en Gros (B2B)

### 10.1 Interface

Interface de bureau (Next.js / Tauri) pour les commerciaux.

### 10.2 Cycle de Vente B2B

```
Devis -> Facture Proforma -> Bon de Livraison (decremente le stock) -> Facture Finale
```

Chaque etape = changement d'etat, jamais suppression. Un devis peut devenir proforma, une proforma peut devenir BL, etc.

### 10.3 Compte Client

- **Plafonnement de l'encours** : credit maximum autorise par client
- Blocage automatique si encours depasse
- Historique des achats
- **Suivi des creances** : paiements differes, echeancier, relances
- Conditions de paiement par client (comptant, 30 jours, 60 jours)

### 10.4 Grilles Tarifaires

- Prix par type de client : detail, grossiste, distributeur, VIP
- Prix par quantite (paliers)
- Gestion de la TVA et mentions legales obligatoires sur documents A4

---

## 11. Module E-Commerce (Marketplace & Boutiques)

### 11.1 Vue d'ensemble

Le module e-commerce offre **deux modes** :

1. **Marketplace** : vitrine multi-commercants sur un domaine principal (ex: `libitex.com`)
2. **Boutique individuelle** : espace dedie par commercant avec domaine personnalise (ex: `maboutique.com` ou `maboutique.libitex.com`)

### 11.2 Marketplace

- **Catalogue unifie** : les produits de tous les commercants sont visibles
- Recherche et filtres par categorie, commercant, prix, localisation
- Fiche produit avec photos, description, disponibilite
- Panier multi-commercants (commande splitee par commercant a la validation)
- Systeme d'avis et notation
- Pages commercant (profil, catalogue, avis)

### 11.3 Boutique Individuelle

- Chaque commercant peut **activer** son espace boutique
- **Sous-domaine automatique** : `nom-boutique.libitex.com`
- **Domaine personnalise** : le commercant peut connecter son propre domaine (ex: `www.maboutique.com`)
- Gestion DNS automatisee (certificat SSL Let's Encrypt via Caddy ou Traefik)
- **Personnalisation** : logo, couleurs, banniere, description, pages statiques
- Catalogue filtre (uniquement les produits du commercant)
- Meme moteur de commande que la marketplace

### 11.4 Gestion des Commandes E-Commerce

```
Commande recue
  -> Notification au commercant (push mobile + email)
  -> Validation par le commercant
  -> Preparation (decrementation stock)
  -> Expedition (numero de suivi)
  -> Livraison confirmee
  -> Paiement encaisse
```

### 11.5 Paiements E-Commerce

- Integration passerelles de paiement locales (mobile money, Wave, Orange Money)
- Cartes bancaires (Stripe / PayDunya selon les marches)
- Paiement a la livraison (COD — Cash On Delivery)
- **Commission plateforme** : pourcentage configurable par categorie/commercant
- Reversement automatique aux commercants (cycle configurable)

### 11.6 Architecture Technique E-Commerce

- **Next.js en mode SSR/SSG** pour le SEO (pages produits pre-generees)
- **Resolution du tenant** :
  - Par sous-domaine : `maboutique.libitex.com` -> `tenant_id = maboutique`
  - Par domaine personnalise : lookup dans une table `custom_domains` -> `tenant_id`
  - Marketplace : pas de filtrage tenant, catalogue global
- **CDN** pour les images produits et assets statiques
- **Meilisearch** pour la recherche produits cote e-commerce

---

## 12. App Commercant — ERP + POS Unifie

### 12.1 Principe : Une seule application

Le POS et le back-office (ERP) sont **une seule et meme application** Next.js. Le commercant navigue entre les modules via un menu lateral, dont un **mode POS plein ecran** optimise pour la vente au comptoir.

### 12.2 Acces Multi-Plateforme

| Support | Technologie | Usage |
|---------|-------------|-------|
| **Navigateur** | Next.js (PWA) | Acces complet ERP + POS, installable en PWA |
| **Desktop** | Tauri (meme code) | Uniquement si besoin natif (impression, peripheriques POS) |
| **Mobile** | React Native | Version allegee : pilotage, notifications, validations |

### 12.3 Fonctionnalites Web / Desktop (ERP + POS)

- **POS** : mode vente plein ecran, scan, panier, paiements, tickets
- Gestion complete du catalogue produits
- Gestion des achats et fournisseurs
- Gestion des stocks et transferts
- Ventes B2B (devis, factures, BL)
- Gestion des clients et creances
- Rapports et tableaux de bord
- Configuration boutique e-commerce
- Gestion des employes et permissions

### 12.4 Fonctionnalites Mobile (React Native)

Version orientee **pilotage et actions rapides** (pas de POS complet) :

- Dashboard temps reel (CA, ventes du jour, alertes)
- Notifications push (commande e-commerce, alerte stock, demande de transfert)
- Validation de transferts et ajustements
- Consultation des rapports
- Scan de produits (camera pour inventaire)

### 12.5 Specificites Tauri (Desktop — si necessaire)

Le wrapper Tauri n'est deploye que si la PWA ne couvre pas les besoins natifs :

- **Impression directe** : envoi vers imprimantes thermiques (ESC/POS) et laser sans dialogue navigateur
- **Controle peripheriques** : tiroir-caisse, afficheur client, balance
- **SQLite local** : offline robuste pour environnements a connectivite tres instable
- **Acces fichiers** : import/export CSV massif, sauvegarde locale
- **Mise a jour automatique** : auto-updater integre de Tauri

---

## 13. Module Administration Plateforme

### 13.1 Acces

- **Navigateur** (Next.js PWA) — par defaut, + Tauri si besoin natif
- Reserve aux administrateurs de la plateforme LIBITEX (pas les commercants)

### 13.2 Fonctionnalites

- **Gestion des tenants** : creation, suspension, suppression de comptes commercants
- **Configuration globale** : devises, taux de TVA, moyens de paiement, passerelles
- **Monitoring** : sante des services, metriques, logs
- **Gestion des abonnements** : plans SaaS, facturation, limites
- **Gestion des domaines personnalises** : validation DNS, certificats SSL
- **Moderation** : produits e-commerce, avis, signalements
- **Support** : acces aux comptes commercants pour assistance
- **Rapports plateforme** : revenus commissions, nombre de transactions, commercants actifs

---

## 14. Securite, RBAC & Audit

### 14.1 Authentification

- **JWT** avec refresh tokens
- **MFA** optionnel (TOTP) pour les comptes admin et manager
- Sessions revocables
- Rate limiting sur les endpoints sensibles

### 14.2 RBAC (Role-Based Access Control)

Implementation via **NestJS Guards** :

| Role | Acces |
|------|-------|
| **Vendeur** | Vente uniquement. Pas d'acces aux prix d'achat/marge. Suppression de ligne ticket = code superviseur |
| **Magasinier** | Stock et receptions. Pas d'acces aux caisses ni donnees financieres |
| **Commercial** | Ventes B2B, devis, factures. Pas d'acces a la configuration |
| **Manager** | Rapports, annulations, remises manuelles, validation inventaires |
| **Admin Commercant** | Acces complet au perimetre du tenant + configuration |
| **Super Admin** | Acces plateforme complete (equipe LIBITEX uniquement) |

### 14.3 Permissions Granulaires

Au-dela des roles, des permissions specifiques :
- `pos.void_line` — Annuler une ligne de ticket
- `pos.apply_discount` — Appliquer une remise
- `stock.adjust` — Ajuster manuellement le stock
- `purchase.validate` — Valider un bon de commande
- `report.view_margins` — Voir les marges

### 14.4 Audit Trail

Table `audit_logs` :

```
id | tenant_id | user_id | action | entity_type | entity_id | before (JSONB) | after (JSONB) | ip | timestamp
```

**Actions tracees** :
- Modification manuelle de stock
- Annulation de ticket
- Ouverture tiroir-caisse sans vente
- Modification de prix
- Suppression de donnee (soft delete)
- Connexion / deconnexion
- Changement de permissions

---

## 15. Synchronisation Offline-First

### 15.1 Le Defi

C'est le **risque technique principal** du projet. Le document original mentionne "sync par horodatage + priorite serveur" — cela ne suffit pas. Voici l'architecture complete.

### 15.2 Problemes a Resoudre

| Probleme | Exemple |
|----------|---------|
| **Conflit de stock** | 2 boutiques vendent le meme produit hors ligne -> stock negatif |
| **Conflit de prix** | Le cloud met a jour un prix pendant qu'une boutique vend offline a l'ancien |
| **Conflit de donnees client** | Credit accorde en boutique A et B simultanement -> encours depasse |
| **Ordre des evenements** | Reconnexion apres des heures, les evenements arrivent en desordre |

### 15.3 Architecture de Sync

**Composant** : Sync Engine (Rust/Axum)

```
┌──────────────────────┐          ┌──────────────────┐
│  App Commercant       │          │  Serveur Central  │
│                      │          │  (PostgreSQL)      │
│  PWA: IndexedDB      │          │                    │
│  Tauri: SQLite       │──push──▶ │  Sync Engine       │
│                      │          │  (Rust/Axum)       │
│  events_queue        │◀──pull── │                    │
│  (file locale)       │          │                    │
└──────────────────────┘          └──────────────────┘
```

### 15.4 Strategie de Resolution

**Principe : les ventes locales gagnent toujours.**

Une vente effectuee offline est **un fait accompli** : le produit a ete donne au client, l'argent a ete encaisse. Le systeme ne peut pas "annuler" cette vente.

**Regles de resolution** :

1. **Stock** : la vente decremente toujours. Si le stock devient negatif apres reconciliation, le systeme genere une **alerte de stock negatif** a traiter par un manager (pas un blocage).

2. **Prix** : la vente utilise le prix **au moment de la vente** (stocke dans le ticket). Si le prix a change entre-temps, la vente reste valide a l'ancien prix. Le nouveau prix s'appliquera aux ventes suivantes apres sync.

3. **Credit client** : la vente a credit est acceptee localement si l'encours local n'est pas depasse. Apres sync, si l'encours consolide depasse, une **alerte est generee** (pas un blocage retroactif).

4. **Ordre des evenements** : chaque evenement porte un **timestamp local + sequence number**. Le Sync Engine reconstruit la timeline correcte.

### 15.5 Flux de Sync

**Uplink (Local -> Cloud)** :

```
1. App Commercant cree un evenement (ex: SaleCompleted)
2. Evenement stocke dans events_queue (IndexedDB ou SQLite) avec status = PENDING
3. Quand Internet disponible :
   a. Lire les evenements PENDING par ordre chronologique
   b. Envoyer par batch au Sync Engine (Rust/Axum)
   c. Sync Engine valide, applique, detecte conflits
   d. Reponse avec status (OK, CONFLICT_RESOLVED, ALERT_GENERATED)
   e. Marquer les evenements comme SYNCED
```

**Downlink (Cloud -> Local)** :

```
1. App demande les mises a jour depuis son dernier sync_timestamp
2. Le serveur renvoie : catalogue (nouveaux produits, prix mis a jour), stock recalcule
3. App applique les mises a jour dans le store local (IndexedDB ou SQLite)
4. App met a jour son sync_timestamp
```

### 15.6 Idempotence

Chaque evenement a un **UUID unique**. Si le meme evenement est envoye deux fois (ex: timeout reseau, retry), le Sync Engine le detecte et l'ignore. C'est critique pour eviter les doublons de ventes.

---

## 16. Pilotage & Tableaux de Bord

### 16.1 Dashboard Commercant

**Indicateurs temps reel** :

| Indicateur | Description |
|------------|-------------|
| Chiffre d'affaires | Global et par point de vente, jour/semaine/mois |
| Marge brute | CA - Cout de Revient des Marchandises Vendues |
| Produits performants | Top / Flop ventes |
| Rotation de stock | Identification des "rossignols" (produits dormants) |
| Valorisation de stock | Valeur totale au PMP (Prix Moyen Pondere) |
| Encours clients | Total des creances en cours |
| Alertes | Stock bas, DLC proche, ecarts |

### 16.2 Rapports Cles

1. **Z de Caisse** : recapitulatif journalier par moyen de paiement
2. **Journal des Ventes** : detail de chaque transaction
3. **Etat des Creances** : suivi des paiements en attente
4. **Rapport d'Inventaire** : ecarts constates vs stock theorique
5. **Analyse des Marges** : par produit, categorie, fournisseur
6. **Performance Fournisseurs** : delais, qualite, prix

### 16.3 Dashboard Plateforme (Super Admin)

- Nombre de tenants actifs
- Volume de transactions global
- Revenus commissions e-commerce
- Metriques techniques (sync, erreurs, latence)

---

## 17. Comptabilite & Conformite Fiscale

### 17.1 Pourquoi c'est Necessaire

Un ERP commercial sans module comptable est incomplet. Les commercants ont besoin de documents fiscaux conformes (TVA, declarations).

### 17.2 Fonctionnalites

- **Plan comptable OHADA** (pour les marches UEMOA/CEMAC) configurable
- **Ecritures automatiques** : chaque vente, achat, mouvement de stock genere des ecritures comptables
- **Gestion de la TVA** : taux multiples, TVA collectee / deductible
- **Rapports fiscaux** : journal comptable, balance, compte de resultat simplifie
- **Export comptable** : format compatible avec les logiciels comptables locaux
- **Numerotation sequentielle** des factures (obligation legale)
- **Gestion des ecarts de change** : gains et pertes de change comptabilises

### 17.3 Implementation

Les ecritures sont generees **automatiquement** par les evenements metier :

```
Vente POS:
  Debit  : Caisse (ou Banque, ou Mobile Money)
  Credit : Ventes de marchandises
  Credit : TVA collectee

Achat fournisseur:
  Debit  : Achats de marchandises
  Debit  : TVA deductible
  Credit : Fournisseurs
```

---

## 18. Impressions & Documents

### 18.1 Le Defi

L'impression est un point de friction frequent dans les systemes POS. Le projet doit supporter :

| Document | Format | Imprimante |
|----------|--------|------------|
| Ticket de caisse | 80mm thermique | ESC/POS |
| Etiquette code-barres | Variable | Thermique (ZPL/EPL) |
| Facture A4 | PDF | Laser / Jet d'encre |
| Bon de livraison A4 | PDF | Laser / Jet d'encre |
| Devis / Proforma A4 | PDF | Laser / Jet d'encre |
| Z de caisse | 80mm ou A4 | Les deux |

### 18.2 Architecture d'Impression

**PWA (Navigateur)** :
- Generation de PDF cote serveur (via Rust ou NestJS)
- Telechargement ou ouverture dans le navigateur
- Pour les tickets thermiques : WebUSB (experimental) ou print server local leger
- Suffisant pour les factures A4 et la majorite des cas

**Desktop (Tauri — si deploye)** :
- Bridge Rust pour communication directe ESC/POS (USB/Reseau)
- Impression PDF via le systeme d'impression OS natif
- Controle tiroir-caisse et afficheur client
- Avantage Tauri : acces bas niveau aux peripheriques sans restriction navigateur

**Mobile (React Native)** :
- Pas d'impression directe (version allegee)
- Envoi de tickets par email/SMS depuis l'app

### 18.3 Templates

- Templates de documents parametrables par tenant (logo, coordonnees, mentions legales)
- Mentions legales obligatoires sur les factures (TVA, numero RCCM, etc.)
- Support multi-langue (francais, anglais minimum)

---

## 19. Migration & Onboarding

### 19.1 Le Defi

Les commercants cibles ont deja des donnees :
- Fichiers Excel
- Cahiers papier
- Ancien logiciel de caisse
- Connaissances en tete

### 19.2 Strategie de Migration

1. **Import CSV/Excel** :
   - Template d'import fourni pour : produits, clients, fournisseurs, stock initial
   - Validation des donnees avec rapport d'erreurs avant import
   - Mapping de colonnes configurable

2. **Saisie assistee** :
   - Wizard d'onboarding etape par etape
   - Creation du premier catalogue par scan de codes-barres
   - Import de photos par lot

3. **Stock initial** :
   - Inventaire de demarrage : saisie des quantites actuelles
   - Evenement `STOCK_IN` initial pour chaque article
   - Pas de tentative de reconstituer l'historique (on part de zero)

### 19.3 Onboarding Commercant

```
1. Inscription et creation du tenant
2. Configuration de base (devise, TVA, moyens de paiement)
3. Import ou creation du catalogue
4. Inventaire initial
5. Configuration des emplacements (entrepot, boutiques)
6. Creation des comptes utilisateurs et roles
7. Formation sur le POS (tutoriel interactif integre)
8. Go live
```

---

## 20. Multi-Tenancy & SaaS

### 20.1 Modele Choisi : Shared Database, Tenant Isolation par Row

Chaque table possede un `tenant_id`. Toutes les requetes sont filtrees par tenant.

**Pourquoi ce choix** (vs. database par tenant) :

| Critere | DB par tenant | Shared DB + tenant_id |
|---------|--------------|----------------------|
| Cout infra | Eleve (1 DB par client) | Faible (1 seule DB) |
| Complexite migration | Elevee (migrer N DBs) | Faible (1 seule migration) |
| Isolation des donnees | Forte | Forte (Row Level Security PostgreSQL) |
| Performance a l'echelle | Bonne | Bonne (index sur tenant_id) |

### 20.2 Securite Multi-Tenant

- **Row Level Security (RLS)** PostgreSQL : chaque requete est automatiquement filtree par `tenant_id`
- **Middleware NestJS** : extraction du `tenant_id` depuis le JWT et injection dans le contexte de requete
- **Tests automatises** : verification qu'aucune requete ne peut acceder aux donnees d'un autre tenant

### 20.3 Plans SaaS

| Plan | Limites | Prix |
|------|---------|------|
| **Starter** | 1 boutique, 500 produits, POS uniquement | Gratuit / Freemium |
| **Pro** | 3 boutiques, produits illimites, B2B, rapports | Abonnement mensuel |
| **Business** | Multi-sites, e-commerce, domaine personnalise | Abonnement mensuel + |
| **Enterprise** | Custom, SLA, support dedie | Sur devis |

### 20.4 Domaines Personnalises

```
1. Commercant saisit son domaine (ex: maboutique.com)
2. Systeme genere les enregistrements DNS a configurer (CNAME)
3. Commercant configure son DNS
4. Systeme verifie la propagation DNS
5. Generation automatique du certificat SSL (Let's Encrypt via Caddy/Traefik)
6. Table custom_domains mise a jour : domain -> tenant_id
7. Le reverse proxy route les requetes vers le bon tenant
```

---

## 21. Strategie de Tests

### 21.1 Le Defi

La matrice de tests est large :
- 4 types de produits x 2 modes de vente (POS/B2B) x 2 modes (online/offline) = 16 combinaisons minimum
- Multi-tenant (isolation)
- Sync offline (conflits)
- Calculs financiers (precision)

### 21.2 Pyramide de Tests

| Niveau | Scope | Outils | Couverture |
|--------|-------|--------|------------|
| **Unitaires** | Fonctions pures, calculs | Jest (TS), cargo test (Rust) | Landed Cost, CUMP, regles tarifaires, FEFO |
| **Integration** | Modules avec DB | Jest + PostgreSQL test, Supertest | CRUD, workflows, RBAC, event sourcing |
| **E2E** | Flux complets | Playwright (web), Detox (mobile) | Vente POS, cycle B2B, sync |
| **Performance** | Charge | k6 / Artillery | Sync engine, API sous charge |

### 21.3 Tests Critiques

- **Test de stock negatif** : 2 POS vendent le meme article offline, sync, verification que l'alerte est generee
- **Test d'idempotence** : meme evenement envoye 2 fois, aucun doublon
- **Test d'isolation tenant** : un tenant ne peut jamais voir/modifier les donnees d'un autre
- **Test FEFO** : verification que le lot le plus proche de l'expiration sort en premier
- **Test Landed Cost** : verification de la precision des calculs (arrondi, devises)
- **Test CUMP** : verification apres receptions multiples a prix differents

---

## 22. Deploiement & Infrastructure

### 22.1 Environnements

| Environnement | Usage | Infra |
|---------------|-------|-------|
| **Dev** | Developpement local | Docker Compose |
| **Staging** | Tests d'integration, recette | Docker Compose sur VPS |
| **Production** | Clients | Docker Compose -> Kubernetes quand necessaire |

### 22.2 Services en Production

```
docker-compose.yml (production initiale):
  - nestjs-api        (backend principal)
  - rust-axum         (sync engine + calculs)
  - postgresql        (base de donnees)
  - redis             (cache + queues BullMQ)
  - meilisearch       (recherche)
  - minio             (stockage fichiers S3-compatible)
  - caddy             (reverse proxy, SSL, routing domaines)
  - next-backoffice   (back-office web)
  - next-marketplace  (e-commerce)
  - next-admin        (admin plateforme)
```

### 22.3 Evolution vers Kubernetes

Passage a Kubernetes quand :
- Plus de 50 tenants actifs
- Besoin de scaling horizontal
- SLA de disponibilite > 99.5%

### 22.4 Monitoring

- **Metriques** : Prometheus + Grafana
- **Logs** : Loki (ou ELK)
- **Alertes** : PagerDuty / Telegram bot
- **APM** : OpenTelemetry pour le tracing distribue (NestJS <-> Rust)

---

## 23. Roadmap de Developpement

### Phase 1 — MVP (Fondations)

| Module | Contenu |
|--------|---------|
| **Catalogue** | 4 types de produits, multi-tarifs, codes-barres |
| **Stock** | Event sourcing, mouvements, stock courant, alertes basiques |
| **POS** | Vente, panier mixte, multi-paiements, ticket thermique, mode offline |
| **Sync** | Sync engine basique (push/pull, resolution conflits stock) |
| **Auth** | JWT, RBAC (4 roles), audit trail |
| **Rapports** | Z de caisse, journal des ventes, stock courant |
| **Infra** | Docker Compose, CI/CD, PostgreSQL, Redis |

### Phase 2 — Consolidation

| Module | Contenu |
|--------|---------|
| **Achats** | PO multi-devises, Landed Cost, reception, CUMP |
| **Stock avance** | Transferts inter-sites, inventaires, multi-depots |
| **B2B** | Devis, proforma, BL, factures, comptes clients, creances |
| **Sync robuste** | Gestion des conflits avancee, retry, idempotence |
| **Comptabilite** | Ecritures automatiques, TVA, plan OHADA |
| **Impressions** | Factures A4, etiquettes code-barres, templates personnalisables |

### Phase 3 — E-Commerce & Expansion

| Module | Contenu |
|--------|---------|
| **Marketplace** | Catalogue multi-commercants, recherche, panier, paiements |
| **Boutiques individuelles** | Sous-domaines, domaines personnalises, personnalisation |
| **App Mobile Commercant** | React Native, dashboard, notifications, validations |
| **Desktop (Tauri)** | Si besoin natif : impression, peripheriques, offline robuste |
| **Migration** | Import CSV/Excel, wizard d'onboarding |

### Phase 4 — Scale & Intelligence

| Module | Contenu |
|--------|---------|
| **Multi-boutiques avance** | Consolidation multi-sites, tableaux de bord comparatifs |
| **Application mobile dirigeant** | Dashboard executif, alertes, KPIs |
| **Fidelite client** | Points, niveaux, promotions |
| **IA / Previsions** | Prediction de stock, recommandations de commandes |
| **Kubernetes** | Passage a K8s, scaling horizontal, SLA |

---

## 24. Opportunite d'Investissement

### Marche Cible

- Commerce generaliste en Afrique de l'Ouest et Centrale
- Marche large et **sous-equipe** en solutions logicielles adaptees
- Croissance du commerce digital sur le continent

### Modele Economique

| Source de Revenus | Description |
|-------------------|-------------|
| **Abonnement SaaS** | Revenus recurrents mensuels par commercant |
| **Commission e-commerce** | Pourcentage sur les ventes marketplace |
| **Services premium** | Domaine personnalise, support dedie, formations |
| **Hardware** | Vente/location d'equipements POS (tablettes, imprimantes) |

### Avantages Competitifs

1. **Solution complete** : de l'import au client final, y compris e-commerce
2. **Offline-first** : fonctionne sans Internet, contrairement aux concurrents cloud-only
3. **4 types de produits** : commerce generaliste reel, pas un POS simplifie
4. **Landed Cost integre** : marge reelle, pas estimee
5. **Multi-canal** : POS + B2B + E-commerce dans un seul systeme
6. **Adapte au terrain** : mobile money, plan OHADA, multi-devises Afrique

### Scalabilite

- D'un commercant unique a des centaines via le modele SaaS
- Deploiement multi-sectoriel (textile, electronique, alimentaire, mixte)
- Expansion regionale progressive (UEMOA, CEMAC, puis continent)

---

## Annexe A — Glossaire

| Terme | Definition |
|-------|-----------|
| **CUMP** | Cout Unitaire Moyen Pondere — methode de valorisation du stock |
| **DLC** | Date Limite de Consommation |
| **FEFO** | First Expired, First Out — regle de sortie des produits perissables |
| **IMEI** | International Mobile Equipment Identity — numero de serie telephone |
| **Landed Cost** | Cout de revient reel incluant tous les frais d'approche |
| **OHADA** | Organisation pour l'Harmonisation en Afrique du Droit des Affaires |
| **PMP** | Prix Moyen Pondere (= CUMP) |
| **PO** | Purchase Order — Bon de commande fournisseur |
| **RBAC** | Role-Based Access Control |
| **RLS** | Row Level Security — securite au niveau des lignes PostgreSQL |
| **SKU** | Stock Keeping Unit — identifiant unique d'un article en stock |
| **Tenant** | Commercant / entreprise utilisant la plateforme |

## Annexe B — Schema d'Architecture Complet

```
  ┌─────────────────┐  ┌───────────────────────────────┐  ┌──────────────────┐
  │  CONSOMMATEURS  │  │        COMMERCANTS             │  │  ADMINS          │
  │  (Clients)      │  │        & Equipes               │  │  Plateforme      │
  │                 │  │                                │  │                  │
  │  E-Commerce     │  │  App Commercant (ERP+POS)      │  │  App Admin       │
  │  (Next.js SSR)  │  │  Next.js PWA | Tauri si natif  │  │  Next.js PWA     │
  │  Marketplace    │  │  + App Mobile (React Native)   │  │                  │
  │  + Boutiques    │  │    (version allegee)            │  │                  │
  └────────┬────────┘  └──────────────┬────────────────┘  └────────┬─────────┘
           │                          │                            │
           └──────────┬───────────────┘────────────────────────────┘
                       │  HTTPS / WebSocket
                       ▼
              ┌─────────────────────┐
              │   Caddy / Traefik    │  (Reverse Proxy, SSL, Routing Domaines)
              └─────────┬───────────┘
                        │
           ┌────────────┼────────────────┐
           ▼            ▼                ▼
    ┌────────────┐ ┌──────────┐   ┌───────────┐
    │  NestJS    │ │  Rust    │   │  Redis    │
    │  API       │ │  Axum    │   │           │
    │            │ │          │   │  Cache    │
    │  Auth      │ │  Sync    │   │  Sessions │
    │  RBAC      │ │  Engine  │   │  BullMQ   │
    │  Modules   │ │  Calculs │   │  Queues   │
    │  Metier    │ │  Batch   │   │           │
    └─────┬──────┘ └────┬─────┘   └───────────┘
          │             │
          ▼             ▼
    ┌──────────────────────────┐   ┌─────────────┐   ┌─────────────┐
    │  PostgreSQL (+ RLS)       │   │ Meilisearch │   │  MinIO (S3) │
    │  Base principale          │   │ Recherche   │   │  Fichiers   │
    └──────────────────────────┘   └─────────────┘   └─────────────┘
```
