const {describe, it} = require("node:test")
const assert = require("node:assert/strict")

const {calculerCompletudeProfil, REGLES_COMPLETUDE}  = require("../src/utils/completudeProfil/completudeProfil.locataire.utils.js")

const  {locataireTest, locataireVide, locataireComplet } = require("../src/__mock__/locataireTest.js")

const cles = (res) => res.manquants.map((m) => m.cle);

describe("calculerCompletudeProfil", () => {
  describe("barème", () => {
    it("les poids totalisent 100", () => {
      const total = REGLES_COMPLETUDE.reduce((s, r) => s + r.poids, 0);
      assert.equal(total, 100);
    });

    it("les clés des règles sont uniques", () => {
      const toutes = REGLES_COMPLETUDE.map((r) => r.cle);
      assert.equal(new Set(toutes).size, toutes.length);
    });
  });

  describe("profil partiel", () => {
    const res = calculerCompletudeProfil(locataireTest);

    it("retourne 70 %", () => {
      assert.equal(res.pourcentage, 70);
    });

    it("pointsObtenus + points manquants = pointsTotal", () => {
      const perdus = res.manquants.reduce((s, m) => s + m.poids, 0);
      assert.equal(res.pointsObtenus + perdus, res.pointsTotal);
    });

    it("liste les champs manquants attendus", () => {
      for (const attendu of [
        "photoProfil",
        "metier",
        "preferences.quartier",
        "verification.telephoneVerifie",
        "verification.cniVerified",
      ]) {
        assert.ok(cles(res).includes(attendu), `${attendu} devrait manquer`);
      }
    });

    it("trie les manquants du plus important au moins important", () => {
      const poids = res.manquants.map((m) => m.poids);
      assert.deepEqual(poids, [...poids].sort((a, b) => b - a));
    });

    it("la prochaine étape est la photo de profil", () => {
      assert.equal(res.prochaineEtape.cle, "photoProfil");
    });
  });

  describe("cas extrêmes", () => {
    it("profil vide : 30 %", () => {
      assert.equal(calculerCompletudeProfil(locataireVide).pourcentage, 30);
    });

    it("profil complet : 100 %, aucun manquant", () => {
      const res = calculerCompletudeProfil(locataireComplet);
      assert.equal(res.pourcentage, 100);
      assert.equal(res.manquants.length, 0);
      assert.equal(res.prochaineEtape, null);
    });

    it("objet vide : 0 % sans planter", () => {
      assert.equal(calculerCompletudeProfil({}).pourcentage, 0);
    });

    it("sans argument : 0 % sans planter", () => {
      assert.equal(calculerCompletudeProfil().pourcentage, 0);
    });

    it("gère les objets imbriqués à null", () => {
      const res = calculerCompletudeProfil({
        nom: "Kamga",
        preferences: null,
        localisation: null,
        verification: null,
      });
      assert.equal(res.pourcentage, 8);
    });
  });

  describe("détection des valeurs vides", () => {
    for (const [nom, valeur] of [
      ["chaîne vide", ""],
      ["espaces seuls", "   "],
      ["null", null],
      ["undefined", undefined],
    ]) {
      it(`${nom} ne compte pas pour le prénom`, () => {
        const res = calculerCompletudeProfil({ nom: "Kamga", prenom: valeur });
        assert.ok(cles(res).includes("prenom"));
      });
    }

    it("un tableau vide ne compte pas", () => {
      const res = calculerCompletudeProfil({ preferences: { quartier: [] } });
      assert.ok(cles(res).includes("preferences.quartier"));
    });

    it("un budget de 0 ne compte pas", () => {
      const res = calculerCompletudeProfil({ preferences: { maxBudget: 0 } });
      assert.ok(cles(res).includes("preferences.maxBudget"));
    });
  });

  describe("vérifications", () => {
    it("lit verification.emailVerifie en priorité", () => {
      const res = calculerCompletudeProfil({
        emailVerifie: true,
        verification: { emailVerifie: false },
      });
      assert.ok(cles(res).includes("verification.emailVerifie"));
    });

    it("retombe sur emailVerifie à la racine", () => {
      const res = calculerCompletudeProfil({ emailVerifie: true });
      assert.ok(!cles(res).includes("verification.emailVerifie"));
    });

    it("accepte quatier (faute du modèle) comme quartier", () => {
      const res = calculerCompletudeProfil({ localisation: { quatier: "Bastos" } });
      assert.ok(!cles(res).includes("localisation.quartier"));
    });
  });

  describe("barème personnalisé", () => {
    it("utilise les règles passées en paramètre", () => {
      const regles = [
        { cle: "nom", label: "Nom", poids: 1, rempli: (p) => !!p.nom },
        { cle: "email", label: "Email", poids: 3, rempli: (p) => !!p.email },
      ];
      const res = calculerCompletudeProfil({ email: "a@b.cm" }, regles);
      assert.equal(res.pourcentage, 75);
    });

    it("retourne 0 si le barème est vide", () => {
      assert.equal(calculerCompletudeProfil({ nom: "A" }, []).pourcentage, 0);
    });
  });
});