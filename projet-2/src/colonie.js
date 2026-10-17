// colonie.js — l'écosystème de la mission 4 : colis à livrer, chargeurs, orages et drones qui
// naissent, vivent et meurent. Pas de génération « officielle » : la reproduction est continue,
// un drone qui vole bien et garde sa batterie se reproduit plus souvent (sélection naturelle).

class Colonie {
  constructor(graine = CONFIG.graine, params = CONFIG.evo) {
    this.p = params;
    this.rng = creerRng(graine);
    this.w = CONFIG.monde.largeur;
    this.h = CONFIG.monde.hauteur;
    this.drones = [];
    this.colis = [];
    this.orages = [];
    this.chargeurs = [
      { x: this.w * 0.2, y: this.h * 0.28, utilises: 0 },
      { x: this.w * 0.8, y: this.h * 0.3, utilises: 0 },
      { x: this.w * 0.5, y: this.h * 0.52, utilises: 0 },
      { x: this.w * 0.28, y: this.h * 0.78, utilises: 0 },
      { x: this.w * 0.74, y: this.h * 0.8, utilises: 0 },
    ];
    this.temps = 0;
    this.nes = 0;
    this.morts = { batterie: 0, orage: 0 };
    this.totalLivraisons = 0;
    this.historique = [];            // { t, population, ... gènes moyens } échantillonné
    this.derniereGeneration = 1;
    for (let i = 0; i < this.p.colis; i++) this.colis.push(this.nouveauColis());
    for (let i = 0; i < 3; i++) this.orages.push(this.nouvelOrage(i));
    for (let i = 0; i < this.p.population; i++) this.drones.push(this.nouveauDrone(new ADN(null, this.rng)));
  }

  nouveauColis() { return { x: 60 + this.rng() * (this.w - 120), y: 60 + this.rng() * (this.h - 120) }; }

  nouvelOrage(i) {
    const a = this.rng() * Math.PI * 2;
    return { x: this.w * (0.25 + 0.25 * i) + this.rng() * 80, y: this.h * (0.3 + 0.2 * (i % 2)), r: 70 + this.rng() * 30, vx: Math.cos(a) * 0.25, vy: Math.sin(a) * 0.25 };
  }

  nouveauDrone(adn, x = null, y = null, options = {}) {
    return new DroneEvo(x ?? 60 + this.rng() * (this.w - 120), y ?? 60 + this.rng() * (this.h - 120), adn, options);
  }

  /** L'objet de `liste` le plus proche de `pos`, à moins de `portee` (+ taille éventuelle) */
  plusProche(liste, pos, portee, taille = null) {
    let meilleur = null;
    let dmin = Infinity;
    for (const o of liste) {
      const d = Math.hypot(o.x - pos.x, o.y - pos.y) - (taille ? taille(o) : 0);
      if (d < portee && d < dmin) { dmin = d; meilleur = o; }
    }
    return meilleur;
  }

  voisinsDe(drone, distance) {
    const r = [];
    for (const o of this.drones) {
      if (o === drone || o.mort) continue;
      if (Math.abs(o.pos.x - drone.pos.x) < distance && Math.abs(o.pos.y - drone.pos.y) < distance) r.push(o);
    }
    return r;
  }

  vivants() { return this.drones.filter((d) => !d.mort); }

  /** Un pas : perception → forces → déplacement → interactions → naissances et morts */
  pas() {
    const p = this.p;
    for (const o of this.orages) {
      o.x += o.vx; o.y += o.vy;
      if (o.x < 80 || o.x > this.w - 80) o.vx *= -1;
      if (o.y < 80 || o.y > this.h - 80) o.vy *= -1;
    }
    for (const c of this.chargeurs) c.utilises = 0;
    for (const d of this.drones) d.penser(this);
    for (const d of this.drones) {
      d.update();
      if (d.mort) continue;
      d.contenir(this.w, this.h);
      this.interagir(d);
    }
    this.naissances();
    this.drones = this.drones.filter((d) => !d.mort || (this.temps - (d.finDeVie ?? this.temps) < 90));
    for (const d of this.drones) if (d.mort && d.finDeVie === undefined) { d.finDeVie = this.temps; this.morts[d.cause]++; }
    this.temps++;
    if (this.temps % 120 === 0) this.echantillonner();
  }

  interagir(d) {
    const p = this.p;
    d.recharge = false;
    // colis : livré = un peu d'énergie récupérée (retour de mission) + score
    for (let i = 0; i < this.colis.length; i++) {
      const c = this.colis[i];
      if (Math.hypot(c.x - d.pos.x, c.y - d.pos.y) < 14) {
        d.batterie = Math.min(p.batterieMax, d.batterie + p.gainColis);
        d.livraisons++;
        this.totalLivraisons++;
        this.colis[i] = this.nouveauColis();
        break;
      }
    }
    // chargeur : capacité limitée (3 drones à la fois) — il faut en partager
    for (const c of this.chargeurs) {
      if (c.utilises < 3 && Math.hypot(c.x - d.pos.x, c.y - d.pos.y) < p.rayonChargeur) {
        c.utilises++;
        d.recharge = true;
        d.batterie = Math.min(p.batterieMax, d.batterie + p.gainChargeur);
        break;
      }
    }
    // orage : la batterie s'effondre dans une cellule d'orage
    for (const o of this.orages) {
      if (Math.hypot(o.x - d.pos.x, o.y - d.pos.y) < o.r) {
        d.batterie -= 0.35;
        if (d.batterie <= 0) { d.batterie = 0; d.mort = true; d.cause = 'orage'; }
        break;
      }
    }
  }

  /** Reproduction asexuée avec mutation ; la population est bornée et ne s'éteint jamais */
  naissances() {
    const p = this.p;
    const vivants = this.vivants();
    if (vivants.length < p.population * 0.45) {
      // filet de sécurité : si presque tous sont morts, la lignée survivante repart avec des mutants
      const base = vivants.length ? vivants : null;
      const n = Math.ceil(p.population * 0.45) - vivants.length;
      for (let i = 0; i < n; i++) {
        const parent = base ? base[Math.floor(this.rng() * base.length)] : null;
        const adn = parent ? parent.adn.muter(0.4, this.rng) : new ADN(null, this.rng);
        this.drones.push(this.nouveauDrone(adn, null, null, { generation: parent ? parent.generation + 1 : 1 }));
        this.nes++;
      }
    }
    if (vivants.length >= p.populationMax) return;
    for (const d of vivants) {
      // un drone en forme (batterie haute) et expérimenté (a livré) se reproduit
      const aptitude = Math.max(0, d.niveau - 0.5) * 2 * Math.min(1, d.livraisons / 3);
      if (this.rng() < p.reproduction * aptitude * 6) {
        d.batterie -= 30;
        const enfant = this.nouveauDrone(d.adn.muter(p.mutation, this.rng), d.pos.x, d.pos.y, { batterie: 55, generation: d.generation + 1 });
        this.drones.push(enfant);
        this.derniereGeneration = Math.max(this.derniereGeneration, enfant.generation);
        this.nes++;
      }
    }
  }

  /** Moyenne des gènes de la population vivante (courbes d'évolution) */
  moyenneGenes() {
    const v = this.vivants();
    return GENES.map((g, i) => (v.length ? v.reduce((s, d) => s + d.adn.valeurs[i], 0) / v.length : 0));
  }

  echantillonner() {
    this.historique.push({ t: this.temps, population: this.vivants().length, genes: this.moyenneGenes() });
    if (this.historique.length > 300) this.historique.shift();
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Colonie };
