// sketch.js — point d'entrée p5 et état de l'application (App).
//
// Le monde est logique (1600 × 900) ; le canevas s'adapte à la fenêtre. Quatre missions partagent
// la même scène ; chacune a sa simulation (ga, flotte, ecole, colonie) et sa vue.

const COULEURS_DRONES = ['#e0f2fe', '#fde68a', '#f9a8d4', '#86efac'];

const App = {
  mission: 1,
  pause: false,
  vitesse: 1,
  epure: false,
  temps: 0,
  echelle: 1, dx: 0, dy: 0,
  enIntro: true,

  ville: null, ga: null, gaReste: 0,
  drones: [], optionsVol: { guide: true, couloir: true, traces: true },
  ecole: null, turbo: 0, examen: null, brevet: null,
  colonie: null, selection: null,
  vues: {},

  // ---------- Mission 1 : algorithme génétique ----------
  nouvelleVille(graine = CONFIG.graine) {
    this.ville = new Ville(graine);
    this.nouveauGA();
  },

  nouveauGA() {
    const p = CONFIG.genetique;
    const reglages = this.reglagesGA || { mutation: p.mutation, population: p.population };
    this.ga = new Genetique(this.ville.matriceDistances(), {
      population: reglages.population, mutation: reglages.mutation, elitisme: p.elitisme, tournoi: p.tournoi, rng: this.rngGA,
    });
    this.gaAleatoire = this.ga.moyenne;
    this.stagnation = 0;
    this.drones = [];
  },

  changerLivraisons(n) {
    this.ville.tirerLivraisons(n, this.rngGA);
    this.nouveauGA();
  },

  pasGA(dt) {
    if (this.stagnation > 90) return;
    this.gaReste += dt * CONFIG.genetique.generationsParSeconde * this.vitesse;
    while (this.gaReste >= 1) {
      this.gaReste--;
      const avant = this.ga.meilleureLongueur;
      this.ga.suivante();
      this.stagnation = this.ga.meilleureLongueur < avant - 1e-6 ? 0 : this.stagnation + 1;
    }
  },

  // ---------- Mission 2 : path following ----------
  /** Découpe la meilleure tournée entre k drones (tronçons consécutifs) */
  lancerVol(k = this.nbDrones || 2) {
    this.nbDrones = k;
    const pts = [this.ville.hub, ...this.ville.livraisons];
    const ordre = this.ga.meilleur.map((i) => pts[i]);
    const parts = Math.min(k, ordre.length);
    this.drones = [];
    for (let i = 0; i < parts; i++) {
      const a = Math.round((ordre.length * i) / parts);
      const b = Math.round((ordre.length * (i + 1)) / parts);
      const etapes = [this.ville.hub, ...ordre.slice(a, b), this.ville.hub];
      this.drones.push(new Drone(this.ville, etapes, { couleur: COULEURS_DRONES[i % COULEURS_DRONES.length], delaiDepart: i * 50 }));
    }
    this.volTermine = false;
  },

  pasVol() {
    const vivants = this.drones.filter((d) => d.etat !== 'termine');
    for (const d of this.drones) d.penser(this.drones.filter((o) => o !== d && o.etat === 'vol'));
    for (const d of this.drones) d.update();
    if (!this.volTermine && vivants.length && this.drones.every((d) => d.termine)) {
      this.volTermine = true;
      UI.bandeau('Tournée terminée : toutes les livraisons sont faites');
    }
  },

  // ---------- Mission 3 : neuroévolution ----------
  nouvelleEcole(graine = Math.floor(Math.random() * 1e6)) {
    this.ecole = new Ecole(graine);
    this.examen = null;
    this.brevet = null;
    this.turbo = 0;
  },

  passerExamen() {
    this.turbo = 0;
    this.brevet = null;
    this.examen = { terrains: Ecole.terrainsExamen(), i: 0, resultats: [], pilote: null, attente: 0, reseau: this.ecole.evo.meilleur.copie() };
    this.examen.pilote = new Pilote(this.examen.terrains[0], this.examen.reseau);
  },

  pasExamen() {
    const ex = this.examen;
    if (ex.attente > 0) {
      if (--ex.attente === 0) {
        ex.i++;
        if (ex.i >= ex.terrains.length) { this.finExamen(); return; }
        ex.pilote = new Pilote(ex.terrains[ex.i], ex.reseau);
      }
      return;
    }
    ex.pilote.penser();
    ex.pilote.update();
    if (!ex.pilote.vivant) { ex.resultats.push(ex.pilote.etat === 'arrive'); ex.attente = 45; }
  },

  finExamen() {
    const reussites = this.examen.resultats.filter(Boolean).length;
    this.brevet = { reussites, total: this.examen.resultats.length, ok: reussites >= 6, generation: this.ecole.generationsEcoulees };
    this.examen = null;
    UI.bandeau(this.brevet.ok ? `Brevet obtenu : ${reussites} / ${this.brevet.total} terrains inconnus réussis` : `Examen raté : ${reussites} / ${this.brevet.total}`);
  },

  pasEcole(pas) {
    for (let i = 0; i < pas; i++) this.ecole.pas();
  },

  /** Entraînement accéléré : on calcule autant que le budget de temps de l'image le permet */
  pasTurbo() {
    const debut = performance.now();
    while (this.turbo > 0 && performance.now() - debut < 14) {
      const g = this.ecole.generationsEcoulees;
      this.ecole.pas();
      if (this.ecole.generationsEcoulees > g) this.turbo--;
    }
  },

  // ---------- Mission 4 : evolutionary steering ----------
  nouvelleColonie(graine = Math.floor(Math.random() * 1e6)) {
    this.colonie = new Colonie(graine);
    this.selection = null;
  },

  // ---------- Boucle ----------
  avancer() {
    if (this.pause) return;
    const dt = 1 / 60;
    if (this.mission === 1) this.pasGA(dt);
    else if (this.mission === 2) { for (let i = 0; i < this.vitesse; i++) this.pasVol(); }
    else if (this.mission === 3) {
      if (this.examen) { for (let i = 0; i < Math.min(this.vitesse, 4); i++) if (this.examen) this.pasExamen(); }
      else if (this.turbo > 0) this.pasTurbo();
      else this.pasEcole(this.vitesse);
    } else if (this.mission === 4) { for (let i = 0; i < this.vitesse; i++) this.colonie.pas(); }
  },

  changerMission(m) {
    this.mission = m;
    this.pause = this.pause && false;
    UI.pauseIcone(false);
    document.body.dataset.mission = String(m);
    if (m === 2 && !this.drones.length) this.lancerVol();
    UI.rafraichir(true);
  },
};

let echelleCourante = 1;

function setup() {
  const scene = document.getElementById('scene');
  const canevas = createCanvas(scene.clientWidth, scene.clientHeight);
  canevas.parent(scene);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  randomSeed(CONFIG.graine);
  App.rngGA = creerRng(CONFIG.graine + 1);
  App.vues = { ville: new VueVille(), ecole: new VueEcole(), colonie: new VueColonie() };
  App.nouvelleVille();
  App.nouvelleEcole(5);
  App.nouvelleColonie(3);
  for (let i = 0; i < 30; i++) App.ga.suivante();      // un début de tournée déjà décent à l'ouverture
  ajusterEchelle();
  UI.init();
  canevas.elt.addEventListener('pointerdown', cliquer);

  const intro = document.getElementById('intro');
  const entrer = () => { intro.classList.add('masque'); App.enIntro = false; setTimeout(() => { intro.hidden = true; }, 900); };
  document.getElementById('intro-entrer').addEventListener('click', entrer);
  const params = new URLSearchParams(location.search);
  if (params.get('intro') === '0') { intro.hidden = true; App.enIntro = false; }
  if (params.get('mission')) App.changerMission(+params.get('mission'));
}

function ajusterEchelle() {
  App.echelle = Math.min(width / CONFIG.monde.largeur, height / CONFIG.monde.hauteur);
  App.dx = (width - CONFIG.monde.largeur * App.echelle) / 2;
  App.dy = (height - CONFIG.monde.hauteur * App.echelle) / 2;
}

function windowResized() {
  const scene = document.getElementById('scene');
  resizeCanvas(scene.clientWidth, scene.clientHeight);
  ajusterEchelle();
}

function cliquer(evt) {
  if (App.mission !== 4) return;
  const r = evt.target.getBoundingClientRect();
  const x = (evt.clientX - r.left - App.dx) / App.echelle;
  const y = (evt.clientY - r.top - App.dy) / App.echelle;
  let meilleur = null; let dmin = 30 * 30;
  for (const d of App.colonie.drones) {
    if (d.mort) continue;
    const dd = (d.pos.x - x) ** 2 + (d.pos.y - y) ** 2;
    if (dd < dmin) { dmin = dd; meilleur = d; }
  }
  App.selection = meilleur;
  UI.rafraichir(true);
}

let derniereMajUI = 0;

function draw() {
  if (!App.enIntro) App.avancer();
  App.temps++;
  background(5, 7, 14);
  const ctx = drawingContext;
  ctx.save();
  ctx.translate(App.dx, App.dy);
  ctx.scale(App.echelle, App.echelle);
  ctx.beginPath(); ctx.rect(0, 0, CONFIG.monde.largeur, CONFIG.monde.hauteur); ctx.clip();
  const m = App.mission;
  if (m === 1 || m === 2) {
    const v = App.vues.ville;
    if (App.epure) { ctx.fillStyle = '#05070e'; ctx.fillRect(0, 0, 1600, 900); } else ctx.drawImage(v.fond(App.ville), 0, 0);
    if (m === 1) v.points(ctx, App.ville, App.ga.meilleur, App.temps); else v.points(ctx, App.ville, null, App.temps);
    if (m === 1) v.dessinerGenetique(ctx, App.ville, App.ga, App.temps);
    else v.dessinerVol(ctx, App.ville, App.drones, App.optionsVol, App.temps);
  } else if (m === 3) {
    const v = App.vues.ecole;
    const ex = App.examen;
    const arene = ex ? ex.terrains[ex.i] : App.ecole.arene;
    v.terrain(ctx, arene);
    if (ex) v.pilotes(ctx, [ex.pilote], ex.pilote, App.temps);
    else {
      const vivants = App.ecole.pilotes.filter((p) => p.vivant);
      let vedette = null;
      for (const p of vivants) if (!vedette || p.progression > vedette.progression) vedette = p;
      App.vedette = vedette || App.vedette;
      v.pilotes(ctx, App.ecole.pilotes, vedette, App.temps);
    }
  } else {
    App.vues.colonie.dessiner(ctx, App.colonie, App.selection, App.temps);
  }
  ctx.restore();

  const t = millis();
  if (t - derniereMajUI > 200) { derniereMajUI = t; UI.rafraichir(); }
}
