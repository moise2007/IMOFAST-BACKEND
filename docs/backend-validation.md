# Bilan de la mission backend

Le contrat frontend complet (méthode, route, payload, réponse, erreurs, hypothèses) est dans [backend-endpoints.md](backend-endpoints.md).

## Vérifications

- Une exécution complète hors sandbox a réussi : 82 tests, 8 suites, aucun échec.
- Dernière relance dans le sandbox : 15 fichiers de tests réussis sur 16 ; seul `tests/auth.test.js` nécessite l'ouverture d'un serveur HTTP local. La relance autorisée de ce test a été interrompue avant réception du résultat ; ne pas la considérer comme une nouvelle validation réussie.
- Contrôle de syntaxe de 292 fichiers : trois erreurs préexistantes dans `src/models/video.js`, `src/models/analitics.js`, `src/models/session.js`. Leur contenu est identique à HEAD. Les autres fichiers passent ce contrôle.
- Aucune clé littérale `errors:backend.*`, `responses:backend.*` ou `errors:validation.*` manquante dans les catalogues français/anglais contrôlés.
- Les tests de logique Firestore utilisent un double transactionnel en mémoire. Les vrais index, emails Resend et notifications navigateur restent à vérifier en staging après configuration.

## Fichiers principaux créés ou modifiés, par tâche

Les chemins ci-dessous sont relatifs au backend. Le dépôt contenait déjà d'autres changements ; cette liste décrit les fichiers impliqués dans la mission, sans attribuer l'ensemble du diff existant à cette intervention.

| Tâche | Fichiers principaux | Reste pour la mise en service |
| --- | --- | --- |
| 1. Notifications | `src/models/{bailleur,locataire}.js`, `src/repositories/{subscription,notification}.repository.js`, `src/services/notification.service.js`, `src/services/ApiService/notification.service.js`, `src/controllers/notification.controller.js`, `src/routes/notification.route.js`, `src/notifications/alertDelivery.js`, `src/notifications/push/{subscriptions,messagePush}.js`, `src/utils/notificationPreferences.js` | Recette push avec les clés VAPID et plusieurs navigateurs |
| 2. Vues/dashboard | `src/services/metrics/consultation.service.js`, `src/middlewares/anonymousVisitor.js`, `src/utils/statistics.js`, `src/repositories/dashboard.repository.js`, `src/services/ApiService/dashboard.service.js`, `src/controllers/dashboard.controller.js`, routes annonce/bailleur | Déployer les index ; agrégats quotidiens alimentés à partir de la mise en service |
| 3. Activité interne | `src/repositories/activite.repository.js`, repositories commentaire/note/conversation/message, services associés, `src/config/socket.io.js`, `src/utils/privateFields.js`, `src/app.js` | Pas de reconstruction historique des nouveaux compteurs |
| 4. Candidatures | `src/models/candidature.js`, `src/utils/candidatureScore.js`, `src/repositories/candidature.repository.js`, `src/services/ApiService/candidature.service.js`, contrôleur/route/validateur candidature | Déployer les index et valider le parcours des deux participants en staging |
| 5. Publications/signalement | `src/models/annonce.js`, `src/utils/publication.js`, repository/service/validateur annonce, `src/services/auto/publication.auto.js`, `src/services/auto/authAnnonce.js`, `src/services/signalementMail.service.js`, service/validateur signalement, `src/server.js`, `.env.example` | Configurer destinataire admin et fournisseur email ; processus persistant pour les crons |
| 6. Sélections | `src/utils/listingSelections.js`, `src/repositories/selection-annonce.repository.js`, `src/services/ApiService/selection-annonce.service.js`, `src/services/auto/selection-annonce.auto.js`, `src/cache/selection-annonce.cache.js`, `src/cache/cache.index.js`, route/contrôleur annonce | Vérifier les dates historiques de publication et la persistance du cache |
| 7. Recherche | `src/utils/annonceKeywords.js`, `src/repositories/annonce-keywords.repository.js`, repositories annonce/bien, validateur annonce, `scripts/reindex-annonce-keywords.cjs`, `firestore.indexes.json`, `firebase.backend.json` | Déployer les index puis lancer explicitement la réindexation des annonces existantes |
| 8. Agence | `src/utils/agencyName.js`, modèle/repository/service bailleur | Aucun traitement de données existantes automatique |
| 9. Réponse aux alertes | route/contrôleur/service alerte, services/repositories conversation/message | Recette de la conversation et du message dans la langue du locataire |
| 10. Service client | `src/routes/serviceClient.route.js`, `src/controllers/service_client.controller.js`, `src/services/ApiService/service_client.service.js`, `src/repositories/service_client.reporitory.js`, `src/validators/service_client.validator.js`, `.env.example` | Renseigner téléphone/WhatsApp si souhaité ; les valeurs inconnues restent nulles |
| 11. Session/onboarding | `src/repositories/{session,onboarding}.repository.js`, `src/services/ApiService/{session,onboarding}.service.js`, `src/controllers/onboarding.controller.js`, contrôleur/routes authentification, route bailleur, `src/middlewares/auth.js`, `src/utils/session.js`, repository authentification | Vérifier les cookies sur le domaine réel ; migration de leur ancien chemin via `/auth/refresh` |
| Traductions et tests | `src/locales/{fr,en}/{errors,responses,emails}.json`, `src/utils/validationErrors.js`, `src/middlewares/errorHandler.js`, `src/config/i18n.config.js`, `tests/backend.business.test.js`, `tests/backend.integration.test.js`, `tests/helpers/backendHarness.cjs`, tests consultation/souscriptions/diffusion | Recette staging des intégrations externes |

Aucun déploiement, réindexage de la base distante, email réel ou push réel n'a été exécuté pendant cette mission. Les commandes et variables nécessaires sont documentées dans le contrat API.
