const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Admin {
    constructor({
        pseudo,
        email,
        role,
    }) {
        this.pseudo       = pseudo
        this.email     = email
        this.role      = role
    }

    toFirebase() {
        return {
            // ── Identité ─────────────────────────────
            pseudo:       this.pseudo,
            email:     this.email,

            // ── Rôle ──────────────────────────────────
            role: this.role ?? "moderateur",
            // "super_admin" | "moderateur" | "support"

            // ── Permissions ───────────────────────────
            permissions: {
                utilisateurs: {
                    voir:      true,
                    bloquer:   this.role === "super_admin" || this.role === "moderateur",
                    supprimer: this.role === "super_admin",
                },
                biens: {
                    voir:      true,
                    suspendre: this.role === "super_admin" || this.role === "moderateur",
                    supprimer: this.role === "super_admin",
                },
                signalements: {
                    voir:     true,
                    traiter:  this.role === "super_admin" || this.role === "moderateur",
                    rejeter:  this.role === "super_admin" || this.role === "moderateur",
                },
                statistiques: {
                    voir: true,
                },
                admins: {
                    voir:      this.role === "super_admin",
                    creer:     this.role === "super_admin",
                    supprimer: this.role === "super_admin",
                },
            },
            verification: {emailVerifie: true,},
            // ── Statut ───────────────────────────────
            statut: "actif", // "actif" | "suspendu"

            // ── Dates ────────────────────────────────
            createdAt: timestamp.now(),
            updatedAt: timestamp.now(),
        }
    }
}
module.exports = {Admin}