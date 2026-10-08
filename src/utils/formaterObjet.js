/**
 * Nettoie récursivement un objet avant son traitement ou son enregistrement.
 *
 * Règles appliquées :
 * - supprime les propriétés dont la valeur est `undefined`
 * - supprime les propriétés dont la valeur est `null`
 * - supprime les chaînes vides
 * - supprime les tableaux vides
 * - supprime les objets vides
 * - conserve les valeurs `false` et `0`
 *
 * @param {Object} objet - Objet à nettoyer.
 * @returns {Object} Objet nettoyé.
 */
const formaterObjet = (objet) => {
  if (!objet || typeof objet !== "object" || Array.isArray(objet)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(objet)
      .map(([cle, valeur]) => {
        if (valeur && typeof valeur === "object" && !Array.isArray(valeur)) {
          const objetFormate = formaterObjet(valeur);

          return [cle, objetFormate];
        }

        if (Array.isArray(valeur)) {
          const tableauFormate = valeur
            .map((element) => {
              if (
                element &&
                typeof element === "object" &&
                !Array.isArray(element)
              ) {
                return formaterObjet(element);
              }

              return element;
            })
            .filter((element) => {
              if (element === undefined || element === null) {
                return false;
              }

              if (typeof element === "string" && element.trim() === "") {
                return false;
              }

              if (
                typeof element === "object" &&
                !Array.isArray(element) &&
                Object.keys(element).length === 0
              ) {
                return false;
              }

              return true;
            });

          return [cle, tableauFormate];
        }

        return [cle, valeur];
      })
      .filter(([cle, valeur]) => {
        if (valeur === undefined || valeur === null) {
          return false;
        }

        if (typeof valeur === "string" && valeur.trim() === "") {
          return false;
        }

        if (Array.isArray(valeur) && valeur.length === 0) {
          return false;
        }

        if (
          typeof valeur === "object" &&
          !Array.isArray(valeur) &&
          Object.keys(valeur).length === 0
        ) {
          return false;
        }

        return true;
      })
      .map(([cle, valeur]) => [
        cle,
        typeof valeur === "string" ? valeur.trim() : valeur,
      ])
  );
};

module.exports = {formaterObjet,};