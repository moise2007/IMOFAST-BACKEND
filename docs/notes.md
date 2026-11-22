# Répartition des notes

Le champ `notes` des documents `annonce`, `bailleur` et `locataire`
est un tableau de cinq entrées, triées de 1 à 5 :

```json
[{"note":1,"nombre":0},{"note":2,"nombre":0},{"note":3,"nombre":1},{"note":4,"nombre":2},{"note":5,"nombre":3}]
```

`nombre` est le nombre de votes pour cette valeur. Les nouveaux modèles
initialisent les cinq compteurs à zéro. La collection `note` conserve son
format individuel existant (`auteurId`, `cibleId`, `typeCible`, `valeur`, etc.).

Les réponses de vote et `GET /api/note/agregat` renvoient cette répartition.
La moyenne s'obtient en divisant la somme des `note * nombre` par le total
des `nombre`. Sans vote, l'interface affiche un état vide.

Les anciens champs `{ moyenne, nombre, somme }` sont reconstruits à partir
des documents de la collection `note` lors de la lecture de l'agrégat ou du
prochain vote. La répartition reconstruite est enregistrée dans la cible.
Une moyenne seule ne permet pas de retrouver les votes : seuls les votes
individuels encore présents sont comptés, sans inventer de répartition.

La lecture du vote précédent, la migration éventuelle, le changement des
compteurs et l'écriture du vote ont lieu dans une transaction Firestore.
Les lectures précèdent les écritures. La cible commune permet à Firestore
de relancer la transaction en cas de votes concurrents.
