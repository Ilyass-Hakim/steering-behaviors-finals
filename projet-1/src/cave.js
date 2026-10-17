// cave.js — la géométrie de la grotte (monde logique, déterministe selon la graine).
//
//  * un plafond et un sol définis par des fonctions ceilY(x) et floorY(x) ;
//  * des stalactites (plafond) et stalagmites (sol), chacune faite de cercles
//    de rayon décroissant : simple à tester pour les collisions et les rayons ;
//  * une zone de repos au plafond (les « places » où les chauves-souris se suspendent) ;
//  * l'entrée de la grotte à droite, par où arrivent les papillons et le hibou.
//
// La grotte ne dessine rien par elle-même à la lumière du jour : l'écran reste noir,
// ce sont les ondes du sonar (sonar.js) qui révèlent ses surfaces.

class Cave {
  constructor(largeur, hauteur, graine) {
    this.w = largeur;
    this.h = hauteur;
    this.graine = graine;
    this.rng = creerRng(graine);
    this.bruitPlafond = new Bruit1D(graine * 3 + 1);
    this.bruitSol = new Bruit1D(graine * 5 + 2);
    this.zoneRepos = { x0: 150, x1: 700 };
    this._tabulerProfils();
    this.cercles = [];        // { x, y, r, type: 'stalactite' | 'stalagmite', id }
    this.formes = [];         // résumé de chaque concrétion (pour le dessin)
    this.places = [];         // places de repos au plafond
    this._genererObstacles();
    this._genererPlaces();
    this.entree = { x: this.w, y: this.milieuY(this.w - 1), hauteur: 250 };
  }

  // ---------- Profil du plafond et du sol ----------

  /** Pré-calcule plafond et sol tous les pixels : les rayons les lisent des milliers de fois */
  _tabulerProfils() {
    const n = Math.ceil(this.w) + 3;
    this._plafond = new Float32Array(n);
    this._sol = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this._plafond[i] = this._plafondBrut(i - 1);
      this._sol[i] = this._solBrut(i - 1);
    }
  }

  _lire(tab, x) {
    const u = Math.min(tab.length - 2.001, Math.max(0, x + 1));
    const i = Math.floor(u);
    return tab[i] + (tab[i + 1] - tab[i]) * (u - i);
  }

  /** Altitude du plafond à l'abscisse x (y croît vers le bas) */
  plafondY(x) {
    return this._lire(this._plafond, x);
  }

  /** Altitude du sol à l'abscisse x */
  solY(x) {
    return this._lire(this._sol, x);
  }

  _plafondBrut(x) {
    const t = x / 260;
    let y = 70 + 90 * this.bruitPlafond.fbm(t);
    // la zone de repos est aplatie pour que les chauves-souris s'y alignent
    const { x0, x1 } = this.zoneRepos;
    const bord = 60;
    const k = Math.min(1, Math.max(0, Math.min(x - (x0 - bord), (x1 + bord) - x) / bord));
    const lisse = k * k * (3 - 2 * k);
    y = y * (1 - lisse) + 100 * lisse;
    return y;
  }

  _solBrut(x) {
    return this.h - 70 - 90 * this.bruitSol.fbm(x / 300 + 31);
  }

  milieuY(x) {
    return (this.plafondY(x) + this.solY(x)) / 2;
  }

  // ---------- Concrétions ----------

  _genererObstacles() {
    const rng = this.rng;
    const placer = (nombre, type) => {
      const xs = [];
      let essais = 0;
      while (xs.length < nombre && essais++ < 400) {
        const x = 90 + rng() * (this.w - 330);
        const dansRepos = type === 'stalactite'
          && x > this.zoneRepos.x0 - 40 && x < this.zoneRepos.x1 + 40;
        if (dansRepos) continue;
        if (xs.some((o) => Math.abs(o - x) < 120)) continue;
        xs.push(x);
      }
      xs.sort((a, b) => a - b);
      for (const x of xs) this._ajouterConcretion(x, type, rng);
    };
    placer(11, 'stalactite');
    placer(10, 'stalagmite');
  }

  _ajouterConcretion(x, type, rng) {
    const haut = type === 'stalactite';
    const base = haut ? this.plafondY(x) : this.solY(x);
    const ecart = this.solY(x) - this.plafondY(x);
    // le couloir central reste toujours libre : 60 px de marge de chaque côté du milieu
    const longueurMax = Math.max(30, ecart / 2 - 60);
    const longueur = Math.min(longueurMax, (haut ? 70 : 50) + rng() * (haut ? 150 : 120));
    const rayonBase = 15 + rng() * 13;
    const n = Math.max(3, Math.round(longueur / (rayonBase * 0.7)));
    const sens = haut ? 1 : -1;
    const id = this.formes.length;
    const cercles = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const c = {
        x: x + Math.sin(t * 2.4 + x) * 3,
        y: base + sens * t * longueur,
        r: rayonBase * (1 - t * 0.82),
        type: haut ? 'stalactite' : 'stalagmite',
        id,
      };
      cercles.push(c);
      this.cercles.push(c);
    }
    this.formes.push({ id, x, base, longueur, rayonBase, type: haut ? 'stalactite' : 'stalagmite', cercles });
  }

  // ---------- Zone de repos ----------

  _genererPlaces() {
    const { x0, x1 } = this.zoneRepos;
    for (let rang = 0; rang < 3; rang++) {
      for (let x = x0 + 20 + (rang % 2) * 7; x < x1 - 10; x += 14) {
        this.places.push({ x, y: this.plafondY(x) + 12 + rang * 13, rang, prise: false });
      }
    }
  }

  /** Libère toutes les places de repos */
  libererPlaces() {
    for (const p of this.places) p.prise = false;
  }

  /** Réserve la place libre la plus proche de (x, y) ; null s'il n'y en a plus */
  reserverPlace(x, y) {
    let meilleure = null;
    let dmin = Infinity;
    for (const p of this.places) {
      if (p.prise) continue;
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d < dmin) { dmin = d; meilleure = p; }
    }
    if (meilleure) meilleure.prise = true;
    return meilleure;
  }

  // ---------- Dessin (lumière du jour, aube, mode « lumière » du débogage) ----------

  /** Dessine le contour du plafond, du sol et des concrétions avec l'opacité donnée */
  dessinerGeometrie(ctx, alpha, couleur = '120,150,200') {
    ctx.save();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = `rgba(${couleur},${alpha})`;
    ctx.fillStyle = `rgba(${couleur},${alpha * 0.12})`;
    for (const haut of [true, false]) {
      ctx.beginPath();
      ctx.moveTo(0, haut ? 0 : this.h);
      for (let x = 0; x <= this.w; x += 8) ctx.lineTo(x, haut ? this.plafondY(x) : this.solY(x));
      ctx.lineTo(this.w, haut ? 0 : this.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    for (const c of this.cercles) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Requêtes géométriques ----------

  /**
   * Lance un rayon depuis (ox, oy) dans la direction unitaire (dx, dy).
   * Renvoie la distance au premier obstacle (roche, plafond, sol, mur), ou Infinity
   * s'il n'y en a pas avant `portee`. 0 si l'origine est déjà dans la roche.
   * `candidats` : cercles à tester (voir cerclesProches), tous par défaut.
   * `marge` épaissit les concrétions : c'est la taille du corps de l'entité, pour qu'un
   * rayon ne passe pas entre deux obstacles trop fins pour être touchés.
   */
  rayon(ox, oy, dx, dy, portee, marge = 0, candidats = this.cercles) {
    let meilleur = Infinity;
    // concrétions : intersection analytique rayon / cercle
    for (const c of candidats) {
      const ex = ox - c.x;
      const ey = oy - c.y;
      const rc = c.r + marge;
      if (ex * ex + ey * ey > (portee + rc) * (portee + rc)) continue;
      const cc = ex * ex + ey * ey - rc * rc;
      const b = ex * dx + ey * dy;
      // dans la marge du cercle : un rayon qui s'en éloigne est libre, un rayon qui s'y enfonce est bloqué
      if (cc < 0) {
        if (b < 0) return 0;
        continue;
      }
      const disc = b * b - cc;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t >= 0 && t < meilleur) meilleur = t;
    }
    // parois : on avance par pas de 5 px, puis on affine par dichotomie
    const limite = Math.min(portee, meilleur);
    for (let t = 0; t <= limite; t += 5) {
      if (this._hors(ox + dx * t, oy + dy * t)) {
        if (t === 0) return 0;
        let a = t - 5;
        let b = t;
        for (let i = 0; i < 4; i++) {
          const m = (a + b) / 2;
          if (this._hors(ox + dx * m, oy + dy * m)) b = m; else a = m;
        }
        return Math.min(meilleur, b);
      }
    }
    return meilleur <= portee ? meilleur : Infinity;
  }

  /** Les cercles susceptibles d'être touchés depuis (x, y) : à calculer une fois par entité */
  cerclesProches(x, y, distance) {
    const proches = [];
    for (const c of this.cercles) {
      const dx = c.x - x;
      const dy = c.y - y;
      const lim = distance + c.r;
      if (dx * dx + dy * dy <= lim * lim) proches.push(c);
    }
    return proches;
  }

  /** Hors de la grotte : au-delà d'une paroi, du plafond ou du sol */
  _hors(x, y) {
    return x < 0 || x > this.w || y < this.plafondY(x) || y > this.solY(x);
  }

  /** Vrai si le point (x, y) est dans la roche ou hors de la grotte */
  estSolide(x, y) {
    if (x < 0 || x > this.w || y < this.plafondY(x) || y > this.solY(x)) return true;
    for (const c of this.cercles) {
      const dx = x - c.x;
      const dy = y - c.y;
      if (dx * dx + dy * dy < c.r * c.r) return true;
    }
    return false;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Cave };
