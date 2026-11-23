(() => {
  const strip = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻ‘’`']/g, '').toLowerCase();
  const PRETTY = { 'Hana Volcanics': 'Hāna Volcanics', 'Kau Basalt': 'Kaʻū Basalt', 'Honomanu Basalt': 'Honomanū Basalt', 'Hualalai Volcanics': 'Hualālai Volcanics', 'Laupahoehoe Volcanics': 'Laupāhoehoe Volcanics',
    'Hamakua Volcanics': 'Hāmākua Volcanics', 'Pololu Volcanics': 'Pololū Volcanics', 'Hawi Volcanics': 'Hāwī Volcanics', 'Ninole Basalt': 'Nīnole Basalt', 'Kanapou Volcanics': 'Kanapou Volcanics', 'Koloa Volcanics': 'Kōloa Volcanics' };
  const pretty = f => PRETTY[f] || f;
  // formations a field note might name; one-word keys where the word is distinctive, full names where it is also a place name
  const FORMS = [['kula', 'Kula Volcanics'], ['hana volcanics', 'Hana Volcanics'], ['hana lava', 'Hana Volcanics'], ['honomanu', 'Honomanu Basalt'], ['wailuku', 'Wailuku Volcanics'], ['honolua', 'Honolua Volcanics'],
    ['lahaina volcanics', 'Lahaina Volcanics'], ['puna basalt', 'Puna Basalt'], ['hilina', 'Hilina Basalt'], ['kau basalt', 'Kau Basalt'], ['ninole', 'Ninole Basalt'], ['kahuku basalt', 'Kahuku Basalt'],
    ['hualalai volcanics', 'Hualalai Volcanics'], ['laupahoehoe', 'Laupahoehoe Volcanics'], ['hamakua', 'Hamakua Volcanics'], ['hawi', 'Hawi Volcanics'], ['pololu', 'Pololu Volcanics'], ['kanapou', 'Kanapou Volcanics'], ['alluvium', 'alluvium']];
  const dash = s => s.replace(/-/g, '–');
  function age(rec) {   // one line a visitor can read
    const t = rec.ageText || '';
    if (!t) return rec.kind === 'lava' ? 'Age not given on the map' : 'Sediment, not a lava flow' + (rec.dmuAge ? ' · ' + rec.dmuAge : '');
    if (rec.ageKind === 'AD') { const y = t.replace('A.D. ', ''); const first = parseInt(y, 10); return (first < 1790 ? 'Erupted about A.D. ' : 'Erupted in ') + dash(y); }
    if (rec.ageKind === 'lt') return 'Erupted after ' + t.replace('Younger than A.D. ', '');
    if (rec.ageKind === 'gt') return 'Older than ' + t.replace('Older than ', '').replace(' yr', ' years');
    if (rec.ageKind === 'about') return 'About ' + t.replace('About ', '').replace(' Ma', ' million years old');
    const r = t.replace(/^Age /, '').replace(/^About /, '');
    if (/Ma$/.test(r)) return 'Erupted ' + dash(r.replace(' Ma', '')) + ' million years ago';
    return 'Erupted ' + dash(r.replace(' yr', '')) + ' years ago';
  }
  const short = rec => rec.ageText ? dash(rec.ageText.replace(/^Age /, '').replace(' yr', ' yr').replace('A.D. ', 'A.D. ')) : (rec.kind === 'lava' ? 'age not given' : 'sediment');
  function title(rec) { const f = rec.formation ? pretty(rec.formation) : (rec.dmuName || 'Unnamed unit'); return rec.member ? f + ' · ' + rec.member : f; }
  function detail(rec) { return [rec.volcano, rec.stage && rec.stage !== 'alluvium' && rec.stage !== 'water' ? rec.stage.replace('post shield', 'post-shield') + ' stage' : null, rec.lithology, rec.composition].filter(Boolean).join(' · '); }
  function compare(note, rec) {
    if (!note) return null; const n = strip(note), named = [];
    FORMS.forEach(([k, f]) => { if (n.includes(k) && !named.includes(f)) named.push(f); });
    if (!named.length) return null;
    const mine = rec.formation || ''; const agree = named.some(f => f === 'alluvium' ? /alluvium/i.test(mine) : f === mine);
    return { agree, named: named.map(f => f === 'alluvium' ? 'alluvium' : pretty(f)) };
  }
  function color(rec) { const G = window.GEOL; if (rec.kind === 'water') return '#5f8faa'; if (rec.kind !== 'lava' || rec.bin == null) return G.sedRGB; return G.binRGB[rec.bin]; }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  // opts: { note, island, offshore, actions: [[label, fn]], compact }
  window.geolCard = function (rec, opts = {}) {
    const G = window.GEOL, box = el('div', 'unit');
    const head = el('div', 'u-head'); const sw = el('span', 'u-sw'); sw.style.background = color(rec); head.append(sw, el('span', 'u-lab', rec.unit), el('span', 'u-name', title(rec))); box.append(head);
    box.append(el('div', 'u-age', age(rec)));
    const d = detail(rec); if (d) box.append(el('div', 'u-sub', d));
    if (rec.confidence === 'questionable') box.append(el('div', 'u-note', 'The map marks this unit as questionable here.'));
    if (opts.offshore) box.append(el('div', 'u-note', `The pin sits about ${opts.offshore} m outside the mapped coast; this is the nearest unit.`));
    const c = compare(opts.note, rec);
    if (c) { const p = el('div', 'u-cmp ' + (c.agree ? 'agree' : 'differ')); p.append(el('b', null, c.agree ? 'Agrees with the site note' : 'Differs from the site note'));
      p.append(c.agree ? ` (both ${c.named.filter(f => f === 'alluvium' ? /alluvium/i.test(rec.formation || '') : f === pretty(rec.formation || '')).join(', ') || pretty(rec.formation || '')}).`
        : `: the note says ${c.named.join(' or ')}; the map puts the pin in ${pretty(rec.formation || rec.dmuName || 'another unit')}. It is probably on or near a contact, so trust the outcrop.`); box.append(p); }
    if (rec.dmuDesc && !opts.compact) { const dt = el('details'); dt.append(el('summary', null, 'USGS description')); dt.append(el('p', null, rec.dmuDesc)); box.append(dt); }
    const sc = G.source.scale[opts.island] || ''; const tol = sc === '1:250,000' ? '125 m' : '50 m';
    box.append(el('div', 'u-note', `USGS state geologic map (SIM 3143)${sc ? ', mapped at ' + sc + '; boundaries are drawn to about ±' + tol + ' at that scale' : ''}.`));
    if (opts.actions && opts.actions.length) { const a = el('div', 'u-act'); opts.actions.forEach(([label, fn]) => { const b = el('button', null, label); b.onclick = fn; a.append(b); }); box.append(a); }
    return box;
  };
  window.geolLine = rec => `${rec.unit} · ${title(rec)} · ${short(rec)}${rec.lithology ? ' · ' + rec.lithology : ''} (USGS map)`;
  window.geolColor = color; window.geolAge = age; window.geolTitle = title; window.geolPretty = pretty;
})();

(() => {
  const D2R = Math.PI / 180;
  const $ = id => document.getElementById(id);
  const sphere = $('sphere');
  const gl = sphere.getContext('webgl2', { antialias: false });
  if (!gl) { const f = document.createElement('div'); f.className = 'fail';
    f.textContent = 'This browser cannot show the 360 view (WebGL 2 is off or unsupported). Try a current version of Chrome, Safari or Firefox.';
    document.body.appendChild(f); return; }
  const vs = `#version 300 es
  in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `#version 300 es
  precision highp float;
  uniform sampler2D tex; uniform vec2 res; uniform float yaw, pitch, vfov; out vec4 o;
  const float PI = 3.14159265358979;
  void main(){
    vec2 q = (gl_FragCoord.xy - 0.5 * res) / (0.5 * res.y);
    vec3 d = normalize(vec3(q, 1.0 / tan(0.5 * vfov)));
    float cp = cos(pitch), sp = sin(pitch);
    d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
    float cy = cos(yaw), sy = sin(yaw);
    d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);
    vec2 uv = vec2(atan(d.x, d.z) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(d.y, -1.0, 1.0)) / PI);
    vec2 gx = dFdx(uv), gy = dFdy(uv);
    gx.x -= floor(gx.x + 0.5); gy.x -= floor(gy.x + 0.5);
    o = textureGrad(tex, uv, gx, gy);
  }`;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x);
    if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n); const uRes = U('res'), uYaw = U('yaw'), uPitch = U('pitch'), uFov = U('vfov');
  const tex = gl.createTexture(); const aniso = gl.getExtension('EXT_texture_filter_anisotropic'); const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  let hasImage = false;
  function upload(img) {
    let src = img;
    if (img.naturalWidth > maxTex) {   // older phones: shrink to what the GPU can hold
      const c = document.createElement('canvas'); c.width = maxTex; c.height = maxTex / 2;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); src = c;
    }
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    hasImage = true; queue();
  }
  const loadImg = src => new Promise((ok, bad) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = bad; i.src = src; });
  const loadEl = $('load'); let loadToken = 0;
  function loadSite(s) {
    const tok = ++loadToken; loadEl.textContent = 'loading…';
    const first = s.lo || s.hi;
    loadImg(first).then(img => { if (tok !== loadToken) return; upload(img);
      if (s.lo && s.hi && maxTex >= 6144) { loadEl.textContent = 'loading full resolution…';
        return loadImg(s.hi).then(big => { if (tok !== loadToken) return; upload(big); loadEl.textContent = 'full resolution'; }); }
      loadEl.textContent = s.lo ? 'standard resolution' : 'full resolution';
    }).catch(() => { if (tok === loadToken) loadEl.textContent = 'image failed to load'; });
  }

  const view = { yaw: 0, pitch: 0, vfov: 75 };
  const defaultFov = () => { const a = innerWidth / innerHeight; return Math.min(95, Math.max(55, 2 * Math.atan(Math.tan(45 * D2R) / a) / D2R)); };
  const clampView = () => { view.pitch = Math.max(-89, Math.min(89, view.pitch)); view.vfov = Math.max(25, Math.min(110, view.vfov)); view.yaw = ((view.yaw % 360) + 360) % 360; };
  let pending = false; const queue = () => { if (!pending) { pending = true; requestAnimationFrame(draw); } };
  function resize() { const dpr = Math.min(devicePixelRatio || 1, 2); const w = Math.round(sphere.clientWidth * dpr), h = Math.round(sphere.clientHeight * dpr);
    if (sphere.width !== w || sphere.height !== h) { sphere.width = w; sphere.height = h; } sizeTape(); queue(); }
  function draw() { pending = false; clampView(); gl.viewport(0, 0, sphere.width, sphere.height); gl.clearColor(0.07, 0.066, 0.06, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (hasImage) { gl.uniform2f(uRes, sphere.width, sphere.height); gl.uniform1f(uYaw, view.yaw * D2R); gl.uniform1f(uPitch, view.pitch * D2R); gl.uniform1f(uFov, view.vfov * D2R); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    drawTape(); }

  const tape = $('tape'), tctx = tape.getContext('2d'), read = $('read');
  const NAMES = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const css = getComputedStyle(document.documentElement); const C = n => css.getPropertyValue(n).trim();
  const C_BONE = C('--bone'), C_DIM = C('--bone-dim'), C_AMBER = C('--amber');
  function sizeTape() { const dpr = Math.min(devicePixelRatio || 1, 2); tape.width = Math.round(tape.clientWidth * dpr); tape.height = Math.round(tape.clientHeight * dpr); }
  function drawTape() {
    const w = tape.width, h = tape.height, dpr = w / Math.max(1, tape.clientWidth); tctx.clearRect(0, 0, w, h);
    const span = 120, ppd = w / span, hd = view.yaw; tctx.textAlign = 'center';
    for (let a = Math.floor((hd - span / 2) / 5) * 5; a <= hd + span / 2; a += 5) {
      const x = w / 2 + (a - hd) * ppd, n = ((a % 360) + 360) % 360, major = n % 45 === 0, mid = n % 15 === 0;
      tctx.strokeStyle = major ? C_BONE : C_DIM; tctx.lineWidth = (major ? 2 : 1) * dpr; const len = (major ? 12 : mid ? 8 : 4) * dpr;
      tctx.beginPath(); tctx.moveTo(x, h); tctx.lineTo(x, h - len); tctx.stroke();
      if (major || mid) { tctx.font = `${major ? 600 : 500} ${(major ? 14 : 10.5) * dpr}px ${major ? '"Barlow Condensed", sans-serif' : '"IBM Plex Mono", monospace'}`;
        tctx.fillStyle = n === 0 ? C_AMBER : (major ? C_BONE : C_DIM); tctx.fillText(major ? NAMES[n / 22.5] : String(n).padStart(3, '0'), x, h - len - 5 * dpr); }
    }
    tctx.fillStyle = C_AMBER; tctx.beginPath(); tctx.moveTo(w / 2 - 6 * dpr, 0); tctx.lineTo(w / 2 + 6 * dpr, 0); tctx.lineTo(w / 2, 7 * dpr); tctx.fill();
    const deg = Math.round(view.yaw) % 360; read.textContent = `${String(deg).padStart(3, '0')}° ${NAMES[Math.round(deg / 22.5) % 16]}`;
  }

  // input
  const hint = $('hint'); let touched = false; const dismiss = () => { if (!touched) { touched = true; hint.classList.add('gone'); } };
  const ptrs = new Map(); let pinch0 = 0, fov0 = 0;
  sphere.addEventListener('pointerdown', e => { sphere.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); sphere.classList.add('dragging'); dismiss();
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); fov0 = view.vfov; } });
  sphere.addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) { const k = view.vfov / sphere.clientHeight; view.yaw -= dx * k; view.pitch += dy * k; queue(); }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) { view.vfov = fov0 * pinch0 / d; queue(); } } });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (!ptrs.size) sphere.classList.remove('dragging'); };
  sphere.addEventListener('pointerup', up); sphere.addEventListener('pointercancel', up);
  sphere.addEventListener('wheel', e => { e.preventDefault(); dismiss(); view.vfov *= Math.exp(e.deltaY * 0.0012); queue(); }, { passive: false });
  addEventListener('keydown', e => {
    const m = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, 4], ArrowDown: [0, -4] }[e.key];
    if (m && !(e.target.closest && e.target.closest('.sheet'))) { view.yaw += m[0]; view.pitch += m[1]; dismiss(); queue(); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') { view.vfov /= 1.15; queue(); } else if (e.key === '-') { view.vfov *= 1.15; queue(); }
    else if (e.key === ']') go(cur + 1); else if (e.key === '[') go(cur - 1);
  });
  const animTo = (yaw, pitch, fov) => { const f = { ...view }; const dy = ((yaw - f.yaw + 540) % 360) - 180; const t0 = performance.now(); const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    const step = now => { const t = dur ? Math.min(1, (now - t0) / dur) : 1, s = t * t * (3 - 2 * t); view.yaw = f.yaw + dy * s; view.pitch = f.pitch + (pitch - f.pitch) * s; view.vfov = f.vfov + (fov - f.vfov) * s; queue(); if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); };
  $('zin').onclick = () => { view.vfov /= 1.25; queue(); }; $('zout').onclick = () => { view.vfov *= 1.25; queue(); };
  $('north').onclick = () => animTo(0, view.pitch, view.vfov);

  // locator map: redrawn for whichever island the current site is on
  const map = $('map'), NS = 'http://www.w3.org/2000/svg';
  const ISLE = id => ISLANDS.find(x => x.id === id) || ISLANDS[0];
  const el = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const a in at) e.setAttribute(a, at[a]); (parent || map).appendChild(e); return e; };
  let pins = [], rockMarks = [], locIsland = null;
  function drawLocator(islandId) {
    if (locIsland === islandId) return; locIsland = islandId; map.replaceChildren();
    const isl = ISLE(islandId), [bx0, by0, bx1, by1] = isl.bbox, padX = (bx1 - bx0) * 0.04, padY = (by1 - by0) * 0.07;
    const B = { x0: bx0 - padX, x1: bx1 + padX, y0: by0 - padY, y1: by1 + padY }, k = Math.cos((B.y0 + B.y1) / 2 * D2R);
    const W = 300, Hm = Math.round(W * (B.y1 - B.y0) / ((B.x1 - B.x0) * k));
    const px = (lon, lat) => [((lon - B.x0) / (B.x1 - B.x0)) * W, (1 - (lat - B.y0) / (B.y1 - B.y0)) * Hm];
    map.setAttribute('viewBox', `0 0 ${W} ${Hm}`); map.setAttribute('aria-label', `Locator map of ${isl.name} with numbered site pins`);
    LAND.forEach(p => el('path', { class: 'isle', d: 'M' + p.ring.map(q => px(q[0], q[1]).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z' }));
    (isl.labels || []).forEach(([n, lo, la]) => { const [x, y] = px(lo, la); const t = el('text', { class: 'isle-name', x, y, 'text-anchor': 'middle' }); t.textContent = n; });
    { const kmPerPx = ((B.x1 - B.x0) * 111.32 * k) / W, km = kmPerPx * W > 120 ? 20 : 10, len = km / kmPerPx, g = el('g', { class: 'scale' }), x = 10, y = Hm - 10;
      el('line', { x1: x, y1: y, x2: x + len, y2: y }, g); el('line', { x1: x, y1: y - 3, x2: x, y2: y + 1 }, g); el('line', { x1: x + len, y1: y - 3, x2: x + len, y2: y + 1 }, g);
      const t = el('text', { x: x + len + 4, y: y + 2.5 }, g); t.textContent = km + ' km'; }
  // pins: nudge any pin that would overlap an earlier one, with a leader line to the true spot
  const placed = [], under = el('g', {}); // leaders sit under every pin so they never cross a label
  // distance from point (a,b) to segment (x1,y1)-(x2,y2)
  const segD = (a, b, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((a - x1) * dx + (b - y1) * dy) / L)); return Math.hypot(a - x1 - t * dx, b - y1 - t * dy); };
    pins = SITES.map((s, i) => { if (s.pending || (s.island || 'maui') !== isl.id) return null; const [tx, ty] = px(s.lon, s.lat); let x = tx, y = ty;
    if (placed.some(([a, b]) => Math.hypot(a - x, b - y) < 16)) {
      // push away from the crowd: try directions fanning out from "away from nearby pins", nearest first
      const near = placed.filter(([a, b]) => Math.hypot(a - tx, b - ty) < 48), cx = near.reduce((v, p) => v + p[0], 0) / near.length, cy = near.reduce((v, p) => v + p[1], 0) / near.length;
      const base = Math.atan2(ty - cy, tx - cx); let done = false;
      for (const r of [18, 24, 30, 38]) { for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6]) { const a = base + k * 30 * D2R, nx = tx + r * Math.cos(a), ny = ty + r * Math.sin(a);
          // a pin sitting on the true spot already hides the leader's start, so only check the others
          if (placed.every(([p, q]) => Math.hypot(p - nx, q - ny) >= 16 && (Math.hypot(p - tx, q - ty) < 10 || segD(p, q, tx, ty, nx, ny) >= 8.5))) { x = nx; y = ny; done = true; break; } } if (done) break; } }
    placed.push([x, y]);
    if (x !== tx || y !== ty) { el('line', { x1: tx, y1: ty, x2: x, y2: y, stroke: 'var(--bone-dim)', 'stroke-width': 0.8 }, under); el('circle', { cx: tx, cy: ty, r: 1.6, fill: 'var(--bone)' }, under); }
    const g = el('g', { class: 'pin', tabindex: '0', role: 'button', 'aria-label': `Site ${s.n}: ${s.name}`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
    el('circle', { r: 7 }, g); const t = el('text', {}, g); t.textContent = s.n;
    g.addEventListener('click', () => go(i)); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(i); } }); return g; });

  // rock stops: diamonds, placed after the site pins and nudged clear of them the same way
    rockMarks = ROCKS.map((r, i) => { if ((r.island || 'maui') !== isl.id) return null; const [tx, ty] = px(r.lon, r.lat); let x = tx, y = ty;
    if (placed.some(([a, b]) => Math.hypot(a - x, b - y) < 14)) {
      const near = placed.filter(([a, b]) => Math.hypot(a - tx, b - ty) < 48), cx = near.reduce((v, p) => v + p[0], 0) / near.length, cy = near.reduce((v, p) => v + p[1], 0) / near.length;
      const base = Math.atan2(ty - cy, tx - cx); let done = false;
      for (const r2 of [16, 22, 28, 36]) { for (const k2 of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6]) { const a = base + k2 * 30 * D2R, nx = tx + r2 * Math.cos(a), ny = ty + r2 * Math.sin(a);
          if (placed.every(([p, q]) => Math.hypot(p - nx, q - ny) >= 14 && (Math.hypot(p - tx, q - ty) < 10 || segD(p, q, tx, ty, nx, ny) >= 8))) { x = nx; y = ny; done = true; break; } } if (done) break; } }
    placed.push([x, y]);
    if (x !== tx || y !== ty) { el('line', { x1: tx, y1: ty, x2: x, y2: y, stroke: 'var(--live)', 'stroke-width': 0.7, 'stroke-dasharray': '1.5 1.5' }, under); el('circle', { cx: tx, cy: ty, r: 1.4, fill: 'var(--live)' }, under); }
    const g = el('g', { class: 'rock', tabindex: '0', role: 'button', 'aria-label': `Rock stop ${r.n}: ${r.name}`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
    el('rect', { x: -5.5, y: -5.5, width: 11, height: 11, rx: 1.5, transform: 'rotate(45)' }, g); const t = el('text', {}, g); t.textContent = 'R' + r.n;
    g.addEventListener('click', () => openRock(i, g)); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRock(i, g); } }); return g; });
  }
  $('rocks-sec').hidden = !ROCKS.length;
  ROCKS.forEach((r, i) => { const li = document.createElement('li'); const b = document.createElement('button');
    b.innerHTML = '<img alt="" loading="lazy"><span class="t"><span class="tag"></span><span></span><small></small></span>';
    b.querySelector('img').src = r.photos[0].thumb; b.querySelector('.tag').textContent = 'R' + r.n + ' · ' + r.when;
    b.querySelector('.t span:nth-child(2)').textContent = r.name; b.querySelector('small').textContent = r.short;
    b.onclick = () => openRock(i, b); li.appendChild(b); $('rocks').appendChild(li); });
  // photo viewer
  const lb = $('lb'); let lbRock = 0, lbPhoto = 0, lbReturn = null;
  function showPhoto() { const r = ROCKS[lbRock], p = r.photos[lbPhoto]; const img = $('lb-img'); img.src = p.src; img.alt = p.alt || r.name;
    $('lb-count').textContent = r.photos.length > 1 ? `photo ${lbPhoto + 1} of ${r.photos.length}` : ''; $('lb-prev').hidden = $('lb-next').hidden = r.photos.length < 2; }
  function openRock(i, from) { const r = ROCKS[i]; lbRock = i; lbPhoto = 0; lbReturn = from || null;
    $('lb-eyebrow').textContent = `Rock stop ${r.n} · ${r.when}`; $('lb-title').textContent = r.name; $('lb-coords').textContent = r.coordText;
    const dl = $('lb-facts'); dl.replaceChildren(); r.facts.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); });
    if (r.unit != null) { const dt = document.createElement('dt'); dt.textContent = 'Map unit (USGS)'; const dd = document.createElement('dd'); dd.textContent = window.geolLine(GEOL.records[r.unit]) + (r.unitOff ? ` · pin ${r.unitOff} m outside the mapped coast` : ''); dl.append(dt, dd); }
    $('lb-geo').textContent = r.geo || ''; $('lb-geo').hidden = !r.geo;
    const src = $('lb-src'); src.replaceChildren(); if (r.src) { src.append('Source: '); const a = document.createElement('a'); a.href = r.src.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = r.src.label; src.append(a); }
    showPhoto(); lb.hidden = false; $('lb-close').focus(); }
  function closeRock() { lb.hidden = true; if (lbReturn && lbReturn.focus) lbReturn.focus(); }
  const stepPhoto = d => { const n = ROCKS[lbRock].photos.length; lbPhoto = (lbPhoto + d + n) % n; showPhoto(); };
  $('lb-close').onclick = closeRock; $('lb-prev').onclick = () => stepPhoto(-1); $('lb-next').onclick = () => stepPhoto(1);
  lb.addEventListener('click', e => { if (e.target === lb || e.target.tagName === 'FIGURE') closeRock(); });
  addEventListener('keydown', e => { if (lb.hidden) return;
    if (e.key === 'Escape') closeRock(); else if (e.key === 'ArrowLeft') stepPhoto(-1); else if (e.key === 'ArrowRight') stepPhoto(1);
    else if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button:not([hidden]), a[href]')]; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); } else return; }
    else return;
    e.preventDefault(); e.stopImmediatePropagation(); }, true);

  const list = $('sites');
  const items = SITES.map((s, i) => { const li = document.createElement('li'); const b = document.createElement('button');
    b.innerHTML = `<span class="n">${s.n}</span><span class="t"><span></span><small></small></span>`; b.querySelector('.t span').textContent = s.name; b.querySelector('small').textContent = s.short;
    b.onclick = () => go(i); li.appendChild(b); list.appendChild(li); return b; });

  // site switching
  let cur = 0;
  function render(s) {
    $('p-eyebrow').textContent = `Site ${s.n} · ${s.region}`; $('p-name').textContent = s.name; $('p-when').textContent = s.when;
    $('n-coords').textContent = s.coordText;
    const dl = $('n-facts'); dl.replaceChildren(); s.facts.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); });
    $('n-geo-sec').hidden = !s.geo; $('n-geo-h').textContent = s.geoTitle || 'The rock'; $('n-geo').textContent = s.geo || '';
    $('n-unit-sec').hidden = s.unit == null; if (s.unit != null) $('n-unit').replaceChildren(window.geolCard(GEOL.records[s.unit], { note: s.geo, island: s.island || 'maui', offshore: s.unitOff,
      actions: [['See the age map', () => { if (window.FS.openMapLayer) window.FS.openMapLayer(s.island || 'maui', 'age'); }]] }));
    const src = $('n-src'); src.replaceChildren(); if (s.src) { src.append('Source: '); const a = document.createElement('a'); a.href = s.src.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = s.src.label; src.append(a); }
    const ul = $('n-layers'); ul.replaceChildren(); s.layers.forEach(([name, state, live]) => { const li = document.createElement('li'); if (live) li.className = 'live';
      li.innerHTML = '<span class="dot"></span><span></span><span class="state"></span>'; li.children[1].textContent = name; li.children[2].textContent = state; ul.appendChild(li); });
    drawLocator(s.island || 'maui'); pins.forEach((p, i) => p && p.classList.toggle('on', i === cur)); $('copy').hidden = !!s.pending; items.forEach((b, i) => b.setAttribute('aria-current', String(i === cur)));
    sphere.setAttribute('aria-label', `360 degree view of ${s.name}. Drag to look around.`);
  }
  function go(i) { cur = (i + SITES.length) % SITES.length; const s = SITES[cur]; render(s); view.yaw = s.startYaw; view.pitch = s.startPitch || 0; view.vfov = defaultFov(); hasImage = false; queue(); loadSite(s);
    try { history.replaceState(null, '', '#site' + s.n); } catch (_) {} }
  $('prev').onclick = () => go(cur - 1); $('next').onclick = () => go(cur + 1);

  const sheet = $('sheet'), info = $('info');
  const wide = () => innerWidth >= 820, key = () => 'maui-sites-panel-' + (wide() ? 'wide' : 'narrow');
  const setSheet = open => { sheet.hidden = !open; document.body.classList.toggle('notes-open', open); info.setAttribute('aria-pressed', String(open)); try { localStorage.setItem(key(), open ? '1' : '0'); } catch (_) {} queue(); };
  let startOpen = wide(); try { const v = localStorage.getItem(key()); if (v !== null) startOpen = v === '1'; } catch (_) {}
  setSheet(startOpen); info.onclick = () => setSheet(sheet.hidden); $('close').onclick = () => setSheet(false);
  const copy = $('copy'); copy.onclick = () => { const s = SITES[cur]; if (s.pending) return; const txt = `${s.lat.toFixed(6)}, ${s.lon.toFixed(6)}`;
    navigator.clipboard.writeText(txt).then(() => { copy.textContent = 'Copied'; setTimeout(() => copy.textContent = 'Copy', 1600); })
      .catch(() => { const r = document.createRange(); r.selectNodeContents($('n-coords')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }); };

  addEventListener('resize', resize); if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  resize();
  // bridge for the 3D map module
  window.HAWAII_LAND = LAND;
  window.FS = {
    islands: ISLANDS,
    items(id) {
      return [...SITES.map((s, i) => ({ key: 's' + s.n, kind: 'site', n: s.n, name: s.name, label: s.label || s.name, lon: s.lon, lat: s.lat, island: s.island || 'maui', pending: s.pending, open: () => FS.openSite(i) })),
              ...ROCKS.map((r, i) => ({ key: 'r' + r.n, kind: 'rock', n: r.n, name: r.name, label: r.label || r.name, lon: r.lon, lat: r.lat, island: r.island || 'maui', open: e => openRock(i, e) }))]
        .filter(x => x.island === id && !x.pending); },
    openSite(i) { document.body.classList.remove('map-mode'); go(i); resize(); },
    currentIsland: () => (SITES[cur] && SITES[cur].island) || 'maui',
    currentSite: () => SITES[cur],
    sites: SITES, index: () => cur, view, redraw: () => queue(),
  };
  $('tomap').onclick = () => { if (window.openMap) window.openMap(FS.currentIsland()); };
  const m = /^#site(\d+)$/.exec(location.hash || ''); const start = m ? SITES.findIndex(s => String(s.n) === m[1]) : -1;
  if (start >= 0) go(start); else { document.body.classList.add('map-mode'); FS.wantMap = true; if (window.openMap) window.openMap(); }
})();
