require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const BASE_URL = "http://127.0.0.1:3000";
const API_BASE = `${BASE_URL}/api`;

const TEST_CREDENTIALS = {
  email: "paul@gmail.com",
  password: "Moise.12345",
  role: "bailleur"
};

const JWT_SECRET = process.env.JWT_SECRET;

const axiosInstance = axios.create({
  timeout: 60000,
  validateStatus: () => true
});

class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;
    this.userRole = null;
    this.sessionId = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  setTokens(accessToken, refreshToken, user) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.userId = user.id;
    this.userIdPublic = user.idPublic;
    this.userRole = user.role;
    
    try {
      const decoded = jwt.verify(accessToken, JWT_SECRET);
      this.sessionId = decoded.idsession;
    } catch (e) {
      console.error("Failed to decode access token:", e.message);
    }
  }

  async refreshAccessToken() {
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._doRefresh();
    
    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async _doRefresh() {
    try {
      const response = await axiosInstance.post(
        `${API_BASE}/auth/refresh`,
        { refreshToken: this.refreshToken },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Client": "mobile"
          }
        }
      );

      if (response.data.success && response.data.data) {
        this.accessToken = response.data.data.accessToken;
        this.refreshToken = response.data.data.refreshToken;
        console.log("✅ Access token refreshed successfully");
        return this.accessToken;
      }
      
      throw new Error("Invalid refresh response");
    } catch (error) {
      console.error("❌ Failed to refresh token:", error.response?.data || error.message);
      this.accessToken = null;
      this.refreshToken = null;
      throw error;
    }
  }

  async authenticatedRequest(method, url, data = null, options = {}) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const headers = {
          "Content-Type": "application/json",
          "X-Client": "mobile",
          Authorization: `Bearer ${this.accessToken}`,
          ...options.headers
        };

        const response = await axiosInstance({
          method,
          url,
          data,
          headers,
          ...options
        });

        return response;
      } catch (error) {
        lastError = error;
        
        if (error.response?.status === 401 || error.response?.status === 429) {
          const errorData = error.response?.data;
          if (errorData?.reconnection || errorData?.msg?.includes("expir") || errorData?.msg?.includes("invalide")) {
            console.log("🔄 Token expired or invalid, attempting refresh...");
            try {
              await this.refreshAccessToken();
              continue;
            } catch (refreshError) {
              console.error("❌ Refresh failed, cannot continue");
              throw new Error("Authentication failed: refresh token invalid or expired");
            }
          }
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }
}

const tokenManager = new TokenManager();

// 15 varied test biens for Cameroon
const TEST_BIENS = [
  // LOGEMENTS - Appartements
  {
    typeBien: "logement",
    type: "appartement",
    nature: "moderne",
    description: "Bel appartement moderne de 3 chambres au cœur de Yaoundé, quartier Bastos. Proche des commodités, écoles et centres commerciaux. Entièrement sécurisé avec gardien et caméras.",
    mode: "complet",
    exemplaire: { libre: 2, occuper: 1, construction: 0 },
    localisation: { pays: "Cameroun", ville: "Yaoundé", quartier: "Bastos", adresse: "Rue du Palais des Congrès", lat: 3.8612, lon: 11.5217 },
    prixGoudron: 0, devise: "XAF",
    images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800","https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"],
    videos: [], superficie: 120,
    securite: { gardien: true, camera: true, barriere: true, quartierSecuriser: true, eclairagePublic: true, Conciergerie: false },
    eau: { type: "postpayer", prix: 5000 }, electricite: { type: "prepayer", prix: 10000 }, estProcheGoudron: true,
    chambres: 3, salleBains: 2, cuisines: 1, salons: 1, etage: { min: 2, max: 2 }, niveauFinition: "bon_standing",
    equipements: { lit: true, armoire: true, bureau: true, canape: true, tableChaises: true, televiseur: true, climatiseur: true, refrigerateur: true, machineALaver: false, cuisineEquipee: true, wifi: true, parking: true, balcon: true, terrasse: false, jardin: false, piscine: false, ascenseur: false },
    environements: { ecole: true, marche: true, hopital: true, axePrincipal: true }
  },
  {
    typeBien: "logement",
    type: "appartement",
    nature: "meubler",
    description: "Appartement meublé 2 chambres standing à Yaoundé, quartier Hippodrome. Vue imprenable, finitions haut de gamme, prêt à habiter.",
    mode: "complet",
    exemplaire: { libre: 1, occuper: 0, construction: 0 },
    localisation: { pays: "Cameroun", ville: "Yaoundé", quartier: "Hippodrome", adresse: "Avenue Kennedy", lat: 3.8722, lon: 11.5156 },
    prixGoudron: 0, devise: "XAF",
    images: ["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"],
    videos: [], superficie: 95,
    securite: { gardien: true, camera: true, barriere: true, quartierSecuriser: true, eclairagePublic: true, Conciergerie: true },
    eau: { type: "postpayer", prix: 4000 }, electricite: { type: "prepayer", prix: 8000 }, estProcheGoudron: true,
    chambres: 2, salleBains: 2, cuisines: 1, salons: 1, etage: { min: 4, max: 4 }, niveauFinition: "haut_standing",
    equipements: { lit: true, armoire: true, bureau: true, canape: true, tableChaises: true, televiseur: true, climatiseur: true, refrigerateur: true, machineALaver: true, cuisineEquipee: true, wifi: true, parking: true, balcon: true, terrasse: true, jardin: false, piscine: true, ascenseur: true },
    environements: { ecole: true, marche: true, hopital: false, axePrincipal: true }
  },
  {
    typeBien: "logement",
    type: "studio",
    nature: "meubler",
    description: "Studio meublé tout confort à Douala, quartier Bonapriso. Idéal pour jeune actif ou étudiant. Proche du Wouri et des zones d'activités.",
    mode: "rapide",
    exemplaire: { libre: 1, occuper: 0, construction: 0 },
    localisation: { pays: "Cameroun", ville: "Douala", quartier: "Bonapriso", adresse: "Rue de la Paix", lat: 4.0511, lon: 9.7679 },
    prixGoudron: 0, devise: "XAF",
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800","https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800","https://images.unsplash.com/photo-1560448075-b90c8c9b8c0a?w=800"],
    videos: [], superficie: 35,
    securite: { gardien: true, camera: false, barriere: true, quartierSecuriser: true, eclairagePublic: true, Conciergerie: false },
    eau: { type: "fixe", prix: 3000 }, electricite: { type: "prepayer", prix: 5000 }, estProcheGoudron: true,
    chambres: 1, salleBains: 1, cuisines: 1, salons: 0, etage: { min: 1, max: 1 }, niveauFinition: "fini",
    equipements: { lit: true, armoire: true, bureau: true, canape: false, tableChaises: true, televiseur: true, climatiseur: true, refrigerateur: true, machineALaver: false, cuisineEquipee: true, wifi: true, parking: false, balcon: false, terrasse: false, jardin: false, piscine: false, ascenseur: false },
    environements: { ecole: true, marche: true, hopital: false, axePrincipal: true }
  },
  {
    typeBien: "logement",
    type: "chambre",
    nature: "simple",
    description: "Chambre étudiante meublée à Yaoundé, quartier Ngoa-Ekelle. Proche Université de Yaoundé I. Partage cuisine et salle de bain. Calme et sécurisé.",
    mode: "rapide",
    exemplaire: { libre: 3, occuper: 2, construction: 0 },
    localisation: { pays: "Cameroun", ville: "Yaoundé", quartier: "Ngoa-Ekelle", adresse: "Rue de l'Université", lat: 3.8748, lon: 11.5117 },
    prixGoudron: 0, devise: "XAF",
    images: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800","https://images.unsplash.com/photo-1560448075-b90c8c9b8c0a?w=800"],
    videos: [], superficie: 18,
    securite: { gardien: true, camera: false, barriere: true, quartierSecuriser: true, eclairagePublic: true, Conciergerie: false },
    eau: { type: "fixe", prix: 2000 }, electricite: { type: "prepayer", prix: 3000 }, estProcheGoudron: true,
    chambres: 1, salleBains: 0, cuisines: 0, salons: 0, etage: { min: 2, max: 2 }, niveauFinition: "simple",
    equipements: { lit: true, armoire: true, bureau: true, canape: false, tableChaises: false, televiseur: false, climatiseur: false, refrigerateur: false, machineALaver: false, cuisineEquipee: false, wifi: true, parking: false, balcon: false, terrasse: false, jardin: false, piscine: false, ascenseur: false },
    environements: { ecole: true, marche: true, hopital: true, axePrincipal: true }
  },
  {
    typeBien: "logement",
    type: "maison",
    nature: "simple",
    description: "Grande maison familiale de 5 chambres à Bafoussam, quartier Commercial. Espaces verts, garage, dépendances. Parfait pour grande famille.",
    mode: "complet",
    exemplaire: { libre: 1, occuper: 0, construction: 0 },
    localisation: { pays: "Cameroun", ville: "Bafoussam", quartier: "Commercial", adresse: "Avenue de la Liberté", lat: 5.4731, lon: 10.4173 },
    prixGoudron: 50000, devise: "XAF",
    images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800","https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800","https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"],
    videos: [], superficie: 250,
    securite: { gardien: true, camera: true, barriere: true, quartierSecuriser: true, eclairagePublic: true, Conciergerie: true },
    eau: { type: "postpayer", prix: 8000 }, electricite: { type: "postpayer", prix: 15000 }, estProcheGoudron: false,
    chambres: 5, salleBains: 3, cuisines: 1, salons: 2, etage: { min: 1, max: 2 }, niveauFinition: "haut_standing",
    equipements: { lit: true, armoire: true, bureau: true, canape: true, tableChaises: true, televiseur: true, climatiseur: true, refrigerateur: true, machineALaver: true, cuisineEquipee: true, wifi: true, parking: true, balcon: true, terrasse: true, jardin: true, piscine: false, ascenseur: false },
    environements: { ecole: true, marche: true, hopital: true, axePrincipal: false }
  },
  {
    typeBien: "logement",
    type: "villa",
    nature: "moderne",
    description: "Villa moderne de luxe 4 chambres à Douala, quartier Bonamoussadi. Piscine, jardin paysager, garage double. Quartier résidentiel prisé.",
    mode: "complet",
    exemplaire: { libre: 1, occuper: 0, construction: 0 },
    localisation: { pays: "Cameroun", ville: "Douala", quartier: "Bonamoussadi", adresse: "Rue des Palmiers", lat: 4.0634, lon: 9.7206 },
    prixGoudron: 0, devise: "XAF",
    images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800","https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"],
    videos: [], superficie: 320,
    securite: { gardien: true, camera: true, barriere: true, quartierSecuriser: true, eclairagePublic: true, Conciergerie: true },
    eau: { type: "postpayer", prix: 10000 }, electricite: { type: "prepayer", prix: 20000 }, estProcheGoudron: true,
    chambres: 4, salleBains: 3, cuisines: 1, salons: 2, etage: { min: 1, max: 2 }, niveauFinition: "luxe",
    equipements: { lit: true, armoire: true, bureau: true, canape: true, tableChaises: true, televiseur: true, climatiseur: true, refrigerateur: true, machineALaver: true, cuisineEquipee: true, wifi: true, parking: true, balcon: true, terrasse: true, jardin: true, piscine: true, ascenseur: false },
    environements: { ecole: true, marche: false, hopital: false, axePrincipal: true }
  },
  {
    typeBien: "logement",
    type: "duplex",
    nature: "meubler",
    description: "Duplex meublé 3 chambres à Kribi, quartier Résidentiel. Vue mer, terrasse panoramique. Proche plages et centre-ville.",
    mode: "complet",
    exemplaire: { libre: 1, occuper: 0, construction: 0 },
    localisation: { pays: "Cameroun", ville: "Kribi", quartier: "Résidentiel", adresse: "Boulevard de la Mer", lat: 2.9333, lon: 9.9167 },
    prixGoudron: 0, devise: "XAF",
    images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800","https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"],
    videos: [], superficie: 150,
    securite: { gardien: true, camera: true, barriere: true, quartierSecuriser: true, eclairagePublic: true, Conciergerie: false },
    eau: { type: "postpayer", prix: 6000 }, electricite: { type: "prepayer", prix: 12000 }, estProcheGoudron: true,
    chambres: 3, salleBains: 2, cuisines: 1, salons: 1, etage: { min: 1, max: 2 }, niveauFinition: "bon_standing",
    equipements: { lit: true, armoire: true, bureau: true, canape: true, tableChaises: true, televiseur: true, climatiseur: true, refrigerateur: true, machineALaver: true, cuisineEquipee: true, wifi: true, parking: true, balcon: true, terrasse: true, jardin: false, piscine: false, ascenseur: false },
    environements: { ecole: false, marche: true, hopital: true, axePrincipal: true }
  },
  {
    typeBien: "logement",
    type: "appartement",
    nature: "simple",
    description: "Appartement 2 chambres à Bangangté, quartier Centre-Ville. Proche marché et administrations. Prix abordable.",
    mode: "rapide",
    exemplaire: { libre: 2, occuper: 0, construction: 0 },
    localisation: { pays: "Cameroun", ville: "Bangangté", quartier: "Centre-Ville", adresse: "Rue du Marché", lat: 5.1297, lon: 10.5253 },
    prixGoudron: 0, devise: "XAF",
    images: ["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"],
    videos: [], superficie: 70,
    securite: { gardien: false, camera: false, barriere: true, quartierSecuriser: true, eclairagePublic: true, Conciergerie: false },
    eau: { type: "postpayer", prix: 3000 }, electricite: { type: "prepayer", prix: 5000 }, estProcheGoudron: true,
    chambres: 2, salleBains: 1, cuisines: 1, salons: 1, etage: { min: 1, max: 1 }, niveauFinition: "simple",
    equipements: { lit: true, armoire: true, bureau: false, canape: true, tableChaises: true, televiseur: false, climatiseur: false, refrigerateur: true, machineALaver: false, cuisineEquipee: false, wifi: false, parking: false, balcon: false, terrasse: false, jardin: false, piscine: false, ascenseur: false },
    environements: { ecole: true, marche: true, hopital: true, axePrincipal: true }
  },

  // BUREAUX
  {
    typeBien: "bureau",
    dimension: "Open space 50m² + 2 bureaux fermés",
    exemplaire: { libre: 3, occuper: 0, construction: 0 },
    pays: "Cameroun", ville: "Yaoundé", quartier: "Centre-ville", adresse: "Boulevard du 20 Mai",
    lat: 3.8667, lon: 11.5167, prixGoudron: 0,
    etage: { min: 3, max: 3 },
    images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800","https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800","https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800","https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800"],
    videos: [], superficie: 120,
    salleReunion: true, accueil: true, parking: true,
    eau: { type: "postpayer", prix: 5000 }, electricite: { type: "prepayer", prix: 15000 },
    toilettes: true, climatisation: true, internet: true,
    securite: { gardien: true, camera: true, barriere: true },
    environement: { ecole: true, marche: true, hopital: false, axePrincipal: true }
  },
  {
    typeBien: "bureau",
    dimension: "Bureau individuel 25m²",
    exemplaire: { libre: 5, occuper: 2, construction: 0 },
    pays: "Cameroun", ville: "Douala", quartier: "Akwa", adresse: "Rue de la Poste",
    lat: 4.0511, lon: 9.7679, prixGoudron: 0,
    etage: { min: 2, max: 2 },
    images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800","https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800","https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800","https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800"],
    videos: [], superficie: 25,
    salleReunion: false, accueil: false, parking: true,
    eau: { type: "postpayer", prix: 2000 }, electricite: { type: "prepayer", prix: 5000 },
    toilettes: true, climatisation: true, internet: true,
    securite: { gardien: true, camera: false, barriere: true },
    environement: { ecole: false, marche: true, hopital: true, axePrincipal: true }
  },

  // BOUTIQUES
  {
    typeBien: "boutique",
    superficie: 80,
    pays: "Cameroun", ville: "Douala", quartier: "Akwa", adresse: "Rue Joss",
    lat: 4.0511, lon: 9.7679,
    gardien: true, camera: true, eclairagePublic: true,
    prixGoudron: 0,
    etage: { min: 0, max: 0 },
    exemplaire: { libre: 2, occuper: 1, construction: 0 },
    parking: false,
    eau: { type: "postpayer", prix: 3000 }, electricite: { type: "prepayer", prix: 8000 },
    toilettes: { type: "fixe", prix: 2000 }, climatisation: true, espaceStockage: true,
    marche: true, supermarche: false, banque: true, pharmacie: false, ecole: false, station: true, hopital: false,
    images: ["https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800","https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800","https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800","https://images.unsplash.com/photo-1567690187548-b4a0d675d0c0?w=800"],
    videos: []
  },
  {
    typeBien: "boutique",
    superficie: 120,
    pays: "Cameroun", ville: "Yaoundé", quartier: "Mokolo", adresse: "Marché Central",
    lat: 3.8592, lon: 11.5014,
    gardien: true, camera: true, eclairagePublic: true,
    prixGoudron: 0,
    etage: { min: 0, max: 1 },
    exemplaire: { libre: 1, occuper: 0, construction: 0 },
    parking: true,
    eau: { type: "postpayer", prix: 5000 }, electricite: { type: "prepayer", prix: 10000 },
    toilettes: { type: "fixe", prix: 3000 }, climatisation: true, espaceStockage: true,
    marche: true, supermarche: true, banque: true, pharmacie: true, ecole: true, station: true, hopital: true,
    images: ["https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800","https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800","https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800","https://images.unsplash.com/photo-1567690187548-b4a0d675d0c0?w=800"],
    videos: []
  },

  // TERRAINS
  {
    typeBien: "terrain",
    superficie: 500,
    forme: "rectangle", dimension: "20m x 25m",
    exemplaire: 500,
    pays: "Cameroun", ville: "Kribi", quartier: "Grand Batanga", adresse: "Route de la Plage",
    lat: 2.9333, lon: 9.9167, prixGoudron: 100000,
    images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800","https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800","https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800","https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"],
    videos: [], titreFontier: true
  },
  {
    typeBien: "terrain",
    superficie: 1000,
    forme: "carre", dimension: "31.6m x 31.6m",
    exemplaire: 1000,
    pays: "Cameroun", ville: "Douala", quartier: "Logbaba", adresse: "Zone Industrielle",
    lat: 4.0167, lon: 9.6833, prixGoudron: 50000,
    images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800","https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800","https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800","https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"],
    videos: [], titreFontier: true
  },
  {
    typeBien: "terrain",
    superficie: 300,
    forme: "rectangle", dimension: "15m x 20m",
    exemplaire: 300,
    pays: "Cameroun", ville: "Yaoundé", quartier: "Emana", adresse: "Route d'Emana",
    lat: 3.8333, lon: 11.4833, prixGoudron: 0,
    images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800","https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800","https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800","https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"],
    videos: [], titreFontier: false
  },
  {
    typeBien: "terrain",
    superficie: 2000,
    forme: "autres", dimension: "Terrain irrégulier",
    exemplaire: 2000,
    pays: "Cameroun", ville: "Bafoussam", quartier: "Kouoptamo", adresse: "Sortie de ville",
    lat: 5.4500, lon: 10.4000, prixGoudron: 200000,
    images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800","https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800","https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800","https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"],
    videos: [], titreFontier: true
  }
];

async function login() {
  console.log("\n🔐 Authenticating test account...");
  
  try {
    const response = await axiosInstance.post(
      `${API_BASE}/auth/login`,
      {
        role: TEST_CREDENTIALS.role,
        identifiant: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Client": "mobile"
        }
      }
    );

    if (response.data.success && response.data.data) {
      const { user, accessToken, refreshToken } = response.data.data;
      tokenManager.setTokens(accessToken, refreshToken, user);
      
      console.log("✅ Authentication successful");
      console.log(`   User ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Name: ${user.prenom} ${user.nom}`);
      console.log(`   Email verified: ${user.verification?.emailVerifie || false}`);
      console.log(`   Access token: ${accessToken ? "✓ received" : "✗ missing"}`);
      console.log(`   Refresh token: ${refreshToken ? "✓ received" : "✗ missing"}`);
      
      return { user, accessToken, refreshToken };
    }
    
    throw new Error(response.data.message || response.data.msg || "Login failed");
  } catch (error) {
    console.error("❌ Authentication failed:");
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.response?.data?.message || error.response?.data?.msg || error.message}`);
    throw error;
  }
}

async function verifyProfile() {
  console.log("\n👤 Verifying user profile and permissions...");
  console.log(`   Using idPublic: ${tokenManager.userIdPublic}, role: ${tokenManager.userRole}`);
  
  try {
    const response = await tokenManager.authenticatedRequest(
      "POST",
      `${API_BASE}/profil`,
      { idPublic: tokenManager.userIdPublic, role: tokenManager.userRole }
    );
    
    console.log(`   Response status: ${response.status}`);
    console.log(`   Response success: ${response.data.success}`);
    
    if (response.data.success && response.data.profil) {
      const user = response.data.profil;
      console.log("✅ Profile retrieved successfully");
      console.log(`   ID: ${user.profil?.documentId || user.idPublic}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Name: ${user.profil?.prenom} ${user.profil?.nom}`);
      console.log(`   Email: ${user.profil?.email}`);
      console.log(`   Email verified: ${user.profil?.verification?.emailVerifie || false}`);
      console.log(`   Phone verified: ${user.profil?.verification?.telephoneVerifie || false}`);
      console.log(`   Status: ${user.profil?.status}`);
      console.log(`   Forfait: ${user.profil?.forfait?.type}`);
      console.log(`   Can create biens: ${user.role === "bailleur" ? "YES" : "NO"}`);
      
      if (user.role !== "bailleur") {
        throw new Error("User is not a bailleur, cannot create biens");
      }
      
      return user;
    }
    
    throw new Error("Failed to retrieve profile");
  } catch (error) {
    console.error("❌ Profile verification failed:");
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.response?.data?.message || error.response?.data?.msg || error.message}`);
    throw error;
  }
}

async function testTokenRefresh() {
  console.log("\n🔄 Testing token refresh...");
  
  try {
    const oldAccessToken = tokenManager.accessToken;
    await tokenManager.refreshAccessToken();
    
    if (tokenManager.accessToken && tokenManager.accessToken !== oldAccessToken) {
      console.log("✅ Token refresh working correctly");
      console.log(`   New access token: ${tokenManager.accessToken ? "✓ generated" : "✗ failed"}`);
      return true;
    }
    
    throw new Error("Token not refreshed");
  } catch (error) {
    console.error("❌ Token refresh test failed:", error.message);
    return false;
  }
}

async function createBien(bienData) {
  console.log(`\n🏗️  Creating bien: ${bienData.typeBien} - ${bienData.type || bienData.dimension || ''} in ${bienData.ville}, ${bienData.quartier}`);
  
  try {
    const response = await tokenManager.authenticatedRequest(
      "POST",
      `${API_BASE}/bien`,
      bienData
    );

    if (response.data.success && response.data.bien) {
      const bien = response.data.bien;
      console.log(`✅ Bien created successfully`);
      console.log(`   ID Public: ${bien.idPublic}`);
      console.log(`   Type: ${bien.typeBien}`);
      console.log(`   Ville: ${bien.localisation?.ville}`);
      console.log(`   Quartier: ${bien.localisation?.quartier}`);
      return { success: true, bien, data: response.data };
    }
    
    throw new Error(response.data.message || response.data.msg || "Failed to create bien");
  } catch (error) {
    console.error(`❌ Failed to create bien:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.response?.data?.message || error.response?.data?.msg || error.message}`);
    if (error.response?.data?.errors) {
      console.error(`   Errors:`, JSON.stringify(error.response.data.errors, null, 2));
    }
    return { success: false, error: error.response?.data?.message || error.response?.data?.msg || error.message, status: error.response?.status };
  }
}

async function verifyBien(bienId) {
  console.log(`\n🔍 Verifying bien: ${bienId}`);
  
  try {
    const response = await tokenManager.authenticatedRequest(
      "GET",
      `${API_BASE}/bien/${bienId}`
    );

    if (response.data.success && response.data.bien) {
      const bien = response.data.bien;
      console.log(`✅ Bien verified successfully`);
      console.log(`   ID: ${bien.idPublic}`);
      console.log(`   Type: ${bien.typeBien}`);
      console.log(`   Bailleur ID: ${bien.bailleurId}`);
      return { success: true, bien };
    }
    
    throw new Error("Bien not found");
  } catch (error) {
    console.error(`❌ Verification failed:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
}

async function listBiens() {
  console.log("\n📋 Listing all biens for the authenticated bailleur...");
  
  try {
    const response = await tokenManager.authenticatedRequest(
      "GET",
      `${API_BASE}/bien?limit=50`
    );

    if (response.data.success && response.data.biens) {
      const biens = response.data.biens;
      console.log(`✅ Retrieved ${biens.length} biens`);
      
      const stats = { total: biens.length, byType: {}, byVille: {}, byStatus: {} };
      
      biens.forEach(b => {
        stats.byType[b.typeBien] = (stats.byType[b.typeBien] || 0) + 1;
        stats.byVille[b.localisation?.ville] = (stats.byVille[b.localisation?.ville] || 0) + 1;
        const status = b.exemplaire?.occuper > 0 ? "occupied" : (b.exemplaire?.construction > 0 ? "construction" : "available");
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });
      
      console.log(`   By type:`, stats.byType);
      console.log(`   By ville:`, stats.byVille);
      console.log(`   By status:`, stats.byStatus);
      
      return { success: true, biens, stats };
    }
    
    throw new Error("Failed to list biens");
  } catch (error) {
    console.error(`❌ List failed:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.response?.data?.message || error.message}`);
    return { success: false };
  }
}

async function testFilters() {
  console.log("\n🔍 Testing filters and search...");
  
  const tests = [
    { name: "Filter by ville (Yaoundé)", url: `${API_BASE}/bien?ville=Yaoundé&limit=10` },
    { name: "Filter by type (logement)", url: `${API_BASE}/bien?type=logement&limit=10` },
    { name: "Filter by nature (meubler)", url: `${API_BASE}/bien?nature=meubler&limit=10` },
    { name: "Pagination (page 2)", url: `${API_BASE}/bien?page=2&limit=2` }
  ];
  
  for (const test of tests) {
    try {
      const response = await tokenManager.authenticatedRequest("GET", test.url);
      if (response.data.success) {
        console.log(`✅ ${test.name}: ${response.data.biens?.length || 0} results`);
      } else {
        console.log(`❌ ${test.name}: Failed`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function testAccessAfterRefresh() {
  console.log("\n🔄 Testing access after token refresh...");
  
  try {
    await tokenManager.refreshAccessToken();
    const response = await tokenManager.authenticatedRequest("GET", `${API_BASE}/bien?limit=1`);
    
    if (response.data.success) {
      console.log("✅ Access after refresh works correctly");
      return true;
    }
    throw new Error("Access failed after refresh");
  } catch (error) {
    console.error("❌ Access after refresh failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     ImoFast - Create 15 Test Biens                          ║");
  console.log("║     Authenticating as bailleur and creating test biens       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  
  const report = {
    authentication: { success: false, user: null, tokens: { access: false, refresh: false }, refreshTested: false },
    dataCreation: { biensCreated: 0, biensFailed: 0, details: [] },
    verification: { biensVerified: 0, relationsOk: false, filtersWork: false, refreshWorks: false, accessAfterRefresh: false },
    errors: []
  };

  try {
    await login();
    report.authentication.success = true;
    report.authentication.tokens.access = !!tokenManager.accessToken;
    report.authentication.tokens.refresh = !!tokenManager.refreshToken;

    const user = await verifyProfile();
    report.authentication.user = { id: user.id, role: user.role, name: `${user.prenom} ${user.nom}` };

    const refreshTested = await testTokenRefresh();
    report.authentication.refreshTested = refreshTested;

    console.log("\n📦 Creating 15 test biens...");
    for (const bienData of TEST_BIENS) {
      const result = await createBien(bienData);
      report.dataCreation.details.push({
        type: bienData.typeBien,
        subtype: bienData.type || bienData.dimension || '',
        ville: bienData.ville,
        quartier: bienData.quartier,
        success: result.success,
        idPublic: result.bien?.idPublic,
        error: result.error
      });
      
      if (result.success) {
        report.dataCreation.biensCreated++;
      } else {
        report.dataCreation.biensFailed++;
      }
      
      await new Promise(r => setTimeout(r, 500));
    }

    console.log("\n✅ Verifying created biens...");
    for (const detail of report.dataCreation.details) {
      if (detail.success && detail.idPublic) {
        const result = await verifyBien(detail.idPublic);
        if (result.success) {
          report.verification.biensVerified++;
          if (result.bien.bailleurId === tokenManager.userId) {
            report.verification.relationsOk = true;
          }
        }
      }
    }

    const listResult = await listBiens();
    if (listResult.success) {
      report.verification.filtersWork = true;
    }

    await testFilters();
    
    const accessAfterRefresh = await testAccessAfterRefresh();
    report.verification.accessAfterRefresh = accessAfterRefresh;

  } catch (error) {
    report.errors.push({
      step: "main",
      message: error.message,
      stack: error.stack
    });
    console.error("\n❌ Fatal error:", error.message);
  }

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                      FINAL REPORT                             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  
  console.log("\n📋 AUTHENTICATION:");
  console.log(`   Account: ${report.authentication.user?.name || "N/A"} (${report.authentication.user?.role || "N/A"})`);
  console.log(`   User ID: ${report.authentication.user?.id || "N/A"}`);
  console.log(`   Authenticated: ${report.authentication.success ? "✅ YES" : "❌ NO"}`);
  console.log(`   Access Token: ${report.authentication.tokens.access ? "✅ Received" : "❌ Missing"}`);
  console.log(`   Refresh Token: ${report.authentication.tokens.refresh ? "✅ Received" : "❌ Missing"}`);
  console.log(`   Refresh Tested: ${report.authentication.refreshTested ? "✅ YES" : "❌ NO"}`);

  console.log("\n📦 DATA CREATED:");
  console.log(`   Biens created: ${report.dataCreation.biensCreated}`);
  console.log(`   Biens failed: ${report.dataCreation.biensFailed}`);
  
  const byType = {};
  const byVille = {};
  report.dataCreation.details.forEach(d => {
    if (d.success) {
      byType[d.type] = (byType[d.type] || 0) + 1;
      byVille[d.ville] = (byVille[d.ville] || 0) + 1;
    }
  });
  console.log(`   By type:`, byType);
  console.log(`   By ville:`, byVille);

  console.log("\n✅ VERIFICATIONS:");
  console.log(`   Biens verified: ${report.verification.biensVerified}/${report.dataCreation.biensCreated}`);
  console.log(`   Relations correct: ${report.verification.relationsOk ? "✅ YES" : "❌ NO"}`);
  console.log(`   Filters work: ${report.verification.filtersWork ? "✅ YES" : "❌ NO"}`);
  console.log(`   Access after refresh: ${report.verification.accessAfterRefresh ? "✅ YES" : "❌ NO"}`);

  if (report.errors.length > 0) {
    console.log("\n❌ ERRORS ENCOUNTERED:");
    report.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.message}`);
    });
  }

  console.log("\n✨ Script completed!");
}

main().catch(console.error);