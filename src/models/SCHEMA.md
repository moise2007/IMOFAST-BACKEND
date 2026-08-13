## Table des matières

1. [Locataire](#1-locataire)
2. [Bailleur](#2-bailleur)
3. [Admin](#3-admin)
4. [Bien](#4-bien)
5. [Annonce](#5-annonce)
6. [Candidature](#6-candidature)
7. [Visite](#7-visite)
8. [Conversation](#8-conversation)
9. [Message](#9-message)
10. [Avis](#10-avis)
11. [Commentaire](#11-commentaire)
12. [Favori](#12-favori)
13. [Signalement](#13-signalement)
14. [Logique de Score](#14-logique-de-score)

---

## 1. Locataire

> Utilisateur cherchant un logement à louer.

### 1.1 Identité & Contact

| Champ        | Type       | Contraintes         |
|--------------|------------|---------------------|
| _id          | ObjectId   | Auto-généré         |
| nom          | String     | Requis              |
| prenom       | String     | Requis              |
| email        | String     | Unique, indexé      |
| telephone    | String     |                     |
| password     | String     | Hash bcrypt         |
| photoProfil  | String/URL |                     |
| status       | Enum       | `actif` `suspendu` `blacklisté` |
| createdAt    | Timestamp  | Auto                |

### 1.2 Authentification Sociale (OAuth)

| Champ      | Type   |
|------------|--------|
| googleId   | String |
| facebookId | String |

### 1.3 Préférences de Recherche

| Champ                  | Type            | Exemple                      |
|------------------------|-----------------|------------------------------|
| preferences.types      | Array\<String\> | `["Studio", "Appartement"]`  |
| preferences.maxBudget  | Number          |                              |
| preferences.meuble     | Boolean         |                              |
| preferences.villes     | Array\<String\> | `["Yaoundé", "Douala"]`      |

### 1.4 Scoring & Réputation

| Champ                 | Type    | Notes                                         |
|-----------------------|---------|-----------------------------------------------|
| score.global          | Number  | 0–100, calculé automatiquement                |
| score.badge           | Enum    | `non_évalué` `bronze` `argent` `or` `premium` |

### 1.5 Notation (Avis reçus — 40%)

| Champ                                     | Type    | Notes              |
|-------------------------------------------|---------|--------------------|
| notation.moyenne                          | Number  | 0–5                |
| notation.nombreAvis                       | Number  | Défaut: 0          |

### 1.6 Complétude du Profil (25%)

| Champ                                  | Type    | Défaut |
|----------------------------------------|---------|--------|
| completudeProfil.pourcentage           | Number  | 0      |

### 1.7 Signalements (20%)

| Champ                              | Type    | Défaut |
|------------------------------------|---------|--------|
| signalements.total                 | Number  | 0      |
| signalements.dernierSignalementAt  | Date    | null   |

### 1.8 Activité & Fiabilité (15%)

| Champ                                  | Type    | Notes                                |
|----------------------------------------|---------|--------------------------------------|
| activite.candidaturesSoumises          | Number  | Défaut: 0                            |
| activite.candidaturesAcceptees         | Number  | Défaut: 0                            |
| activite.visitesDemandees              | Number  | Défaut: 0                            |
| activite.visitesHonorees               | Number  | Visites auxquelles il s'est présenté |

### 1.9 Vérification

| Champ                        | Type    | Défaut |
|------------------------------|---------|--------|
| verification.emailVerifie    | Boolean | false  |
| verification.telephoneVerifie| Boolean | false  |

### 1.10 Modération

| Champ                        | Type     | Notes                       |
|------------------------------|----------|-----------------------------|
| moderation.nombresuspension  | Number   | Suspension temporaire       |

---

## 2. Bailleur

> Propriétaire ou gestionnaire proposant des logements.

### 2.1 Identité & Contact

| Champ           | Type          | Contraintes                     |
|-----------------|---------------|---------------------------------|
| _id             | ObjectId      | Auto-généré                     |
| nom             | String        | Requis                          |
| prenom          | String        | Requis                          |
| email           | String        | Unique, indexé                  |
| telephone       | String        |                                 |
| password        | String        | Hash bcrypt                     |
| photoProfil     | String/URL    |                                 |
| dateNaissance   | Date          |                                 |
| localisation    | GeoJSON Point | `[lon, lat]`                 |
| status          | Enum          | `actif` `suspendu` `blacklisté` |
| createdAt       | Timestamp     | Auto                            |

### 2.2 Authentification Sociale (OAuth)

| Champ      | Type   |
|------------|--------|
| googleId   | String |
| facebookId | String |

### 2.3 Vérification Identité

| Champ                         | Type         | Notes                         |
|-------------------------------|--------------|-------------------------------|
| cni.numero                    | String       |                               |
| cni.imageRecto                | String/URL   |                               |
| cni.imageVerso                | String/URL   |                               |
| imageAnciensContrats          | Array\<URL\> |                               |
| verification.emailVerifie     | Boolean      | false                         |
| verification.telephoneVerifie | Boolean      | false                         |
| verification.cniVerifiee      | Boolean      | false                         |
| verification.cniVerifieeAt    | Date         | null                          |
| verification.cniVerifieeParId | ObjectId     | Ref: Admin                    |
| verification.estDigne         | Boolean      | Flag manuel admin             |

### 2.4 Scoring & Réputation

| Champ        | Type   | Notes                                         |
|--------------|--------|-----------------------------------------------|
| score.global | Number | 0–100, calculé automatiquement                |
| score.badge  | Enum   | `non_évalué` `bronze` `argent` `or` `premium` |

### 2.5 Notation (Avis reçus — 40%)

| Champ                     | Type   | Notes              |
|---------------------------|--------|--------------------|
| notation.moyenne          | Number | 0–5                |
| notation.nombreAvis       | Number | Défaut: 0          |

### 2.6 Complétude du Profil (25%)

| Champ                                    | Type    | Défaut |
|------------------------------------------|---------|--------|
| completudeProfil.pourcentage             | Number  | 0      |

### 2.7 Signalements (20%)

| Champ                              | Type  | Défaut |
|------------------------------------|-------|--------|
| signalements.total                 | Number| 0      |
| signalements.dernierSignalementAt  | Date  | null   |

### 2.8 Activité & Fiabilité (15%)

| Champ                               | Type   | Notes                   |
|-------------------------------------|--------|-------------------------|
| activite.annoncesActives            | Number | Défaut: 0               |
| activite.annoncesTotales            | Number | Défaut: 0               |
| activite.tauxReponse                | Number | % messages répondus     |
| activite.delaiReponseHeure          | Number | Délai moyen en heures   |
| activite.derniereActiviteAt         | Date   | null                    |

### 2.9 Modération

| Champ                        | Type     | Notes                 |
|------------------------------|----------|-----------------------|
| moderation.avertissements    | Number   | Défaut: 0             |
| moderation.nombresSuspension | Number   | Suspension temporaire |

---

## 3. Admin

> Modérateur ou super-administrateur de la plateforme.

| Champ     | Type     | Notes                              |
|-----------|----------|------------------------------------|
| _id       | ObjectId | Auto-généré                        |
| email     | String   | Unique                             |
| password  | String   | Hash bcrypt                        |
| degre     | Enum     | `superAdmin` `moderateur` `support`|
| createdAt | Timestamp| Auto                               |

---

## 4. Bien

> Logement physique enregistré par un bailleur.

| Champ                    | Type           | Notes                          |
|--------------------------|----------------|--------------------------------|
| _id                      | ObjectId       | Auto-généré                    |
| bailleurId               | ObjectId       | Ref: Bailleur                  |
| titre                    | String         | Requis                         |
| description              | String         |                                |
| localisation             | GeoJSON Point  | `[lon, lat]`, indexé           |
| adresse                  | String         | Adresse lisible                |
| photos                   | Array\<URL\>   | Min. 1 photo                   |
| cout.prix                | Number         |                                |
| cout.duree               | Enum           | `jour` `semaine` `mois` `an`   |
| cout.valeurDuree         | Number         | ex: 1 pour "1 mois"            |
| caution                  | Number         |                                |
| nombreExemplaires        | Number         | Défaut: 1                      |
| superficie               | Number         | en m²                          |
| nombreChambres           | Number         |                                |
| nombreCuisines           | Number         |                                |
| nombreSDB                | Number         |                                |
| nombreSalons             | Number         |                                |
| options.meubles          | Array\<String\>|                                |
| options.procheEcole      | Array\<String\>|                                |
| options.procheMarche     | Array\<String\>|                                |
| options.autres           | Array\<String\>|                                |
| securite                 | Boolean        |                                |
| eau                      | Boolean        |                                |
| electricite              | Boolean        |                                |
| disponible               | Boolean        | Défaut: true                   |
| createdAt                | Timestamp      | Auto                           |

---

## 5. Annonce

> Publication d'un bien sur la plateforme.

| Champ           | Type      | Notes                                               |
|-----------------|-----------|-----------------------------------------------------|
| _id             | ObjectId  | Auto-généré                                         |
| bienId          | ObjectId  | Ref: Bien                                           |
| bailleurId      | ObjectId  | Ref: Bailleur (dénormalisé pour performance)        |
| titre           | String    | Peut différer du bien                               |
| status          | Enum      | `active` `suspendue` `expirée` `louée`              |
| estPubliee      | Boolean   | Défaut: false                                       |
| datePublication | Timestamp |                                                     |
| dateExpiration  | Timestamp | Optionnel                                           |
| vues            | Number    | Défaut: 0                                           |
| likes           | ArrayId   | Défaut: []  (c'est le tableau de id des locataires) |
| createdAt       | Timestamp | Auto                                                |

---

## 6. Candidature

> Demande d'un locataire pour une annonce.

| Champ          | Type      | Notes                                         |
|----------------|-----------|-----------------------------------------------|
| _id            | ObjectId  | Auto-généré                                   |
| annonceId      | ObjectId  | Ref: Annonce                                  |
| bienId         | ObjectId  | Ref: Bien                                     |
| locataireId    | ObjectId  | Ref: Locataire                                |
| prixSnapshot   | Number    | Prix au moment de la candidature              |
| dureeSnapshot  | String    | Durée snapshot (ex: "1 mois")                 |
| message        | String    | Message optionnel du locataire                |
| status         | Enum      | `en_attente` `acceptée` `refusée` `annulée`   |
| createdAt      | Timestamp | Auto                                          |

---

## 7. Visite

> Demande de visite d'un logement.

| Champ        | Type      | Notes                                          |
|--------------|-----------|------------------------------------------------|
| _id          | ObjectId  | Auto-généré                                    |
| annonceId    | ObjectId  | Ref: Annonce                                   |
| locataireId  | ObjectId  | Ref: Locataire                                 |
| dateDemande  | Timestamp | Auto                                           |
| dateVisite   | Timestamp | Fixée par le bailleur                          |
| heureVisite  | String    | ex: "10:00"                                    |
| status       | Enum      | `en_attente` `confirmée` `refusée` `annulée`   |
| createdAt    | Timestamp | Auto                                           |

---

## 8. Conversation

> Fil de discussion entre deux utilisateurs.

| Champ            | Type              | Notes                        |
|------------------|-------------------|------------------------------|
| _id              | ObjectId          | Auto-généré                  |
| participants     | Array\<ObjectId\> | Ref: Locataire ou Bailleur   |
| annonceId        | ObjectId          | Ref: Annonce (contexte)      |
| dernierMessage   | String            | Dénormalisé pour aperçu      |
| dernierMessageAt | Timestamp         | Pour tri                     |
| createdAt        | Timestamp         | Auto                         |

---

## 9. Message

> Message individuel dans une conversation.

| Champ              | Type      | Notes                              |
|--------------------|-----------|------------------------------------|
| _id                | ObjectId  | Auto-généré                        |
| conversationId     | ObjectId  | Ref: Conversation                  |
| senderId           | ObjectId  | Ref: Locataire ou Bailleur         |
| senderType         | Enum      | `locataire` `bailleur`             |
| contenu            | String    |                                    |
| type               | Enum      | `texte` `image` `fichier`          |
| mediaUrl           | String/URL| Si type ≠ texte                    |
| reponseAMessageId  | ObjectId  | Optionnel, message cité            |
| dateEnvoi          | Timestamp |                                    |
| dateRecu           | Timestamp |                                    |
| dateVu             | Timestamp |                                    |

---

## 10. Avis

> Note laissée après une expérience de location.  
> Un locataire note un **bailleur**, un bailleur note un **locataire**.

| Champ                         | Type      | Notes                           |
|-------------------------------|-----------|---------------------------------|
| _id                           | ObjectId  | Auto-généré                     |
| cibleId                       | ObjectId  | Ref: Bailleur ou Locataire      |
| cibleType                     | Enum      | `bailleur` `locataire`          |
| auteurId                      | ObjectId  | Ref: Locataire ou Bailleur      |
| auteurType                    | Enum      | `locataire` `bailleur`          |
| note                          | Number    | 1–5, requis                     |
| message                       | String    |                                 |
| createdAt                     | Timestamp | Auto                            |

---

## 11. Commentaire

> Commentaire public sur une annonce.

| Champ       | Type      | Notes              |
|-------------|-----------|--------------------|
| _id         | ObjectId  | Auto-généré        |
| annonceId   | ObjectId  | Ref: Annonce       |
| locataireId | ObjectId  | Ref: Locataire     |
| message     | String    | Requis             |
| likes       | Number    | Défaut: 0          |
| createdAt   | Timestamp | Auto               |

---

## 12. Favori

> Annonce sauvegardée par un locataire.

| Champ       | Type      | Notes          |
|-------------|-----------|----------------|
| _id         | ObjectId  | Auto-généré    |
| locataireId | ObjectId  | Ref: Locataire |
| annonceId   | ObjectId  | Ref: Annonce   |
| createdAt   | Timestamp | Auto           |

---

## 13. Signalement

> Alerte envoyée par un utilisateur sur une annonce ou un profil suspect.

| Champ         | Type      | Notes                                                                         |
|---------------|-----------|-------------------------------------------------------------------------------|
| _id           | ObjectId  | Auto-généré                                                                   |
| cibleType     | Enum      | `annonce` `bailleur` `locataire`                                              |
| cibleId       | ObjectId  | Ref selon cibleType                                                           |
| signaleurId   | ObjectId  | Ref: Locataire ou Bailleur                                                    |
| signaleurType | Enum      | `locataire` `bailleur`                                                        |
| motif         | Enum      | `fraude` `contenu_inapproprié` `faux_logement` `comportement_suspect` `autre` |
| message       | String    |                                                                               |
| status        | Enum      | `en_attente` `traité` `ignoré`                                                |
| adminId       | ObjectId  | Ref: Admin ayant traité                                                       |
| createdAt     | Timestamp | Auto                                                                          |

---

## 14. Logique de Score

### 14.1 Dimensions & Pondération

| Dimension                     | Poids | Max pts |
|-------------------------------|-------|---------|
| ⭐ Avis reçus                 | 40%   | 40 pts  |
| 📋 Complétude du profil       | 25%   | 25 pts  |
| 🚩 Signalements & modération  | 20%   | 20 pts  |
| 🏃 Activité & fiabilité       | 15%   | 15 pts  |

### 14.2 Badges

| Badge       | Score                      |
|-------------|----------------------------|
| non_évalué  | Nouveau compte, aucun avis |
|  bronze     | 30–49                      |
|  argent     | 50–69                      |
|  or         | 70–84                      |
|  premium    | 85–100                     |

### 14.3 Déclencheurs de recalcul

| Événement                         | Action déclenchée                     |
|-----------------------------------|---------------------------------------|
| Nouvel avis reçu                  | Recalcul `notation` + `score`         |
| Signalement confirmé par admin    | Recalcul `signalements` + `score`     |
| Profil mis à jour (photo, CNI...) | Recalcul `completudeProfil` + `score` |
| Visite honorée / manquée          | Mise à jour `activite` + `score`      |
| Message répondu                   | Mise à jour `tauxReponse` + `score`   |
| Suspension levée                  | Recalcul global                       |
| CNI vérifiée par admin            | Recalcul `completudeProfil` + `score` |
