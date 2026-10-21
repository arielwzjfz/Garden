/* The garth: a plan of a cloister garden after the Cuxa Cloister at
 * The Met Cloisters. A covered walk with a pink-marble arcade frames a lawn
 * cut into four beds by gravel paths, with an octagonal fountain at the
 * crossing. Units are a 1000 x 1000 plan. */
(function () {
  'use strict';

  const C = 500; // centre of the plan
  const GARTH = [118, 882]; // inner edge of the arcade
  const BED = [156, 480, 520, 844]; // outer/inner edges of the four beds
  const RING = 108; // gravel circle around the fountain cut into the beds

  // Each bed is a square with its inner corner cut by the fountain circle.
  function bedPath(sx, sy) {
    const o = BED[0];
    const i = BED[1];
    const cut = C - Math.sqrt(RING * RING - (C - i) * (C - i)); // where the circle meets the bed edge
    const X = (v) => (sx < 0 ? v : 1000 - v);
    const Y = (v) => (sy < 0 ? v : 1000 - v);
    const sweep = sx * sy > 0 ? 0 : 1;
    return `M${X(o)} ${Y(o)} L${X(i)} ${Y(o)} L${X(i)} ${Y(cut)} A${RING} ${RING} 0 0 ${sweep} ${X(cut)} ${Y(i)} L${X(o)} ${Y(i)} Z`;
  }
  const BEDS = [bedPath(-1, -1), bedPath(1, -1), bedPath(1, 1), bedPath(-1, 1)];

  function isPlantable(x, y) {
    const m = 8;
    const inA = (v) => (v > BED[0] + m && v < BED[1] - m) || (v > BED[2] + m && v < BED[3] - m);
    if (!inA(x) || !inA(y)) return false;
    return Math.hypot(x - C, y - C) > RING + m;
  }

  function randomSpot(rand) {
    for (let t = 0; t < 200; t++) {
      const x = BED[0] + rand() * (BED[3] - BED[0]);
      const y = BED[0] + rand() * (BED[3] - BED[0]);
      if (isPlantable(x, y)) return { x, y };
    }
    return { x: 300, y: 300 };
  }

  function arcade() {
    // paired colonnettes on a low parapet, with square piers at the corners
    const [a, b] = GARTH;
    const mid = a - 9;
    const bays = 9;
    const step = (b - a) / bays;
    let s = '';
    const sides = [
      (t) => [t, mid], (t) => [1000 - mid, t], (t) => [t, 1000 - mid], (t) => [mid, t],
    ];
    s += `<path d="M${a - 18} ${a - 18} H${b + 18} V${b + 18} H${a - 18} Z M${a} ${a} V${b} H${b} V${a} Z" fill="url(#parapet)" fill-rule="evenodd"/>`;
    s += `<path d="M${a} ${a} H${b} V${b} H${a} Z" fill="none" stroke="#a99c86" stroke-width="1.5"/>`;
    s += `<path d="M${a - 18} ${a - 18} H${b + 18} V${b + 18} H${a - 18} Z" fill="none" stroke="#efe7d8" stroke-width="1.2"/>`;
    for (const side of sides) {
      for (let k = 1; k < bays; k++) {
        const t = a + k * step;
        const [x, y] = side(t);
        const horiz = y === mid || y === 1000 - mid;
        const d = 6.5;
        const pts = horiz ? [[x - d, y], [x + d, y]] : [[x, y - d], [x, y + d]];
        for (const [px, py] of pts) {
          s += `<rect x="${px - 5.5}" y="${py - 5.5}" width="11" height="11" rx="1.5" fill="#d8b2a4" stroke="#b78e80" stroke-width=".8"/>`;
          s += `<circle cx="${px}" cy="${py}" r="4.2" fill="url(#marble)"/>`;
        }
      }
    }
    for (const [x, y] of [[mid, mid], [1000 - mid, mid], [1000 - mid, 1000 - mid], [mid, 1000 - mid]]) {
      s += `<rect x="${x - 15}" y="${y - 15}" width="30" height="30" fill="#cbbfab" stroke="#a99c86" stroke-width="1.2"/>`;
      s += `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" fill="none" stroke="#e8dfcf" stroke-width="1"/>`;
    }
    return s;
  }

  function archShadows() {
    // the sun stands in the south-east, so the north and west arcades
    // throw their arches onto the gravel walk
    const [a, b] = GARTH;
    const bays = 9;
    const step = (b - a) / bays;
    let n = `M${a} ${a} H${b} V${a + 20}`;
    for (let k = bays; k > 0; k--) {
      const x1 = a + k * step - 8;
      const x0 = a + (k - 1) * step + 8;
      n += ` L${x1} ${a + 20} L${x1} ${a + 34} A${(x1 - x0) / 2} ${(x1 - x0) / 2.4} 0 0 0 ${x0} ${a + 34} L${x0} ${a + 20}`;
    }
    n += ` L${a} ${a + 20} Z`;
    let w = `M${a} ${a} V${b} H${a + 20}`;
    for (let k = bays; k > 0; k--) {
      const y1 = a + k * step - 8;
      const y0 = a + (k - 1) * step + 8;
      w += ` L${a + 20} ${y1} L${a + 34} ${y1} A${(y1 - y0) / 2.4} ${(y1 - y0) / 2} 0 0 1 ${a + 34} ${y0} L${a + 20} ${y0}`;
    }
    w += ` L${a + 20} ${a} Z`;
    return `<g fill="#2a2416" opacity=".17"><path d="${n}"/><path d="${w}"/></g>`;
  }

  function fountain() {
    const oct = (r) => {
      const p = [];
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i * Math.PI) / 4;
        p.push(`${(C + Math.cos(a) * r).toFixed(1)},${(C + Math.sin(a) * r).toFixed(1)}`);
      }
      return p.join(' ');
    };
    return (
      `<circle cx="${C + 6}" cy="${C + 8}" r="66" fill="#2a2416" opacity=".18"/>` +
      `<polygon points="${oct(66)}" fill="#d9cfbd" stroke="#a99c86" stroke-width="1.5"/>` +
      `<polygon points="${oct(57)}" fill="#bfb29b"/>` +
      `<polygon points="${oct(54)}" fill="url(#water)"/>` +
      `<g class="ripples" fill="none" stroke="#e9f2f0" stroke-width="1.2">` +
      `<circle cx="${C}" cy="${C}" r="20"/><circle cx="${C}" cy="${C}" r="20" style="animation-delay:-1.6s"/><circle cx="${C}" cy="${C}" r="20" style="animation-delay:-3.2s"/></g>` +
      `<circle cx="${C}" cy="${C}" r="17" fill="#cfc4b0" stroke="#a99c86" stroke-width="1.2"/>` +
      `<circle cx="${C}" cy="${C}" r="11" fill="url(#water)"/>` +
      `<circle cx="${C}" cy="${C}" r="4" fill="#e9f2f0"/>`
    );
  }

  function pots() {
    // potted bay laurels on the gravel ring, as in the Cuxa garth each summer
    let s = '';
    const d = 84 / Math.SQRT2;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = C + sx * d;
      const y = C + sy * d;
      s += `<ellipse cx="${x + 5}" cy="${y + 7}" rx="19" ry="17" fill="url(#plantShadow)"/>`;
      s += `<circle cx="${x}" cy="${y}" r="15" fill="#b4623f" stroke="#8b4429" stroke-width="1.2"/>`;
      s += `<circle cx="${x}" cy="${y}" r="12.5" fill="#6b4a32"/>`;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        s += `<circle cx="${(x + Math.cos(a) * 6).toFixed(1)}" cy="${(y + Math.sin(a) * 6).toFixed(1)}" r="7" fill="${i % 2 ? '#3f5a2c' : '#4c6b34'}"/>`;
      }
      s += `<circle cx="${x - 2}" cy="${y - 2}" r="6" fill="#5f8243" opacity=".7"/>`;
    }
    return s;
  }

  function compass() {
    // north point and scale bar in the walk, like a measured plan
    return (
      `<g class="plan-marks" transform="translate(70 70)">` +
      `<circle r="20" fill="none" stroke="#6d6253" stroke-width="1"/>` +
      `<path d="M0 -17 L5 2 L0 -2 L-5 2 Z" fill="#4b4237"/><path d="M0 17 L5 -2 L0 2 L-5 -2 Z" fill="none" stroke="#4b4237" stroke-width=".8"/>` +
      `<text y="-24" text-anchor="middle">N</text></g>` +
      `<g class="plan-marks" transform="translate(800 934)">` +
      `<rect width="40" height="5" fill="#4b4237"/><rect x="40" width="40" height="5" fill="none" stroke="#4b4237"/>` +
      `<text x="0" y="-6">0</text><text x="80" y="-6" text-anchor="end">20 ft</text></g>`
    );
  }

  function scene() {
    const [a, b] = GARTH;
    const defs =
      window.Plants.DEFS +
      `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>` +
      `<feColorMatrix values="0 0 0 0 .14  0 0 0 0 .2  0 0 0 0 .06  1.7 0 0 0 -.55"/></filter>` +
      `<filter id="grainLight" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" seed="9"/>` +
      `<feColorMatrix values="0 0 0 0 .95  0 0 0 0 .92  0 0 0 0 .8  1.6 0 0 0 -.62"/></filter>` +
      `<filter id="mottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="2"/>` +
      `<feColorMatrix values="0 0 0 0 .2  0 0 0 0 .32  0 0 0 0 .08  0 0 0 -1.1 .9"/></filter>` +
      `<pattern id="flags" width="90" height="56" patternUnits="userSpaceOnUse">` +
      `<rect width="90" height="56" fill="#ddd4c3"/><path d="M0 .5 H90 M0 28.5 H90 M.5 0 V28 M45.5 28 V56" stroke="#bdb19c" stroke-width="1.2"/>` +
      `<rect x="3" y="3" width="40" height="22" fill="#e3dbcc"/><rect x="48" y="31" width="40" height="22" fill="#d6ccb9"/></pattern>` +
      `<pattern id="parapet" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#d3c8b4"/>` +
      `<path d="M0 15 H30 M15 0 V15" stroke="#bfb29b" stroke-width=".8"/></pattern>` +
      `<pattern id="mow" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
      `<rect width="28" height="56" fill="#fff" opacity=".045"/></pattern>` +
      `<radialGradient id="marble" cx=".35" cy=".35"><stop offset="0" stop-color="#f3d9cf"/><stop offset="1" stop-color="#c99486"/></radialGradient>` +
      `<radialGradient id="water" cx=".4" cy=".35"><stop offset="0" stop-color="#8fb9b3"/><stop offset=".7" stop-color="#4f8582"/><stop offset="1" stop-color="#386663"/></radialGradient>` +
      `<linearGradient id="sun" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff3c9" stop-opacity=".22"/><stop offset=".6" stop-color="#fff3c9" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="vignette" cx=".5" cy=".5" r=".72"><stop offset=".6" stop-color="#1c160e" stop-opacity="0"/><stop offset="1" stop-color="#1c160e" stop-opacity=".35"/></radialGradient>` +
      `<linearGradient id="walkShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3024" stop-opacity=".3"/><stop offset="1" stop-color="#3a3024" stop-opacity="0"/></linearGradient>` +
      `<clipPath id="bedClip">${BEDS.map((d) => `<path d="${d}"/>`).join('')}</clipPath>`;

    const walk = `M36 36 H964 V964 H36 Z M${a - 18} ${a - 18} V${b + 18} H${b + 18} V${a - 18} Z`;
    const wattle = BEDS.map((d) =>
      `<path d="${d}" fill="none" stroke="#5e4329" stroke-width="7" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="#9a7650" stroke-width="4" stroke-dasharray="7 4" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="#c49e70" stroke-width="1.2" stroke-dasharray="3 8" stroke-dashoffset="2"/>`
    ).join('');

    return (
      `<defs>${defs}</defs>` +
      `<rect width="1000" height="1000" fill="#8a7f6e"/>` +
      `<rect x="6" y="6" width="988" height="988" fill="none" stroke="#6f6557" stroke-width="2"/>` +
      `<path d="${walk}" fill="url(#flags)" fill-rule="evenodd"/>` +
      `<path d="${walk}" fill="#000" filter="url(#grainLight)" opacity=".5" fill-rule="evenodd"/>` +
      `<rect x="36" y="36" width="928" height="60" fill="url(#walkShade)"/>` +
      `<rect x="${a}" y="${a}" width="${b - a}" height="${b - a}" fill="#c8bb9f"/>` +
      `<rect x="${a}" y="${a}" width="${b - a}" height="${b - a}" filter="url(#grainLight)"/>` +
      `<rect x="${a}" y="${a}" width="${b - a}" height="${b - a}" filter="url(#grain)" opacity=".35"/>` +
      `<circle cx="${C}" cy="${C}" r="${RING}" fill="none" stroke="#b0a286" stroke-width="2"/>` +
      `<g clip-path="url(#bedClip)"><rect x="${BED[0]}" y="${BED[0]}" width="${BED[3] - BED[0]}" height="${BED[3] - BED[0]}" fill="#6e8a45"/>` +
      `<rect x="${BED[0]}" y="${BED[0]}" width="${BED[3] - BED[0]}" height="${BED[3] - BED[0]}" filter="url(#mottle)"/>` +
      `<rect x="${BED[0]}" y="${BED[0]}" width="${BED[3] - BED[0]}" height="${BED[3] - BED[0]}" filter="url(#grain)" opacity=".8"/>` +
      `<rect x="${BED[0]}" y="${BED[0]}" width="${BED[3] - BED[0]}" height="${BED[3] - BED[0]}" fill="url(#mow)"/></g>` +
      `<g class="bed-glow">${BEDS.map((d) => `<path d="${d}"/>`).join('')}</g>` +
      wattle +
      archShadows() +
      arcade() +
      fountain() +
      pots() +
      compass() +
      `<g id="plants"></g>` +
      `<g id="marks"></g>` +
      `<rect width="1000" height="1000" fill="url(#sun)" pointer-events="none"/>` +
      `<rect width="1000" height="1000" fill="url(#vignette)" pointer-events="none"/>` +
      `<rect class="dusk" width="1000" height="1000" pointer-events="none"/>` +
      `<g class="butterflies" pointer-events="none">` +
      `<g class="bfly b1"><path d="M0 0 C-6 -8 -12 -4 -9 2 C-7 6 -2 4 0 0 C2 4 7 6 9 2 C12 -4 6 -8 0 0Z" fill="#f1e3a2"/></g>` +
      `<g class="bfly b2"><path d="M0 0 C-6 -8 -12 -4 -9 2 C-7 6 -2 4 0 0 C2 4 7 6 9 2 C12 -4 6 -8 0 0Z" fill="#f4f1ea"/></g></g>`
    );
  }

  window.Garden = { scene, isPlantable, randomSpot, BEDS, size: 1000 };
})();
