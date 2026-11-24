const DAY_MS = 24 * 60 * 60 * 1000;
const DOUALA_OFFSET_MS = 60 * 60 * 1000;

function toValidDate(value = new Date()) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("La date fournie est invalide.");
  }

  return date;
}

/** Retourne la date civile au Cameroun au format YYYY-MM-DD. */
function dayKey(value = new Date()) {
  const date = toValidDate(value);
  return new Date(date.getTime() + DOUALA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/** Retourne minuit au Cameroun sous forme de Date (UTC+01:00). */
function dayStart(value = new Date()) {
  return new Date(`${dayKey(value)}T00:00:00.000+01:00`);
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Evolution en pourcentage entre deux périodes.
 * Lorsque la période précédente vaut 0, retourne 100 si la valeur actuelle
 * est positive, et 0 si les deux valeurs sont nulles.
 */
function evolution(current, previous) {
  const currentValue = toFiniteNumber(current);
  const previousValue = toFiniteNumber(previous);

  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100;
  }

  return Math.round(((currentValue - previousValue) / previousValue) * 10000) / 100;
}

module.exports = {
  DAY_MS,
  DOUALA_OFFSET_MS,
  dayKey,
  dayStart,
  evolution,
  toFiniteNumber,
};
