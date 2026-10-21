/* The Garth: state, follower import, planting and the side panel. */
(function () {
  'use strict';

  const KEY = 'the-garth-v1';
  const $ = (s) => document.querySelector(s);
  const svg = $('#garden');
  svg.innerHTML = Garden.scene();
  const plantsLayer = $('#plants');
  const marksLayer = $('#marks');
  const BASE = 46; // plan units for a plant of size 1

  const SAMPLE = [
    'brother_anselm', 'hildegard.of.bingen', 'the.unicorn.hunt', 'illuminated.pages', 'cuxa.capitals',
    'scriptorium.notes', 'bonnefont.bees', 'quince_and_honey', 'saint.fiacre', 'vellum.and.ink',
    'trie.garden', 'fort.tryon.walks', 'gothic.arches', 'tapestry_threads', 'abbey.bells',
    'moss.on.stone', 'lark.at.vespers', 'herbarium.sheets', 'cloister.cat', 'rubrication',
    'belltower.doves', 'mead.and.manuscripts', 'a.book.of.hours', 'the.apothecary',
  ];

  // ---------- state ----------
  let state = load();

  function blank() {
    return { version: 1, followers: {}, lastSync: null, sample: false };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable */ }
    return null;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function seedSample() {
    state = blank();
    state.sample = true;
    const now = Date.now();
    SAMPLE.forEach((u, i) => {
      state.followers[u] = { u, followedAt: now - (SAMPLE.length - i) * 86400000 * 3, seenAt: now, status: 'active', sample: true };
    });
    const rand = mulberry(7);
    SAMPLE.slice(0, 17).forEach((u) => autoPlace(u, rand));
    state.followers['cloister.cat'].status = 'departed';
    save();
  }

  function mulberry(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const list = () => Object.values(state.followers);
  const planted = () => list().filter((p) => p.x != null);
  const seeds = () => list().filter((p) => p.x == null && p.status === 'active');

  // the drawn foliage reaches about 70% of the nominal box
  function plantRadius(u) {
    const id = Plants.identify(u);
    return BASE * id.species.size * id.jitter * 0.7;
  }

  // best-candidate sampling gives an even, natural scatter
  function autoPlace(u, rand) {
    rand = rand || Math.random;
    const others = planted();
    const r0 = plantRadius(u);
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < 40; i++) {
      const p = Garden.randomSpot(rand);
      let score = Infinity;
      for (const o of others) {
        const d = Math.hypot(o.x - p.x, o.y - p.y) - plantRadius(o.u) * 0.7 - r0 * 0.7;
        if (d < score) score = d;
      }
      if (score > bestScore) { bestScore = score; best = p; }
    }
    const f = state.followers[u];
    f.x = Math.round(best.x);
    f.y = Math.round(best.y);
    f.plantedAt = Date.now();
  }

  // ---------- reading follower lists ----------
  const VALID = /^[a-z0-9._]{1,30}$/i;
  function cleanName(s) {
    if (!s) return null;
    s = String(s).trim();
    const m = s.match(/instagram\.com\/(?:_u\/)?([A-Za-z0-9._]+)/);
    if (m) s = m[1];
    s = s.replace(/^@/, '').replace(/\/$/, '');
    return VALID.test(s) ? s.toLowerCase() : null;
  }

  function parseFollowers(text) {
    const out = new Map();
    const add = (u, t) => {
      u = cleanName(u);
      if (u && !out.has(u)) out.set(u, t || null);
    };
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const j = JSON.parse(trimmed);
      if (j && j.followers && !Array.isArray(j.followers) && j.version) throw new Error('backup');
      const arr = Array.isArray(j)
        ? j
        : j.relationships_followers || j.followers || Object.values(j).find(Array.isArray) || [];
      for (const item of arr) {
        if (typeof item === 'string') add(item);
        else if (item && Array.isArray(item.string_list_data)) {
          for (const s of item.string_list_data) add(s.value || item.title || s.href, s.timestamp ? s.timestamp * 1000 : null);
          if (!item.string_list_data.length) add(item.title);
        } else if (item) add(item.username || item.value || item.title || item.href, item.timestamp ? item.timestamp * 1000 : null);
      }
    } else if (/<a\s/i.test(trimmed)) {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');
      doc.querySelectorAll('a[href*="instagram.com"]').forEach((a) => add(a.getAttribute('href')));
    } else {
      trimmed.split(/[\r\n,;\t ]+/).forEach((s) => add(s));
    }
    return [...out].map(([u, t]) => ({ u, t }));
  }

  // A full list is a snapshot: anyone missing from it has unfollowed.
  function sync(entries, source, full) {
    if (state.sample) state = blank();
    const now = Date.now();
    const seen = new Set();
    let added = 0;
    let back = 0;
    for (const { u, t } of entries) {
      seen.add(u);
      const f = state.followers[u];
      if (!f) {
        state.followers[u] = { u, followedAt: t, seenAt: now, status: 'active' };
        added++;
      } else {
        if (f.status === 'departed') { f.status = 'active'; back++; }
        if (t && !f.followedAt) f.followedAt = t;
      }
    }
    let departed = 0;
    if (full) {
      for (const f of list()) {
        if (!seen.has(f.u) && f.status === 'active') { f.status = 'departed'; departed++; }
      }
    }
    state.lastSync = { at: now, source, added, departed, total: entries.length };
    save();
    render();
    const bits = [];
    bits.push(added ? `${added} new follower${added === 1 ? '' : 's'} arrived as seeds` : 'No new followers');
    if (back) bits.push(`${back} came back`);
    if (departed) bits.push(`${departed} unfollowed and went to seed`);
    toast(bits.join(' · ') + '.');
  }

  // Daily check: if the site serves a followers.json beside it, read it once a day.
  async function dailyCheck() {
    const today = new Date().toDateString();
    if (state.lastAuto === today) return;
    try {
      const res = await fetch('followers.json', { cache: 'no-store' });
      if (!res.ok) return;
      const entries = parseFollowers(await res.text());
      if (!entries.length) return;
      state.lastAuto = today;
      sync(entries, 'Daily check', true);
    } catch (e) { /* no feed published; manual import only */ }
  }

  // ---------- drawing ----------
  function plantMarkup(u, scale) {
    const id = Plants.identify(u);
    const s = scale || (BASE * id.species.size * id.jitter) / 48;
    return `<g transform="rotate(${id.rotation.toFixed(1)}) scale(${s.toFixed(3)})">${Plants.render(u)}</g>`;
  }

  let justPlanted = null;
  function drawPlants() {
    const ps = planted().sort((a, b) => plantRadius(a.u) - plantRadius(b.u) || a.y - b.y);
    // trees last so their canopies sit above the flowers
    ps.sort((a, b) => (Plants.identify(a.u).species.tree ? 1 : 0) - (Plants.identify(b.u).species.tree ? 1 : 0));
    plantsLayer.innerHTML = ps.map((p) =>
      `<g class="plant${p.status === 'departed' ? ' departed' : ''}${p.u === selectedPlant ? ' is-selected' : ''}" data-u="${p.u}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="@${p.u}, ${Plants.identify(p.u).species.name}">` +
      `<g class="${p.u === justPlanted ? 'grow' : ''}"${p.status === 'departed' ? ' filter="url(#wilt)"' : ''}>${plantMarkup(p.u)}</g></g>`
    ).join('');
    justPlanted = null;
  }

  function fmtDate(t) {
    if (!t) return null;
    return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }
  function miniPlant(u) {
    return `<svg class="mini" viewBox="-52 -52 104 104" aria-hidden="true">${plantMarkup(u, 1)}</svg>`;
  }

  let selectedSeed = null;
  let selectedPlant = null;

  function drawTray() {
    const items = seeds().sort((a, b) => (b.seenAt - a.seenAt) || ((b.followedAt || 0) - (a.followedAt || 0)));
    $('#trayCount').textContent = items.length;
    $('#plantAll').disabled = !items.length;
    $('#trayEmpty').hidden = items.length > 0;
    $('#trayList').innerHTML = items.map((p) => {
      const sp = Plants.identify(p.u).species;
      const when = fmtDate(p.followedAt);
      return `<li class="seed${p.u === selectedSeed ? ' is-selected' : ''}" data-u="${p.u}">` +
        `<span class="handle" title="Drag into a bed">${miniPlant(p.u)}</span>` +
        `<button class="seed-body" type="button" data-u="${p.u}">` +
        `<span class="seed-name">@${esc(p.u)}</span>` +
        `<span class="seed-meta">${esc(sp.name)}${Plants.isRare(sp) ? ' <em class="rare">rare</em>' : ''}${when ? ' · ' + when : ''}</span></button></li>`;
    }).join('');
  }

  function drawStats() {
    const ps = planted();
    const gone = list().filter((p) => p.status === 'departed').length;
    $('#statPlanted').textContent = ps.filter((p) => p.status === 'active').length;
    $('#statSeeds').textContent = seeds().length;
    $('#statGone').textContent = gone;
    const ls = state.lastSync;
    $('#lastSync').textContent = state.sample
      ? 'Showing a sample garden'
      : ls ? `Last checked ${fmtDate(ls.at)} · ${ls.source}` : 'No follower list yet';
    $('#sampleNote').hidden = !state.sample;
    const species = new Set(ps.map((p) => Plants.identify(p.u).species.id));
    $('#statSpecies').textContent = `${species.size} of ${Plants.SPECIES.length}`;
  }

  function drawDetail() {
    const el = $('#detail');
    const p = selectedPlant && state.followers[selectedPlant];
    if (!p) { el.hidden = true; return; }
    const id = Plants.identify(p.u);
    const sp = id.species;
    el.hidden = false;
    el.innerHTML =
      `<div class="detail-art">${miniPlant(p.u)}</div>` +
      `<div class="detail-text">` +
      `<p class="eyebrow">${p.status === 'departed' ? 'Gone to seed' : Plants.isRare(sp) ? 'A rare planting' : 'In the garth'}${p.sample ? ' · sample' : ''}</p>` +
      `<h2><a href="https://www.instagram.com/${encodeURIComponent(p.u)}/" target="_blank" rel="noopener">@${esc(p.u)}</a></h2>` +
      `<p class="species">${esc(sp.name)} <i>${esc(sp.latin)}</i></p>` +
      `<p class="lore">${esc(sp.lore)}</p>` +
      `<dl>` +
      (p.followedAt ? `<div><dt>Followed</dt><dd>${fmtDate(p.followedAt)}</dd></div>` : '') +
      (p.plantedAt ? `<div><dt>Planted</dt><dd>${fmtDate(p.plantedAt)}</dd></div>` : '') +
      `</dl>` +
      (p.status === 'departed' ? `<p class="gone-note">No longer follows you. The plant has faded.</p>` : '') +
      `<div class="row">` +
      `<button type="button" class="btn ghost" data-act="uproot">Return to tray</button>` +
      (p.status === 'departed' ? `<button type="button" class="btn ghost warn" data-act="compost">Compost</button>` : '') +
      `<button type="button" class="btn ghost" data-act="close">Close</button></div></div>`;
  }

  function drawMarks() {
    const p = selectedPlant && state.followers[selectedPlant];
    marksLayer.innerHTML = p && p.x != null
      ? `<circle class="halo" cx="${p.x}" cy="${p.y}" r="${(plantRadius(p.u) + 8).toFixed(1)}"/>`
      : '';
  }

  function drawHint() {
    const h = $('#hint');
    if (selectedSeed) {
      h.hidden = false;
      h.innerHTML = `Tap a spot in one of the four beds to plant <b>@${esc(selectedSeed)}</b> <button type="button" id="cancelPick" class="link">Cancel</button>`;
    } else h.hidden = true;
    svg.classList.toggle('is-planting', !!selectedSeed || (drag && drag.moved));
  }

  function render() {
    drawPlants();
    drawTray();
    drawStats();
    drawDetail();
    drawMarks();
    drawHint();
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
  }

  // ---------- pointer interaction ----------
  function toPlan(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return p.x >= 0 && p.y >= 0 && p.x <= 1000 && p.y <= 1000 ? p : null;
  }

  function plantAt(u, p) {
    const f = state.followers[u];
    f.x = Math.round(p.x);
    f.y = Math.round(p.y);
    if (!f.plantedAt) f.plantedAt = Date.now();
    justPlanted = u;
    selectedSeed = null;
    save();
    render();
  }

  let drag = null;
  const ghost = $('#ghost');

  document.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.seed .handle');
    const plant = e.target.closest('#plants .plant');
    if (handle) {
      drag = { kind: 'seed', u: handle.parentElement.dataset.u, x0: e.clientX, y0: e.clientY, moved: false };
    } else if (plant) {
      const f = state.followers[plant.dataset.u];
      drag = { kind: 'plant', u: f.u, el: plant, x0: e.clientX, y0: e.clientY, ox: f.x, oy: f.y, moved: false };
    } else return;
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });

  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      svg.classList.add('is-planting');
      if (drag.kind === 'seed') {
        ghost.innerHTML = miniPlant(drag.u);
        ghost.hidden = false;
      }
    }
    const p = toPlan(e);
    const ok = p && Garden.isPlantable(p.x, p.y);
    if (drag.kind === 'seed') {
      ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      ghost.classList.toggle('bad', !ok);
    } else if (p) {
      drag.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      drag.el.classList.toggle('bad', !ok);
      marksLayer.innerHTML = '';
    }
  });

  document.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    ghost.hidden = true;
    svg.classList.remove('is-planting');
    const p = toPlan(e);
    const ok = p && Garden.isPlantable(p.x, p.y);
    if (d.kind === 'seed') {
      if (d.moved) {
        if (ok) { plantAt(d.u, p); toast(`Planted @${d.u}.`); } else if (p) toast('Plant inside one of the four wattle-fenced beds.');
      } else pickSeed(d.u);
    } else {
      if (d.moved) {
        if (ok) {
          const f = state.followers[d.u];
          f.x = Math.round(p.x);
          f.y = Math.round(p.y);
          save();
        } else toast('That spot is path or stone. The plant went back to its bed.');
        selectedPlant = d.u;
        render();
      } else {
        selectedPlant = selectedPlant === d.u ? null : d.u;
        selectedSeed = null;
        render();
      }
    }
  });

  document.addEventListener('pointercancel', () => {
    drag = null;
    ghost.hidden = true;
    render();
  });

  svg.addEventListener('click', (e) => {
    if (!selectedSeed || e.target.closest('.plant')) return;
    const p = toPlan(e);
    if (p && Garden.isPlantable(p.x, p.y)) { const u = selectedSeed; plantAt(u, p); toast(`Planted @${u}.`); }
    else toast('Plant inside one of the four wattle-fenced beds.');
  });

  svg.addEventListener('keydown', (e) => {
    const plant = e.target.closest('.plant');
    if (plant && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      selectedPlant = plant.dataset.u;
      render();
    }
  });

  function pickSeed(u) {
    selectedSeed = selectedSeed === u ? null : u;
    selectedPlant = null;
    render();
  }

  // hover name tag
  const tag = $('#tag');
  svg.addEventListener('pointerover', (e) => {
    const plant = e.target.closest('.plant');
    if (!plant || drag) { tag.hidden = true; return; }
    const f = state.followers[plant.dataset.u];
    tag.textContent = '@' + f.u;
    tag.style.left = f.x / 10 + '%';
    tag.style.top = (f.y - plantRadius(f.u) - 6) / 10 + '%';
    tag.hidden = false;
  });
  svg.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.plant')) tag.hidden = true;
  });

  // ---------- panel controls ----------
  $('#trayList').addEventListener('click', (e) => {
    const b = e.target.closest('.seed-body');
    if (b) pickSeed(b.dataset.u);
  });

  document.addEventListener('click', (e) => {
    if (e.target.id === 'cancelPick') { selectedSeed = null; render(); }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const u = selectedPlant;
    const f = state.followers[u];
    if (act.dataset.act === 'close') selectedPlant = null;
    if (act.dataset.act === 'uproot' && f) {
      delete f.x; delete f.y; delete f.plantedAt;
      if (f.status === 'departed') { delete state.followers[u]; }
      selectedPlant = null;
      toast(`@${u} is back in the seed tray.`);
    }
    if (act.dataset.act === 'compost' && f) {
      delete state.followers[u];
      selectedPlant = null;
      toast(`@${u} was composted.`);
    }
    save();
    render();
  });

  $('#plantAll').addEventListener('click', () => {
    const s = seeds();
    s.forEach((p) => autoPlace(p.u));
    selectedSeed = null;
    save();
    render();
    toast(`Planted ${s.length} seed${s.length === 1 ? '' : 's'} across the beds.`);
  });

  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const entries = parseFollowers(await file.text());
      if (!entries.length) throw new Error('empty');
      sync(entries, file.name, true);
    } catch (err) {
      toast(err.message === 'backup'
        ? 'That file is a garden backup. Use “Restore a backup” instead.'
        : 'No usernames found. Choose followers_1.json from your Instagram download, or a list of usernames.');
    }
  });

  $('#addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#addName');
    const u = cleanName(input.value);
    if (!u) { toast('Usernames use letters, numbers, periods and underscores.'); return; }
    if (state.followers[u] && !state.sample) { toast(`@${u} is already in your garden.`); return; }
    if (state.sample) state = blank();
    state.followers[u] = { u, followedAt: Date.now(), seenAt: Date.now(), status: 'active' };
    input.value = '';
    save();
    render();
    toast(`@${u} arrived as a ${Plants.identify(u).species.name.toLowerCase()} seed.`);
  });

  $('#findForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#findName').value.trim().replace(/^@/, '').toLowerCase();
    if (!q) return;
    const hit = list().find((p) => p.u === q) || list().find((p) => p.u.includes(q));
    if (!hit) { toast(`No @${q} in the garden.`); return; }
    if (hit.x != null) { selectedPlant = hit.u; selectedSeed = null; }
    else { selectedSeed = hit.u; selectedPlant = null; }
    render();
    if (hit.x == null) {
      const li = document.querySelector(`.seed[data-u="${CSS.escape(hit.u)}"]`);
      if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else $('#scene').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  $('#clearSample').addEventListener('click', () => {
    state = blank();
    save();
    render();
    toast('The sample is cleared. Import your followers to start your garden.');
  });

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `garth-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#restoreFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const j = JSON.parse(await file.text());
      if (!j || !j.followers || Array.isArray(j.followers)) throw new Error('bad');
      state = j;
      save();
      selectedPlant = selectedSeed = null;
      render();
      toast('Garden restored from backup.');
    } catch (err) {
      toast('That file is not a garden backup.');
    }
  });

  const resetBtn = $('#resetBtn');
  resetBtn.addEventListener('click', () => {
    if (resetBtn.dataset.armed) {
      state = blank();
      save();
      selectedPlant = selectedSeed = null;
      render();
      delete resetBtn.dataset.armed;
      resetBtn.textContent = 'Clear the garden';
      toast('The garden is bare.');
    } else {
      resetBtn.dataset.armed = '1';
      resetBtn.textContent = 'Click again to clear everything';
      setTimeout(() => { delete resetBtn.dataset.armed; resetBtn.textContent = 'Clear the garden'; }, 4000);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { selectedSeed = null; selectedPlant = null; render(); }
  });

  // ---------- start ----------
  if (!state) seedSample();
  render();
  dailyCheck();
  setInterval(dailyCheck, 3 * 3600 * 1000);
})();
