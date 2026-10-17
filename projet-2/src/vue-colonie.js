// vue-colonie.js — dessin de la mission 4 : ciel, orages, chargeurs, colis et drones à ADN.

class VueColonie {
  dessiner(ctx, col, selection, temps) {
    const g = ctx.createRadialGradient(col.w / 2, col.h / 2, 80, col.w / 2, col.h / 2, col.w * 0.7);
    g.addColorStop(0, '#0c1428'); g.addColorStop(1, '#05070e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, col.w, col.h);
    ctx.strokeStyle = 'rgba(148,163,184,0.05)'; ctx.lineWidth = 1;
    for (let x = 0; x <= col.w; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, col.h); ctx.stroke(); }
    for (let y = 0; y <= col.h; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(col.w, y); ctx.stroke(); }

    for (const o of col.orages) {
      const r = ctx.createRadialGradient(o.x, o.y, 4, o.x, o.y, o.r);
      r.addColorStop(0, 'rgba(167,139,250,0.34)'); r.addColorStop(0.75, 'rgba(99,102,241,0.14)'); r.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.fillStyle = r; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(167,139,250,0.35)'; ctx.setLineDash([4, 8]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      if (Math.sin(temps * 0.13 + o.x) > 0.93) {                       // un éclair de temps en temps
        ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 2; ctx.beginPath();
        let x = o.x + (Math.sin(temps) * o.r) / 3; let y = o.y - o.r * 0.5; ctx.moveTo(x, y);
        for (let i = 0; i < 4; i++) { x += Math.sin(temps * (i + 2)) * 14; y += o.r * 0.25; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }

    for (const c of col.chargeurs) {
      ctx.fillStyle = 'rgba(52,211,153,0.10)'; ctx.beginPath(); ctx.arc(c.x, c.y, col.p.rayonChargeur + 6, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(52,211,153,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, c.y, col.p.rayonChargeur, 0, 7); ctx.stroke();
      for (let i = 0; i < 3; i++) {                                    // 3 places : pleines quand occupées
        ctx.fillStyle = i < c.utilises ? '#34d399' : 'rgba(52,211,153,0.22)';
        ctx.beginPath(); ctx.arc(c.x - 12 + i * 12, c.y, 4, 0, 7); ctx.fill();
      }
    }

    for (const k of col.colis) {
      ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
      Rendu.rect(ctx, k.x - 5, k.y - 5, 10, 10, 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#0b1222'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(k.x - 5, k.y); ctx.lineTo(k.x + 5, k.y); ctx.stroke();
    }

    for (const d of col.drones) {
      if (d.mort) {
        const fondu = Math.max(0, 1 - (col.temps - (d.finDeVie ?? col.temps)) / 90);
        ctx.strokeStyle = d.cause === 'orage' ? `rgba(167,139,250,${fondu})` : `rgba(248,113,113,${fondu})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(d.pos.x - 5, d.pos.y - 5); ctx.lineTo(d.pos.x + 5, d.pos.y + 5); ctx.moveTo(d.pos.x + 5, d.pos.y - 5); ctx.lineTo(d.pos.x - 5, d.pos.y + 5); ctx.stroke();
        continue;
      }
      const teinte = d.adn.teinte();
      const couleur = `hsl(${teinte}, 85%, 68%)`;
      Rendu.drone(ctx, d.pos.x, d.pos.y, d.cap, couleur, 0.9, temps);
      // anneau de batterie : vert → rouge
      const n = d.niveau;
      ctx.strokeStyle = n > 0.5 ? '#4ade80' : n > 0.25 ? '#fbbf24' : '#f87171';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y, 13, -Math.PI / 2, -Math.PI / 2 + n * Math.PI * 2); ctx.stroke();
      if (d.recharge) {
        ctx.strokeStyle = 'rgba(52,211,153,0.9)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y, 17 + Math.sin(temps * 0.4) * 2, 0, 7); ctx.stroke();
      }
    }

    const s = selection;
    if (s && !s.mort) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(s.pos.x, s.pos.y, s.adn.get('vue'), 0, 7); ctx.stroke(); ctx.setLineDash([]);
      for (const [nom, f] of Object.entries(s.forces)) {
        const couleur = { seek: '#fbbf24', arrive: '#34d399', flee: '#f87171', separation: '#a78bfa', wander: '#7dd3fc' }[nom] || '#fff';
        ctx.strokeStyle = couleur; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s.pos.x, s.pos.y); ctx.lineTo(s.pos.x + f.x * 140, s.pos.y + f.y * 140); ctx.stroke();
      }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(s.pos.x, s.pos.y, 22 + Math.sin(temps * 0.2) * 2, 0, 7); ctx.stroke();
    }
  }
}
