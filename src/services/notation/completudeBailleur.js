

const CompletudeProfilBailleur = ({
    nom, // 5 pts
    emailVerifie, // 8 pts
    prenom, // 5pts
    telephoneVerifie, //7pts
    photoProfil, // 10pts
    dateNaissance, // 5pts
    localisation, // 20pts
    cni, // 5pts
    cniVerifie, // 18pts
    imageAnciensContrats, // 12pts
}) => {
    let note = 0;
    if (nom?.trim() !== "") note += 5
    if (prenom?.trim() !== "") note += 5
    if (emailVerifie) note += 8
    if (telephoneVerifie) note += 7
    if (photoProfil?.trim() !== "") note += 10
    const dataNaiss = new Date(dateNaissance);
    if (dateNaissance && !isNaN(dataNaiss) && dataNaiss < new Date()) {
        note += 5;
    }
    if (localisation?.lon?.toString().trim() !== "" && localisation?.lat?.toString().trim() !== "") note += 20
    if (cni?.imageVerso?.trim() !== "" && cni?.imageRecto?.trim() !== "") note += 5
    if (cniVerifie) note += 18;
    if (imageAnciensContrats && imageAnciensContrats.length > 0) {
        note += Math.min(3, imageAnciensContrats.length) * 4
    }
    return note
}

module.exports = { CompletudeProfilBailleur }