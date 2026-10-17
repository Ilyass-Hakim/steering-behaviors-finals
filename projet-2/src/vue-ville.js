// vue-ville.js — dessin de la ville (missions 1 et 2) : fond mis en cache, tournées, drones et
// pièces pédagogiques du path following (position prédite, point normal, cible, couloir).

class VueVille {
  constructor() {
    this.cache = null;
    this.graineCache = null;
    this.jambes = new Map();
  }

  /** Plus court chemin a → b sous forme de points (mis en cache) */
  jambe(ville, a, b) {
    const cle = `${ville.graine}:${a}:${b}`;
    if (!this.jambes.has(cle)) this.jambes.set(cle, ville.plusCourtChemin(a, b).map((i) => ville.pos(i)));
    return this.jambes.get(cle);
  }

  /** Fond de la ville : rues, travaux, immeubles. Dessiné une fois, puis recopié. */
  fond(ville) {
    const cle = ville.graine + ':' + ville.aretes.filter((e) => e.ferme).length;
    if (this.cache && this.graineCache === cle) return this.cache;
    const c = document.createElement('canvas');
    c.width = ville.w; c.height = ville.h;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(ville.w / 2, ville.h / 2, 100, ville.w / 2, ville.h / 2, ville.w * 0.7);
    g.addColorStop(0, '#0b1222'); g.addColorStop(1, '#05070e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ville.w, ville.h);
    // rues
    ctx.lineCap = 'round';
    for (const e of ville.aretes) {
      const a = ville.noeuds[e.a]; const b = ville.noeuds[e.b];
      if (e.ferme) {
        ctx.strokeStyle = 'rgba(248,113,113,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([3, 9]);
      } else {
        ctx.strokeStyle = '#16233d'; ctx.lineWidth = 22; ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (!e.ferme) {
        ctx.strokeStyle = 'rgba(148,163,184,0.16)'; ctx.lineWidth = 1; ctx.setLineDash([10, 12]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    // immeubles : ombre portée + toit
    for (const b of ville.blocs) {
      const dec = 3 + b.hauteur * 8;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      Rendu.rect(ctx, b.x + dec, b.y + dec, b.l, b.h, 4); ctx.fill();
      const l = 14 + b.hauteur * 14;
      ctx.fillStyle = `hsl(222, 36%, ${l}%)`;
      Rendu.rect(ctx, b.x, b.y, b.l, b.h, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(148,163,255,0.14)'; ctx.lineWidth = 1; ctx.stroke();
      // fenêtres allumées
      ctx.fillStyle = 'rgba(251,191,36,0.28)';
      const nx = Math.max(1, Math.floor(b.l / 14)); const ny = Math.max(1, Math.floor(b.h / 14));
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        if (((i * 7 + j * 13 + Math.floor(b.x)) % 5) < 2) ctx.fillRect(b.x + 6 + i * 14, b.y + 6 + j * 14, 4, 4);
      }
    }
    this.cache = c;
    this.graineCache = cle;
    return c;
  }

  /** Points d'intérêt : hub, livraisons (numérotées selon la tournée), chargeurs */
  points(ctx, ville, tournee, temps) {
    for (const id of ville.chargeurs) {
      const p = ville.pos(id);
      ctx.fillStyle = 'rgba(52,211,153,0.16)'; ctx.beginPath(); ctx.arc(p.x, p.y, 17, 0, 7); ctx.fill();
      ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7); ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.beginPath(); ctx.moveTo(p.x + 2, p.y - 7); ctx.lineTo(p.x - 4, p.y + 1); ctx.lineTo(p.x, p.y + 1); ctx.lineTo(p.x - 2, p.y + 7); ctx.lineTo(p.x + 4, p.y - 1); ctx.lineTo(p.x, p.y - 1); ctx.closePath(); ctx.fill();
    }
    const ordre = new Map();
    if (tournee) tournee.forEach((g, i) => ordre.set(g, i + 1));
    ville.livraisons.forEach((id, i) => {
      const p = ville.pos(id);
      const n = ordre.get(i + 1);
      const pulse = 1 + 0.12 * Math.sin(temps * 0.06 + i);
      ctx.fillStyle = 'rgba(244,114,182,0.18)'; ctx.beginPath(); ctx.arc(p.x, p.y, 20 * pulse, 0, 7); ctx.fill();
      ctx.fillStyle = '#f472b6'; ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      // croix médicale
      ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 5, p.y - 1.5, 10, 3); ctx.fillRect(p.x - 1.5, p.y - 5, 3, 10);
      if (n) {
        ctx.fillStyle = '#0b1222'; ctx.beginPath(); ctx.arc(p.x + 12, p.y - 12, 8, 0, 7); ctx.fill();
        ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '600 10px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(n, p.x + 12, p.y - 11.5);
      }
    });
    const h = ville.pos(ville.hub);
    ctx.fillStyle = 'rgba(251,191,36,0.2)'; ctx.beginPath(); ctx.arc(h.x, h.y, 28 + 3 * Math.sin(temps * 0.05), 0, 7); ctx.fill();
    ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 18;
    Rendu.rect(ctx, h.x - 13, h.y - 13, 26, 26, 6); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b1222'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('H', h.x, h.y + 0.5);
  }

  /** Tournée complète (hub → … → hub) sous forme de polyligne */
  tracer(ville, etapes) {
    const pts = [];
    for (let i = 0; i + 1 < etapes.length; i++) {
      const j = this.jambe(ville, etapes[i], etapes[i + 1]);
      for (let k = i === 0 ? 0 : 1; k < j.length; k++) pts.push(j[k]);
    }
    return pts;
  }

  /** Mission 1 : les meilleures tournées de la population qui évolue */
  dessinerGenetique(ctx, ville, ga, temps) {
    if (!ga) return;
    const pts = [ville.hub, ...ville.livraisons];
    const etapes = (g) => [ville.hub, ...g.map((i) => pts[i]), ville.hub];
    // quelques autres individus, en filigrane : on voit la population converger
    const ordre = ga.individus.map((g, i) => i).sort((a, b) => ga.scores[b] - ga.scores[a]).slice(1, 6);
    for (const i of ordre) Rendu.ligne(ctx, this.tracer(ville, etapes(ga.individus[i])), '#38bdf8', 2, 0, 0.1);
    const meilleur = this.tracer(ville, etapes(ga.meilleur));
    Rendu.ligne(ctx, meilleur, '#38bdf8', 7, 22, 0.25);
    ctx.save();
    ctx.setLineDash([16, 12]);
    ctx.lineDashOffset = -temps * 0.8;
    Rendu.ligne(ctx, meilleur, '#e0f2fe', 2.6, 8, 1);
    ctx.restore();
  }

  /** Mission 2 : tournées des drones, couloir de tolérance, drones et guidage */
  dessinerVol(ctx, ville, drones, options, temps) {
    for (const d of drones) {
      if (d.chemin && options.couloir) {
        Rendu.ligne(ctx, d.chemin.points, d.couleur, d.chemin.rayon * 2, 0, 0.09);
      }
      if (d.chemin) Rendu.ligne(ctx, d.chemin.points, d.couleur, 1.6, 6, 0.55);
    }
    for (const d of drones) {
      if (options.traces && d.trace.length > 2) {
        for (let i = 1; i < d.trace.length; i++) {
          ctx.globalAlpha = (i / d.trace.length) * 0.5;
          ctx.strokeStyle = d.couleur; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(d.trace[i - 1].x, d.trace[i - 1].y); ctx.lineTo(d.trace[i].x, d.trace[i].y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    for (const d of drones) {
      if (d.etat === 'attente' || d.etat === 'termine' && false) continue;
      // ombre portée : le drone vole au-dessus de la ville
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(d.pos.x + 12, d.pos.y + 17, 14, 7, 0, 0, 7); ctx.fill();
      if (options.guide && d.debugChemin && d.etat === 'vol') this.guide(ctx, d);
      Rendu.drone(ctx, d.pos.x, d.pos.y, d.cap, d.couleur, 1.5, temps);
      if (d.etat === 'livraison') {
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y, 18 + (70 - d.pause) * 0.35, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
  }

  /** Les trois points du path following : futur (anneau), normal (jaune), cible (croix rose) */
  guide(ctx, d) {
    const i = d.debugChemin;
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(d.pos.x, d.pos.y); ctx.lineTo(i.futur.x, i.futur.y); ctx.lineTo(i.normal.x, i.normal.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(i.futur.x, i.futur.y, 5, 0, 7); ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(i.normal.x, i.normal.y, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(i.cible.x - 6, i.cible.y - 6); ctx.lineTo(i.cible.x + 6, i.cible.y + 6); ctx.moveTo(i.cible.x + 6, i.cible.y - 6); ctx.lineTo(i.cible.x - 6, i.cible.y + 6); ctx.stroke();
    ctx.restore();
  }
}
