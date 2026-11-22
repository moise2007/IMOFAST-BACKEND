const { db, admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;
const { emptyNotes, isNotesDistribution, notesFromVotes, changeVote } = require("../utils/notesDistribution");

class NoteRepository {
  _collectionForType(typeCible) {
    switch (typeCible) {
      case "annonce":
        return "annonce";
      case "locataire":
        return "locataire";
      case "bailleur":
        return "bailleur";
      default:
        throw new Error(`typeCible inconnu: ${typeCible}`);
    }
  }

  _defaultNotes() {
    return emptyNotes();
  }

  _targetQuery(typeCible, cibleId) {
    return db
      .collection(this._collectionForType(typeCible))
      .where("idPublic", "==", cibleId)
      .limit(1);
  }

  /**
   * Crée, modifie ou supprime une note.
   *
   * @param {Object} params
   * @param {string} params.typeCible   "annonce" | "locataire" | "bailleur"
   * @param {string} params.cibleId
   * @param {string} params.auteurId
   * @param {number} params.valeur      1..5, ou 0 pour supprimer
   */
  async voter({ typeCible, cibleId, auteurId, valeur, role }) {
    if (!["annonce", "locataire", "bailleur"].includes(typeCible)) {
      throw new Error("typeCible invalide");
    }
    if (!Number.isInteger(valeur) || valeur < 0 || valeur > 5) {
      throw new Error("valeur doit être un entier entre 0 et 5");
    }

    return db.runTransaction(async (tx) => {
      const targets = await tx.get(this._targetQuery(typeCible, cibleId));
      if (targets.empty) {
        const error = new Error(`${typeCible} introuvable: ${cibleId}`);
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      const target = targets.docs[0];
      const votesQuery = this._votesQuery(typeCible, cibleId);
      const existingSnapshot = await tx.get(votesQuery.where("auteurId", "==", auteurId).limit(1));
      const existing = existingSnapshot.docs[0];
      const current = await this._readDistribution(tx, target, votesQuery);
      const notes = changeVote(current, existing?.data().valeur ?? 0, valeur);
      const action = valeur === 0 ? (existing ? "deleted" : "noop") : (existing ? "updated" : "created");
      const noteRef = existing?.ref ?? db.collection("note").doc();
      const now = Timestamp.now();
      if (role && action === 'created') {
        const { authorRef, increment } = require('./activite.repository');
        const author = await authorRef(role, auteurId, tx);
        increment(tx, author, 'notes');
      }

      if (action === "deleted") {
        tx.delete(noteRef);
      } else if (valeur > 0) {
        const payload = { auteurId, cibleId, typeCible, valeur, updatedAt: now, ...(role ? { role } : {}) };
        if (!existing) {
          payload.idPublic = noteRef.id;
          payload.createdAt = now;
        }
        tx.set(noteRef, payload, { merge: true });
      }
      tx.update(target.ref, { notes });

      return {
        cibleId,
        typeCible,
        notes,
        vote: valeur === 0 ? null : { documentId: noteRef.id, valeur },
        action,
      };
    });
  }

  _votesQuery(typeCible, cibleId) {
    return db.collection("note").where("cibleId", "==", cibleId).where("typeCible", "==", typeCible);
  }

  async _readDistribution(tx, target, votesQuery) {
    const notes = target.data().notes;
    if (isNotesDistribution(notes)) return notes;
    const votes = await tx.get(votesQuery);
    return notesFromVotes(votes.docs.map((document) => document.data()));
  }

  async create(data) {
    const reference = await db.collection("note").add(data);
    const snapshot = await reference.get();
    return {
      documentId: reference.id,
      note: snapshot.data(),
    };
  }

  async findByPublicId(idPublic) {
    const snapshot = await db
      .collection("note")
      .where("idPublic", "==", idPublic)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const document = snapshot.docs[0];
    return { documentId: document.id, note: document.data() };
  }

  async findByAuteurAndCible({ auteurId, cibleId, typeCible }) {
    const snapshot = await db
      .collection("note")
      .where("auteurId", "==", auteurId)
      .where("cibleId", "==", cibleId)
      .where("typeCible", "==", typeCible)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const document = snapshot.docs[0];
    return { documentId: document.id, note: document.data() };
  }

  async findByPublicIdAndAuteur({ idPublic, auteurId }) {
    const snapshot = await db
      .collection("note")
      .where("idPublic", "==", idPublic)
      .where("auteurId", "==", auteurId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const document = snapshot.docs[0];
    return { documentId: document.id, note: document.data() };
  }

  async findByCible({ cibleId, typeCible }) {
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(this._targetQuery(typeCible, cibleId));
      if (snapshot.empty) return null;
      const target = snapshot.docs[0];
      const notes = await this._readDistribution(tx, target, this._votesQuery(typeCible, cibleId));
      if (!isNotesDistribution(target.data().notes)) tx.update(target.ref, { notes });
      return { documentId: target.id, note: notes };
    });
  }

  async findAll(filters = {}) {
    const {
      cibleId,
      typeCible,
      auteurId,
      valeur,
      min,
      max,
      pageSize = 30,
      lastId,
    } = filters;

    let query = db.collection("note");

    if (cibleId) query = query.where("cibleId", "==", cibleId);
    if (typeCible) query = query.where("typeCible", "==", typeCible);
    if (auteurId) query = query.where("auteurId", "==", auteurId);
    if (valeur !== undefined) query = query.where("valeur", "==", valeur);
    if (min !== undefined) query = query.where("valeur", ">=", min);
    if (max !== undefined) query = query.where("valeur", "<=", max);

    if (lastId) {
      const cursorSnapshot = await db
        .collection("note")
        .where("idPublic", "==", lastId)
        .limit(1)
        .get();

      if (!cursorSnapshot.empty) {
        query = query.startAfter(cursorSnapshot.docs[0]);
      }
    }

    query = query.orderBy("createdAt", "desc").limit(pageSize);

    const snapshot = await query.get();

    const notes = snapshot.docs.map((document) => ({
      documentId: document.id,
      note: document.data(),
    }));

    const lastDocument =
      snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;

    return {
      notes,
      total: notes.length,
      lastId: lastDocument ? lastDocument.data().idPublic : null,
      hasMore: snapshot.size === pageSize,
    };
  }

  async update({ documentId, data }) {
    await db
      .collection("note")
      .doc(documentId)
      .update({ ...data, updatedAt: Timestamp.now() });

    const snapshot = await db.collection("note").doc(documentId).get();

    return { documentId, note: snapshot.data() };
  }

  async delete({ documentId }) {
    await db.collection("note").doc(documentId).delete();
  }
}

module.exports = new NoteRepository();
