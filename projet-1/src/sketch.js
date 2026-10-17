// sketch.js — point d'entrée p5 : création du monde, boucle de simulation, dessin.
//
// Le monde est logique (1600 × 900). Le canevas s'adapte à la fenêtre : on applique une
// échelle uniforme, les marges restent noires. L'interface (ui.js) règle UI.options,
// UI.pause et UI.vitesse ; la simulation, elle, ne dépend pas d'elle.

let monde;
let echelle = 1;
let decalageX = 0;
let decalageY = 0;
let graineCourante = CONFIG.graine;
let derniereMajUI = 0;
let enIntro = true;

function setup() {
  const scene = document.getElementById('scene');
  const canevas = createCanvas(scene.clientWidth, scene.clientHeight);
  canevas.parent(scene);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  randomSeed(CONFIG.graine);
  monde = new Monde(CONFIG.graine);
  ajusterEchelle();

  UI.init(monde, { nouvelleGrotte, ajusterNombre });
  canevas.elt.addEventListener('pointerdown', cliquer);
  canevas.elt.addEventListener('pointermove', survoler);

  const intro = document.getElementById('intro');
  const entrer = () => {
    intro.classList.add('masque');
    enIntro = false;
    setTimeout(() => { intro.hidden = true; }, 900);
  };
  document.getElementById('intro-entrer').addEventListener('click', entrer);
  // ?intro=0 : démarrer directement (captures d'écran, démonstration)
  if (new URLSearchParams(location.search).get('intro') === '0') { intro.hidden = true; enIntro = false; }
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

/** Recrée le monde (nouvelle grotte ou autre nombre de chauves-souris) en gardant les réglages */
function recreer(graine, nombre) {
  graineCourante = graine;
  randomSeed(graine);
  const actifs = monde.actifs;
  monde = new Monde(graine, nombre);
  monde.actifs = actifs;
  monde.ajusterPapillons(+document.getElementById('r-papillons').value);
  UI.changerMonde(monde);
}

function nouvelleGrotte() {
  recreer(Math.floor(Math.random() * 1e9), monde.chauvesSouris.length);
  monde.noter('Une nouvelle grotte', 'info');
}

function ajusterNombre(n) {
  recreer(graineCourante, n);
}

function versMonde(evt) {
  const r = evt.target.getBoundingClientRect();
  return { x: (evt.clientX - r.left - decalageX) / echelle, y: (evt.clientY - r.top - decalageY) / echelle };
}

function cliquer(evt) {
  const p = versMonde(evt);
  UI.selectionner(monde.chauveSourisPres(p.x, p.y, 34 / Math.max(0.6, echelle)));
}

function survoler(evt) {
  const p = versMonde(evt);
  evt.target.classList.toggle('survol', !!monde.chauveSourisPres(p.x, p.y, 34 / Math.max(0.6, echelle)));
}

function draw() {
  if (!UI.pause && !enIntro) {
    for (let i = 0; i < UI.vitesse; i++) monde.pas();
  } else if (enIntro) {
    monde.pas();   // la grotte vit doucement derrière l'écran d'accueil
  }
  const lum = monde.cycle.lumiere;
  background(4 + 20 * lum, 5 + 12 * lum, 9 + 4 * lum);
  const ctx = drawingContext;
  ctx.save();
  ctx.translate(decalageX, decalageY);
  ctx.scale(echelle, echelle);
  monde.dessiner(ctx, { ...UI.options, selection: UI.selection });
  ctx.restore();

  const t = millis();
  if (t - derniereMajUI > 200) {
    derniereMajUI = t;
    document.getElementById('s-fps').textContent = Math.round(frameRate());
    UI.rafraichir();
  }
}
