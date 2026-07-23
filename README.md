# BetterGantt

Visualiseur et exporteur de diagrammes de Gantt. Appli 100% front-end (aucune base de données,
aucun backend) : on importe un fichier `.gan` (GanttProject) ou un export JSON BetterGantt,
on retouche les tâches et les couleurs, et on exporte un PDF propre (A4 une page ou multi-pages,
portrait ou paysage).

Les projets sont sauvegardés localement dans le navigateur (`localStorage`).

## En local

**Prérequis :** Node.js

1. Installer les dépendances : `npm install`
2. Lancer l'appli : `npm run dev`
3. Ouvrir l'URL affichée (par défaut `http://localhost:5173`)

## Build de production

```
npm run build
npm run preview
```
