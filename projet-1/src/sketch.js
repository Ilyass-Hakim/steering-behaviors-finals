// sketch.js — point d'entrée p5 : création du monde, boucle de simulation, dessin.
//
// Le monde est logique (1600 × 900). Le canevas s'adapte à la fenêtre : on applique une
// échelle uniforme, les marges restent noires.

let monde;
let echelle = 1;
let decalageX = 0;
let decalageY = 0;
const reglages = { lumiere: false, ondes: true, rayons: false, chemin: false, vitesse: 1, pause: false };

function setup() {
  const scene = document.getElementById('scene');
  const canevas = createCanvas(scene.clientWidth, scene.clientHeight);
  canevas.parent(scene);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  randomSeed(CONFIG.graine);
  monde = new Monde(CONFIG.graine);
  ajusterEchelle();
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
  if (!reglages.pause) {
    for (let i = 0; i < reglages.vitesse; i++) monde.pas();
  }
  const lum = monde.cycle.lumiere;
  background(4 + 20 * lum, 5 + 12 * lum, 9 + 4 * lum);
  const ctx = drawingContext;
  ctx.save();
  ctx.translate(decalageX, decalageY);
  ctx.scale(echelle, echelle);
  monde.dessiner(ctx, reglages);
  ctx.restore();
}
