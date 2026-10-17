// vue-ecole.js — dessin de la mission 3 : terrain, promotion de pilotes, télémètres du meilleur,
// et schéma du réseau de neurones.

class VueEcole {
  terrain(ctx, arene) {
    const g = ctx.createLinearGradient(0, 0, arene.w, 0);
    g.addColorStop(0, '#0a1424'); g.addColorStop(1, '#0a1220');
    ctx.fillStyle = g; ctx.fillRect(0, 0, arene.w, arene.h);
    ctx.strokeStyle = 'rgba(148,163,184,0.06)'; ctx.lineWidth = 1;
    for (let x = 0; x <= arene.w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, arene.h); ctx.stroke(); }
    for (let y = 0; y <= arene.h; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(arene.w, y); ctx.stroke(); }
    for (const o of arene.obstacles) {
      ctx.fillStyle = o.mur ? '#1a2540' : '#141f38';
      ctx.strokeStyle = o.mur ? 'rgba(248,113,113,0.55)' : 'rgba(148,163,255,0.3)';
      ctx.lineWidth = 1.6;
      if (o.type === 'cercle') { ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); } else Rendu.rect(ctx, o.x, o.y, o.l, o.h, 5);
      ctx.fill(); ctx.stroke();
    }
    // départ et arrivée
    const d = arene.depart; const a = arene.arrivee;
    ctx.fillStyle = 'rgba(251,191,36,0.16)'; ctx.beginPath(); ctx.arc(d.x, d.y, 30, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.x, d.y, 30, 0, 7); ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.font = '600 11px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('DÉPART', d.x, d.y + 48);
    ctx.fillStyle = 'rgba(74,222,128,0.16)'; ctx.beginPath(); ctx.arc(a.x, a.y, arene.rayonArrivee, 0, 7); ctx.fill();
    ctx.strokeStyle = '#4ade80'; ctx.beginPath(); ctx.arc(a.x, a.y, arene.rayonArrivee, 0, 7); ctx.stroke();
    ctx.fillStyle = '#4ade80'; ctx.fillText('ARRIVÉE', a.x, a.y + 50);
  }

  /** @param {Pilote[]} pilotes  @param {Pilote|null} vedette  celui dont on montre les télémètres */
  pilotes(ctx, pilotes, vedette, temps) {
    for (const p of pilotes) {
      if (p === vedette) continue;
      if (p.etat === 'vol') Rendu.drone(ctx, p.pos.x, p.pos.y, p.cap, '#7dd3fc', 0.62, temps, 0.55);
      else if (p.etat === 'crash') {
        ctx.strokeStyle = 'rgba(248,113,113,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p.pos.x - 4, p.pos.y - 4); ctx.lineTo(p.pos.x + 4, p.pos.y + 4); ctx.moveTo(p.pos.x + 4, p.pos.y - 4); ctx.lineTo(p.pos.x - 4, p.pos.y + 4); ctx.stroke();
      } else if (p.etat === 'arrive') {
        ctx.fillStyle = 'rgba(74,222,128,0.65)'; ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 3.2, 0, 7); ctx.fill();
      }
    }
    if (vedette) this.vedette(ctx, vedette, temps);
  }

  vedette(ctx, p, temps) {
    if (p.trace.length > 1) Rendu.ligne(ctx, p.trace, '#fbbf24', 2, 8, 0.7);
    if (p.vivant) {
      const { capteurs, ouverture, portee } = CONFIG.neuro;
      for (let i = 0; i < capteurs; i++) {
        const a = p.cap + (i / (capteurs - 1) - 0.5) * ouverture;
        const d = p.capteurs[i] * portee;
        const danger = 1 - p.capteurs[i];
        ctx.strokeStyle = `rgba(${Math.round(80 + 170 * danger)},${Math.round(220 - 140 * danger)},140,0.8)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(p.pos.x, p.pos.y); ctx.lineTo(p.pos.x + Math.cos(a) * d, p.pos.y + Math.sin(a) * d); ctx.stroke();
        if (p.capteurs[i] < 0.999) { ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.arc(p.pos.x + Math.cos(a) * d, p.pos.y + Math.sin(a) * d, 2.6, 0, 7); ctx.fill(); }
      }
      // vitesse désirée (la décision du cerveau) : la force est désiré − vitesse
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(p.pos.x, p.pos.y); ctx.lineTo(p.pos.x + p.desire.x * 9, p.pos.y + p.desire.y * 9); ctx.stroke();
    }
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 16;
    Rendu.drone(ctx, p.pos.x, p.pos.y, p.cap, '#fde68a', 1.25, temps);
    ctx.shadowBlur = 0;
  }

  /** Schéma du réseau (entrées, couche cachée, sorties) avec activations et poids */
  reseau(canvas, reseau) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const l = canvas.clientWidth; const h = canvas.clientHeight;
    if (!l || !h) return;
    if (canvas.width !== Math.round(l * dpr)) { canvas.width = Math.round(l * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, l, h);
    if (!reseau) return;
    const t = reseau.tailles;
    const x = (c) => 26 + ((l - 52) * c) / (t.length - 1);
    const y = (c, i) => 12 + ((h - 24) * (i + 0.5)) / t[c];
    let k = 0;
    for (let c = 0; c + 1 < t.length; c++) {
      const n = t[c]; const m = t[c + 1];
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        const w = reseau.poids[k + i * m + j];
        ctx.strokeStyle = w > 0 ? `rgba(56,189,248,${Math.min(0.7, Math.abs(w) * 0.35)})` : `rgba(244,114,182,${Math.min(0.7, Math.abs(w) * 0.35)})`;
        ctx.lineWidth = 0.4 + Math.min(1.6, Math.abs(w) * 0.9);
        ctx.beginPath(); ctx.moveTo(x(c), y(c, i)); ctx.lineTo(x(c + 1), y(c + 1, j)); ctx.stroke();
      }
      k += (n + 1) * m;
    }
    const act = reseau.activations;
    for (let c = 0; c < t.length; c++) {
      for (let i = 0; i < t[c]; i++) {
        const a = act[c] ? act[c][i] ?? 0 : 0;
        const base = c === 0 ? '251,191,36' : c === t.length - 1 ? '167,139,250' : '148,163,184';
        ctx.fillStyle = `rgba(${base},${0.25 + 0.75 * Math.min(1, Math.abs(a))})`;
        ctx.beginPath(); ctx.arc(x(c), y(c, i), 4.6, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(${base},0.9)`; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }
}
