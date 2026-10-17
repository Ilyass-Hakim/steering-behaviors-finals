// rendu.js — petits outils de dessin partagés (canvas 2D, pas de logique de simulation).

const Rendu = {
  /** Rectangle à coins arrondis (chemin, sans remplir) */
  rect(ctx, x, y, l, h, r = 4) {
    r = Math.min(r, l / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + l, y, x + l, y + h, r);
    ctx.arcTo(x + l, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + l, y, r);
    ctx.closePath();
  },

  /** Polyligne lumineuse */
  ligne(ctx, pts, couleur, largeur = 3, flou = 12, alpha = 1) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = couleur;
    ctx.shadowColor = couleur;
    ctx.shadowBlur = flou;
    ctx.lineWidth = largeur;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  },

  /** Quadricoptère vu de dessus. `t` anime les hélices. */
  drone(ctx, x, y, cap, couleur, taille = 1, t = 0, alpha = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(cap);
    ctx.scale(taille, taille);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = couleur;
    ctx.fillStyle = couleur;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, -8); ctx.lineTo(8, 8); ctx.moveTo(8, -8); ctx.lineTo(-8, 8);
    ctx.stroke();
    for (const [dx, dy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
      ctx.globalAlpha = alpha * 0.28;
      ctx.beginPath(); ctx.arc(dx, dy, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      const a = t * 0.9 + dx;
      ctx.moveTo(dx + Math.cos(a) * 5, dy + Math.sin(a) * 5); ctx.lineTo(dx - Math.cos(a) * 5, dy - Math.sin(a) * 5);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#04070e';
    ctx.beginPath(); ctx.arc(2, 0, 1.2, 0, Math.PI * 2); ctx.fill();   // l'avant du drone
    ctx.restore();
  },

  /** Courbes sur un <canvas> HTML. series : [{ valeurs, couleur }], bornes optionnelles */
  courbe(canvas, series, { min = null, max = null, zero = false } = {}) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const l = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!l || !h) return;
    if (canvas.width !== Math.round(l * dpr)) { canvas.width = Math.round(l * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, l, h);
    const tous = series.flatMap((s) => s.valeurs).filter(Number.isFinite);
    if (tous.length < 2) {
      ctx.fillStyle = '#8b93b3'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('en attente de données…', l / 2, h / 2);
      return;
    }
    let lo = min ?? Math.min(...tous);
    let hi = max ?? Math.max(...tous);
    if (zero) lo = Math.min(lo, 0);
    if (hi - lo < 1e-9) hi = lo + 1;
    const px = 8; const py = 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) { const y = py + ((h - 2 * py) * i) / 3; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(l - px, y); ctx.stroke(); }
    for (const s of series) {
      const n = s.valeurs.length;
      ctx.strokeStyle = s.couleur;
      ctx.lineWidth = s.epaisseur || 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      s.valeurs.forEach((v, i) => {
        const x = px + ((l - 2 * px) * i) / Math.max(1, n - 1);
        const y = h - py - ((h - 2 * py) * (v - lo)) / (hi - lo);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.fillStyle = '#8b93b3'; ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'left';
    ctx.fillText(hi >= 100 ? hi.toFixed(0) : hi.toFixed(2), px, py - 1);
    ctx.fillText(lo >= 100 ? lo.toFixed(0) : lo.toFixed(2), px, h - 2);
  },
};
