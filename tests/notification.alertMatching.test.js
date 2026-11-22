const test = require("node:test");
const assert = require("node:assert/strict");
const { matchesAlert, matchesPreferences } = require("../src/notifications/alertMatching");

const annonce = { status: "publier", nature: "location", loyer: [{ prix: 120000 }, { prix: 180000 }] };
const bien = { typeBien: "logement", type: "studio", nature: "meubler", localisation: { ville: "Yaoundé", quartier: "Bastos" }, chambres: { nombre: 1 } };

test("une annonce correspond à une alerte de ville, type et budget", () => {
  assert.equal(matchesAlert({ ville: "yaounde", type: "studio", prixMax: 150000 }, annonce, bien), true);
  assert.equal(matchesAlert({ ville: "douala", type: "studio", prixMax: 150000 }, annonce, bien), false);
  assert.equal(matchesAlert({ ville: "yaounde", prixMax: 100000 }, annonce, bien), false);
  assert.equal(matchesAlert({ ville: "yaounde", nombreChambre: 2 }, annonce, bien), false);
});

test("les préférences par défaut ne déclenchent pas de notification générale", () => {
  assert.equal(matchesPreferences({ typeBien: "logement", typeLogement: "all", quartier: "all", maxBudget: 150000 }, annonce, bien), false);
  assert.equal(matchesPreferences({ typeBien: "logement", typeLogement: "studio", maxBudget: 150000 }, annonce, bien), true);
  assert.equal(matchesPreferences({ typeBien: "logement", typeLogement: "villa", maxBudget: 150000 }, annonce, bien), false);
});
