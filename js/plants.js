/* Plants of the garth.
 * Every follower's username is hashed into a species, a color variant and a
 * seed, so the same person always grows into the same plant. Plants are drawn
 * top-down (like a garden plan) inside a box of radius ~50 centred on 0,0. */
(function () {
  'use strict';

  // Plants grown at The Met Cloisters' gardens, or close medieval cousins.
  const SPECIES = [
    { id: 'rose', name: 'Apothecary’s rose', latin: 'Rosa gallica ‘Officinalis’', weight: 7, size: 1.25,
      lore: 'The red rose of the medieval apothecary, dried for its scent and grown in nearly every monastery garden.',
      leaf: { type: 'round', count: [14, 20], len: 15, wid: 9, color: '#4f6b3a' },
      bloom: { type: 'rose', petals: 5, heads: [3, 5], len: 15, spread: 0.6, colors: ['#a8203a', '#c9466b', '#e07f9a', '#8e1830'] } },
    { id: 'lily', name: 'Madonna lily', latin: 'Lilium candidum', weight: 5, size: 1.05,
      lore: 'The white lily of Annunciation paintings, a sign of purity. Its bulbs also went into medieval salves.',
      leaf: { type: 'narrow', count: [10, 14], len: 36, wid: 5, color: '#5d7a3d' },
      bloom: { type: 'ring', petals: 6, shape: 'pointed', len: 22, wid: 8, heads: [1, 3], spread: 0.35,
        colors: ['#fbf8ef', '#f6f0e0'], center: { r: 4, color: '#e3b23c', stamens: '#b5651d' } } },
    { id: 'iris', name: 'Orris iris', latin: 'Iris germanica ‘Florentina’', weight: 5, size: 1.15,
      lore: 'Its dried root, orris, held perfumes and freshened linen. The fleur-de-lis is a stylized iris.',
      leaf: { type: 'sword', count: [7, 10], len: 46, wid: 6, color: '#5f7f63' },
      bloom: { type: 'iris', heads: [1, 3], len: 18, spread: 0.4, colors: ['#e9e6f3', '#8c79c4', '#5b4aa3', '#b6c2e6'] } },
    { id: 'violet', name: 'Sweet violet', latin: 'Viola odorata', weight: 8, size: 0.75,
      lore: 'The flower of humility, said to grow low so as not to be proud. Candied, it was eaten as a sweet.',
      leaf: { type: 'heart', count: [7, 10], len: 20, wid: 13, color: '#3f6234' },
      bloom: { type: 'ring', petals: 5, shape: 'heart', len: 9, wid: 6, heads: [4, 8], spread: 0.75,
        colors: ['#5b3b8c', '#7a4fb0', '#efeaf5'], center: { r: 2.2, color: '#f2c94c' } } },
    { id: 'columbine', name: 'Columbine', latin: 'Aquilegia vulgaris', weight: 5, size: 0.95,
      lore: 'Named for the dove, columba. Its spurred petals looked like doves drinking, and it stood for the Holy Spirit.',
      leaf: { type: 'lobed', count: [6, 9], len: 22, wid: 14, color: '#6c8a73' },
      bloom: { type: 'ring', petals: 5, shape: 'pointed', len: 14, wid: 7, heads: [3, 5], spread: 0.6,
        colors: ['#5a4a9e', '#8b5fa8', '#c05c8a', '#3e5aa8'], center: { r: 5, color: '#f3ecd2' } } },
    { id: 'foxglove', name: 'Foxglove', latin: 'Digitalis purpurea', weight: 4, size: 1.1,
      lore: 'Folk’s glove, the fairies’ flower. Its tall spikes of speckled bells are as handsome as they are poisonous.',
      leaf: { type: 'broad', count: [9, 12], len: 30, wid: 12, color: '#56723f' },
      bloom: { type: 'spike', spikes: [3, 5], len: 34, dot: 5, colors: ['#b04f8e', '#d27cb3', '#efe3ea'] } },
    { id: 'lavender', name: 'Lavender', latin: 'Lavandula angustifolia', weight: 6, size: 1.0,
      lore: 'Laid among linens and strewn on floors. Its name comes from lavare, to wash.',
      leaf: { type: 'needle', count: [26, 34], len: 26, wid: 2.2, color: '#8a9a7a' },
      bloom: { type: 'spike', spikes: [9, 14], len: 38, dot: 2.6, colors: ['#7c6bb5', '#9a86cc', '#6a5aa8'] } },
    { id: 'sage', name: 'Common sage', latin: 'Salvia officinalis', weight: 5, size: 1.0,
      lore: '“Why should a man die who has sage in his garden?” asked the physicians of Salerno.',
      leaf: { type: 'broad', count: [10, 14], len: 26, wid: 11, color: '#8fa08a' },
      bloom: { type: 'spike', spikes: [3, 6], len: 26, dot: 3.2, colors: ['#6f62b0', '#8a7bc8'] } },
    { id: 'calendula', name: 'Pot marigold', latin: 'Calendula officinalis', weight: 6, size: 0.9,
      lore: 'Mary’s gold. Its petals colored butter and cheese and went into the cooking pot.',
      leaf: { type: 'broad', count: [8, 12], len: 22, wid: 9, color: '#6a8a3e' },
      bloom: { type: 'ring', petals: 22, shape: 'strap', len: 13, wid: 3.2, heads: [2, 5], spread: 0.6,
        colors: ['#ef8a1f', '#f2a93b', '#e86a1a'], center: { r: 5, color: '#9a4b10' } } },
    { id: 'cornflower', name: 'Cornflower', latin: 'Centaurea cyanus', weight: 6, size: 0.85,
      lore: 'The blue weed of the grain fields. Its petals were ground into a blue for manuscript painters.',
      leaf: { type: 'narrow', count: [12, 18], len: 26, wid: 3, color: '#7a9278' },
      bloom: { type: 'ring', petals: 9, shape: 'fringe', len: 11, wid: 6, heads: [4, 8], spread: 0.7,
        colors: ['#3b68c4', '#4f7fe0', '#6a5aa8'], center: { r: 3.5, color: '#2b3e7a' } } },
    { id: 'poppy', name: 'Corn poppy', latin: 'Papaver rhoeas', weight: 5, size: 0.9,
      lore: 'A flower of sleep and of remembrance, scarlet among the barley.',
      leaf: { type: 'lobed', count: [6, 9], len: 22, wid: 10, color: '#7a9a5a' },
      bloom: { type: 'ring', petals: 4, shape: 'round', len: 16, wid: 13, heads: [2, 4], spread: 0.55,
        colors: ['#d7261e', '#e0412b', '#c81d25'], center: { r: 4, color: '#1f1a1a', stamens: '#2a2222' } } },
    { id: 'daisy', name: 'Day’s eye', latin: 'Bellis perennis', weight: 7, size: 0.75,
      lore: 'The day’s eye opens at dawn and closes at dusk. Margaret’s flower, in the medieval tongue.',
      leaf: { type: 'round', count: [8, 12], len: 12, wid: 8, color: '#4f7a3a' },
      bloom: { type: 'ring', petals: 18, shape: 'strap', len: 9, wid: 2.2, heads: [6, 11], spread: 0.8,
        colors: ['#ffffff', '#fde8ef'], tip: '#e27a9b', center: { r: 3.5, color: '#f2c230' } } },
    { id: 'peony', name: 'Peony', latin: 'Paeonia officinalis', weight: 4, size: 1.35,
      lore: 'The rose without thorns. Its seeds were strung into necklaces to ward off nightmares.',
      leaf: { type: 'lobed', count: [8, 11], len: 28, wid: 12, color: '#4c6b3c' },
      bloom: { type: 'rose', petals: 7, heads: [2, 3], len: 18, spread: 0.5, colors: ['#c2185b', '#e86b9a', '#f4c2d4'] } },
    { id: 'pink', name: 'Clove pink', latin: 'Dianthus caryophyllus', weight: 5, size: 0.8,
      lore: 'The gillyflower, scented of cloves. Sops-in-wine, the brewers called it.',
      leaf: { type: 'needle', count: [18, 24], len: 18, wid: 2, color: '#8fa6a0' },
      bloom: { type: 'ring', petals: 5, shape: 'fringe', len: 11, wid: 9, heads: [4, 7], spread: 0.7,
        colors: ['#e46a9a', '#d1416f', '#f5b8cf', '#f7f2f4'], center: { r: 2, color: '#8c1c3c' } } },
    { id: 'periwinkle', name: 'Periwinkle', latin: 'Vinca minor', weight: 5, size: 0.85,
      lore: 'The joy of the ground. Garlands of periwinkle crowned brides, and condemned prisoners.',
      leaf: { type: 'round', count: [14, 20], len: 13, wid: 7, color: '#2f5a2c' },
      bloom: { type: 'ring', petals: 5, shape: 'pinwheel', len: 10, wid: 7, heads: [5, 9], spread: 0.8,
        colors: ['#5a6fd1', '#6f7fe0'], center: { r: 2, color: '#f3f3ff' } } },
    { id: 'chamomile', name: 'Chamomile', latin: 'Chamaemelum nobile', weight: 6, size: 0.85,
      lore: 'Planted in turf seats and walked upon, for the more it is trodden the faster it grows.',
      leaf: { type: 'feathery', count: [14, 20], len: 22, wid: 5, color: '#7fa05a' },
      bloom: { type: 'ring', petals: 13, shape: 'strap', len: 7, wid: 2.2, heads: [9, 15], spread: 0.85,
        colors: ['#ffffff', '#f7f6ee'], center: { r: 3.5, color: '#e8b923' } } },
    { id: 'strawberry', name: 'Wild strawberry', latin: 'Fragaria vesca', weight: 5, size: 0.85,
      lore: 'A fruit of paradise in Netherlandish paintings: flower, leaf and berry all at once.',
      leaf: { type: 'trifoliate', count: [5, 7], len: 22, wid: 9, color: '#3f6a32' },
      bloom: { type: 'ring', petals: 5, shape: 'round', len: 6, wid: 5, heads: [3, 5], spread: 0.65,
        colors: ['#ffffff'], center: { r: 2.5, color: '#e2c43a' } },
      berries: { count: [3, 6], color: '#c8102e' } },
    { id: 'borage', name: 'Borage', latin: 'Borago officinalis', weight: 4, size: 0.95,
      lore: '“I, borage, bring always courage.” Its blue stars were floated in the cup.',
      leaf: { type: 'broad', count: [8, 11], len: 26, wid: 12, color: '#6f8a5f' },
      bloom: { type: 'ring', petals: 5, shape: 'pointed', len: 11, wid: 5, heads: [4, 7], spread: 0.65,
        colors: ['#3d6fd6', '#5b86e6', '#c6a0e0'], center: { r: 3, color: '#2a2440' } } },
    { id: 'rosemary', name: 'Rosemary', latin: 'Salvia rosmarinus', weight: 5, size: 1.0,
      lore: 'Rosemary, for remembrance. Sprigs were carried at weddings and laid in graves.',
      leaf: { type: 'needle', count: [40, 56], len: 30, wid: 1.8, color: '#4e6650' },
      bloom: { type: 'ring', petals: 5, shape: 'round', len: 3, wid: 2.5, heads: [10, 16], spread: 0.9,
        colors: ['#a9c3e8', '#c3d3ef'] } },
    { id: 'hellebore', name: 'Christmas rose', latin: 'Helleborus niger', weight: 2, size: 1.0,
      lore: 'Said to have sprung from a shepherd girl’s tears in the snow at Bethlehem. It flowers in midwinter.',
      leaf: { type: 'lobed', count: [6, 8], len: 30, wid: 9, color: '#2f4a2c' },
      bloom: { type: 'ring', petals: 5, shape: 'round', len: 15, wid: 12, heads: [2, 4], spread: 0.55,
        colors: ['#f4efe6', '#e9d6dc', '#7a2f4f'], center: { r: 5, color: '#d9d36a', stamens: '#c2b84a' } } },
    { id: 'mandrake', name: 'Mandrake', latin: 'Mandragora officinarum', weight: 1, size: 1.1,
      lore: 'Its forked root was said to shriek when pulled. Gardeners tied a dog to it and stood well back.',
      leaf: { type: 'broad', count: [8, 11], len: 34, wid: 15, color: '#4a6a2c' },
      bloom: { type: 'ring', petals: 5, shape: 'round', len: 8, wid: 6, heads: [5, 9], spread: 0.4,
        colors: ['#8a6ab8', '#a48ac9'], center: { r: 2, color: '#f0e6a0' } } },
    { id: 'quince', name: 'Quince tree', latin: 'Cydonia oblonga', weight: 1.2, size: 2.3, tree: true,
      lore: 'The golden apple of the ancients. The Bonnefont garden at the Cloisters still keeps quinces.',
      bloom: { colors: ['#f6d9df'] } },
  ];

  const BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
  const TOTAL_WEIGHT = SPECIES.reduce((a, s) => a + s.weight, 0);

  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function identify(username) {
    const h = hash(String(username).toLowerCase());
    const r = mulberry(h);
    let pick = r() * TOTAL_WEIGHT;
    let sp = SPECIES[0];
    for (const s of SPECIES) {
      pick -= s.weight;
      if (pick <= 0) { sp = s; break; }
    }
    const colors = (sp.bloom && sp.bloom.colors) || ['#fff'];
    return { species: sp, variant: Math.floor(r() * colors.length), seed: h, rotation: r() * 360, jitter: 0.9 + r() * 0.2 };
  }

  // ---- colour helpers ----
  function toRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(rgb) {
    return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function shade(hex, amt) {
    const c = toRgb(hex);
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    return toHex(c.map((v) => v + (t - v) * p));
  }

  const f = (n) => Math.round(n * 10) / 10;
  const between = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));

  // ---- leaves ----
  function leafShape(type, l, w, color, r) {
    const vein = shade(color, 0.25);
    switch (type) {
      case 'needle':
        return `<line x1="0" y1="0" x2="0" y2="${f(-l)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
      case 'sword':
        return `<path d="M${f(-w / 2)} 0 L${f(-w / 2)} ${f(-l * 0.82)} Q0 ${f(-l)} ${f(w / 2)} ${f(-l * 0.82)} L${f(w / 2)} 0Z" fill="${color}"/>` +
          `<line x1="0" y1="0" x2="0" y2="${f(-l * 0.85)}" stroke="${shade(color, -0.15)}" stroke-width="0.8"/>`;
      case 'round':
        return `<ellipse cx="0" cy="${f(-l / 2)}" rx="${f(w / 2)}" ry="${f(l / 2)}" fill="${color}"/>` +
          `<line x1="0" y1="${f(-l * 0.1)}" x2="0" y2="${f(-l * 0.85)}" stroke="${vein}" stroke-width="0.6" opacity=".7"/>`;
      case 'heart':
        return `<path d="M0 0 C${f(w * 0.9)} ${f(-l * 0.2)} ${f(w * 0.75)} ${f(-l * 1.05)} 0 ${f(-l * 0.82)} C${f(-w * 0.75)} ${f(-l * 1.05)} ${f(-w * 0.9)} ${f(-l * 0.2)} 0 0Z" fill="${color}"/>` +
          `<line x1="0" y1="0" x2="0" y2="${f(-l * 0.75)}" stroke="${vein}" stroke-width="0.7" opacity=".6"/>`;
      case 'lobed': {
        const leaflet = (a, s) =>
          `<path transform="rotate(${a}) scale(${s})" d="M0 0 C${f(w * 0.6)} ${f(-l * 0.3)} ${f(w * 0.5)} ${f(-l * 0.9)} 0 ${f(-l)} C${f(-w * 0.5)} ${f(-l * 0.9)} ${f(-w * 0.6)} ${f(-l * 0.3)} 0 0Z" fill="${color}"/>`;
        return leaflet(-28, 0.8) + leaflet(28, 0.8) + leaflet(0, 1) +
          `<line x1="0" y1="0" x2="0" y2="${f(-l * 0.8)}" stroke="${vein}" stroke-width="0.6" opacity=".6"/>`;
      }
      case 'trifoliate': {
        const stem = l * 0.45;
        const leaflet = (a) =>
          `<g transform="translate(0 ${f(-stem)}) rotate(${a})"><ellipse cx="0" cy="${f(-w * 0.8)}" rx="${f(w * 0.62)}" ry="${f(w * 0.85)}" fill="${color}"/>` +
          `<line x1="0" y1="0" x2="0" y2="${f(-w * 1.5)}" stroke="${vein}" stroke-width="0.5" opacity=".7"/></g>`;
        return `<line x1="0" y1="0" x2="0" y2="${f(-stem)}" stroke="${shade(color, -0.2)}" stroke-width="1.2"/>` +
          leaflet(-55) + leaflet(55) + leaflet(0);
      }
      case 'feathery': {
        let s = `<line x1="0" y1="0" x2="0" y2="${f(-l)}" stroke="${color}" stroke-width="1.2" stroke-linecap="round"/>`;
        for (let i = 1; i < 7; i++) {
          const y = -l * (i / 7.5);
          const k = w * (1 - i / 9);
          s += `<path d="M${f(-k)} ${f(y - k * 0.6)} L0 ${f(y)} L${f(k)} ${f(y - k * 0.6)}" stroke="${color}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
        }
        return s;
      }
      default: // broad / narrow
        return `<path d="M0 0 C${f(w * 0.75)} ${f(-l * 0.25)} ${f(w * 0.5)} ${f(-l * 0.85)} 0 ${f(-l)} C${f(-w * 0.5)} ${f(-l * 0.85)} ${f(-w * 0.75)} ${f(-l * 0.25)} 0 0Z" fill="${color}"/>` +
          `<line x1="0" y1="0" x2="0" y2="${f(-l * 0.9)}" stroke="${vein}" stroke-width="0.7" opacity=".55"/>`;
    }
  }

  function leaves(leaf, r) {
    const base = shade(leaf.color, (r() - 0.5) * 0.16);
    const n = between(r, leaf.count);
    const off = r() * 360;
    let s = '';
    // outer, darker tier then an inner, lighter tier for depth
    for (let i = 0; i < n; i++) {
      const a = off + (i * 360) / n + (r() - 0.5) * 18;
      const l = leaf.len * (0.82 + r() * 0.3);
      s += `<g transform="rotate(${f(a)}) translate(0 -2)">${leafShape(leaf.type, l, leaf.wid, shade(base, -0.12), r)}</g>`;
    }
    const m = Math.max(3, Math.round(n * 0.5));
    for (let i = 0; i < m; i++) {
      const a = off + 180 / n + (i * 360) / m + (r() - 0.5) * 20;
      const l = leaf.len * (0.55 + r() * 0.2);
      s += `<g transform="rotate(${f(a)})">${leafShape(leaf.type, l, leaf.wid * 0.9, shade(base, 0.1), r)}</g>`;
    }
    return s;
  }

  // ---- blooms ----
  function petalPath(shape, l, w) {
    switch (shape) {
      case 'round':
        return `M0 0 C${f(w)} ${f(-l * 0.15)} ${f(w)} ${f(-l)} 0 ${f(-l)} C${f(-w)} ${f(-l)} ${f(-w)} ${f(-l * 0.15)} 0 0Z`;
      case 'heart':
        return `M0 0 C${f(w)} ${f(-l * 0.2)} ${f(w)} ${f(-l * 1.05)} ${f(w * 0.25)} ${f(-l)} L0 ${f(-l * 0.85)} L${f(-w * 0.25)} ${f(-l)} C${f(-w)} ${f(-l * 1.05)} ${f(-w)} ${f(-l * 0.2)} 0 0Z`;
      case 'strap':
        return `M${f(-w / 2)} 0 L${f(-w / 2)} ${f(-l + w / 2)} A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(w / 2)} ${f(-l + w / 2)} L${f(w / 2)} 0Z`;
      case 'fringe': {
        let d = `M0 0 C${f(w)} ${f(-l * 0.3)} ${f(w)} ${f(-l * 0.75)} ${f(w * 0.8)} ${f(-l)}`;
        const teeth = 5;
        for (let i = 1; i <= teeth * 2; i++) {
          const x = w * 0.8 - (i * 1.6 * w) / (teeth * 2);
          const y = i % 2 ? -l * 0.86 : -l;
          d += ` L${f(x)} ${f(y)}`;
        }
        return d + ` C${f(-w)} ${f(-l * 0.75)} ${f(-w)} ${f(-l * 0.3)} 0 0Z`;
      }
      case 'pinwheel':
        return `M0 0 C${f(w * 1.2)} ${f(-l * 0.3)} ${f(w * 0.9)} ${f(-l)} ${f(-w * 0.1)} ${f(-l)} C${f(-w * 0.6)} ${f(-l * 0.8)} ${f(-w * 0.5)} ${f(-l * 0.3)} 0 0Z`;
      default: // pointed
        return `M0 0 C${f(w * 0.9)} ${f(-l * 0.35)} ${f(w * 0.35)} ${f(-l * 0.85)} 0 ${f(-l)} C${f(-w * 0.35)} ${f(-l * 0.85)} ${f(-w * 0.9)} ${f(-l * 0.35)} 0 0Z`;
    }
  }

  function ringHead(b, color, hs, r) {
    const n = b.petals;
    const l = b.len * hs;
    const w = b.wid * hs;
    const d = petalPath(b.shape, l, w);
    const off = r() * 360;
    const deep = shade(color, -0.28);
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = off + (i * 360) / n;
      s += `<g transform="rotate(${f(a)})">`;
      if (b.tip) {
        s += `<path d="${d}" fill="${b.tip}"/><path d="${d}" fill="${color}" transform="scale(.8)"/>`;
      } else {
        s += `<path d="${d}" fill="${color}"/>`;
      }
      s += `<path d="${d}" fill="${deep}" opacity=".35" transform="scale(.45)"/></g>`;
    }
    if (b.center) {
      s += `<circle r="${f(b.center.r * hs)}" fill="${b.center.color}"/>`;
      if (b.center.stamens) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + off;
          const rr = b.center.r * hs * 1.5;
          s += `<circle cx="${f(Math.cos(a) * rr)}" cy="${f(Math.sin(a) * rr)}" r="${f(0.9 * hs)}" fill="${b.center.stamens}"/>`;
        }
      }
      s += `<circle cx="${f(-b.center.r * hs * 0.3)}" cy="${f(-b.center.r * hs * 0.3)}" r="${f(b.center.r * hs * 0.35)}" fill="#fff" opacity=".25"/>`;
    }
    return s;
  }

  function roseHead(b, color, hs, r) {
    const L = b.len * hs;
    const rings = [1, 0.78, 0.56, 0.36];
    const off = r() * 360;
    let s = '';
    rings.forEach((rf, k) => {
      const n = k === 3 ? 4 : b.petals;
      const c = b.petals > 5 ? shade(color, k * 0.08) : shade(color, -k * 0.1);
      const d = petalPath('round', L * rf, L * rf * 0.72);
      for (let i = 0; i < n; i++) {
        s += `<path transform="rotate(${f(off + k * 36 + (i * 360) / n)})" d="${d}" fill="${c}" stroke="${shade(color, -0.3)}" stroke-width=".4" stroke-opacity=".5"/>`;
      }
    });
    const cc = shade(color, b.petals > 5 ? 0.3 : -0.35);
    s += `<circle r="${f(L * 0.2)}" fill="${cc}"/>`;
    s += `<path d="M0 0 m${f(L * 0.12)} 0 a${f(L * 0.12)} ${f(L * 0.12)} 0 1 1 ${f(-L * 0.18)} ${f(-L * 0.05)}" stroke="${shade(cc, -0.3)}" stroke-width=".7" fill="none"/>`;
    return s;
  }

  function irisHead(b, color, hs) {
    const L = b.len * hs;
    const fall = petalPath('round', L, L * 0.72);
    const std = petalPath('pointed', L * 0.7, L * 0.45);
    const light = shade(color, 0.35);
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += `<g transform="rotate(${i * 120})"><path d="${fall}" fill="${color}"/>` +
        `<path d="${fall}" fill="${shade(color, -0.25)}" opacity=".3" transform="scale(.6)"/>` +
        `<line x1="0" y1="${f(-L * 0.15)}" x2="0" y2="${f(-L * 0.6)}" stroke="#f2c94c" stroke-width="${f(1.8 * hs)}" stroke-linecap="round"/></g>`;
    }
    for (let i = 0; i < 3; i++) {
      s += `<path transform="rotate(${60 + i * 120})" d="${std}" fill="${light}"/>`;
    }
    return s + `<circle r="${f(2 * hs)}" fill="${shade(color, -0.2)}"/>`;
  }

  function spikes(b, color, r) {
    const n = between(r, b.spikes);
    const off = r() * 360;
    const light = shade(color, 0.3);
    let s = '';
    for (let k = 0; k < n; k++) {
      const a = ((off + (k * 360) / n + (r() - 0.5) * 20) * Math.PI) / 180;
      const len = b.len * (0.75 + r() * 0.35);
      const m = Math.max(4, Math.floor(len / (b.dot * 1.35)));
      for (let i = m - 1; i >= 0; i--) {
        const d = 5 + (i * (len - 5)) / m;
        const sz = b.dot * (1 - (i / m) * 0.55);
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        const c = i % 2 ? light : color;
        s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(sz)}" ry="${f(sz * 0.82)}" fill="${c}" transform="rotate(${f((a * 180) / Math.PI)} ${f(x)} ${f(y)})"/>`;
        if (b.dot > 4) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(sz * 0.3)}" fill="${shade(color, -0.4)}" opacity=".6"/>`;
      }
    }
    return s;
  }

  function berries(be, r) {
    const n = between(r, be.count);
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = 12 + r() * 20;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      s += `<path d="M${f(x)} ${f(y - 4)} C${f(x + 4)} ${f(y - 4)} ${f(x + 3)} ${f(y + 3)} ${f(x)} ${f(y + 4.5)} C${f(x - 3)} ${f(y + 3)} ${f(x - 4)} ${f(y - 4)} ${f(x)} ${f(y - 4)}Z" fill="${be.color}"/>` +
        `<circle cx="${f(x - 1.2)}" cy="${f(y - 1.5)}" r="1" fill="#fff" opacity=".55"/>`;
    }
    return s;
  }

  function tree(r) {
    let s = '<ellipse cx="9" cy="12" rx="50" ry="46" fill="url(#plantShadow)"/>';
    const greens = ['#4d6b34', '#5b7a3c', '#456230', '#678845'];
    const blobs = [];
    for (let i = 0; i < 11; i++) {
      const a = r() * Math.PI * 2;
      const d = i === 0 ? 0 : 12 + r() * 18;
      blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, rr: 15 + r() * 9, c: greens[Math.floor(r() * greens.length)] });
    }
    blobs.sort((a, b) => b.y - a.y);
    for (const b of blobs) s += `<circle cx="${f(b.x)}" cy="${f(b.y)}" r="${f(b.rr)}" fill="${shade(b.c, -0.1)}"/>`;
    for (const b of blobs) s += `<circle cx="${f(b.x - b.rr * 0.25)}" cy="${f(b.y - b.rr * 0.25)}" r="${f(b.rr * 0.6)}" fill="${shade(b.c, 0.18)}" opacity=".55"/>`;
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * 34;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        s += `<circle cx="${f(x + Math.cos(pa) * 1.6)}" cy="${f(y + Math.sin(pa) * 1.6)}" r="1.5" fill="#f6d9df"/>`;
      }
      s += `<circle cx="${f(x)}" cy="${f(y)}" r=".8" fill="#e3b23c"/>`;
    }
    const fruit = 3 + Math.floor(r() * 4);
    for (let i = 0; i < fruit; i++) {
      const a = r() * Math.PI * 2;
      const d = 8 + r() * 24;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="4.6" fill="#d9b333"/><circle cx="${f(x - 1.4)}" cy="${f(y - 1.4)}" r="1.6" fill="#fff2b0" opacity=".7"/>`;
    }
    return s;
  }

  const cache = new Map();

  function render(username) {
    if (cache.has(username)) return cache.get(username);
    const id = identify(username);
    const sp = id.species;
    const r = mulberry(id.seed ^ 0x9e3779b9);
    let s;
    if (sp.tree) {
      s = tree(r);
    } else {
      s = '<ellipse cx="5" cy="7" rx="46" ry="42" fill="url(#plantShadow)"/><circle r="34" fill="url(#soil)"/>';
      s += leaves(sp.leaf, r);
      const b = sp.bloom;
      const color = b.colors[id.variant % b.colors.length];
      if (b.type === 'spike') {
        s += spikes(b, color, r);
      } else {
        const n = between(r, b.heads);
        const off = r() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          let x = (r() - 0.5) * 6;
          let y = (r() - 0.5) * 6;
          if (n > 1) {
            const a = off + i * 2.39996;
            const d = b.spread * 40 * Math.sqrt((i + 0.5) / n);
            x = Math.cos(a) * d;
            y = Math.sin(a) * d;
          }
          const hs = 0.85 + r() * 0.3;
          const head = b.type === 'rose' ? roseHead(b, color, hs, r) : b.type === 'iris' ? irisHead(b, color, hs) : ringHead(b, color, hs, r);
          s += `<g transform="translate(${f(x)} ${f(y)})">${head}</g>`;
        }
      }
      if (sp.berries) s += berries(sp.berries, r);
    }
    cache.set(username, s);
    return s;
  }

  // Shared <defs> every plant drawing relies on; include once per document.
  const DEFS =
    '<radialGradient id="soil"><stop offset="0" stop-color="#4a3a26" stop-opacity=".85"/>' +
    '<stop offset=".75" stop-color="#5a4630" stop-opacity=".5"/><stop offset="1" stop-color="#5a4630" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="plantShadow"><stop offset="0" stop-color="#1d2a12" stop-opacity=".38"/>' +
    '<stop offset=".7" stop-color="#1d2a12" stop-opacity=".16"/><stop offset="1" stop-color="#1d2a12" stop-opacity="0"/></radialGradient>' +
    '<filter id="wilt" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' +
    '.5 .4 .1 0 .06  .42 .42 .1 0 .03  .3 .3 .1 0 0  0 0 0 .8 0"/></filter>';

  window.Plants = { SPECIES, BY_ID, identify, render, DEFS, rng: mulberry, isRare: (sp) => sp.weight <= 2 };
})();
