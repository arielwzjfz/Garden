/* A walk-around 3D view of the garth, built with three.js.
 * Same plan as the top-down view: plan units / 10 = world units, with the
 * fountain at the origin. Each plant is merged into one mesh with vertex
 * colours so hundreds of followers stay cheap to draw. */
(function () {
  'use strict';

  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const LIBS = ['build/three.min.js', 'examples/js/controls/OrbitControls.js', 'examples/js/utils/BufferGeometryUtils.js'];

  let T; // THREE
  let ready = null;
  let renderer, scene, camera, controls, host, plantGroup, ring, ripples = [], droplets = [], sun, hemi, lanterns = [];
  let running = false;
  let meshes = new Map(); // username -> mesh
  const W = (p) => (p - 500) / 10; // plan -> world

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  async function load() {
    if (!window.THREE) {
      await loadScript(CDN + LIBS[0]);
      await Promise.all(LIBS.slice(1).map((l) => loadScript(CDN + l)));
    }
    T = window.THREE;
  }

  // ---------- textures ----------
  function noiseTexture(base, specks, repeat, opts = {}) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    let seed = opts.seed || 3;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const [color, count, size] of specks) {
      g.fillStyle = color;
      for (let i = 0; i < count; i++) {
        const s = size * (0.5 + rand());
        if (opts.blades) g.fillRect(rand() * 256, rand() * 256, s * 0.35, s * 1.6);
        else g.fillRect(rand() * 256, rand() * 256, s, s);
      }
    }
    if (opts.flags) {
      g.strokeStyle = 'rgba(120,105,82,.55)';
      g.lineWidth = 2;
      for (let y = 0; y <= 256; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
      for (let row = 0; row < 4; row++) {
        for (let x = row % 2 ? 48 : 0; x <= 256; x += 96) { g.beginPath(); g.moveTo(x, row * 64); g.lineTo(x, row * 64 + 64); g.stroke(); }
      }
    }
    if (opts.weave) {
      for (let y = 0; y < 256; y += 16) {
        g.strokeStyle = y % 32 ? '#7a5a38' : '#9c7a52';
        g.lineWidth = 7;
        g.beginPath();
        for (let x = 0; x <= 256; x += 32) g.quadraticCurveTo(x + 8, y + (x % 64 ? 5 : -5), x + 16, y);
        g.stroke();
      }
      g.fillStyle = '#4e3822';
      for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 4, 256);
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    if ('colorSpace' in t) t.colorSpace = 'srgb'; else t.encoding = T.sRGBEncoding;
    return t;
  }

  const mat = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));

  // ---------- architecture ----------
  function box(w, h, d, m, x, y, z) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }

  function buildArchitecture() {
    const stone = mat({ map: noiseTexture('#d9d0bf', [['#c9bfac', 900, 3], ['#e6dfd2', 600, 2]], 6) });
    const wallStone = mat({ map: noiseTexture('#cfc4b0', [['#bdb19b', 900, 4], ['#ddd4c4', 500, 3]], 8) });
    const marble = mat({ color: '#e7c3b7', roughness: 0.45 });
    const roofMat = mat({ map: noiseTexture('#a65a3c', [['#8e4a30', 700, 5], ['#bd7150', 500, 4]], 10), roughness: 0.8 });
    const floor = mat({ map: noiseTexture('#ddd4c3', [['#cfc5b2', 800, 3]], 12, { flags: true }) });

    const A = 38.2; // half-width of the garth
    const OUT = 46.4; // inner face of the outer wall

    // walkway floor and outer ground
    const f = new T.Mesh(new T.PlaneGeometry(2 * OUT + 4, 2 * OUT + 4), floor);
    f.rotation.x = -Math.PI / 2;
    f.receiveShadow = true;
    scene.add(f);

    // outer walls with a cornice
    for (const [w, d, x, z] of [[2 * OUT + 4, 2, 0, -OUT - 1], [2 * OUT + 4, 2, 0, OUT + 1], [2, 2 * OUT + 4, -OUT - 1, 0], [2, 2 * OUT + 4, OUT + 1, 0]]) {
      scene.add(box(w, 10.5, d, wallStone, x, 5.25, z));
    }

    // low parapet the colonnettes stand on
    const PH = 1.1;
    const PT = 1.8;
    for (const s of [-1, 1]) {
      scene.add(box(2 * A + PT * 2, PH, PT, stone, 0, PH / 2, s * (A + PT / 2)));
      scene.add(box(PT, PH, 2 * A, stone, s * (A + PT / 2), PH / 2, 0));
    }

    // arcade: paired colonnettes with capitals carrying a run of round arches
    const bays = 9;
    const L = 2 * A;
    const bay = L / bays;
    const spring = 4.1;
    const top = 7.6;
    const pier = 0.75;
    const shape = new T.Shape();
    shape.moveTo(-PT, top);
    shape.lineTo(-PT, spring);
    for (let k = 0; k < bays; k++) {
      const a = k * bay;
      shape.lineTo(a + pier, spring);
      shape.absarc(a + bay / 2, spring, bay / 2 - pier, Math.PI, 0, true);
    }
    shape.lineTo(L + PT, spring);
    shape.lineTo(L + PT, top);
    shape.closePath();
    const archGeo = new T.ExtrudeGeometry(shape, { depth: PT, bevelEnabled: false, curveSegments: 14 });
    const colGeo = new T.CylinderGeometry(0.26, 0.3, spring - PH - 0.55, 10);
    const capGeo = new T.BoxGeometry(0.85, 0.55, 0.85);
    const baseGeo = new T.BoxGeometry(0.75, 0.22, 0.75);
    const capMat = mat({ color: '#efd7cc', roughness: 0.55 });

    for (let side = 0; side < 4; side++) {
      const g = new T.Group();
      const arch = new T.Mesh(archGeo, wallStone);
      arch.castShadow = arch.receiveShadow = true;
      g.add(arch);
      for (let k = 0; k <= bays; k++) {
        const u = k * bay;
        for (const zoff of [0.45, PT - 0.45]) {
          const c = new T.Mesh(colGeo, marble);
          c.position.set(u, PH + (spring - PH - 0.55) / 2, zoff);
          c.castShadow = true;
          g.add(c);
          const cap = new T.Mesh(capGeo, capMat);
          cap.position.set(u, spring - 0.27, zoff);
          cap.castShadow = true;
          g.add(cap);
          const b = new T.Mesh(baseGeo, capMat);
          b.position.set(u, PH + 0.11, zoff);
          g.add(b);
        }
      }
      // place the run along one side of the garth; local x runs along the side, z is the wall thickness
      const ang = [0, -Math.PI / 2, Math.PI, Math.PI / 2][side];
      g.rotation.y = ang;
      const pos = [[-A, 0, -A - PT], [A + PT, 0, -A], [A, 0, A + PT], [-A - PT, 0, A]][side];
      g.position.set(pos[0], pos[1], pos[2]);
      scene.add(g);
    }
    // corner piers
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      scene.add(box(PT + 0.6, top, PT + 0.6, wallStone, x * (A + PT / 2), top / 2, z * (A + PT / 2)));
    }

    // lean-to tiled roof from the outer wall down onto the arcade
    const span = OUT - A;
    const rise = 10.5 - top;
    const slope = Math.atan2(rise, span);
    const len = Math.hypot(span, rise) + 0.8;
    for (let side = 0; side < 4; side++) {
      const r = new T.Mesh(new T.BoxGeometry(2 * OUT + 2, 0.35, len), roofMat);
      r.castShadow = r.receiveShadow = true;
      const g = new T.Group();
      r.position.set(0, (top + 10.5) / 2 + 0.2, -(A + span / 2));
      r.rotation.x = slope;
      g.add(r);
      g.rotation.y = (side * Math.PI) / 2;
      scene.add(g);
    }
  }

  function bedOutline(sx, sy) {
    // mirrors garden.js bedPath, sampled into points (plan units)
    const o = 156, i = 480, C = 500, R = 108;
    const cut = C - Math.sqrt(R * R - (C - i) * (C - i));
    const X = (v) => (sx < 0 ? v : 1000 - v);
    const Y = (v) => (sy < 0 ? v : 1000 - v);
    const pts = [[o, o], [i, o], [i, cut]];
    const a0 = Math.atan2(cut - C, i - C);
    const a1 = Math.atan2(i - C, cut - C);
    for (let k = 1; k < 12; k++) {
      const a = a0 + ((a1 - a0) * k) / 12;
      pts.push([C + Math.cos(a) * R, C + Math.sin(a) * R]);
    }
    pts.push([cut, i], [o, i]);
    return pts.map(([x, y]) => [X(x), Y(y)]);
  }

  function buildGarth() {
    const gravel = mat({ map: noiseTexture('#c9bca0', [['#b3a586', 2200, 2], ['#ddd2bb', 1600, 2], ['#a29473', 600, 2]], 14) });
    const g = new T.Mesh(new T.PlaneGeometry(76.4, 76.4), gravel);
    g.rotation.x = -Math.PI / 2;
    g.position.y = 0.02;
    g.receiveShadow = true;
    scene.add(g);

    const lawn = mat({ map: noiseTexture('#6f8b45', [['#5d7a38', 2600, 3], ['#83a055', 1800, 3], ['#4f6b30', 900, 2]], 6, { blades: true }) });
    const wattle = mat({ map: noiseTexture('#6b4d30', [], 1, { weave: true }) });
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const pts = bedOutline(sx, sy);
      const shape = new T.Shape(pts.map(([x, y]) => new T.Vector2(W(x), -W(y))));
      const m = new T.Mesh(new T.ShapeGeometry(shape), lawn);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.06;
      m.receiveShadow = true;
      // world-space UVs so the grass texture tiles evenly
      const uv = m.geometry.attributes.uv;
      const p = m.geometry.attributes.position;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, p.getX(k) / 12, p.getY(k) / 12);
      scene.add(m);
      for (let k = 0; k < pts.length; k++) {
        const [x0, y0] = pts[k];
        const [x1, y1] = pts[(k + 1) % pts.length];
        const a = [W(x0), W(y0)];
        const b = [W(x1), W(y1)];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const seg = box(len + 0.25, 0.6, 0.28, wattle, (a[0] + b[0]) / 2, 0.3, (a[1] + b[1]) / 2);
        seg.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
        seg.material = wattle.clone();
        seg.material.map = wattle.map.clone();
        seg.material.map.repeat.set(len / 3, 0.25);
        seg.material.map.needsUpdate = true;
        scene.add(seg);
      }
    }

    // fountain
    const stone = mat({ color: '#d6ccba', roughness: 0.8 });
    const basin = new T.Mesh(new T.CylinderGeometry(6.6, 6.8, 1, 8), stone);
    basin.rotation.y = Math.PI / 8;
    basin.position.y = 0.5;
    basin.castShadow = basin.receiveShadow = true;
    scene.add(basin);
    const water = new T.Mesh(new T.CylinderGeometry(5.6, 5.6, 0.2, 8), mat({ color: '#4f8582', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 }));
    water.rotation.y = Math.PI / 8;
    water.position.y = 0.92;
    scene.add(water);
    const ped = new T.Mesh(new T.CylinderGeometry(0.9, 1.3, 1.8, 12), stone);
    ped.position.y = 1.6;
    ped.castShadow = true;
    scene.add(ped);
    const bowl = new T.Mesh(new T.CylinderGeometry(1.9, 1.1, 0.5, 16), stone);
    bowl.position.y = 2.6;
    bowl.castShadow = true;
    scene.add(bowl);
    const bowlWater = new T.Mesh(new T.CylinderGeometry(1.65, 1.65, 0.05, 16), water.material);
    bowlWater.position.y = 2.84;
    scene.add(bowlWater);
    buildSeal();

    const ringMat = new T.MeshBasicMaterial({ color: '#e9f2f0', transparent: true, opacity: 0.6 });
    for (let k = 0; k < 3; k++) {
      const r = new T.Mesh(new T.RingGeometry(1.6, 1.75, 40), ringMat.clone());
      r.rotation.x = -Math.PI / 2;
      r.position.y = 1.03;
      r.userData.phase = k / 3;
      ripples.push(r);
      scene.add(r);
    }
    const dropMat = new T.MeshBasicMaterial({ color: '#eef6f4', transparent: true, opacity: 0.85 });
    const dropGeo = new T.SphereGeometry(0.07, 6, 4);
    for (let k = 0; k < 24; k++) {
      const d = new T.Mesh(dropGeo, dropMat);
      d.userData.phase = k / 24;
      d.userData.side = k % 2 ? 1 : -1;
      droplets.push(d);
      scene.add(d);
    }

    // potted bay laurels on the gravel ring
    const pot = mat({ color: '#b4623f', roughness: 0.85 });
    const bay = mat({ color: '#45632f' });
    const trunk = mat({ color: '#6b4a32' });
    const dd = 8.4 / Math.SQRT2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = sx * dd, z = sz * dd;
      const p = new T.Mesh(new T.CylinderGeometry(1.3, 1.0, 1.5, 14), pot);
      p.position.set(x, 0.75, z);
      p.castShadow = true;
      scene.add(p);
      const t = new T.Mesh(new T.CylinderGeometry(0.12, 0.15, 1.6, 6), trunk);
      t.position.set(x, 2.2, z);
      scene.add(t);
      const ball = new T.Mesh(new T.IcosahedronGeometry(1.35, 1), bay);
      ball.position.set(x, 3.6, z);
      ball.castShadow = true;
      scene.add(ball);
    }
  }

  function buildSeal() {
    // @app_making_seal's emblem, carved in grey stone, nose to the sky
    const m = mat({ color: '#9a968e', roughness: 0.6 });
    const g = new T.Group();
    const body = new T.Mesh(new T.SphereGeometry(0.55, 16, 12), m);
    body.scale.set(1, 1.5, 0.9);
    body.position.y = 0.6;
    g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.4, 16, 12), m);
    head.position.set(0, 1.45, 0.12);
    g.add(head);
    const snout = new T.Mesh(new T.SphereGeometry(0.2, 12, 8), m);
    snout.position.set(0, 1.62, 0.42);
    g.add(snout);
    const eye = mat({ color: '#2f2c28', roughness: 0.3 });
    for (const s of [-1, 1]) {
      const e = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), eye);
      e.position.set(s * 0.17, 1.6, 0.42);
      g.add(e);
      const fl = new T.Mesh(new T.SphereGeometry(0.3, 10, 6), m);
      fl.scale.set(1.2, 0.25, 0.6);
      fl.position.set(s * 0.55, 0.45, 0.25);
      fl.rotation.z = s * 0.5;
      g.add(fl);
    }
    const tail = new T.Mesh(new T.SphereGeometry(0.3, 10, 6), m);
    tail.scale.set(1.3, 0.25, 0.6);
    tail.position.set(0, 0.12, -0.55);
    g.add(tail);
    g.traverse((o) => { o.castShadow = true; });
    g.position.y = 2.8;
    g.rotation.y = Math.PI * 0.25;
    scene.add(g);
  }

  // ---------- plants ----------
  const HEIGHT = {
    rose: 1.7, lily: 2.1, iris: 1.6, violet: 0.35, columbine: 1.1, foxglove: 2.4, lavender: 1.1, sage: 0.9,
    calendula: 0.8, cornflower: 1.1, poppy: 1.0, daisy: 0.3, peony: 1.3, pink: 0.7, periwinkle: 0.3,
    chamomile: 0.5, strawberry: 0.35, borage: 1.0, rosemary: 1.3, hellebore: 0.6, mandrake: 0.5, quince: 6,
  };

  let base = null;
  function bases() {
    if (base) return base;
    base = {
      sphere: new T.SphereGeometry(1, 8, 6),
      lowSphere: new T.IcosahedronGeometry(1, 1),
      stem: new T.CylinderGeometry(1, 1, 1, 5, 1, true).translate(0, 0.5, 0),
    };
    return base;
  }

  function piece(list, geo, color, pos, rot, scale) {
    const g = geo.clone();
    const m = new T.Matrix4().compose(
      new T.Vector3(pos[0], pos[1], pos[2]),
      new T.Quaternion().setFromEuler(new T.Euler(rot[0], rot[1], rot[2], 'YXZ')),
      new T.Vector3(scale[0], scale[1], scale[2])
    );
    g.applyMatrix4(m);
    const c = new T.Color(color);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(arr, 3));
    if (g.index) list.push(g.toNonIndexed()); else list.push(g);
  }

  function shade(hex, amt) {
    const c = new T.Color(hex);
    const t = amt < 0 ? new T.Color(0, 0, 0) : new T.Color(1, 1, 1);
    return '#' + c.lerp(t, Math.abs(amt)).getHexString();
  }

  function stemTo(list, from, to, r, color) {
    const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
    const len = Math.hypot(dx, dy, dz);
    const yaw = Math.atan2(dx, dz);
    const pitch = Math.acos(dy / len);
    piece(list, bases().stem, color, from, [pitch, yaw, 0], [r, len, r]);
  }

  function headAt(list, b, color, p, s, r) {
    const B = bases();
    if (b.type === 'rose') {
      piece(list, B.lowSphere, shade(color, -0.15), p, [0, 0, 0], [s * 0.55, s * 0.45, s * 0.55]);
      const n = b.petals;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        piece(list, B.sphere, color, [p[0] + Math.cos(a) * s * 0.45, p[1], p[2] + Math.sin(a) * s * 0.45], [-0.5, -a + Math.PI / 2, 0], [s * 0.45, s * 0.12, s * 0.35]);
      }
      return;
    }
    if (b.type === 'iris') {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        piece(list, B.sphere, color, [p[0] + Math.cos(a) * s * 0.5, p[1] - s * 0.15, p[2] + Math.sin(a) * s * 0.5], [0.5, -a + Math.PI / 2, 0], [s * 0.32, s * 0.06, s * 0.55]);
        const a2 = a + Math.PI / 3;
        piece(list, B.sphere, shade(color, 0.3), [p[0] + Math.cos(a2) * s * 0.18, p[1] + s * 0.35, p[2] + Math.sin(a2) * s * 0.18], [-1.1, -a2 + Math.PI / 2, 0], [s * 0.22, s * 0.05, s * 0.42]);
      }
      return;
    }
    const n = Math.min(b.petals, 16);
    const l = s * 0.5;
    const w = Math.max(s * 0.12, (s * b.wid) / b.len * 0.5);
    const cup = b.shape === 'pointed' && b.petals === 6 ? -0.7 : -0.25; // lilies flare as trumpets
    const off = r() * Math.PI;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      const c = b.tip && i % 2 ? b.tip : color;
      piece(list, B.sphere, c, [p[0] + Math.cos(a) * l, p[1], p[2] + Math.sin(a) * l], [cup, -a + Math.PI / 2, 0], [w, s * 0.05, l]);
    }
    if (b.center) piece(list, B.sphere, b.center.color, [p[0], p[1] + s * 0.05, p[2]], [0, 0, 0], [s * 0.18 * (b.center.r / 3 + 0.5), s * 0.12, s * 0.18 * (b.center.r / 3 + 0.5)]);
  }

  function buildPlant(u, departed) {
    const B = bases();
    const id = Plants.identify(u);
    const sp = id.species;
    const r = Plants.rng(id.seed ^ 0x51ed270b);
    const R = (window.GarthApp.radius(u) / 10) * 1.25; // footprint radius
    const H = (HEIGHT[sp.id] || 1) * id.jitter * (sp.tree ? 1 : 1.7); // flowers drawn larger than life so they read across the garth
    const list = [];

    if (sp.tree) {
      piece(list, B.stem, '#5e4632', [0, 0, 0], [0, 0, 0], [0.32, H * 0.5, 0.32]);
      for (let k = 0; k < 3; k++) {
        const a = r() * Math.PI * 2;
        stemTo(list, [0, H * 0.4, 0], [Math.cos(a) * R * 0.5, H * 0.65, Math.sin(a) * R * 0.5], 0.14, '#5e4632');
      }
      const greens = ['#4d6b34', '#5b7a3c', '#456230', '#678845'];
      for (let k = 0; k < 10; k++) {
        const a = r() * Math.PI * 2;
        const d = k === 0 ? 0 : R * (0.25 + r() * 0.45);
        const rr = R * (0.32 + r() * 0.14);
        piece(list, B.lowSphere, greens[k % 4], [Math.cos(a) * d, H * (0.62 + r() * 0.25), Math.sin(a) * d], [0, r() * 6, 0], [rr, rr * 0.8, rr]);
      }
      for (let k = 0; k < 26; k++) {
        const a = r() * Math.PI * 2;
        const d = R * 0.85 * Math.sqrt(r());
        const y = H * (0.68 + r() * 0.3);
        if (k < 6) piece(list, B.sphere, '#d9b333', [Math.cos(a) * d, y - 0.3, Math.sin(a) * d], [0, 0, 0], [0.32, 0.36, 0.32]);
        else piece(list, B.sphere, '#f6d9df', [Math.cos(a) * d, y + 0.25, Math.sin(a) * d], [0, 0, 0], [0.16, 0.1, 0.16]);
      }
    } else {
      const leaf = sp.leaf;
      const lc = shade(leaf.color, (r() - 0.5) * 0.16);
      const nLeaves = Math.min(leaf.type === 'needle' ? 34 : 14, Math.round((leaf.count[0] + leaf.count[1]) / 2));
      const leafLen = R * Math.min(1, leaf.len / 34) * 0.85;
      for (let i = 0; i < nLeaves; i++) {
        const a = (i / nLeaves) * Math.PI * 2 + r() * 0.4;
        const cl = i % 2 ? lc : shade(lc, -0.12);
        if (leaf.type === 'needle' || leaf.type === 'sword' || leaf.type === 'narrow') {
          const tilt = leaf.type === 'sword' ? 0.25 + r() * 0.2 : 0.35 + r() * 0.45;
          const len = (leaf.type === 'sword' ? H * 0.75 : Math.max(leafLen, H * 0.6)) * (0.75 + r() * 0.35);
          const tip = [Math.cos(a) * Math.sin(tilt) * len, Math.cos(tilt) * len, Math.sin(a) * Math.sin(tilt) * len];
          if (leaf.type === 'needle') stemTo(list, [0, 0, 0], tip, 0.05, cl);
          else piece(list, B.sphere, cl, [tip[0] / 2, tip[1] / 2, tip[2] / 2], [tilt, -a + Math.PI / 2, 0], [leaf.type === 'sword' ? 0.16 : 0.09, 0.02, len / 2]);
        } else {
          const l = leafLen * (0.7 + r() * 0.4);
          const w = l * Math.min(0.75, leaf.wid / leaf.len + 0.15);
          piece(list, B.sphere, cl, [Math.cos(a) * l * 0.55, 0.12 + r() * 0.12, Math.sin(a) * l * 0.55], [-0.2 - r() * 0.25, -a + Math.PI / 2, 0], [w * 0.5, 0.04, l * 0.55]);
        }
      }
      if (sp.id === 'rose' || sp.id === 'peony' || sp.id === 'sage' || sp.id === 'rosemary') {
        for (let k = 0; k < 6; k++) {
          const a = r() * Math.PI * 2;
          const d = R * 0.35 * r();
          const rr = R * (0.3 + r() * 0.12);
          piece(list, B.lowSphere, shade(lc, (r() - 0.5) * 0.2), [Math.cos(a) * d, H * 0.4, Math.sin(a) * d], [0, r() * 6, 0], [rr, H * 0.35, rr]);
        }
      }

      const b = sp.bloom;
      const color = b.colors[id.variant % b.colors.length];
      if (b.type === 'spike') {
        const n = Math.min(10, b.spikes[0] + Math.floor(r() * (b.spikes[1] - b.spikes[0] + 1)));
        for (let k = 0; k < n; k++) {
          const a = r() * Math.PI * 2;
          const d = R * 0.25 * Math.sqrt(r());
          const lean = 0.08 + r() * 0.18;
          const h = H * (0.8 + r() * 0.3);
          const top = [Math.cos(a) * (d + Math.sin(lean) * h), h, Math.sin(a) * (d + Math.sin(lean) * h)];
          const foot = [Math.cos(a) * d, 0, Math.sin(a) * d];
          stemTo(list, foot, top, 0.04, shade(lc, -0.1));
          const m = b.dot > 4 ? 9 : 7;
          for (let i = 0; i < m; i++) {
            const t = 0.45 + (i / m) * 0.55;
            const sz = (b.dot > 4 ? 0.2 : 0.11) * (1.1 - (i / m) * 0.6) * (H / 1.2 + 0.4);
            const p = [foot[0] + (top[0] - foot[0]) * t, foot[1] + (top[1] - foot[1]) * t, foot[2] + (top[2] - foot[2]) * t];
            piece(list, B.sphere, i % 2 ? shade(color, 0.25) : color, p, [0, 0, 0], [sz, sz * 1.3, sz]);
          }
        }
      } else {
        const n = Math.min(12, b.heads[0] + Math.floor(r() * (b.heads[1] - b.heads[0] + 1)));
        const s = Math.max(0.25, R * 0.42 * Math.min(1.1, b.len / 15));
        for (let i = 0; i < n; i++) {
          const a = i * 2.39996 + r();
          const d = n > 1 ? b.spread * R * 0.7 * Math.sqrt((i + 0.5) / n) : 0;
          const h = H * (0.75 + r() * 0.35);
          const p = [Math.cos(a) * d, h, Math.sin(a) * d];
          stemTo(list, [Math.cos(a) * d * 0.4, 0, Math.sin(a) * d * 0.4], p, 0.04, shade(lc, -0.1));
          headAt(list, b, color, p, s * (0.85 + r() * 0.3), r);
        }
      }
      if (sp.berries) {
        for (let k = 0; k < 5; k++) {
          const a = r() * Math.PI * 2;
          const d = R * (0.2 + r() * 0.5);
          piece(list, B.sphere, sp.berries.color, [Math.cos(a) * d, 0.18, Math.sin(a) * d], [0, 0, 0], [0.13, 0.16, 0.13]);
        }
      }
    }

    const geo = T.BufferGeometryUtils.mergeBufferGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (departed) {
      // faded: wash colours toward dry straw and droop
      const c = geo.attributes.color;
      const straw = new T.Color('#9c8a64');
      const tmp = new T.Color();
      for (let i = 0; i < c.count; i++) {
        tmp.setRGB(c.getX(i), c.getY(i), c.getZ(i)).lerp(straw, 0.65);
        c.setXYZ(i, tmp.r, tmp.g, tmp.b);
      }
      geo.scale(1, 0.6, 1);
    }
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, plantMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.y = (id.rotation * Math.PI) / 180;
    mesh.userData.u = u;
    mesh.userData.h = sp.tree ? H : H * 1.1;
    return mesh;
  }

  let plantMaterial;

  // ---------- scene ----------
  function lighting() {
    const dusk = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dusk')) > 0;
    scene.background = new T.Color(dusk ? '#18213a' : '#b9cde0');
    scene.fog = new T.Fog(scene.background, 120, 260);
    hemi.color.set(dusk ? '#6f7fb0' : '#f4efe2');
    hemi.groundColor.set(dusk ? '#1d1a18' : '#6b5d45');
    hemi.intensity = dusk ? 0.5 : 0.6;
    sun.color.set(dusk ? '#9fb2e6' : '#fff1d6');
    sun.intensity = dusk ? 0.45 : 1.45;
    for (const l of lanterns) l.visible = dusk;
  }

  async function init(container) {
    host = container;
    await load();
    renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = 'srgb'; else renderer.outputEncoding = T.sRGBEncoding;
    host.appendChild(renderer.domElement);

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(42, 1, 0.5, 600);
    camera.position.set(30, 15, 37);

    hemi = new T.HemisphereLight('#f4efe2', '#6b5d45', 0.75);
    scene.add(hemi);
    sun = new T.DirectionalLight('#fff1d6', 1.25);
    sun.position.set(62, 48, 44); // the south-east sun of the plan
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -60;
    sc.right = sc.top = 60;
    sc.near = 10;
    sc.far = 200;
    sc.updateProjectionMatrix();
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const l = new T.PointLight('#ffb560', 1.1, 40, 1.6);
      l.position.set(x * 41, 5.5, z * 41);
      scene.add(l);
      lanterns.push(l);
    }

    plantMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
    buildArchitecture();
    buildGarth();
    plantGroup = new T.Group();
    scene.add(plantGroup);

    ring = new T.Mesh(new T.RingGeometry(1, 1.12, 48), new T.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.9 }));
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    scene.add(ring);

    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minDistance = 6;
    controls.maxDistance = 150;
    controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotateSpeed = 0.35;
    controls.addEventListener('start', () => { controls.autoRotate = false; });

    lighting();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', lighting);
    new MutationObserver(lighting).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    new ResizeObserver(resize).observe(host);
    resize();
    bindPointer();
  }

  function resize() {
    if (!renderer) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function sync() {
    if (!scene) return;
    const app = window.GarthApp;
    const want = new Map(app.planted().map((p) => [p.u, p]));
    for (const [u, m] of meshes) {
      const p = want.get(u);
      if (!p || m.userData.key !== key(p)) {
        plantGroup.remove(m);
        m.geometry.dispose();
        meshes.delete(u);
      }
    }
    for (const [u, p] of want) {
      if (meshes.has(u)) continue;
      const m = buildPlant(u, p.status === 'departed');
      m.position.set(W(p.x), 0.06, W(p.y));
      m.userData.key = key(p);
      plantGroup.add(m);
      meshes.set(u, m);
    }
    const sel = app.selectedPlant();
    const sm = sel && meshes.get(sel);
    ring.visible = !!sm;
    if (sm) {
      const rr = app.radius(sel) / 10 + 0.6;
      ring.scale.set(rr, rr, rr);
      ring.position.set(sm.position.x, 0.12, sm.position.z);
    }
    host.classList.toggle('is-planting', !!app.selectedSeed());
  }
  const key = (p) => `${p.x},${p.y},${p.status}`;

  // ---------- pointer ----------
  function bindPointer() {
    const el = renderer.domElement;
    const ray = new T.Raycaster();
    const ndc = new T.Vector2();
    const ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
    const tag = document.getElementById('tag3d');
    let down = null;

    function cast(e) {
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(plantGroup.children, false)[0];
      return { plant: hit && hit.object.userData.u, rect };
    }

    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
      down = null;
      const app = window.GarthApp;
      const { plant } = cast(e);
      if (app.selectedSeed()) {
        const p = new T.Vector3();
        if (ray.ray.intersectPlane(ground, p)) app.plantAt(p.x * 10 + 500, p.z * 10 + 500);
        return;
      }
      app.selectPlant(plant || null);
    });
    let pending = false;
    el.addEventListener('pointermove', (e) => {
      if (pending || e.buttons) { if (e.buttons) tag.hidden = true; return; }
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const { plant, rect } = cast(e);
        if (!plant) { tag.hidden = true; el.style.cursor = window.GarthApp.selectedSeed() ? 'copy' : 'grab'; return; }
        el.style.cursor = 'pointer';
        const m = meshes.get(plant);
        const v = new T.Vector3(m.position.x, m.userData.h + 0.4, m.position.z).project(camera);
        tag.textContent = '@' + plant;
        tag.style.left = ((v.x + 1) / 2) * rect.width + 'px';
        tag.style.top = ((1 - v.y) / 2) * rect.height + 'px';
        tag.hidden = false;
      });
    });
    el.addEventListener('pointerleave', () => { tag.hidden = true; });
  }

  // ---------- loop ----------
  const clock = { t0: performance.now() };
  function frame() {
    if (!running) return;
    const t = (performance.now() - clock.t0) / 1000;
    for (const r of ripples) {
      const k = (t / 4.8 + r.userData.phase) % 1;
      const s = 1 + k * 2.6;
      r.scale.set(s, s, s);
      r.material.opacity = 0.6 * (1 - k);
    }
    // a fine jet from the seal's nose, falling back into the bowl
    for (const d of droplets) {
      const k = (t * 0.9 + d.userData.phase) % 1;
      const a = d.userData.phase * Math.PI * 2;
      const rad = 0.2 + k * 1.3;
      d.position.set(0.25 + Math.cos(a) * rad, 4.6 + k * 1.6 - k * k * 3.3, 0.25 + Math.sin(a) * rad);
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  window.Garden3D = {
    async show(container) {
      if (!ready) ready = init(container);
      await ready;
      sync();
      if (!running) { running = true; resize(); frame(); }
    },
    hide() { running = false; },
    sync,
    active: () => running,
  };
})();
