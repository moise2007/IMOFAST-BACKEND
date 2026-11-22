function emptyNotes() {
  return Array.from({ length: 5 }, (_, index) => ({ note: index + 1, nombre: 0 }));
}

function isNotesDistribution(notes) {
  return Array.isArray(notes) && notes.length === 5 && notes.every(
    (entry, index) => entry?.note === index + 1 && Number.isSafeInteger(entry.nombre) && entry.nombre >= 0
  );
}

function notesFromVotes(votes) {
  const notes = emptyNotes();
  for (const vote of votes) {
    if (Number.isInteger(vote.valeur) && vote.valeur >= 1 && vote.valeur <= 5) {
      notes[vote.valeur - 1].nombre += 1;
    }
  }
  return notes;
}

function changeVote(notes, previousValue, nextValue) {
  const updated = notes.map((entry) => ({ ...entry }));
  if (previousValue >= 1 && previousValue <= 5) {
    updated[previousValue - 1].nombre = Math.max(0, updated[previousValue - 1].nombre - 1);
  }
  if (nextValue >= 1 && nextValue <= 5) updated[nextValue - 1].nombre += 1;
  return updated;
}

module.exports = { emptyNotes, isNotesDistribution, notesFromVotes, changeVote };
