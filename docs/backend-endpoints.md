# Imofast — contrat backend pour les frontends

Les routes ci-dessous sont préfixées par `/api`. Les identifiants des URL sont les `idPublic`, pas les identifiants techniques Firestore. Les réponses décrites omettent parfois `message`/`msg`, qui sont des textes traduits à afficher tels quels. Les valeurs d’énumération restent des codes stables à traduire dans le frontend.

## Conventions communes

- Architecture conservée : routes → contrôleurs → services → repositories → Firestore. Côté frontend : Repository pour HTTP, Service pour l’appel au Repository, Hook pour l’état de page, Store pour les données uniquement.
- Langue HTTP : `Accept-Language: fr` ou `en`, avec repli français. `?lang=en` est également détecté ; l’en-tête est prioritaire. Notifications et messages prédéfinis utilisent la langue du destinataire ; les emails admin utilisent `ADMIN_LANGUAGE`.
- Web : envoyer les cookies avec `credentials: 'include'`. Le cookie d’accès est `token` et le cookie de renouvellement est `refresh`, tous deux HTTP-only et signés. Mobile : conserver le mécanisme Bearer existant.
- Les routes protégées demandent un compte actif et une adresse email ou un téléphone vérifié. `GET /auth/me` retourne aussi les comptes actifs non vérifiés avec `user.verifie: false`.
- Erreurs : validation `400`, absence de session `401`, rôle interdit `403`, ressource absente ou inaccessible `404`, conflit métier `409`, recherche trop large `422`. Les validateurs existants conservent leur enveloppe `errors`, le gestionnaire métier renvoie `{success:false,message,...extra}`. Ne pas analyser le texte traduit pour piloter l’interface.
- Les dates métier de publication sont des chaînes ISO 8601 avec fuseau. Les rendez-vous utilisent `YYYY-MM-DD` et `HH:mm` dans `Africa/Douala`. Les champs Firestore existants tels que `createdAt` conservent leur sérialisation Timestamp.
- Les compteurs, notes de candidature, classements, règles d’accès et progression d’onboarding sont calculés/vérifiés par le serveur. `activiteInterne`, mots de passe, hachages de refresh et souscriptions navigateur sont retirés de la sérialisation HTTP, même imbriqués.

## 1. Notifications

| Méthode et route | Accès | Payload / query | Réponse |
| --- | --- | --- | --- |
| `POST /notification/subscribe` | Bailleur ou locataire | `{account:"bailleur:<idPublic>" ou "locataire:<idPublic>",web:{endpoint,expirationTime:null,keys:{p256dh,auth}}}` | `200 {success:true}` |
| `DELETE /notification/subscribe` | Bailleur ou locataire | `{endpoint}` | `200 {success:true,appareils}` |
| `GET /notification/preferences` | Bailleur ou locataire | Aucun | `{success:true,preferences}` |
| `PATCH /notification/preferences` | Bailleur ou locataire | Une partie des booléens de `preferences` | `{success:true,preferences}` fusionnées |
| `GET /notification` | Utilisateur connecté | Aucun ; 20 dernières notifications | `{success:true,notifications:[Notification],msg}` |
| `PATCH /notification/:id/read` | Destinataire | Aucun | `{success:true,msg}` |
| `PATCH /notification/read-all` | Destinataire | Aucun | `{success:true,msg}` |
| `DELETE /notification/:id` | Destinataire | Aucun | `{success:true,msg}` |

`preferences = {annonce,alerte,commentaire,candidature,message,conversation,favoris,note}` : tous les champs sont booléens et activés par défaut. Les choix déjà enregistrés sont conservés quand un nouvel appareil est ajouté. Les souscriptions sont fusionnées par `endpoint`, y compris les anciennes souscriptions `notification.web`. Les clés correspondent au résultat de `PushSubscription.toJSON()` (base64url, 87 caractères pour `p256dh`, 22 pour `auth`). Les endpoints HTTPS doivent appartenir à un service push navigateur reconnu.

Le compte envoyé doit correspondre à la session (`409` sinon). L’envoi parcourt tous les appareils. Seules les réponses push `404/410` retirent la souscription, sans supprimer une clé renouvelée entre-temps. Les erreurs transitoires conservent l’appareil. La réception effective dépend du navigateur et du fournisseur push.

Déclenchements : publication → locataires actifs ; alerte de locataire → bailleurs actifs ; commentaire/candidature → propriétaire de l’annonce. Les préférences du destinataire s’appliquent. Une diffusion de publication interrompue peut reprendre sans créer deux notifications persistées pour le même événement et destinataire. Le push reste une livraison au mieux, sans garantie exactement une fois.

`Notification` conserve notamment `{idPublic,type,cibleId,typeCible,titre,message,lu,createdAt,updatedAt}`. La création manuelle `POST /notification` est réservée à l’admin ; les frontends métier n’ont pas à créer eux-mêmes les notifications.

## 2. Vues et dashboard bailleur

| Méthode et route | Accès | Payload / query | Réponse |
| --- | --- | --- | --- |
| `POST /annonce/:id/vues` | Public | `{type:"simple" ou "profonde"}` | `{success:true,counted:boolean}` |
| `GET /bailleur/dashboard` | Bailleur | `days=7` par défaut, entier de 7 à 90 | `{success:true,data:Dashboard}` |

Une consultation est enregistrée sous `annonce/{document}/consultations/{identite}_{YYYY-MM-DD}`. Un visiteur reçoit un cookie HTTP-only `imofast_visitor`. Une seule vue globale est comptée par identité et jour à Douala, même si les deux types sont signalés. Les sous-compteurs simple/profonde sont distincts et chacun dédupliqué. Les propres vues du bailleur ne comptent pas. Une annonce non publiée ou expirée est refusée.

```json
{
  "cartes": {
    "vues": {"total": 120, "periodeCourante": 30, "periodePrecedente": 20, "evolution": 50},
    "biens": {"total": 4, "periodeCourante": 1, "periodePrecedente": 0, "evolution": 100},
    "candidatures": {"total": 8, "periodeCourante": 2, "periodePrecedente": 4, "evolution": -50},
    "favoris": {"total": 12, "periodeCourante": 0, "periodePrecedente": 0, "evolution": 0}
  },
  "vuesHebdomadaires": [{"date": "2026-11-21", "vues": 5}],
  "meilleuresAnnonces": [{"idPublic": "...", "titre": "...", "bienId": "...", "vues": 12, "favoris": 3, "candidatures": 4, "commentaires": 2}],
  "conversations": [],
  "candidatures": [],
  "completudeProfil": {"pourcentage": 80, "champsManquants": ["photoProfil"]},
  "periode": {"debut": "...", "finExclusive": "...", "jours": 7, "fuseau": "Africa/Douala"}
}
```

L’exemple abrège les sept points du graphique. La période courante inclut aujourd’hui, la précédente a la même durée. Évolution : `0 → 0 = 0 %`, `0 → positif = 100 %`. Le classement limite à quatre annonces, candidatures décroissantes puis vues décroissantes. Les conversations et candidatures récentes sont limitées à cinq et excluent celles masquées par le bailleur. La complétude réutilise le calcul existant ; les champs manquants sont des clés à traduire côté frontend.

Les anciens totaux de vues sont conservés ; les séries quotidiennes commencent avec l’enregistrement de ces nouveaux agrégats. Aucun historique journalier antérieur n’est inventé.

## 3. Activité interne

Aucun nouvel endpoint. Les créations de commentaires, réponses, notes, conversations et messages incrémentent atomiquement `activiteInterne.{commentaires,reponses,notes,conversationsCreees,messagesEnvoyes}` sur l’auteur. Les écritures de messages HTTP et Socket.IO suivent le même repository. Réutiliser une conversation ou réessayer le message prédéfini d’une alerte ne gonfle pas ces compteurs. Une modification de note n’est pas une nouvelle note.

Les anciens comptes démarrent ces nouveaux compteurs à zéro lors de leurs premières écritures ; aucune reconstruction historique n’est effectuée.

## 4. Candidatures

| Méthode et route | Accès | Payload / query | Réponse |
| --- | --- | --- | --- |
| `POST /candidature` | Locataire | `{annonceId,type:"visite" ou "demande",message?,visite?,demande?}` | `201 {success:true,candidature,forfait:false,msg}` |
| `GET /candidature` | Participant | `annonceId?,type?,statut?,vu?,minDate?,maxDate?,lastId?,pageSize?` | `{success:true,candidatures,total,hasMore,lastId,msg}` |
| `GET /candidature/:id` | Participant | Aucun | `{success:true,candidature,msg}` ; consultation bailleur marque `vu:true` |
| `PATCH /candidature/:id/read` | Bailleur propriétaire | Aucun | `{success:true,candidature}` ; idempotent |
| `PATCH /candidature/:id/honoree` | Participant | `{honore:boolean,message?:string}` (2 000 caractères maximum) | `{success:true,candidature}` |
| `GET /candidature/:id/profil-locataire` | Bailleur propriétaire | Aucun | `{success:true,profil}` |
| `PUT /candidature/set-accept/:id` | Bailleur propriétaire | Aucun | `{success:true,candidature,msg}` |
| `PUT /candidature/set-refus/:id` | Bailleur propriétaire | Aucun | `{success:true,candidature,msg}` |
| `PUT /candidature/set-annuler/:id` | Participant | Aucun | `{success:true,candidature,msg}` |
| `PUT /candidature/set-newDate/:id` | Bailleur propriétaire | `{date:"YYYY-MM-DD",time:"HH:mm"}` | `{success:true,candidature,msg}` |
| `PATCH /candidature/:id` | Locataire auteur, candidature en attente | `{demande?,visite?}` | `{success:true,candidature,msg}` |
| `DELETE /candidature/:id` | Participant | Aucun | `{success:true,msg}` ; masque uniquement pour ce participant |

`visite` contient notamment `dateSouhaitee`, `heureSouhaitee`, `horaireFlexible?`, `fraisVisite?`, `devise?`. La date et l’heure doivent former un rendez-vous futur valide. `demande` conserve `prix?`, `devise?`, `duree:{unite}?`, `frequence?`, `caution?`, `min?`, `fraisVisite?`.

La note `/100` est persistée à la création : budget 60 points proportionnels au rapport budget/prix (plafonné), type 25, quartier 15. Critère absent : zéro point ; devises différentes : zéro pour le budget. Le client ne choisit pas la note. Le quota, la création et l’incrément de statistiques sont atomiques. Pour compatibilité, le refus initial de quota reste `200 {success:false,candidature:null,forfait:true,msg}` ; un épuisement concurrent est un conflit `409`.

Une déclaration d’assiduité exige une visite acceptée (`statut:"visitePrevue"`) dont l’heure est strictement passée. Elle renseigne seulement `honoree.bailleur` ou `honoree.locataire` : `{honore,message,date}`. L’autre déclaration est conservée. Hypothèse : une visite est comptée comme honorée dans le profil lorsque **les deux** déclarations sont positives. Une reprogrammation réinitialise les déclarations.

`profil = {idPublic,nom,prenom,photoProfil,candidatures,visites,visitesHonorees,notes:[{auteurId,valeur,createdAt}],metier,age,telephone}`. Les notes sont filtrées sur les auteurs bailleurs existants. Ce profil n’est accessible qu’au propriétaire d’une candidature du locataire, jamais publiquement.

## 5. Annonces et signalements

| Méthode et route | Accès | Payload / query | Réponse |
| --- | --- | --- | --- |
| `POST /annonce` | Bailleur | `{bienId,titre,description,loyer,devise,nature?,status?,datePublication?,dateExpiration?}` | `201 {success:true,annonce,message}` |
| `PATCH /annonce/:id` | Propriétaire | Partie de `{titre,description,loyer,devise,nature,status,datePublication,dateExpiration}` | `{success:true,annonce,message}` |
| `GET /annonce` | Public ; bailleur limité à ses annonces | Filtres de la section 7 | `{success:true,annonces,pagination,message}` |
| `GET /annonce/:id` | Public si publiée ; propriétaire pour les autres statuts | Aucun | `{success:true,annonce,message}` |
| `DELETE /annonce/:id` | Propriétaire | Aucun | `{success:true,message}` |
| `POST /signalement` | Connecté | `{idCible,typeCible:"annonce",raison,description?}` | `201 {success:true,signalement,msg}` |

`loyer` : soit `{prix}` pour la vente, soit un tableau de 1 à 10 options `{prix,caution,fraisVisite,duree:"annee|mois|semaine|jour",min?,valeur?:1}`. Les prix, cautions et frais sont non négatifs ; `min`, lorsqu’il existe, est un entier positif. `nature` d’une annonce est `location` ou `vente`.

Statuts canoniques : `brouillon`, `programmee`, `publier` ; les anciens `suspendus`, `expirer`, `louer` restent acceptés. `active`, `en_ligne`, `en ligne` sont des alias de `publier` ; `programmée` est un alias de `programmee`.

Sans statut, une date future programme l’annonce ; sans date future, la création publie immédiatement. Un brouillon a `datePublication:null`. La publication immédiate horodate la transition côté serveur. Une publication programmée exige une date future ; l’expiration doit être postérieure. La tâche serveur vérifie les échéances chaque minute et au démarrage, puis diffuse les notifications. Le délai nominal est donc inférieur à une minute, hors indisponibilité ou arriéré. L’API n’attend pas la diffusion à tous les destinataires pour répondre.

`raison` : `contenu_inapproprie`, `arnaque`, `fausses_informations`, `harcelement`, `doublon`, `autre`. Description : 2 000 caractères maximum. Le signalement est enregistré même si le fournisseur email échoue ; les emails en attente sont réessayés chaque minute. Destinataire : `ADMIN_REPORT_EMAIL`, jamais une adresse fournie par le client.

## 6. Vedette et populaires

| Méthode et route | Accès | Payload | Réponse |
| --- | --- | --- | --- |
| `GET /annonce/selections` | Public | Aucun | `{success:true,vedette:AnnonceOuNull,populaires:[Annonce],calculeAt,poids:{vues:1,commentaires:3,favoris:5}}` |

Hypothèse de pondération : vues × 1 + commentaires × 3 + favoris × 5. Le score est exposé comme `scoreSelection`. Chaque lundi à 18 h, fuseau `Africa/Douala`, sélection parmi les annonces publiées la semaine civile précédente pour la vedette, et depuis le début du mois courant pour les trois populaires. Seules les annonces encore publiées et non expirées participent. Lecture du cache existant ; s’il est vide, un calcul partagé entre lecteurs concurrents le remplit. Le cache est sauvegardé avec l’infrastructure de cache existante. Masquer/supprimer une annonce retire sa présence du cache de ce processus.

## 7. Recherche et filtres

`GET /annonce` accepte les critères suivants, combinables :

| Groupe | Paramètres |
| --- | --- |
| Texte et pagination | `search` ou `titre` (256 caractères max), `page` 1–100, `limit` 1–50 (défaut 10) |
| C1 | `typeBien=logement|terrain|boutique|bureau`, `type=appartement|villa|duplex|studio|chambre`, `natureAnnonce=location|vente`, `nature=moderne|simple|meubler` (`meuble` accepté) |
| C2 | `ville`, `quartier` |
| C3 | `prixMin`, `prixMax`, `devise`, `duree=annee|mois|semaine|jour`, `nombreDurees` entier 1–1200 |
| Autres | `nombreChambre`, `nombreDouche` (minimums), `status`, `sort=recent|populaire|prixCroissant|prixDecroissant` |

La nature du logement utilise le paramètre historique `nature` ; vente/location utilise **`natureAnnonce` dans les filtres**. Les critères de durée ne correspondent qu’aux locations. Prix, durée et minimum doivent correspondre à une même option de loyer.

Les tokens sont normalisés sans accents, en minuscules, sans mots vides fr/en. Préfixes à partir de deux caractères, huit tokens de requête maximum ; correspondance d’au moins un token, puis classement par nombre de tokens correspondants (`scoreRecherche`) et départage par `sort`. Création/modification de l’annonce et mise à jour de son index sont atomiques. Une modification du bien réindexe ses annonces.

La recherche lit la collection `annonce_motscles` via les préfixes et un filtre indexé, puis applique les autres critères à un ensemble borné de 2 000 candidats maximum. Au-delà : `422`, demander à l’utilisateur de préciser les critères. Aucun résultat partiel présenté comme un classement complet. Les annonces existantes doivent être réindexées avant activation de ces filtres.

`pagination = {page,limit,totalItems,totalPages,hasNextPage,hasPreviousPage}`. Pour un visiteur/locataire, `status` est imposé à `publier`. Pour un bailleur, le périmètre est imposé à son propre compte. Les recherches enregistrées du locataire restent disponibles à `GET /annonce/recherches/recentes` → `{success:true,recherches}`.

## 8. Nom d’agence

`PATCH /bailleur/update/data`, payload `{nomAgence:"Agence Horizon"}` (avec les autres champs de profil existants si nécessaire), retourne `{success:true,data:Bailleur,message}`. Le backend rejette en `400` les variantes évidentes d’« imofast », y compris casse, accents, séparateurs, répétitions et substitutions courantes. Le modèle et le repository appliquent aussi cette validation. Les compteurs et l’onboarding ne sont pas modifiables par cette route.

## 9. Répondre à une alerte

`POST /alerte/:id/conversation`, bailleur connecté, sans payload → `{success:true,conversation,message}`.

L’alerte doit être active et appartenir à un locataire actif. La conversation existante entre les deux comptes est réutilisée. Le message prédéfini inclut les caractéristiques et utilise la langue du locataire. Son identifiant est déterministe par alerte et bailleur : un deuxième appel ne crée pas un deuxième message.

`POST /alerte` conserve son contrat de création et diffuse désormais vers tous les bailleurs actifs, sous réserve de leurs préférences. `GET /alerte` conserve sa pagination et enregistre la consultation nécessaire à l’étape d’onboarding `alertes`.

## 10. Service client

| Méthode et route | Accès | Payload / query | Réponse |
| --- | --- | --- | --- |
| `GET /service-client/contacts` | Public | Aucun | `{success:true,contacts:{email,telephone,whatsapp}}` |
| `POST /service-client/sendMessage` | Public | `{object,message,email?,telephone?,langue?}` | `201 {success:true,message:Demande,msg}` |
| `POST /service-client/sendReclamation` | Public | `{type,object,message,paymentId?,email?,telephone?,langue?}` | `201 {success:true,reclamation:Demande,msg}` |
| `POST /service-client/sendSignalement` | Public | `{type,idElement,message,image?,email?,telephone?,langue?}` | `201 {success:true,signalement:Demande,msg}` |
| `GET /service-client/getDemande` | Connecté | `type=message|reclamation|signalement`, `lastId?`, `pageSize?` (max 100) | `{success:true,demandes,total,lastId,hasMore,msg}` |
| `GET /service-client/demandes/:id` | Auteur connecté | `type=message|reclamation|signalement` obligatoire | `{success:true,demande}` |

Réclamation `type` : `paiement|location|application|autre`. Signalement support `type` : `bien|profil|annonce|utilisateur|autre`. Le signalement support est distinct du signalement d’annonce modéré avec email admin (`POST /signalement`).

Objet : 2–512 caractères ; message : 5–5 000 ; `image` doit être une URL. Les formulaires sont persistés avec statut `en_attente`, coordonnées et langue. Pour un visiteur, fournir des coordonnées permet au support de répondre ; les demandes anonymes ne sont pas consultables par l’endpoint protégé.

Contacts : document `parametres/service_client`, puis variables `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `SUPPORT_WHATSAPP`. Sans configuration, email `contact@imofast.org`, téléphone et WhatsApp `null` (aucun numéro inventé).

## 11. Session et onboarding

| Méthode et route | Accès | Payload | Réponse |
| --- | --- | --- | --- |
| `GET /auth/me` | Public, résolution des cookies | Aucun | `{success:true,role,user,onboarding}` |
| `POST /auth/refresh` | Refresh valide | Web : cookie ; mobile : `{refreshToken}` avec `x-client: mobile` | Web : `{success:true,data:{},message}` + nouveaux cookies ; mobile : `data.accessToken` et `data.refreshToken` |
| `DELETE /auth/logout` | Connecté | Aucun | `{success:true}` + suppression de la session et des deux chemins du cookie refresh |
| `GET /bailleur/onboarding` | Bailleur | Aucun | `{success:true,onboarding}` |
| `POST /bailleur/onboarding/advance` | Bailleur | `{etape:"bien|annonce|notifications|alertes"}` : étape **courante** | `{success:true,onboarding}` mis à jour |

Visiteur : `{role:"visiteur",user:null,onboarding:null}`. Connecté : rôle `bailleur|locataire|admin`, `user:{idPublic,nom,prenom,photoProfil,verifie}`. `/me` utilise un accès valide ou renouvelle avec le refresh ; réponse `Cache-Control:no-store`. Un refresh tournant ne peut être réutilisé : une seule requête concurrente gagne. Le frontend doit mutualiser son renouvellement de session.

Parcours : `bien → annonce → notifications → alertes → termine`. Chaque progression vérifie la preuve serveur : bien possédé, annonce publiée ou programmée, souscription navigateur enregistrée, puis consultation de la liste d’alertes. `onboarding = {etape,termine,updatedAt?,alertesConsultees?}`. Saut d’étape ou preuve absente : `409`. Les anciens comptes sans champ commencent à `bien` ; aucun contournement automatique n’est ajouté. Le frontend utilise cette étape pour sa redirection et ne propose pas de bouton « passer ».

Les anciennes sessions dont le cookie refresh était limité à `/api/auth/refresh` doivent faire un premier `POST /auth/refresh` pour migrer ce cookie vers `/api/auth`, avant que `/auth/me` puisse l’utiliser si l’accès est expiré.

## Mise en service et vérification

1. Déployer les index de `firestore.indexes.json` et attendre leur état prêt. Le fichier `firebase.backend.json` permet une commande ciblée : `firebase deploy --only firestore:indexes --config firebase.backend.json --project <projet-confirmé>`. Aucun index ni changement de base distante n’a été appliqué par cette intervention.
2. Dans l’environnement serveur, renseigner `ADMIN_REPORT_EMAIL=bakomenm@gmail.com`, `ADMIN_LANGUAGE=fr`, `MAIL_FROM`, `API_KEY_RESEND`, et les clés VAPID existantes. `.env.example` contient les ajouts. Les secrets existants n’ont pas été remplacés.
3. Exécuter `node scripts/reindex-annonce-keywords.cjs` avec les identifiants du bon projet Firestore. Commande explicite, idempotente et paginée ; jamais exécutée automatiquement au démarrage. Elle reconstruit les mots-clés, sans déclencher de publication ni notification.
4. Les anciennes annonces sans `datePublication` n’entrent pas dans les sélections calendaires tant que leur date réelle n’est pas renseignée. Ne pas inventer cette date à partir d’un historique absent. Les anciennes souscriptions web sont compatibles sans migration séparée.
5. Démarrer le serveur avec un processus persistant pour les crons. Le cache est local au processus, conformément à l’architecture existante ; une modification dans une autre instance n’invalide pas immédiatement ce cache. Garder un seul processus de référence pour les sélections tant qu’aucun cache partagé n’est configuré.
6. Exécuter `node --test tests/*.test.js`. Les nouveaux tests utilisent un double Firestore transactionnel en mémoire et des fournisseurs push/email simulés. Ils ne remplacent pas une recette sur le projet de staging avec les vrais index et un navigateur autorisant le push. Aucun email réel ni push réel n’a été émis pendant ces tests.

Les tests couvrent notamment les souscriptions et quotas concurrents, déduplication journalière, droits et assiduité, classement/recherche/prix/durée, compteurs internes, ordre d’onboarding, rotation/rejeu du refresh, reprise des publications, cache concurrent, formulaires et traduction email. Les tests existants de messagerie, favoris et notes sont conservés.
