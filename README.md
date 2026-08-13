# React + Vite

Ce modèle fournit une configuration minimale pour faire fonctionner React avec Vite, avec le rechargement à chaud (HMR) et quelques règles ESLint.

Actuellement, deux plugins officiels sont disponibles :

* @vitejs/plugin-react
utilise Oxc
* @vitejs/plugin-react-swc
utilise SWC

# Compilateur React

Le compilateur React n’est pas activé dans ce modèle en raison de son impact sur les performances en développement et lors du build. Pour l’ajouter, consulte cette documentation :
https://react.dev/learn/react-compiler/installation

# Extension de la configuration ESLint

Si tu développes une application destinée à la production, il est recommandé d’utiliser TypeScript avec des règles de lint basées sur les types. Consulte le modèle TS pour savoir comment intégrer TypeScript et typescript-eslint dans ton projet :
https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts#