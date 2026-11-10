import os
import sys

# ------------------------------- Réglages -------------------------------
SORTIE = "racine.txt"

DOSSIERS_IGNORES = {
    "node_modules", ".git", ".expo", "dist", "build", "coverage",
    ".next", "android", "ios", ".idea", ".vscode", "__pycache__", ".venv", "venv",
}

FICHIERS_IGNORES = {
    SORTIE, "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".DS_Store", os.path.basename(__file__),
}

EXTENSIONS_BINAIRES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg", ".pdf",
    ".zip", ".rar", ".7z", ".mp3", ".mp4", ".mov", ".ttf", ".otf",
    ".woff", ".woff2", ".keystore", ".jks", ".apk", ".aab", ".pyc",
}

TAILLE_MAX = 1024 * 1024  # 1 Mo


def est_secret(nom: str) -> bool:
    """Un fichier .env contient des secrets : on ne le copie jamais."""
    return nom == ".env" or nom.startswith(".env.")


def demander_chemin() -> str:
    """Demande un dossier valide, en reboucle tant qu'il n'existe pas."""
    while True:
        saisie = input("Chemin du dossier (Entrée = dossier courant) : ").strip()
        # Retire les guillemets ajoutés par un glisser-déposer ou une copie
        saisie = saisie.strip('"').strip("'")

        if not saisie:
            return os.getcwd()

        chemin = os.path.abspath(os.path.expanduser(saisie))
        if os.path.isdir(chemin):
            return chemin
        print(f"✘ Dossier introuvable : {chemin}\n")


# ------------------------------- Parcours -------------------------------
racine = demander_chemin()
print(f"→ Dossier analysé : {racine}\n")

fichiers = []
for dossier, sous_dossiers, noms in os.walk(racine):
    sous_dossiers[:] = sorted(d for d in sous_dossiers if d not in DOSSIERS_IGNORES)

    for nom in sorted(noms):
        if nom in FICHIERS_IGNORES or est_secret(nom):
            continue
        if os.path.splitext(nom)[1].lower() in EXTENSIONS_BINAIRES:
            continue
        fichiers.append(os.path.join(dossier, nom))

# ------------------------------- Écriture -------------------------------
copies = 0
sautes = []
chemin_sortie = os.path.join(racine, SORTIE)

try:
    with open(chemin_sortie, "w", encoding="utf-8") as sortie:
        for fichier in fichiers:
            relatif = os.path.relpath(fichier, racine).replace(os.sep, "/")

            try:
                if os.path.getsize(fichier) > TAILLE_MAX:
                    sautes.append(f"{relatif} (trop gros)")
                    continue

                with open(fichier, "rb") as f:
                    brut = f.read()

                if b"\x00" in brut:
                    sautes.append(f"{relatif} (binaire)")
                    continue

                contenu = brut.decode("utf-8", errors="replace")

                sortie.write("=" * 80 + "\n")
                sortie.write(f"FICHIER : {relatif}\n")
                sortie.write("=" * 80 + "\n")
                sortie.write(contenu if contenu.endswith("\n") else contenu + "\n")
                sortie.write("\n")
                copies += 1
            except OSError as e:
                sautes.append(f"{relatif} ({e})")
except OSError as e:
    sys.exit(f"✘ Impossible d'écrire {chemin_sortie} : {e}")

print(f"✔ {copies} fichier(s) copié(s) dans {chemin_sortie}")
if sautes:
    print(f"⚠ {len(sautes)} fichier(s) ignoré(s) :")
    for s in sautes:
        print(f"  - {s}")