// sonar.js — l'écholocalisation vue de l'extérieur : ce qui rend la grotte visible.
//
// L'écran est noir. Quand une chauve-souris crie, une onde part de sa position et grandit
// à la vitesse du son. Chaque point de roche qu'elle atteint s'allume puis s'éteint
// lentement : la grotte se dessine « au sonar », en nuage de points, autour des bêtes.
// Les papillons et le hibou reçoivent aussi l'écho (propriété `echo`, de 0 à 1).
//
// Ce module ne fait que RÉVÉLER. La détection des obstacles par les chauves-souris
// (les rayons de l'obstacle avoidance) est calculée séparément dans Cave.rayon().

const SONAR = {
  portee: 270,          // distance maximale d'une onde (px)
  vitesseSon: 5.5,      // px par pas de simulation (≈ 330 px/s)
  persistance: 0.984,   // facteur d'extinction d'un point par pas
  maxOndes: 160,        // garde-fou : nombre d'ondes simultanées
};

class Sonar {
  constructor(grotte, graine = 1) {
    this.grotte = grotte;
    this.ondes = [];                 // { x, y, r, force }
    this._rng = creerRng(graine * 7 + 3);
    this._genererPoints();
    this.lumineux = new Float32Array(this.n);   // intensité courante de chaque point (0..1)
  }

  // ---------- Points de surface ----------

  _genererPoints() {
    const g = this.grotte;
    const rng = this._rng;
    const xs = [];
    const ys = [];
    const types = [];         // 0 = paroi, 1 = concrétion
    const ajouter = (x, y, type) => { xs.push(x); ys.push(y); types.push(type); };

    // plafond et sol : trois couches de profondeur, pour une paroi « épaisse »
    for (let x = 0; x <= g.w; x += 4) {
      for (let couche = 0; couche < 3; couche++) {
        const p = couche === 0 ? 0 : couche * (2 + rng() * 3);
        const xh = x + rng() * 3;
        const xb = x + rng() * 3;
        ajouter(xh, g.plafondY(xh) - p, 0);
        ajouter(xb, g.solY(xb) + p, 0);
      }
    }
    // parois gauche et droite (l'entrée reste ouverte à droite)
    for (let y = g.plafondY(0); y <= g.solY(0); y += 4) ajouter(-rng() * 4, y, 0);
    for (let y = g.plafondY(g.w); y <= g.solY(g.w); y += 4) {
      if (Math.abs(y - g.entree.y) < g.entree.hauteur / 2) continue;
      ajouter(g.w + rng() * 4, y, 0);
    }
    // concrétions : deux flancs lisses suivant le profil continu (rayon qui décroît) + pointe
    for (const f of g.formes) {
      const sens = f.type === 'stalactite' ? 1 : -1;
      const pas = 3 / Math.max(1, f.longueur);
      for (let t = 0; t <= 1.0001; t += pas) {
        const y = f.base + sens * t * f.longueur;
        const r = f.rayonBase * (1 - t * 0.82);
        const cx = f.x + Math.sin(t * 2.4 + f.x) * 3;
        ajouter(cx - r + rng() * 1.2, y, 1);
        ajouter(cx + r - rng() * 1.2, y, 1);
      }
      const rPointe = f.rayonBase * 0.18;
      const yPointe = f.base + sens * f.longueur;
      const cxPointe = f.x + Math.sin(2.4 + f.x) * 3;
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (i / 4);
        ajouter(cxPointe + Math.cos(a) * rPointe, yPointe + sens * Math.sin(a) * rPointe, 1);
      }
    }
    this.n = xs.length;
    this.xs = Float32Array.from(xs);
    this.ys = Float32Array.from(ys);
    this.types = Uint8Array.from(types);
    this._indexer();
  }

  /** Grille de cases de 64 px : une onde ne visite que les cases proches de son front */
  _indexer() {
    const T = 64;
    this.taille = T;
    this.cols = Math.ceil((this.grotte.w + 20) / T) + 1;
    this.lignes = Math.ceil((this.grotte.h + 20) / T) + 1;
    const compte = new Int32Array(this.cols * this.lignes + 1);
    const cases = new Int32Array(this.n);
    for (let i = 0; i < this.n; i++) {
      const c = Math.max(0, Math.min(this.cols - 1, Math.floor((this.xs[i] + 10) / T)));
      const l = Math.max(0, Math.min(this.lignes - 1, Math.floor((this.ys[i] + 10) / T)));
      cases[i] = l * this.cols + c;
      compte[cases[i] + 1]++;
    }
    for (let k = 0; k < this.cols * this.lignes; k++) compte[k + 1] += compte[k];
    this.debutCase = compte;                       // debutCase[k] .. debutCase[k+1] dans `ordre`
    this.ordre = new Int32Array(this.n);
    const rempli = new Int32Array(this.cols * this.lignes);
    for (let i = 0; i < this.n; i++) {
      const k = cases[i];
      this.ordre[compte[k] + rempli[k]++] = i;
    }
  }

  // ---------- Émission et propagation ----------

  /** Une chauve-souris crie en (x, y). `force` ∈ [0, 1] : un cri de chasse est plus vif */
  ping(x, y, force = 1) {
    if (this.ondes.length >= SONAR.maxOndes) this.ondes.shift();
    this.ondes.push({ x, y, r: 0, force });
  }

  /**
   * Avance d'un pas : les ondes grandissent, allument les points qu'elles traversent,
   * et lèvent `echo` des entités touchées par le front d'onde.
   * @param {Array<{pos}>} entites papillons, hibou... (objets avec pos et echo)
   */
  pas(entites = []) {
    const L = this.lumineux;
    for (let i = 0; i < this.n; i++) L[i] *= SONAR.persistance;

    const { xs, ys } = this;
    for (const o of this.ondes) {
      const r0 = o.r;
      const r1 = r0 + SONAR.vitesseSon;
      o.r = r1;
      const intensite = o.force * Math.pow(Math.max(0, 1 - r1 / SONAR.portee), 0.8);
      if (intensite <= 0.02) continue;
      const a2 = r0 * r0;
      const b2 = r1 * r1;
      const T = this.taille;
      const demi = T * 0.7072 + SONAR.vitesseSon;      // demi-diagonale d'une case + épaisseur du front
      const c0 = Math.max(0, Math.floor((o.x - r1 + 10) / T));
      const c1 = Math.min(this.cols - 1, Math.floor((o.x + r1 + 10) / T));
      const l0 = Math.max(0, Math.floor((o.y - r1 + 10) / T));
      const l1 = Math.min(this.lignes - 1, Math.floor((o.y + r1 + 10) / T));
      for (let l = l0; l <= l1; l++) {
        for (let c = c0; c <= c1; c++) {
          const cx = c * T + T / 2 - 10;
          const cy = l * T + T / 2 - 10;
          const dc = Math.hypot(cx - o.x, cy - o.y);
          if (dc < r0 - demi || dc > r1 + demi) continue;
          const k = l * this.cols + c;
          for (let j = this.debutCase[k]; j < this.debutCase[k + 1]; j++) {
            const i = this.ordre[j];
            const dx = xs[i] - o.x;
            const dy = ys[i] - o.y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= a2 && d2 < b2 && intensite > L[i]) L[i] = intensite;
          }
        }
      }
      for (const e of entites) {
        const dx = e.pos.x - o.x;
        const dy = e.pos.y - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= a2 && d2 < b2) e.echo = Math.max(e.echo || 0, Math.min(1, intensite * 1.6));
      }
    }
    // retire les ondes arrivées en bout de course
    this.ondes = this.ondes.filter((o) => o.r < SONAR.portee);
  }

  /** Allume toute la grotte à un niveau minimal (lumière du jour, aube) */
  eclairer(niveau) {
    if (niveau <= 0) return;
    const L = this.lumineux;
    for (let i = 0; i < this.n; i++) if (L[i] < niveau) L[i] = niveau;
  }

  // ---------- Dessin ----------

  /**
   * @param {object} o  jour (0..1) : bascule les couleurs du froid vers le chaud ;
   *                    ondes : dessiner les fronts d'onde
   */
  dessiner(ctx, { jour = 0, ondes = true } = {}) {
    const chaud = jour;
    const mix = (a, b) => Math.round(a + (b - a) * chaud);
    const teintes = [
      [mix(95, 255), mix(205, 150), mix(255, 70)],    // parois : cyan → ambre
      [mix(160, 255), mix(225, 190), mix(255, 120)],  // concrétions : plus claires
    ];
    const NIVEAUX = 7;
    const seaux = [[], []];
    for (let t = 0; t < 2; t++) for (let k = 0; k < NIVEAUX; k++) seaux[t].push([]);
    const L = this.lumineux;
    for (let i = 0; i < this.n; i++) {
      const v = L[i];
      if (v < 0.035) continue;
      const k = Math.min(NIVEAUX - 1, Math.floor(v * NIVEAUX));
      seaux[this.types[i]][k].push(i);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let t = 0; t < 2; t++) {
      const [R, G, B] = teintes[t];
      for (let k = 0; k < NIVEAUX; k++) {
        const liste = seaux[t][k];
        if (!liste.length) continue;
        const a = (k + 0.5) / NIVEAUX;
        ctx.fillStyle = `rgba(${R},${G},${B},${a * 0.16})`;
        for (const i of liste) ctx.fillRect(this.xs[i] - 2.5, this.ys[i] - 2.5, 5, 5);
        ctx.fillStyle = `rgba(${R},${G},${B},${Math.min(1, a * 1.05)})`;
        for (const i of liste) ctx.fillRect(this.xs[i] - 1, this.ys[i] - 1, 2, 2);
      }
    }
    if (ondes) {
      ctx.lineWidth = 1.2;
      for (const o of this.ondes) {
        const a = (1 - o.r / SONAR.portee) * 0.22 * o.force;
        if (a <= 0.01) continue;
        ctx.strokeStyle = `rgba(${teintes[0][0]},${teintes[0][1]},${teintes[0][2]},${a})`;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Sonar, SONAR };
