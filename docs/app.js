import {
  MAPPING, valuesFromSelection, selectionFromValues, findAction, applyDrag, CURSORS, fmt, lslSnippet,
} from './mapper.js';
import { serialFor } from './registration.js';

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const preview = $('preview');
const pctx = preview.getContext('2d');
const inputs = { repeatsU: $('repeatsU'), repeatsV: $('repeatsV'), offsetU: $('offsetU'), offsetV: $('offsetV') };

const state = {
  image: null,
  sel: { x: 0, y: 0, w: 0, h: 0 }, // fractions of the image
  drag: null, // { action, start, from }
};

const mapping = () => $('mapping').value;
const hasSel = () => state.sel.w > 0 && state.sel.h > 0;

function status(text, isError = false) {
  const s = $('status');
  s.textContent = text;
  s.classList.toggle('error', isError);
}

// ---------- layout ----------
function fitCanvas() {
  if (!state.image) return;
  const box = $('drop').getBoundingClientRect();
  const ratio = state.image.naturalWidth / state.image.naturalHeight;
  let w = box.width;
  let h = w / ratio;
  const maxH = Math.max(240, window.innerHeight - 180);
  if (h > maxH) { h = maxH; w = h * ratio; }
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${Math.round(w)}px`;
  canvas.style.height = `${Math.round(h)}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  draw();
}

// ---------- drawing ----------
function draw() {
  if (!state.image) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(state.image, 0, 0, W, H);
  if (hasSel()) {
    const r = { x: state.sel.x * W, y: state.sel.y * H, w: state.sel.w * W, h: state.sel.h * H };
    // Dim everything outside the selection.
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill('evenodd');
    // White line under a black dashed line, like the original rubber band.
    const dpr = window.devicePixelRatio || 1;
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([]);
    // Corner handles.
    const s = 7 * dpr;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 * dpr;
    for (const [hx, hy] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) {
      ctx.fillRect(hx - s / 2, hy - s / 2, s, s);
      ctx.strokeRect(hx - s / 2, hy - s / 2, s, s);
    }
    ctx.restore();
  }
  drawPreview();
}

// The face as Second Life would show it: the selected area, wrapping past the image edges the way a
// texture repeats, and mirrored when Flip is checked.
function drawPreview() {
  const P = preview.width;
  pctx.clearRect(0, 0, P, P);
  if (!state.image || !hasSel()) {
    pctx.fillStyle = '#2a2f36';
    pctx.fillRect(0, 0, P, P);
    return;
  }
  const img = state.image;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const sel = state.sel;
  // Keep the selection's shape inside the square preview.
  const aspect = (sel.w * iw) / (sel.h * ih);
  const dw = aspect >= 1 ? P : P * aspect;
  const dh = aspect >= 1 ? P / aspect : P;
  const ox = (P - dw) / 2;
  const oy = (P - dh) / 2;
  pctx.fillStyle = '#2a2f36';
  pctx.fillRect(0, 0, P, P);
  pctx.save();
  pctx.beginPath();
  pctx.rect(ox, oy, dw, dh);
  pctx.clip();
  pctx.translate(ox + (($('flipU').checked) ? dw : 0), oy + (($('flipV').checked) ? dh : 0));
  pctx.scale($('flipU').checked ? -1 : 1, $('flipV').checked ? -1 : 1);
  // Scale: one image width in the preview = dw / sel.w.
  const tw = dw / sel.w;
  const th = dh / sel.h;
  const startX = -sel.x * tw;
  const startY = -sel.y * th;
  const i0 = Math.floor(sel.x);
  const i1 = Math.ceil(sel.x + sel.w);
  const j0 = Math.floor(sel.y);
  const j1 = Math.ceil(sel.y + sel.h);
  if ((i1 - i0) * (j1 - j0) <= 400) {
    for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) pctx.drawImage(img, startX + i * tw, startY + j * th, tw, th);
  }
  pctx.restore();
}

// ---------- values <-> selection ----------
let updatingText = false;
function showValues() {
  const v = valuesFromSelection(state.sel, mapping());
  updatingText = true;
  for (const k of Object.keys(inputs)) inputs[k].value = fmt(v[k]);
  updatingText = false;
  $('lsl').textContent = lslSnippet(v, { mapping: mapping(), flipU: $('flipU').checked, flipV: $('flipV').checked });
}

function readValues() {
  const n = (el) => {
    const x = parseFloat(el.value);
    return Number.isFinite(x) ? x : 0;
  };
  return { repeatsU: n(inputs.repeatsU), repeatsV: n(inputs.repeatsV), offsetU: n(inputs.offsetU), offsetV: n(inputs.offsetV) };
}

for (const el of Object.values(inputs)) {
  el.addEventListener('input', () => {
    if (updatingText) return;
    state.sel = selectionFromValues(readValues(), mapping());
    draw();
    $('lsl').textContent = lslSnippet(readValues(), { mapping: mapping(), flipU: $('flipU').checked, flipV: $('flipV').checked });
  });
  el.addEventListener('change', () => showValues());
}
$('mapping').addEventListener('change', () => { showValues(); draw(); });
$('flipU').addEventListener('change', () => { showValues(); draw(); });
$('flipV').addEventListener('change', () => { showValues(); draw(); });

// ---------- pointer ----------
function toUnit(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
}
// Hit distance: about 6 CSS pixels, expressed in image units (measured on the larger side).
function grab() {
  const r = canvas.getBoundingClientRect();
  return 6 / Math.max(1, Math.min(r.width, r.height));
}

canvas.addEventListener('pointerdown', (e) => {
  if (!state.image || e.button !== 0) return;
  canvas.setPointerCapture(e.pointerId);
  const p = toUnit(e);
  const action = findAction(p, state.sel, grab());
  state.drag = { action, start: { ...state.sel }, from: p };
  if (action === 'select') state.sel = { x: p.x, y: p.y, w: 0, h: 0 };
  e.preventDefault();
});
canvas.addEventListener('pointermove', (e) => {
  const p = toUnit(e);
  if (!state.drag) {
    canvas.style.cursor = state.image ? CURSORS[findAction(p, state.sel, grab())] : 'default';
    return;
  }
  state.sel = applyDrag(state.drag.action, state.drag.start, state.drag.from, p);
  showValues();
  draw();
});
const endDrag = () => { state.drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('dblclick', () => clearSelection());

// Arrow keys move the selection by one image pixel (10 with Alt); Shift+arrows resize it.
canvas.addEventListener('keydown', (e) => {
  if (!state.image || !hasSel()) return;
  const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const d = dirs[e.key];
  if (!d) return;
  e.preventDefault();
  const step = e.altKey ? 10 : 1;
  const dx = (d[0] * step) / state.image.naturalWidth;
  const dy = (d[1] * step) / state.image.naturalHeight;
  const s = state.sel;
  state.sel = e.shiftKey
    ? { ...s, w: Math.max(0, s.w + dx), h: Math.max(0, s.h + dy) }
    : { ...s, x: s.x + dx, y: s.y + dy };
  showValues();
  draw();
});

function clearSelection() {
  state.sel = { x: 0, y: 0, w: 0, h: 0 };
  showValues();
  draw();
}
$('clear').addEventListener('click', clearSelection);

// ---------- loading images (all local) ----------
function loadUrl(url, name, revoke = false) {
  const img = new Image();
  img.onload = () => {
    if (revoke) URL.revokeObjectURL(url);
    state.image = img;
    status(`${name} · ${img.naturalWidth} × ${img.naturalHeight}`);
    fitCanvas();
    showValues();
  };
  img.onerror = () => {
    if (revoke) URL.revokeObjectURL(url);
    status('Could not load image.', true);
  };
  img.src = url;
}
function loadFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { status('That file is not an image.', true); return; }
  loadUrl(URL.createObjectURL(file), file.name, true);
}
$('file').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
$('sample').addEventListener('click', () => loadUrl('filebox.png', 'Sample: file box'));

const drop = $('drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  loadFile(e.dataTransfer.files[0]);
});
window.addEventListener('paste', (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
  if (item) loadFile(item.getAsFile());
});

// ---------- copy ----------
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('lsl').textContent);
    status('Copied the LSL line.');
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('lsl'));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    status('Select the line above and copy it (Ctrl+C or Cmd+C).');
  }
});

// ---------- About box (like the Windows program's About button) ----------
function openAbout() {
  $('aboutBox').showModal();
  $('regName').focus();
}
$('about').addEventListener('click', openAbout);
$('aboutLink').addEventListener('click', openAbout);
// Enter in the name box should not close the box.
$('regName').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
// Click outside the box closes it.
$('aboutBox').addEventListener('click', (e) => { if (e.target === $('aboutBox')) $('aboutBox').close(); });

// ---------- serial numbers for the old Windows program ----------
let regSeq = 0;
$('regName').addEventListener('input', async () => {
  const name = $('regName').value;
  const seq = ++regSeq;
  const serial = await serialFor(name);
  if (seq !== regSeq) return; // a newer keystroke already answered
  $('regSerial').textContent = serial;
  $('regCopy').disabled = !serial;
  $('regStatus').textContent = name !== name.trim()
    ? 'Note: the name starts or ends with a space. The program counts spaces, so type it the same way there.'
    : '';
  $('regStatus').classList.remove('error');
});
$('regCopy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('regSerial').textContent);
    $('regStatus').textContent = 'Copied the serial number.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('regSerial'));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    $('regStatus').textContent = 'Select the serial and copy it (Ctrl+C or Cmd+C).';
  }
});

window.addEventListener('resize', fitCanvas);
new ResizeObserver(fitCanvas).observe(drop);

// Start like the original: the sample file box, nothing selected.
loadUrl('filebox.png', 'Sample: file box');
showValues();

// For tests.
window.textureMapper = { state, showValues, draw, mapping: MAPPING };
