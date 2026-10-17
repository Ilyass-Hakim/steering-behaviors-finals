// world.js — le monde simulé : la grotte, ses habitants et le temps qui passe.
// Il ne dessine rien lui-même sauf via dessiner(), et il ne dépend pas de p5 pour avancer :
// on peut donc le faire tourner sans écran dans les tests (voir tests/monde.test.mjs).

class Monde {
  constructor(graine = CONFIG.graine, nombre = CONFIG.chauveSouris.nombre) {
    this.graine = graine;
    this.grotte = new Cave(CONFIG.monde.largeur, CONFIG.monde.hauteur, graine);
    this.sonar = new Sonar(this.grotte, graine);
    this.cycle = new NightCycle();
    this.chef = null;         // chef de colonie, présent seulement au crépuscule
    this.actifs = {};         // comportements désactivés : { wander: false, ... }
    this.chauvesSouris = [];
    this.papillons = [];
    this.hibou = null;
    this.hibouPrevu = null;   // date (s de la nuit) de la prochaine entrée du hibou
    this.stats = { captures: 0, echappes: 0, alertes: 0 };
    this.journal = [];        // derniers événements : { t, texte, type }
    this.temps = 0;           // secondes simulées
    this.pasCourant = 0;
    Bat.reinitialiserCompteur();
    this.grotte.libererPlaces();
    const milieuRepos = (this.grotte.zoneRepos.x0 + this.grotte.zoneRepos.x1) / 2;
    for (let i = 0; i < nombre; i++) {
      const b = new Bat(0, 0);
      const place = this.grotte.reserverPlace(milieuRepos, 0);
      if (place) {
        b.pos.set(place.x, place.y);
        b.place = place;
      }
      this.chauvesSouris.push(b);
    }
    Moth.reinitialiserCompteur();
    this.peuplerPapillons(CONFIG.papillons.nombre);
    this.surPhase('crepuscule');
  }

  // ---------- Papillons ----------

  peuplerPapillons(n) {
    const g = this.grotte;
    this.papillons = [];
    for (let i = 0; i < n; i++) {
      if (i % 3 === 0) {
        this.papillons.push(Moth.pose(g, random(900, g.w - 120)));
      } else {
        const m = new Moth(0, 0);
        this.refaireEntrer(m);
        m.pos.x = random(700, g.w - 80);          // déjà dans la grotte au départ
        m.pos.y = g.milieuY(m.pos.x) + random(-120, 120);
        this.papillons.push(m);
      }
    }
  }

  /** (Ré)introduit un papillon par l'entrée de la grotte */
  refaireEntrer(m) {
    const g = this.grotte;
    m.etat = 'vol';
    m.pos.set(g.w - 40, g.entree.y + random(-g.entree.hauteur / 3, g.entree.hauteur / 3));
    m.vel.set(-1.4, random(-0.4, 0.4));
    m.echo = 0;
  }

  /**
   * La chauve-souris dont un papillon entend la menace : une chasseuse à moins de 230 px,
   * ou une chauve-souris qui vient de crier à moins de 120 px. null si tout est calme.
   */
  menaceDe(papillon) {
    let meilleure = null;
    let dmin = Infinity;
    for (const b of this.chauvesSouris) {
      if (b.etat === 'repos') continue;
      const dx = b.pos.x - papillon.pos.x;
      const dy = b.pos.y - papillon.pos.y;
      const d = Math.hypot(dx, dy);
      const entendu = (b.etat === 'chasse' && d < 230) || (b.eclat > 0.45 && d < 120);
      if (entendu && d < dmin) { dmin = d; meilleure = b; }
    }
    return meilleure;
  }

  /** Le papillon révélé par un écho le plus proche de `bat`, ou null */
  proieDe(bat) {
    let meilleur = null;
    let dmin = 230 * 230;
    for (const m of this.papillons) {
      if (m.etat === 'mange' || m.echo < 0.12) continue;
      const dx = m.pos.x - bat.pos.x;
      const dy = m.pos.y - bat.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= dmin) continue;
      // pas plus de trois chasseuses sur le même papillon
      let poursuivants = 0;
      for (const b of this.chauvesSouris) if (b.cible === m) poursuivants++;
      if (poursuivants >= 3) continue;
      dmin = d2;
      meilleur = m;
    }
    return meilleur;
  }

  capturer(bat, papillon) {
    papillon.etreMange();
    bat.captures++;
    bat.energie = Math.min(1, bat.energie + 0.06);
    bat.etat = 'errance';
    bat.cible = null;
    bat.prediction = null;
    bat.satiete = 360;
    this.stats.captures++;
    this.noter(`Chauve-souris n°${bat.id} a capturé un papillon`, 'capture');
  }

  /** La chauve-souris en vol la plus proche d'un point (cible du hibou) */
  chauveSourisLaPlusProche(pos) {
    let meilleure = null;
    let dmin = Infinity;
    for (const b of this.chauvesSouris) {
      if (b.etat === 'repos') continue;
      const d = (b.pos.x - pos.x) ** 2 + (b.pos.y - pos.y) ** 2;
      if (d < dmin) { dmin = d; meilleure = b; }
    }
    return meilleure;
  }

  /** Fait entrer le hibou par l'entrée de la grotte */
  appelerHibou() {
    if (this.hibou) return;
    const g = this.grotte;
    this.hibou = new Owl(g.w - 30, g.entree.y);
    this.noter('Le hibou entre dans la grotte', 'hibou');
  }

  /** Planifie l'entrée du hibou pendant la nuit, puis le retire quand il est reparti */
  gererHibou() {
    if (this.cycle.phase === 'nuit' && !this.hibou && this.hibouPrevu !== null && this.cycle.temps >= this.hibouPrevu) {
      this.hibouPrevu = null;
      this.appelerHibou();
    }
    if (this.hibou) {
      this.hibou.penser(this);
      this.hibou.update();
      if (this.hibou.parti) this.hibou = null;
    }
  }

  /** Ajoute une ligne au journal de la nuit (les 40 dernières sont gardées) */
  noter(texte, type = 'info') {
    this.journal.push({ t: this.temps, texte, type });
    if (this.journal.length > 40) this.journal.shift();
  }

  /** Les chauves-souris en vol (hors repos) à moins de `distance` de `bat`, sans `bat` */
  voisinsDe(bat, distance) {
    const liste = [];
    const d2max = distance * distance;
    for (const o of this.chauvesSouris) {
      if (o === bat || o.etat === 'repos') continue;
      const dx = o.pos.x - bat.pos.x;
      const dy = o.pos.y - bat.pos.y;
      if (dx * dx + dy * dy < d2max) liste.push(o);
    }
    return liste;
  }

  /** Chemin de la nuée au crépuscule : du gîte vers l'entrée, puis retour au centre */
  cheminColonie() {
    const g = this.grotte;
    const pt = (fx, dy = 0) => ({ x: g.w * fx, y: g.milieuY(g.w * fx) + dy });
    return [
      { x: (g.zoneRepos.x0 + g.zoneRepos.x1) / 2, y: g.plafondY(425) + 130 },
      pt(0.26), pt(0.42), pt(0.62), pt(0.8), pt(0.9), pt(0.7, -20), pt(0.5),
    ];
  }

  /** Réagit à un changement de phase du cycle */
  surPhase(phase) {
    if (phase === 'crepuscule') {
      this.chef = new Chef(this.cheminColonie());
      for (const b of this.chauvesSouris) if (b.etat === 'repos') b.delaiDepart = Math.floor(random(1, 280));
    } else if (phase === 'nuit') {
      const [a, b] = CONFIG.hibouApparitionNuit;
      this.hibouPrevu = random(a, b);
      this.chef = null;
      for (const b of this.chauvesSouris) {
        if (b.etat === 'repos') b.decoller(this, 'errance');
        else if (b.etat === 'sortie') b.etat = 'errance';
      }
    }
  }

  /** Décolle toutes les chauves-souris dans l'état donné, en cap aléatoire */
  liberer(etat = 'errance') {
    for (const b of this.chauvesSouris) {
      b.etat = etat;
      const a = random(-Math.PI, Math.PI);
      b.vel.set(Math.cos(a) * 1.5, Math.sin(a) * 1.5);
      if (b.place) { b.place.prise = false; b.place = null; }
    }
  }

  /** Avance la simulation d'un pas de 1/60 s */
  pas() {
    if (this.chef) { this.chef.penser(this); this.chef.update(); }
    this.gererHibou();
    for (const m of this.papillons) m.penser(this);
    for (const b of this.chauvesSouris) b.penser(this);
    for (const m of this.papillons) m.update();
    for (const b of this.chauvesSouris) b.update();
    this.sonar.pas(this.papillons.filter((m) => m.etat !== 'mange').concat(this.hibou ? [this.hibou] : []));
    const nouvelle = this.cycle.avancer(CONFIG.pasTemps);
    if (nouvelle) this.surPhase(nouvelle);
    this.temps += CONFIG.pasTemps;
    this.pasCourant++;
  }

  /** Dessine le monde (le contexte est déjà mis à l'échelle) */
  dessiner(ctx, options = {}) {
    if (options.lumiere) this.grotte.dessinerGeometrie(ctx, 0.35);
    this.sonar.dessiner(ctx, { jour: 0, ondes: options.ondes !== false });
    if (this.chef) this.chef.dessiner(ctx, options.chemin);
    if (this.hibou) this.hibou.dessinerZone(ctx, this.temps);
    for (const m of this.papillons) m.dessiner(ctx);
    if (this.hibou) this.hibou.dessiner(ctx);
    for (const b of this.chauvesSouris) b.dessinerChasse(ctx);
    for (const m of this.papillons) m.dessinerFuite(ctx);
    if (options.rayons) for (const b of this.chauvesSouris) b.dessinerRayons(ctx);
    for (const b of this.chauvesSouris) b.dessiner(ctx);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Monde };
