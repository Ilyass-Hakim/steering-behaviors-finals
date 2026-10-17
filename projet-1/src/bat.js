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
    this.satiete = 0;         // pas pendant lesquels elle ne chasse plus (vient de manger)
    this.captures = 0;
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
      if (this.delaiDepart > 0 && --this.delaiDepart === 0) this.decoller(monde, 'sortie');
      return;
    }
    this.crier(monde);
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
    const evitement = this.eviter(monde.grotte);
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
    if (this.etat === 'chasse' && this.cible) {
      const p = this.cible;
      const b = this.boids(voisins);
      ajouter('separation', b.separation);
      // proie posée ou presque immobile : seek ; proie en vol : pursue, qui vise où elle sera
      if (p.vel.mag() < 0.3) ajouter('seek', this.seek(p.pos));
      else ajouter('pursue', this.pursue(p));
    }
    ajouter('avoid', evitement);
    ajouter('contention', this.contenir(monde.grotte));
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
      this.minuteurCri = Math.min(this.minuteurCri, 16);       // « buzz » de capture : cris rapprochés
      const d = p ? Math.hypot(p.pos.x - this.pos.x, p.pos.y - this.pos.y) : Infinity;
      if (p && p.etat !== 'mange' && d < this.r + p.r + 3) {
        monde.capturer(this, p);
      } else if (!p || p.etat === 'mange' || d > 400 || this.tempsChasse > 420) {
        if (p && p.etat === 'fuite') {
          monde.stats.echappes++;
          monde.noter(`Un papillon a échappé à la chauve-souris n°${this.id}`, 'echappe');
        }
        this.etat = 'errance';
        this.cible = null;
        this.prediction = null;
        this.satiete = 120;
      }
    }
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
