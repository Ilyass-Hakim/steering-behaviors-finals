// ui.js — l'interface : panneaux HTML autour du canevas. Elle lit le monde et règle ses
// paramètres, mais n'a aucun effet sur la physique (tout passe par monde.actifs et CONFIG).

const ETATS = {
  repos: 'Au gîte', sortie: 'Sortie', errance: 'Errance', chasse: 'Chasse', fuite: 'Fuite', retour: 'Retour',
};
const COULEUR_ETAT = {
  repos: '#8b93b3', sortie: '#a78bfa', errance: '#7dd3fc', chasse: '#f472b6', fuite: '#f87171', retour: '#facc15',
};
const COULEUR_PHASE = { crepuscule: '#a78bfa', nuit: '#38bdf8', aube: '#fbbf24', repos: '#64748b' };
const NOM_FORCE = {
  wander: 'Errance', avoid: 'Évitement', separation: 'Séparation', alignment: 'Alignement', cohesion: 'Cohésion',
  seek: 'Chercher', pursue: 'Poursuivre', evade: 'S’échapper', flee: 'Fuir', arrive: 'Arriver', contention: 'Contention',
};

const UI = {
  options: { ondes: true, viseurs: true, rayons: false, vecteurs: false, errance: false, chemin: false, lumiere: false },
  pause: false,
  vitesse: 1,
  selection: null,
  monde: null,
  actions: {},      // renseignées par sketch.js : nouvelleGrotte, ajusterNombre
  _dernierJournal: -1,

  $(id) { return document.getElementById(id); },

  init(monde, actions) {
    this.monde = monde;
    this.actions = actions;
    if (window.innerWidth <= 900) document.body.classList.add('panneau-ferme');
    this.construireFrise();
    this.construireComportements();
    this.brancher();
    this.rafraichir(true);
  },

  /** Appelé quand le monde est recréé (nouvelle grotte, nombre de chauves-souris) */
  changerMonde(monde) {
    this.monde = monde;
    this.selection = null;
    this._dernierJournal = -1;
    for (const [id, actif] of Object.entries(this._actifsMemoire || {})) monde.actifs[id] = actif;
    this.rafraichir(true);
  },

  // ---------- Construction ----------

  construireFrise() {
    const frise = this.$('frise');
    const parts = partsDePhases(CONFIG.cycle);
    frise.innerHTML = '';
    for (const [phase, part] of Object.entries(parts)) {
      const li = document.createElement('li');
      li.dataset.phase = phase;
      li.style.setProperty('--part', part.toFixed(2));
      li.style.setProperty('--couleur', COULEUR_PHASE[phase]);
      li.innerHTML = `<span class="nom">${PHASES[phase].label}</span><div class="barre"><div class="rempli"></div></div>`;
      frise.appendChild(li);
    }
    const repere = document.createElement('i');
    repere.className = 'hibou-repere';
    repere.hidden = true;
    frise.appendChild(repere);
    this._repere = repere;
  },

  construireComportements() {
    const liste = this.$('liste-comportements');
    liste.innerHTML = '';
    this._actifsMemoire = this._actifsMemoire || {};
    for (const c of CONFIG.comportements) {
      const li = document.createElement('li');
      li.className = 'comportement';
      li.dataset.id = c.id;
      li.style.setProperty('--c', CONFIG.couleurs[c.id]);
      li.innerHTML = `
        <span class="pastille"></span>
        <label class="nom" for="c-${c.id}">${c.nom}<em>${c.terme}</em></label>
        <span class="nombre" id="n-${c.id}">0</span>
        <label class="coche"><input type="checkbox" id="c-${c.id}" checked aria-label="Activer ${c.nom}"><span class="interrupteur"></span></label>
        <p class="detail"><b>${c.ou}.</b> ${c.texte}</p>
        <div class="usage"><i id="u-${c.id}"></i></div>`;
      liste.appendChild(li);
      li.querySelector('input').addEventListener('change', (e) => {
        const actif = e.target.checked;
        this._actifsMemoire[c.id] = actif;
        this.monde.actifs[c.id] = actif;
        li.classList.toggle('eteint', !actif);
        li.classList.toggle('inactif', !actif);
      });
    }
  },

  brancher() {
    const $ = (id) => this.$(id);
    const basculer = () => this.basculerPause();

    $('btn-pause').addEventListener('click', basculer);
    document.querySelectorAll('[data-vitesse]').forEach((b) => b.addEventListener('click', () => this.regler(+b.dataset.vitesse)));
    $('btn-phase').addEventListener('click', () => this.phaseSuivante());
    $('btn-hibou').addEventListener('click', () => this.monde.appelerHibou());
    $('btn-grotte').addEventListener('click', () => this.actions.nouvelleGrotte());
    $('btn-aide').addEventListener('click', () => this.aide());
    $('aide-fermer').addEventListener('click', () => this.aide(false));
    $('aide').addEventListener('click', (e) => { if (e.target.id === 'aide') this.aide(false); });
    $('panneau-bouton').addEventListener('click', () => this.panneau());

    const cases = { ondes: 'a-ondes', viseurs: 'a-viseurs', rayons: 'a-rayons', vecteurs: 'a-vecteurs', errance: 'a-errance', chemin: 'a-chemin', lumiere: 'a-lumiere' };
    for (const [cle, id] of Object.entries(cases)) {
      $(id).addEventListener('change', (e) => { this.options[cle] = e.target.checked; });
    }

    const curseur = (id, sortie, appliquer, format = (v) => v) => {
      const el = $(id);
      el.addEventListener('input', () => { $(sortie).textContent = format(+el.value); appliquer(+el.value); });
    };
    curseur('r-papillons', 'o-papillons', (v) => this.monde.ajusterPapillons(v));
    curseur('r-portee', 'o-portee', (v) => { SONAR.portee = v; });
    curseur('r-vitesse', 'o-vitesse', (v) => { for (const b of this.monde.chauvesSouris) b.vitesseBase = v; CONFIG.chauveSouris.vitesseMax = v; }, (v) => v.toFixed(1));
    // Le nombre de chauves-souris recrée le monde : on attend le relâchement du curseur.
    $('r-nombre').addEventListener('input', (e) => { $('o-nombre').textContent = e.target.value; });
    $('r-nombre').addEventListener('change', (e) => this.actions.ajusterNombre(+e.target.value));

    window.addEventListener('keydown', (e) => this.clavier(e));
  },

  // ---------- Actions ----------

  basculerPause(valeur = !this.pause) {
    this.pause = valeur;
    const b = this.$('btn-pause');
    this.$('icone-pause').setAttribute('d', valeur ? 'M8 5l11 7-11 7z' : 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z');
    b.setAttribute('aria-label', valeur ? 'Lecture' : 'Pause');
  },

  regler(v) {
    this.vitesse = v;
    document.querySelectorAll('[data-vitesse]').forEach((b) => b.classList.toggle('actif', +b.dataset.vitesse === v));
  },

  aller(phase) {
    const m = this.monde;
    if (m.cycle.forcer(phase)) m.surPhase(phase);
  },

  phaseSuivante() {
    const m = this.monde;
    this.aller(m.cycle.ordre[(m.cycle.indice + 1) % m.cycle.ordre.length]);
  },

  aide(ouvrir = this.$('aide').hidden) { this.$('aide').hidden = !ouvrir; },

  panneau() {
    const ferme = document.body.classList.toggle('panneau-ferme');
    this.$('panneau-bouton').setAttribute('aria-expanded', String(!ferme));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 380);
  },

  choisirOption(cle) {
    const id = { vecteurs: 'a-vecteurs', rayons: 'a-rayons', lumiere: 'a-lumiere' }[cle];
    const el = this.$(id);
    el.checked = !el.checked;
    this.options[cle] = el.checked;
  },

  selectionner(bat) {
    this.selection = bat;
    this.rafraichirInspecteur(true);
  },

  clavier(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!this.$('intro').classList.contains('masque') && !this.$('intro').hidden) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.$('intro-entrer').click(); }
      return;
    }
    const touche = e.key.toLowerCase();
    const actions = {
      ' ': () => this.basculerPause(),
      n: () => this.phaseSuivante(),
      1: () => this.aller('crepuscule'), 2: () => this.aller('nuit'), 3: () => this.aller('aube'),
      h: () => this.monde.appelerHibou(),
      v: () => this.choisirOption('vecteurs'), r: () => this.choisirOption('rayons'), l: () => this.choisirOption('lumiere'),
      g: () => this.actions.nouvelleGrotte(),
      tab: () => this.panneau(),
      '?': () => this.aide(),
      escape: () => { if (!this.$('aide').hidden) this.aide(false); else this.selectionner(null); },
    };
    const f = actions[touche];
    if (!f) return;
    if (e.target.matches && e.target.matches('input[type=range]') && touche === ' ') return;
    e.preventDefault();
    f();
  },

  // ---------- Rafraîchissement (~5 fois par seconde, pas à chaque image) ----------

  rafraichir(force = false) {
    const m = this.monde;
    const c = m.cycle;
    const $ = (id) => this.$(id);

    $('nuit-num').textContent = `Nuit n°${c.numeroNuit}`;
    $('phase-nom').textContent = c.label;
    $('phase-temps').textContent = `${formaterDuree(c.temps)} / ${formaterDuree(c.duree)}`;
    document.querySelectorAll('#frise li').forEach((li) => {
      const i = c.ordre.indexOf(li.dataset.phase);
      li.classList.toggle('fait', i < c.indice);
      li.classList.toggle('actuel', i === c.indice);
      li.querySelector('.rempli').style.width = i === c.indice ? `${(c.progression * 100).toFixed(1)}%` : '';
    });
    this.reperHibou();

    const comptes = compterComportements(m.entites());
    let actives = 0;
    const total = Math.max(1, m.chauvesSouris.length + m.papillons.length);
    for (const comp of CONFIG.comportements) {
      const n = m.actifs[comp.id] === false ? 0 : (comptes[comp.id] || 0);
      if (n > 0) actives++;
      $(`n-${comp.id}`).textContent = n;
      $(`u-${comp.id}`).style.width = `${Math.min(100, (100 * n) / total).toFixed(0)}%`;
    }
    $('comportements-total').textContent = `${actives} / ${CONFIG.comportements.length} en cours`;

    const rep = repartitionEtats(m.chauvesSouris);
    $('s-captures').textContent = m.stats.captures;
    $('s-echappes').textContent = m.stats.echappes;
    $('s-alertes').textContent = m.stats.alertes;
    $('s-gite').textContent = rep.repos || 0;
    $('s-chasse').textContent = rep.chasse || 0;
    $('btn-hibou').disabled = !!m.hibou;

    this.rafraichirJournal(force);
    this.rafraichirInspecteur(force);
  },

  reperHibou() {
    const m = this.monde;
    const c = m.cycle;
    const r = this._repere;
    if (c.phase !== 'nuit' || m.hibouPrevu === null || m.hibou) { r.hidden = true; return; }
    const parts = partsDePhases(CONFIG.cycle);
    const avant = parts.crepuscule;
    const frac = m.hibouPrevu / CONFIG.cycle.nuit;
    r.style.left = `${avant + parts.nuit * frac}%`;
    r.hidden = false;
  },

  rafraichirJournal(force) {
    const m = this.monde;
    const dernier = m.journal.length ? m.journal[m.journal.length - 1].t : -2;
    const cle = `${m.journal.length}:${dernier}`;
    if (!force && cle === this._dernierJournal) return;
    this._dernierJournal = cle;
    const liste = this.$('journal-liste');
    if (!m.journal.length) { liste.innerHTML = '<li><span class="vide">La nuit commence, tout est calme…</span></li>'; return; }
    const couleurs = { info: '#8b93b3', hibou: '#f87171', chasse: '#f472b6', echappe: '#2dd4bf', capture: '#f472b6', aube: '#fbbf24' };
    liste.innerHTML = m.journal.slice(-5).map((j) => `<li><i class="point" style="--c:${couleurs[j.type] || couleurs.info}"></i><span>${j.texte}</span><time>${formaterDuree(j.t)}</time></li>`).join('');
  },

  rafraichirInspecteur(force) {
    const b = this.selection;
    const corps = this.$('inspecteur-corps');
    const titre = this.$('inspecteur-titre');
    if (!b) {
      if (force || !corps.classList.contains('vide')) {
        corps.classList.add('vide');
        corps.innerHTML = '<p class="aide-texte">Cliquez sur une chauve-souris dans la grotte : ses rayons, son cercle d’errance et ses forces (une flèche par comportement) s’affichent, avec leur intensité ici.</p>';
        titre.textContent = 'cliquez une chauve-souris';
      }
      return;
    }
    corps.classList.remove('vide');
    titre.textContent = `Chauve-souris n°${b.id}`;
    const couleur = COULEUR_ETAT[b.etat] || '#fff';
    const vit = Math.hypot(b.vel.x, b.vel.y);
    const jauges = Object.entries(b.forces || {})
      .map(([nom, f]) => ({ nom, n: niveauForce(f) }))
      .sort((a, c) => c.n - a.n)
      .map(({ nom, n }) => `<div class="jauge" style="--c:${CONFIG.couleurs[nom] || '#fff'}"><span class="lib">${NOM_FORCE[nom] || nom}</span><span class="piste"><i style="width:${(n * 100).toFixed(0)}%"></i></span><span>${n.toFixed(2)}</span></div>`)
      .join('');
    corps.innerHTML = `
      <div class="insp-tete"><strong>${ETATS[b.etat] || b.etat}</strong><span class="badge" style="--c:${couleur}">${b.etat}</span></div>
      <dl class="insp-chiffres">
        <div><dt>Vitesse</dt><dd>${vit.toFixed(2)}</dd></div>
        <div><dt>Énergie</dt><dd>${Math.round((b.energie ?? 0) * 100)}%</dd></div>
        <div><dt>V. max</dt><dd>${(b.maxSpeed || 0).toFixed(1)}</dd></div>
      </dl>${jauges || '<p class="aide-texte">Au repos, aucune force.</p>'}`;
  },
};
