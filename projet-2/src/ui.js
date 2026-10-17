// ui.js — l'interface HTML : onglets de missions, panneau, courbes et raccourcis.
// Elle lit l'état de App et règle ses paramètres ; elle ne change jamais la physique.

const UI = {
  $(id) { return document.getElementById(id); },

  init() {
    const $ = (id) => this.$(id);
    if (window.innerWidth <= 900) document.body.classList.add('panneau-ferme');
    document.querySelectorAll('#onglets button').forEach((b) => b.addEventListener('click', () => App.changerMission(+b.dataset.mission)));
    $('btn-pause').addEventListener('click', () => this.basculerPause());
    document.querySelectorAll('[data-vitesse]').forEach((b) => b.addEventListener('click', () => this.regler(+b.dataset.vitesse)));
    $('btn-afficher').addEventListener('click', () => this.epure());
    $('btn-aide').addEventListener('click', () => this.aide());
    $('aide-fermer').addEventListener('click', () => this.aide(false));
    $('aide').addEventListener('click', (e) => { if (e.target.id === 'aide') this.aide(false); });
    $('panneau-bouton').addEventListener('click', () => this.panneau());

    // Mission 1
    const curseur = (id, sortie, appliquer, fmt = (v) => v) => {
      $(id).addEventListener('input', () => { $(sortie).textContent = fmt(+$(id).value); });
      $(id).addEventListener('change', () => appliquer(+$(id).value));
    };
    curseur('r-livraisons', 'o-livraisons', (v) => App.changerLivraisons(v));
    curseur('r-mutation', 'o-mutation', (v) => { App.reglagesGA = { ...(App.reglagesGA || { population: CONFIG.genetique.population }), mutation: v / 100 }; App.nouveauGA(); }, (v) => `${v} %`);
    curseur('r-population', 'o-population', (v) => { App.reglagesGA = { ...(App.reglagesGA || { mutation: CONFIG.genetique.mutation }), population: v }; App.nouveauGA(); });
    $('g-relancer').addEventListener('click', () => App.changerLivraisons(+$('r-livraisons').value));
    $('g-ville').addEventListener('click', () => { App.nouvelleVille(Math.floor(Math.random() * 1e6)); App.ville.tirerLivraisons(+$('r-livraisons').value, App.rngGA); App.nouveauGA(); });
    $('g-envoyer').addEventListener('click', () => { App.lancerVol(); App.changerMission(2); });

    // Mission 2
    $('a-guide').addEventListener('change', (e) => { App.optionsVol.guide = e.target.checked; });
    $('a-couloir').addEventListener('change', (e) => { App.optionsVol.couloir = e.target.checked; });
    $('a-traces').addEventListener('change', (e) => { App.optionsVol.traces = e.target.checked; });
    $('r-nbdrones').addEventListener('input', () => { $('o-nbdrones').textContent = $('r-nbdrones').value; });
    $('r-nbdrones').addEventListener('change', () => App.lancerVol(+$('r-nbdrones').value));
    $('v-relancer').addEventListener('click', () => App.lancerVol());

    // Mission 3
    $('n-turbo').addEventListener('click', () => { App.examen = null; App.turbo = 10; });
    $('n-reset').addEventListener('click', () => App.nouvelleEcole());
    $('n-examen').addEventListener('click', () => App.passerExamen());
    $('n-pastilles').innerHTML = Array.from({ length: CONFIG.neuro.examens }, (_, i) => `<i>${i + 1}</i>`).join('');

    // Mission 4
    $('e-orage').addEventListener('click', () => { App.colonie.orages.push(App.colonie.nouvelOrage(App.colonie.orages.length)); });
    $('e-reset').addEventListener('click', () => App.nouvelleColonie());
    $('e-genes').innerHTML = GENES.map((g) => `<div class="gene" style="--c:${g.couleur}"><span>${g.nom}</span><span id="ge-${g.id}">0</span><div class="piste"><i id="gb-${g.id}"></i></div></div>`).join('');

    window.addEventListener('keydown', (e) => this.clavier(e));
    this.rafraichir(true);
  },

  // ---------- Commandes ----------
  basculerPause(v = !App.pause) { App.pause = v; this.pauseIcone(v); },
  pauseIcone(v) { this.$('icone-pause').setAttribute('d', v ? 'M8 5l11 7-11 7z' : 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'); },
  regler(v) {
    App.vitesse = v;
    document.querySelectorAll('[data-vitesse]').forEach((b) => b.classList.toggle('actif', +b.dataset.vitesse === v));
  },
  epure() { App.epure = !App.epure; this.$('btn-afficher').textContent = App.epure ? 'Afficher la ville' : 'Vue épurée'; },
  aide(ouvrir = this.$('aide').hidden) { this.$('aide').hidden = !ouvrir; },
  panneau() {
    const ferme = document.body.classList.toggle('panneau-ferme');
    this.$('panneau-bouton').setAttribute('aria-expanded', String(!ferme));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 380);
  },

  bandeau(texte) {
    const b = this.$('bandeau');
    b.textContent = texte;
    b.classList.add('visible');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.remove('visible'), 4200);
  },

  clavier(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const intro = this.$('intro');
    if (!intro.hidden && !intro.classList.contains('masque')) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.$('intro-entrer').click(); }
      return;
    }
    const k = e.key.toLowerCase();
    const act = {
      1: () => App.changerMission(1), 2: () => App.changerMission(2), 3: () => App.changerMission(3), 4: () => App.changerMission(4),
      ' ': () => this.basculerPause(),
      r: () => { if (App.mission === 1) this.$('g-relancer').click(); else if (App.mission === 2) App.lancerVol(); else if (App.mission === 3) App.nouvelleEcole(); else App.nouvelleColonie(); },
      v: () => this.epure(),
      tab: () => this.panneau(),
      '?': () => this.aide(),
      escape: () => { if (!this.$('aide').hidden) this.aide(false); else { App.selection = null; this.rafraichir(true); } },
    }[k];
    if (!act) return;
    if (e.target.matches && e.target.matches('input[type=range]') && k === ' ') return;
    e.preventDefault();
    act();
  },

  // ---------- Rafraîchissement (5 fois par seconde) ----------
  rafraichir(force = false) {
    const $ = (id) => this.$(id);
    document.querySelectorAll('#onglets button').forEach((b) => b.classList.toggle('actif', +b.dataset.mission === App.mission));
    const m = App.mission;
    const km = (px) => `${Math.round(px)} px`;

    if (m === 1 && App.ga) {
      const ga = App.ga;
      $('g-gen').textContent = ga.generation;
      $('g-best').textContent = km(ga.meilleureLongueur);
      $('g-rand').textContent = km(App.gaAleatoire);
      const gain = (1 - ga.meilleureLongueur / App.gaAleatoire) * 100;
      $('g-gain').textContent = `−${gain.toFixed(0)} %`;
      $('g-etat').textContent = App.stagnation > 90 ? 'convergé' : 'en évolution';
      Rendu.courbe($('c-genetique'), [
        { valeurs: ga.historiqueMoyenne.slice(-200), couleur: '#64748b', epaisseur: 1.4 },
        { valeurs: ga.historique.slice(-200), couleur: '#38bdf8', epaisseur: 2.4 },
      ]);
    }

    if (m === 2) {
      const d = App.drones;
      const total = d.reduce((s, x) => s + x.etapes.length - 2, 0);
      const livres = d.reduce((s, x) => s + x.livres + (x.termine ? 1 : 0) * 0, 0);
      $('v-liv').textContent = `${livres} / ${total}`;
      $('v-dist').textContent = km(d.reduce((s, x) => s + x.distanceParcourue, 0));
      const pas = d.reduce((s, x) => s + x.pasVol, 0);
      $('v-ecart').textContent = `${(d.reduce((s, x) => s + x.sommeEcart, 0) / Math.max(1, pas)).toFixed(1)} px`;
      $('v-max').textContent = `${Math.max(0, ...d.map((x) => x.ecartMax)).toFixed(1)} px`;
      $('v-etat').textContent = d.length && d.every((x) => x.termine) ? 'terminé' : 'en vol';
    }

    if (m === 3 && App.ecole) {
      const e = App.ecole;
      $('n-gen').textContent = e.generationsEcoulees + 1;
      $('n-essai').textContent = `${e.essai} / ${CONFIG.neuro.essais}`;
      $('n-arr').textContent = e.derniereArrivee === undefined ? '—' : `${Math.round(e.derniereArrivee * 100)} %`;
      $('n-vol').textContent = e.enVol;
      $('n-etat').textContent = App.examen ? `examen ${App.examen.i + 1} / ${App.examen.terrains.length}` : App.turbo > 0 ? `turbo : ${App.turbo} restantes` : 'entraînement';
      const h = e.evo.historique;
      const maxF = Math.max(1, ...h.map((x) => x.meilleur));
      Rendu.courbe($('c-neuro'), [
        { valeurs: h.map((x) => (x.arrives ?? 0) * 100), couleur: '#4ade80', epaisseur: 2.4 },
        { valeurs: h.map((x) => (x.meilleur / maxF) * 100), couleur: '#38bdf8', epaisseur: 1.4 },
      ], { min: 0, max: 100 });
      App.vues.ecole.reseau($('c-reseau'), App.examen ? App.examen.reseau : (App.vedette ? App.vedette.cerveau : e.evo.meilleur));
      $('n-turbo').disabled = App.turbo > 0 || !!App.examen;
      $('n-examen').disabled = !!App.examen || e.generationsEcoulees < 1;
      const ex = App.examen;
      const pastilles = $('n-pastilles').children;
      for (let i = 0; i < pastilles.length; i++) {
        let c = '';
        if (ex) { if (i < ex.resultats.length) c = ex.resultats[i] ? 'ok' : 'ko'; else if (i === ex.i) c = 'en-cours'; }
        else if (e.dernierExamen && App.brevet) c = '';
        pastilles[i].className = c;
      }
      if (!ex && App.brevet && App.brevet.pastilles === undefined) { App.brevet.pastilles = true; }
      const b = App.brevet;
      $('n-brevet').innerHTML = b ? `<div class="brevet ${b.ok ? '' : 'echec'}"><strong>${b.ok ? 'BREVET DE PILOTAGE OBTENU' : 'EXAMEN NON RÉUSSI'}</strong>${b.reussites} terrains inconnus réussis sur ${b.total}, après ${b.generation} générations. ${b.ok ? 'Le pilote a appris à contourner des murs qu’il n’a jamais vus, sans carte.' : 'Entraînez encore quelques générations puis réessayez.'}</div>` : '';
      $('n-brevet-etat').textContent = b ? `${b.reussites} / ${b.total}` : '';
    }

    if (m === 4 && App.colonie) {
      const c = App.colonie;
      const s = Math.floor(c.temps / 60);
      $('e-temps').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      $('e-pop').textContent = c.vivants().length;
      $('e-gen').textContent = c.derniereGeneration;
      $('e-liv').textContent = c.totalLivraisons;
      $('e-morts').textContent = `${c.morts.batterie} / ${c.morts.orage}`;
      const moy = c.moyenneGenes();
      GENES.forEach((g, i) => {
        $(`ge-${g.id}`).textContent = moy[i] >= 100 ? moy[i].toFixed(0) : moy[i].toFixed(2);
        $(`gb-${g.id}`).style.width = `${(100 * (moy[i] - g.min)) / (g.max - g.min)}%`;
      });
      const hist = c.historique;
      Rendu.courbe($('c-genes'), GENES.filter((g) => g.id !== 'vue').map((g) => {
        const i = GENES.indexOf(g);
        return { valeurs: hist.map((h) => (h.genes[i] - g.min) / (g.max - g.min)), couleur: g.couleur, epaisseur: 1.6 };
      }), { min: 0, max: 1 });
      const s2 = App.selection;
      $('sel-info').innerHTML = !s2 ? 'Cliquez un drone pour lire son ADN, sa batterie et ses forces.'
        : s2.mort ? 'Ce drone est tombé en panne.'
          : `<b>Génération ${s2.generation}</b> · batterie ${Math.round(s2.niveau * 100)} % · ${s2.livraisons} livraisons · âge ${Math.floor(s2.age / 60)} s<br>`
            + Object.keys(s2.forces).map((k) => `<span class="terme" style="margin-right:4px">${k}</span>`).join('')
            + '<div class="genes" style="margin-top:8px">' + GENES.map((g, i) => `<div class="gene" style="--c:${g.couleur}"><span>${g.nom}</span><span>${s2.adn.valeurs[i].toFixed(2)}</span><div class="piste"><i style="width:${(100 * (s2.adn.valeurs[i] - g.min)) / (g.max - g.min)}%"></i></div></div>`).join('') + '</div>';
    }
  },
};
