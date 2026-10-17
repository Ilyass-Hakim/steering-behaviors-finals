// sketch.js — point d'entrée p5 : création du monde, boucle de simulation, dessin.
//
// Le monde est logique (1600 × 900). Le canevas s'adapte à la fenêtre : on applique une
// échelle uniforme, les marges restent noires.

let grotte;
let chauvesSouris = [];
let echelle = 1;
let decalageX = 0;
let decalageY = 0;
let modeLumiere = true;       // tant que le sonar n'existe pas, on montre la grotte

function setup() {
  const scene = document.getElementById('scene');
  const canevas = createCanvas(scene.clientWidth, scene.clientHeight);
  canevas.parent(scene);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  creerMonde(CONFIG.graine);
  ajusterEchelle();
}

function creerMonde(graine) {
  Bat.reinitialiserCompteur();
  grotte = new Cave(CONFIG.monde.largeur, CONFIG.monde.hauteur, graine);
  chauvesSouris = [];
  grotte.libererPlaces();
  for (let i = 0; i < CONFIG.chauveSouris.nombre; i++) {
    const b = new Bat(0, 0);
    const place = grotte.reserverPlace((grotte.zoneRepos.x0 + grotte.zoneRepos.x1) / 2, 0);
    if (place) {
      b.pos.set(place.x, place.y);
      b.place = place;
    }
    chauvesSouris.push(b);
  }
}

function ajusterEchelle() {
  echelle = Math.min(width / CONFIG.monde.largeur, height / CONFIG.monde.hauteur);
  decalageX = (width - CONFIG.monde.largeur * echelle) / 2;
  decalageY = (height - CONFIG.monde.hauteur * echelle) / 2;
}

function windowResized() {
  const scene = document.getElementById('scene');
  resizeCanvas(scene.clientWidth, scene.clientHeight);
  ajusterEchelle();
}

function draw() {
  background(4, 5, 9);
  const ctx = drawingContext;
  ctx.save();
  ctx.translate(decalageX, decalageY);
  ctx.scale(echelle, echelle);
  if (modeLumiere) grotte.dessinerGeometrie(ctx, 0.35);
  for (const b of chauvesSouris) b.dessiner(ctx);
  ctx.restore();
}
