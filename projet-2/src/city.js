// city.js — la ville de SkyPost : un quadrillage de rues, des blocs d'immeubles, des chargeurs
// et des points de livraison. Les rues forment un graphe ; les plus courts chemins sont calculés
// par Dijkstra. Aucune dépendance à p5 : la ville se teste seule.

class Ville {
  constructor(graine = CONFIG.graine, params = CONFIG.ville) {
    this.graine = graine;
    this.params = params;
    this.rng = creerRng(graine);
    this.w = CONFIG.monde.largeur;
    this.h = CONFIG.monde.hauteur;
    this.noeuds = [];          // { id, x, y, voisins: [{ vers, longueur }] }
    this.aretes = [];          // { a, b, ferme }
    this.blocs = [];           // immeubles : { x, y, l, h, hauteur }
    this.hub = 0;
    this.chargeurs = [];       // ids de noeuds
    this.livraisons = [];      // ids de noeuds
    this.construireGrille();
    this.fermerRues();
    this.construireBlocs();
    this.placerPoints();
  }

  id(col, lig) { return lig * this.params.colonnes + col; }

  construireGrille() {
    const { colonnes, lignes, margeX, margeY, pasX, pasY } = this.params;
    for (let l = 0; l < lignes; l++) {
      for (let c = 0; c < colonnes; c++) {
        // léger décalage : une ville qui n'est pas parfaitement droite
        const jx = (this.rng() - 0.5) * 34;
        const jy = (this.rng() - 0.5) * 28;
        this.noeuds.push({ id: this.id(c, l), col: c, lig: l, x: margeX + c * pasX + jx, y: margeY + l * pasY + jy, voisins: [] });
      }
    }
    for (let l = 0; l < lignes; l++) {
      for (let c = 0; c < colonnes; c++) {
        if (c + 1 < colonnes) this.aretes.push({ a: this.id(c, l), b: this.id(c + 1, l), ferme: false });
        if (l + 1 < lignes) this.aretes.push({ a: this.id(c, l), b: this.id(c, l + 1), ferme: false });
      }
    }
  }

  /** Ferme une part des rues (travaux) sans jamais déconnecter la ville */
  fermerRues() {
    const cible = Math.floor(this.aretes.length * this.params.ruesSupprimees);
    const ordre = this.aretes.map((_, i) => i).sort(() => this.rng() - 0.5);
    let fermees = 0;
    for (const i of ordre) {
      if (fermees >= cible) break;
      this.aretes[i].ferme = true;
      if (this.estConnexe()) fermees++;
      else this.aretes[i].ferme = false;
    }
    this.recalculerVoisins();
  }

  recalculerVoisins() {
    for (const n of this.noeuds) n.voisins = [];
    for (const e of this.aretes) {
      if (e.ferme) continue;
      const a = this.noeuds[e.a];
      const b = this.noeuds[e.b];
      const longueur = Math.hypot(a.x - b.x, a.y - b.y);
      a.voisins.push({ vers: b.id, longueur });
      b.voisins.push({ vers: a.id, longueur });
    }
  }

  estConnexe() {
    const n = this.noeuds.length;
    const adj = Array.from({ length: n }, () => []);
    for (const e of this.aretes) if (!e.ferme) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
    const vu = new Set([0]);
    const pile = [0];
    while (pile.length) for (const v of adj[pile.pop()]) if (!vu.has(v)) { vu.add(v); pile.push(v); }
    return vu.size === n;
  }

  /** Les blocs d'immeubles occupent le centre de chaque maille du quadrillage */
  construireBlocs() {
    const { colonnes, lignes } = this.params;
    const rue = 34;
    for (let l = 0; l + 1 < lignes; l++) {
      for (let c = 0; c + 1 < colonnes; c++) {
        const a = this.noeuds[this.id(c, l)];
        const b = this.noeuds[this.id(c + 1, l + 1)];
        const x0 = a.x + rue / 2;
        const y0 = a.y + rue / 2;
        const lg = b.x - a.x - rue;
        const ht = b.y - a.y - rue;
        // chaque maille est divisée en 2 × 2 petits immeubles de hauteurs différentes
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            if (this.rng() < 0.12) continue;     // des places vides
            const gap = 6;
            this.blocs.push({
              x: x0 + (i * lg) / 2 + gap / 2, y: y0 + (j * ht) / 2 + gap / 2,
              l: lg / 2 - gap, h: ht / 2 - gap, hauteur: 0.25 + this.rng() * 0.75,
            });
          }
        }
      }
    }
  }

  placerPoints() {
    const n = this.noeuds.length;
    const libres = Array.from({ length: n }, (_, i) => i).sort(() => this.rng() - 0.5);
    this.hub = this.id(0, Math.floor(this.params.lignes / 2));
    const pris = new Set([this.hub]);
    const prendre = (k) => {
      const r = [];
      for (const i of libres) {
        if (r.length >= k) break;
        if (!pris.has(i)) { pris.add(i); r.push(i); }
      }
      return r;
    };
    this.livraisons = prendre(this.params.livraisons);
    this.chargeurs = prendre(this.params.chargeurs);
  }

  /** Nouvelles livraisons (même ville) */
  tirerLivraisons(k, rng = this.rng) {
    const exclus = new Set([this.hub, ...this.chargeurs]);
    const pool = this.noeuds.map((n) => n.id).filter((i) => !exclus.has(i)).sort(() => rng() - 0.5);
    this.livraisons = pool.slice(0, k);
    return this.livraisons;
  }

  // ---------- Plus courts chemins ----------

  /** Dijkstra depuis `source` : { dist[], prec[] } */
  dijkstra(source) {
    const n = this.noeuds.length;
    const dist = new Array(n).fill(Infinity);
    const prec = new Array(n).fill(-1);
    const fait = new Array(n).fill(false);
    dist[source] = 0;
    for (let k = 0; k < n; k++) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!fait[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] === Infinity) break;
      fait[u] = true;
      for (const { vers, longueur } of this.noeuds[u].voisins) {
        if (dist[u] + longueur < dist[vers]) { dist[vers] = dist[u] + longueur; prec[vers] = u; }
      }
    }
    return { dist, prec };
  }

  /** Liste d'ids de noeuds du plus court chemin a → b */
  plusCourtChemin(a, b) {
    const { prec } = this.dijkstra(a);
    const chemin = [];
    for (let v = b; v !== -1; v = prec[v]) chemin.push(v);
    return chemin.reverse();
  }

  /** Matrice des distances par la route entre les points d'intérêt [hub, ...livraisons] */
  matriceDistances(points = [this.hub, ...this.livraisons]) {
    const m = points.map(() => new Array(points.length).fill(0));
    points.forEach((p, i) => {
      const { dist } = this.dijkstra(p);
      points.forEach((q, j) => { m[i][j] = dist[q]; });
    });
    return m;
  }

  /** Noeud le plus proche d'un point */
  noeudProche(x, y) {
    let best = 0;
    let d = Infinity;
    for (const n of this.noeuds) {
      const dd = (n.x - x) ** 2 + (n.y - y) ** 2;
      if (dd < d) { d = dd; best = n.id; }
    }
    return best;
  }

  pos(id) { return { x: this.noeuds[id].x, y: this.noeuds[id].y }; }

  /** Un point (x, y) est-il dans un immeuble ? (marge en px) */
  dansBatiment(x, y, marge = 0) {
    for (const b of this.blocs) {
      if (x > b.x - marge && x < b.x + b.l + marge && y > b.y - marge && y < b.y + b.h + marge) return true;
    }
    return false;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Ville };
