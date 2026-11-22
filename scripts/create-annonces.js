const axios = require("axios");
require("dotenv").config();

const BASE_URL = "http://127.0.0.1:3000";
const API_BASE = `${BASE_URL}/api`;

const TEST_CREDENTIALS = {
  email: "paul@gmail.com",
  password: "Moise.12345",
  role: "bailleur"
};

const axiosInstance = axios.create({
  timeout: 30000,
  validateStatus: () => true
});

async function login() {
  console.log("🔐 Authenticating...");
  try {
    const response = await axiosInstance.post(
      `${API_BASE}/auth/login`,
      {
        role: TEST_CREDENTIALS.role,
        identifiant: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password
      },
      {
        headers: { "Content-Type": "application/json", "X-Client": "mobile" }
      }
    );
    if (response.data.success && response.data.data) {
      return response.data.data.accessToken;
    }
    throw new Error(response.data.message || response.data.msg || "Login failed");
  } catch (error) {
    console.error("❌ Auth failed:", error.response?.data?.message || error.message);
    throw error;
  }
}

async function createAnnonce(token, data) {
  try {
    const response = await axiosInstance.post(
      `${API_BASE}/annonce`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Client": "mobile",
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (response.data.success) {
      return { success: true, annonce: response.data.annonce };
    }
    return { success: false, message: response.data.message || response.data.msg };
  } catch (error) {
    return { success: false, message: error.response?.data?.message || error.message };
  }
}

async function main() {
  const token = await login();
  console.log("✅ Authenticated\n");

  const annonces = [
    // 1. Appartement 3 chambres Bastos Yaoundé
    {
      titre: "Bel appartement 3 chambres Bastos Yaoundé",
      description: "Bel appartement moderne de 3 chambres au cœur de Yaoundé, quartier Bastos. Proche des commodités, écoles et centres commerciaux. Entièrement sécurisé avec gardien et caméras.",
      bienId: "log_b13y5grw5iaw55jj5moelxd2",
      loyer: [{caution: 500000, duree: "mois", fraisVisite: 5000, prix: 350000}, {caution: 450000, duree: "mois", fraisVisite: 5000, prix: 320000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 2. Appartement meublé 2 chambres Hippodrome Yaoundé
    {
      titre: "Appartement meublé 2 chambres Hippodrome Yaoundé",
      description: "Appartement meublé 2 chambres standing à Yaoundé, quartier Hippodrome. Vue imprenable, finitions haut de gamme, prêt à habiter.",
      bienId: "log_x8zjuov35ovxn6y86apmfzig",
      loyer: [{caution: 600000, duree: "mois", fraisVisite: 5000, prix: 400000}, {caution: 550000, duree: "mois", fraisVisite: 5000, prix: 380000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 3. Studio meublé Bonapriso Douala
    {
      titre: "Studio meublé Bonapriso Douala",
      description: "Studio meublé tout confort à Douala, quartier Bonapriso. Idéal pour jeune actif ou étudiant. Proche du Wouri et des zones d'activités.",
      bienId: "log_g6hy2w38eahu6iphrdxf3635",
      loyer: [{caution: 200000, duree: "mois", fraisVisite: 5000, prix: 150000}, {caution: 180000, duree: "mois", fraisVisite: 5000, prix: 130000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 4. Villa de luxe 4 chambres Bonamoussadi Douala
    {
      titre: "Villa de luxe 4 chambres Bonamoussadi Douala",
      description: "Villa moderne de luxe 4 chambres à Douala, quartier Bonamoussadi. Piscine, jardin paysager, garage double. Quartier résidentiel prisé.",
      bienId: "log_yeuptwrsmie00bhciuc5iycj",
      loyer: [{caution: 1500000, duree: "mois", fraisVisite: 10000, prix: 800000}, {caution: 1300000, duree: "mois", fraisVisite: 10000, prix: 700000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 5. Duplex meublé 3 chambres Kribi
    {
      titre: "Duplex meublé 3 chambres Kribi vue mer",
      description: "Duplex meublé 3 chambres à Kribi, quartier Résidentiel. Vue mer, terrasse panoramique. Proche plages et centre-ville.",
      bienId: "log_i3gin0fc88v2qiusw2g7f5gg",
      loyer: [{caution: 800000, duree: "mois", fraisVisite: 10000, prix: 500000}, {caution: 700000, duree: "mois", fraisVisite: 10000, prix: 450000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 6. Maison 5 chambres Bafoussam
    {
      titre: "Grande maison familiale 5 chambres Bafoussam",
      description: "Grande maison familiale de 5 chambres à Bafoussam, quartier Commercial. Espaces verts, garage, dépendances. Parfait pour grande famille.",
      bienId: "log_z3zfc88pdxvzbo2luo45kmeb",
      loyer: [{caution: 600000, duree: "mois", fraisVisite: 5000, prix: 400000}, {caution: 550000, duree: "mois", fraisVisite: 5000, prix: 350000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 7. Bureau open space Yaoundé Centre-ville
    {
      titre: "Bureau open space 120m² Centre-ville Yaoundé",
      description: "Bureau professionnel open space 50m² + 2 bureaux fermés à Yaoundé Centre-ville. Salle réunion, accueil, parking, climatisation, internet fibre.",
      bienId: "Bur_vxbfhq9s7pays2mrz6gz87g0",
      loyer: [{caution: 1000000, duree: "mois", fraisVisite: 10000, prix: 600000}, {caution: 900000, duree: "mois", fraisVisite: 10000, prix: 550000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 8. Bureau individuel 25m² Douala Akwa
    {
      titre: "Bureau individuel 25m² Akwa Douala",
      description: "Bureau individuel 25m² à Douala Akwa, rue de la Poste. Climatisation, internet, parking, toilettes. Idéal profession libérale.",
      bienId: "Bur_flj7mzd13dfa59xnvdrl4ruj",
      loyer: [{caution: 300000, duree: "mois", fraisVisite: 5000, prix: 200000}, {caution: 250000, duree: "mois", fraisVisite: 5000, prix: 180000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 9. Terrain 500m² Kribi Grand Batanga
    {
      titre: "Terrain 500m² constructible Kribi Grand Batanga",
      description: "Terrain rectangle 20m x 25m à Kribi Grand Batanga, route de la Plage. Titre foncier disponible. Proche mer, idéal villa ou résidence.",
      bienId: "Terr_zsux3q4nv8672jbuxplww89m",
      loyer: [{caution: 500000, duree: "mois", fraisVisite: 5000, prix: 200000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 10. Terrain 1000m² Douala Logbaba
    {
      titre: "Terrain 1000m² zone industrielle Douala Logbaba",
      description: "Terrain carré 31.6m x 31.6m à Douala Logbaba, zone industrielle. Titre foncier. Accès poids lourds, idéal entrepôt ou usine.",
      bienId: "Terr_ns9meimddi5ohpb4oocq3d1j",
      loyer: [{caution: 800000, duree: "mois", fraisVisite: 10000, prix: 400000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 11. Terrain 300m² Yaoundé Emana
    {
      titre: "Terrain 300m² Yaoundé Emana route d'Emana",
      description: "Terrain rectangle 15m x 20m à Yaoundé Emana, route d'Emana. Proche commodités, idéal construction villa. Sans titre foncier.",
      bienId: "Terr_trmk0h9bmj6x95tv0j3z35oc",
      loyer: [{caution: 300000, duree: "mois", fraisVisite: 5000, prix: 150000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    },
    // 12. Terrain 2000m² Bafoussam Kouoptamo
    {
      titre: "Grand terrain 2000m² Bafoussam Kouoptamo",
      description: "Grand terrain irrégulier 2000m² à Bafoussam Kouoptamo, sortie de ville. Titre foncier. Idéal projet immobilier, lotissement ou agricole.",
      bienId: "Terr_wzi8qzqgx3eeww4ue9eymn2j",
      loyer: [{caution: 1000000, duree: "mois", fraisVisite: 10000, prix: 500000}],
      devise: "XAF",
      dateExpiration: "2027-02-12"
    }
  ];

  let created = 0;
  let failed = 0;

  for (let i = 0; i < annonces.length; i++) {
    const data = annonces[i];
    console.log(`\n📝 Creating annonce ${i + 1}/${annonces.length}: ${data.titre}`);
    
    const result = await createAnnonce(token, data);
    
    if (result.success) {
      console.log(`✅ Created: ${result.annonce.idPublic}`);
      created++;
    } else {
      console.log(`❌ Failed: ${result.message}`);
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n📊 RESULTS: ${created} created, ${failed} failed`);
}

main().catch(console.error);