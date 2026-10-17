// bat.js — une chauve-souris. Étend Vehicle (règle du projet : une classe par fichier).
//
// États possibles :
//   repos     suspendue au plafond, immobile
//   sortie    la colonie quitte le gîte au crépuscule
//   errance   elle explore la grotte noire
//   chasse    elle poursuit un papillon révélé par son écho
//   fuite     elle s'éparpille devant le hibou
//   retour    elle rejoint sa place de repos à l'aube

const COULEURS_ETAT = {
  repos: '#8b7fb3',
  sortie: '#7dd3fc',
  errance: '#b79cff',
  chasse: '#ff5fa8',
  fuite: '#ff7a45',
  retour: '#facc15',
};

let compteurChauvesSouris = 0;

class Bat extends Vehicle {
  constructor(x, y) {
    super(x, y, {
      maxSpeed: CONFIG.chauveSouris.vitesseMax,
      maxForce: CONFIG.chauveSouris.forceMax,
      r: CONFIG.chauveSouris.rayon,
    });
    this.id = ++compteurChauvesSouris;
    this.etat = 'repos';
    this.energie = CONFIG.chauveSouris.energieDepart;
    this.phaseAiles = random(Math.PI * 2);
    this.eclat = 0;           // éclat lumineux après un cri de sonar (0..1)
    this.cible = null;        // papillon poursuivi
    this.tempsChasse = 0;
    this.frustration = 0;     // pas passés à éviter la roche pendant une chasse : elle finit par renoncer
    this.satiete = 0;         // pas pendant lesquels elle ne chasse plus (vient de manger)
    this.captures = 0;
    this.approcheRef = null;  // le point d'approche d'origine (pour y revenir si besoin)
    this.approche = null;     // point sous le gîte à rejoindre avant l'atterrissage final
    this.delaiRetour = 0;     // pas avant de regagner le gîte (retours échelonnés à l'aube)
    this.calme = 0;           // pas écoulés loin du hibou avant de se calmer
    this.vitesseBase = CONFIG.chauveSouris.vitesseMax;
    this.delaiDepart = 0;     // pas avant de quitter le gîte (départ échelonné)
    this.decalage = { x: 0, y: 0 };   // place individuelle dans la nuée
    this.minuteurCri = random(0, 90);   // pas restants avant le prochain cri de sonar
    this.forces = {};         // dernière force de chaque comportement (inspecteur, vecteurs)
  }

  /** Remet le compteur d'identifiants à zéro (nouvelle simulation) */
  static reinitialiserCompteur() {
    compteurChauvesSouris = 0;
  }

  get couleur() {
    return COULEURS_ETAT[this.etat] || COULEURS_ETAT.errance;
  }

  /**
   * Calcule les forces de chaque comportement selon l'état, les pondère (CONFIG.poids) et
   * les applique. Chaque force est mémorisée dans this.forces pour l'inspecteur.
   * Un comportement désactivé dans l'interface (monde.actifs[nom] === false) est ignoré.
   */
  penser(monde) {
    this.forces = {};
    if (this.etat === 'repos') {
      if (this.delaiDepart > 0 && --this.delaiDepart === 0) {
        this.decoller(monde, 'sortie');
      } else {
        this.vel.set(0, 0);              // suspendue : aucune dérive
        this.acc.set(0, 0);
        return;
      }
    }
    this.crier(monde);
    if (this.etat === 'retour' && this.delaiRetour > 0) this.delaiRetour--;
    this.majFuite(monde);
    this.majChasse(monde);
    const boost = this.etat === 'chasse' ? CONFIG.chauveSouris.boostChasse : this.etat === 'fuite' ? 1.25 : 1;
    this.maxSpeed = this.vitesseBase * boost;
    const poids = { ...CONFIG.poids.commun, ...(CONFIG.poids[this.etat] || {}) };
    const ajouter = (nom, force) => {
      if (monde.actifs[nom] === false || !poids[nom]) return;
      this.forces[nom] = force.mult(poids[nom]);
    };

    const voisins = monde.voisinsDe(this, 120);
    // à l'approche de sa place, au plafond, l'évitement et la contention ne doivent plus la repousser
    const dPlace = this.etat === 'retour' && this.place
      ? Math.hypot(this.place.x - this.pos.x, this.place.y - this.pos.y) : Infinity;
    const finale = this.etat === 'retour' && this.delaiRetour <= 0 && !this.approche;   // dernière montée vers la place
    const atterrissage = finale ? Math.min(1, Math.max(0, (dPlace - 30) / 70)) : 1;
    const but = this.etat === 'retour' && this.place ? (this.approche || this.place)
      : this.etat === 'sortie' && monde.chef ? monde.chef.pos
        : this.etat === 'chasse' && this.cible ? this.cible.pos : null;
    const evitement = this.eviter(monde.grotte, { but }).mult(atterrissage);
    if (this.etat === 'fuite' && monde.hibou) {
      // FLEE : s'éloigner du hibou ; l'alignement avec les voisines fait fuir le groupe ensemble.
      // Quand une paroi se rapproche, la fuite cède la place à l'évitement (sinon elle plaque
      // la chauve-souris contre la roche).
      const cede = Math.max(0.2, 1 - evitement.mag() / 0.5);
      ajouter('flee', this.flee(monde.hibou.pos).mult(cede));
      const b = this.boids(voisins.filter((o) => o.etat === 'fuite'));
      ajouter('separation', b.separation);
      ajouter('alignment', b.alignment);
    }
    if (this.etat === 'sortie' || this.etat === 'errance') {
      const b = this.boids(voisins);
      ajouter('separation', b.separation);
      ajouter('alignment', b.alignment);
      ajouter('cohesion', b.cohesion);
    }
    if (this.etat === 'sortie' && monde.chef) {
      ajouter('seek', this.seek({ x: monde.chef.pos.x + this.decalage.x, y: monde.chef.pos.y + this.decalage.y }));
    }
    if (this.etat === 'errance') ajouter('wander', this.wander());
    if (this.etat === 'retour' && this.place) {
      // ARRIVE : elle freine en approchant de sa place, puis s'y suspend
      if (this.delaiRetour > 0) {
        ajouter('wander', this.wander());
      } else {
        // étape 1 : rejoindre le point d'approche, sous le gîte (seek) ; étape 2 : monter et se poser
        // (arrive). Si une pointe de roche s'interpose entre elle et sa place, elle retourne à
        // l'étape 1 : on contourne au lieu de pousser contre l'obstacle.
        if (!this.approche && dPlace > 140 && !monde.grotte.segmentLibre(this.pos, this.place)) this.approche = this.approcheRef;
        if (this.approche) {
          ajouter('seek', this.seek(this.approche));
          if (Math.hypot(this.approche.x - this.pos.x, this.approche.y - this.pos.y) < 70) this.approche = null;
        } else {
          ajouter('arrive', this.arrive(this.place, 120));
        }
      }
      const b = this.boids(voisins);
      if (dPlace > 60) ajouter('separation', b.separation);
      if (dPlace < 3 && this.vel.mag() < 0.5) { this.seSuspendre(); return; }
    }
    if (this.etat === 'chasse' && this.cible) {
      const p = this.cible;
      const b = this.boids(voisins);
      ajouter('separation', b.separation);
      // proie posée ou presque immobile : seek ; proie en vol : pursue, qui vise où elle sera
      if (p.vel.mag() < 0.3) ajouter('seek', this.seek({ x: p.pos.x, y: p.pos.y + 9 }));   // posé : on le cueille sous lui
      else ajouter('pursue', this.pursue(p));
    }
    ajouter('avoid', evitement);
    ajouter('contention', this.contenir(monde.grotte).mult(atterrissage));
    for (const f of Object.values(this.forces)) this.applyForce(f);
  }

  /**
   * Peur du hibou : toute chauve-souris en vol à moins de `rayonPanique` du hibou passe en
   * fuite. Elle se calme quand il est loin depuis une seconde, ou parti.
   */
  majFuite(monde) {
    const h = monde.hibou;
    if (this.etat === 'fuite') {
      const loin = !h || Math.hypot(h.pos.x - this.pos.x, h.pos.y - this.pos.y) > CONFIG.hibou.rayonPanique * 1.3;
      this.calme = loin ? this.calme + 1 : 0;
      if (this.calme > 60) { this.etat = 'errance'; this.calme = 0; this.satiete = 60; }
    } else if (h && (this.etat === 'errance' || this.etat === 'chasse' || this.etat === 'sortie')) {
      const d = Math.hypot(h.pos.x - this.pos.x, h.pos.y - this.pos.y);
      if (d < CONFIG.hibou.rayonPanique) {
        this.etat = 'fuite';
        this.cible = null;
        this.prediction = null;
        this.calme = 0;
        monde.stats.alertes++;
      }
    }
  }

  /**
   * Machine à états de la chasse : errance → chasse quand un papillon est révélé par l'écho,
   * chasse → errance quand elle l'a mangé, l'a perdu ou s'est lassée.
   */
  majChasse(monde) {
    if (this.etat === 'errance') {
      if (this.satiete > 0) { this.satiete--; return; }
      const proie = monde.proieDe(this);
      if (proie) {
        this.etat = 'chasse';
        this.cible = proie;
        this.tempsChasse = 0;
        monde.noter(`Chauve-souris n°${this.id} chasse un papillon`, 'chasse');
      }
    } else if (this.etat === 'chasse') {
      const p = this.cible;
      this.tempsChasse++;
      const evit = this.forces.avoid ? this.forces.avoid.mag() : 0;
      this.frustration = evit > 0.6 ? this.frustration + 1 : Math.max(0, this.frustration - 2);
      this.minuteurCri = Math.min(this.minuteurCri, 16);       // « buzz » de capture : cris rapprochés
      const d = p ? Math.hypot(p.pos.x - this.pos.x, p.pos.y - this.pos.y) : Infinity;
      if (p && p.etat !== 'mange' && d < this.r + p.r + 3) {
        monde.capturer(this, p);
      } else if (!p || p.etat === 'mange' || d > 400 || this.tempsChasse > 420 || this.frustration > 40) {
        if (p && p.etat === 'fuite') {
          monde.stats.echappes++;
          monde.noter(`Un papillon a échappé à la chauve-souris n°${this.id}`, 'echappe');
        }
        this.etat = 'errance';
        this.cible = null;
        this.prediction = null;
        this.frustration = 0;
        this.satiete = 120;
      }
    }
  }

  /** Atterrissage terminé : elle pend la tête en bas, immobile */
  seSuspendre() {
    this.etat = 'repos';
    this.vel.set(0, 0);
    this.acc.set(0, 0);
    this.delaiDepart = 0;
    this.approche = null;
    this.approcheRef = null;
  }

  /** Quitte le gîte : la place est libérée, la chauve-souris se laisse tomber puis bat des ailes */
  decoller(monde, etat) {
    this.etat = etat;
    if (this.place) { this.place.prise = false; this.place = null; }
    this.vel.set(random(-0.5, 0.5), 1.6);
    this.decalage = { x: random(-110, 110), y: random(-80, 80) };
  }

  /** Émet un cri de sonar à intervalles irréguliers ; le monde fait grandir l'onde */
  crier(monde) {
    if (--this.minuteurCri > 0) return;
    this.minuteurCri = random(70, 115);
    this.eclat = 1;
    monde.sonar.ping(this.pos.x, this.pos.y, 1);
  }

  /** Un pas physique, puis le battement d'ailes (plus vite quand elle va vite) */
  update() {
    super.update();
    this.phaseAiles += 0.22 + this.vel.mag() * 0.05;
    this.eclat *= 0.93;
  }

  /** Rayons du sonar d'évitement : un trait vers chaque obstacle touché */
  dessinerRayons(ctx, alpha = 0.35) {
    if (!this.rayons.length) return;
    ctx.save();
    ctx.lineWidth = 0.9;
    for (const r of this.rayons) {
      const a = alpha * (r.touche ? 1 : 0.45);
      ctx.strokeStyle = r.touche ? `rgba(251,113,133,${a})` : `rgba(125,211,252,${a * 0.6})`;
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(r.hx, r.hy);
      ctx.stroke();
      if (r.touche) {
        ctx.fillStyle = `rgba(251,113,133,${Math.min(1, a * 2)})`;
        ctx.beginPath();
        ctx.arc(r.hx, r.hy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Une flèche par force : sa couleur est celle du comportement (voir la légende) */
  dessinerVecteurs(ctx, echelle = 85) {
    if (this.etat === 'repos') return;
    ctx.save();
    ctx.lineWidth = 1.6;
    for (const [nom, f] of Object.entries(this.forces)) {
      const n = Math.hypot(f.x, f.y);
      if (n < 0.01) continue;
      const bx = this.pos.x + f.x * echelle;
      const by = this.pos.y + f.y * echelle;
      const col = CONFIG.couleurs[nom] || '#fff';
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(bx, by);
      ctx.stroke();
      const a = Math.atan2(f.y, f.x);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - 6 * Math.cos(a - 0.45), by - 6 * Math.sin(a - 0.45));
      ctx.lineTo(bx - 6 * Math.cos(a + 0.45), by - 6 * Math.sin(a + 0.45));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Cercle d'errance (wander) : le cercle devant la bête et le point cible sur ce cercle */
  dessinerErrance(ctx) {
    const d = this.debugErrance;
    if (!d || this.etat !== 'errance') return;
    ctx.save();
    ctx.strokeStyle = 'rgba(125,211,252,0.4)';
    ctx.fillStyle = 'rgba(125,211,252,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, d.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(d.tx, d.ty);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(d.tx, d.ty, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Anneau de sélection autour de la bête inspectée */
  dessinerSelection(ctx, temps) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = -temps * 20;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Dessine le point visé par pursue et la ligne de poursuite */
  dessinerChasse(ctx) {
    if (this.etat !== 'chasse' || !this.cible || !this.prediction) return;
    const q = this.prediction;
    ctx.save();
    ctx.strokeStyle = 'rgba(244,114,182,0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
    ctx.moveTo(q.x - 8, q.y); ctx.lineTo(q.x + 8, q.y);
    ctx.moveTo(q.x, q.y - 8); ctx.lineTo(q.x, q.y + 8);
    ctx.stroke();
    ctx.restore();
  }

  /** Dessin d'une chauve-souris : silhouette sombre, contour de la couleur de son état */
  dessiner(ctx) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    const eclat = Math.min(1, this.eclat);
    const r = this.r;
    ctx.lineWidth = 1.1;
    ctx.fillStyle = '#120d1d';
    ctx.strokeStyle = this.couleur;
    ctx.globalAlpha = 0.55 + 0.45 * eclat;

    if (this.etat === 'repos') {
      // suspendue, tête en bas, ailes repliées autour du corps
      ctx.beginPath();
      ctx.ellipse(0, r * 0.25, r * 0.5, r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, r * 1.05);
      ctx.lineTo(-r * 0.45, r * 1.5);
      ctx.lineTo(-r * 0.05, r * 1.15);
      ctx.moveTo(r * 0.3, r * 1.05);
      ctx.lineTo(r * 0.45, r * 1.5);
      ctx.lineTo(r * 0.05, r * 1.15);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.rotate(this.cap);
    const battement = Math.sin(this.phaseAiles);
    const envergure = r * (1.05 + 1.15 * Math.abs(battement));
    const decalage = battement * r * 0.35;
    for (const cote of [-1, 1]) {
      // aile : épaule → pointe → bord festonné → arrière du corps
      ctx.beginPath();
      ctx.moveTo(r * 0.45, cote * r * 0.25);
      ctx.bezierCurveTo(r * 0.2, cote * envergure * 0.6, -r * 0.4 + decalage, cote * envergure * 1.0, -r * 0.9 + decalage, cote * envergure);
      ctx.quadraticCurveTo(-r * 0.7, cote * envergure * 0.55, -r * 0.95, cote * envergure * 0.52);
      ctx.quadraticCurveTo(-r * 0.75, cote * envergure * 0.28, -r * 1.0, cote * envergure * 0.22);
      ctx.lineTo(-r * 0.9, cote * r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // corps
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // oreilles
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 0.18);
    ctx.lineTo(r * 1.05, -r * 0.62);
    ctx.lineTo(r * 1.0, -r * 0.05);
    ctx.moveTo(r * 0.75, r * 0.18);
    ctx.lineTo(r * 1.05, r * 0.62);
    ctx.lineTo(r * 1.0, r * 0.05);
    ctx.stroke();
    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Bat, COULEURS_ETAT };
