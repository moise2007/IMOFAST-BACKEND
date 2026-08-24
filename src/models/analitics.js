const analyticsSession = {
    // IDENTIFICATION
    role: "visiteur",
    anonymousId: "anon_72jd82",
    userId: null, // null pour un visiteur

    // SESSION
    startedAt: "2026-08-10T12:30:00.000Z",
    endedAt: "2026-08-10T13:02:15.000Z",

    // durée totale sur ImoFast en secondes
    duration: 1935,

    // dernière page consultée avant de quitter
    exitPage: "/annonces/bien-928",

    const annoncesVisiter =  [
        {
            annonceId: "bien-928",
            duration: 420,
            visitedAt: "2026-08-10T12:33:00.000Z"
        },
    ]
    
    
    const events = [
        {
            name: "search",
            createdAt: "2026-08-10T12:31:00.000Z",
            data: {
                ville: "Yaoundé",
                quartier: "Bastos",
                type: "Appartement",
                prixMax: 300000,
                chambres: 2
            }
        },
        {
            name: "property_view",
            createdAt: "2026-08-10T12:33:00.000Z",

            data: {
                annonceId: "bien-928"
            }
        },
    ]

    
}