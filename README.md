# Journal de lecture d'Auguste

Une petite application web pour suivre les temps de lecture d'un enfant, semaine
par semaine. Conçue pour être installée sur une tablette comme une vraie
application, sans passer par un store.

## Fonctionnalités

- Tableau de la semaine (du vendredi au jeudi) avec le temps de lecture et
  le(s) livre(s) lu(s) chaque jour, et le total de la semaine calculé
  automatiquement.
- Navigation entre les semaines avec les flèches de chaque côté du tableau.
- Chronomètre de lecture avec Start / Pause / Stop. Le Stop enregistre le
  temps dans le tableau du jour.
- Choix du livre en cours dans une liste, avec une entrée `<Nouveau...>`
  pour en ajouter un.
- Les données (livres, temps de lecture) sont sauvegardées directement sur
  la tablette (stockage local du navigateur) : elles restent d'une session à
  l'autre, même hors connexion.

## Tester en local

Aucune installation n'est nécessaire, ce sont des fichiers HTML/CSS/JS
statiques. Il faut juste les servir via un petit serveur local (nécessaire
pour que le service worker fonctionne) :

```bash
python -m http.server 8532
```

Puis ouvrir `http://localhost:8532` dans un navigateur.

## Installer sur la tablette (une fois déployé sur GitHub Pages)

1. Sur la tablette, ouvrir le navigateur (Chrome / Safari) à l'adresse du
   site (voir section Déploiement ci-dessous).
2. Ouvrir le menu du navigateur puis choisir **"Ajouter à l'écran
   d'accueil"** (Android/Chrome) ou **"Sur l'écran d'accueil"**
   (iPad/Safari).
3. Une icône apparaît sur l'écran d'accueil et lance l'application en plein
   écran, comme une app installée. Elle fonctionne aussi sans connexion
   internet après la première ouverture.

## Déploiement sur GitHub Pages

Le dépôt est déjà prêt pour GitHub Pages (fichiers statiques, chemins
relatifs). Étape unique à faire une fois sur GitHub :

1. Aller dans **Settings > Pages** du dépôt GitHub.
2. Dans **Build and deployment > Source**, choisir **Deploy from a
   branch**.
3. Choisir la branche `main` et le dossier `/ (root)`, puis **Save**.
4. Après une minute, le site est disponible à
   `https://<utilisateur>.github.io/<nom-du-dépôt>/`.

Chaque `git push` sur `main` met ensuite le site à jour automatiquement.

## Données et sauvegarde

Les données sont stockées dans le navigateur de la tablette (`localStorage`),
pas sur un serveur. Cela veut dire :

- Aucune inscription ni compte nécessaire, ça fonctionne hors ligne.
- Les données restent propres à cette tablette et à ce navigateur. Si on
  vide les données de navigation de l'app ou qu'on change de tablette, il
  faudra ressaisir les livres (mais pas l'historique déjà enregistré,
  perdu dans ce cas).

## Structure du projet

```
index.html              Page principale
css/style.css            Styles (fond bleu, tableau vert clair)
js/app.js                 Logique de l'application
manifest.webmanifest      Manifeste PWA (icône, nom, couleurs)
service-worker.js         Cache hors-ligne
icons/                     Icônes de l'application
```
