// Texture Mapper math, ported from the 2010 Windows program (Form1.cs).
// Everything works in image units: a selection is {x, y, w, h} as fractions of the image (0..1 is the
// whole image). Second Life's "repeats per face" is the selection's size as a fraction of the image,
// and its offset is how far the selection's center sits from the image center (V grows upward).

export const MAPPING = Object.freeze({ DEFAULT: 'default', PLANAR: 'planar' });

// Planar mapping in Second Life shows half as much texture per repeat, so the program doubled the
// repeats for it (RepeatsHorizontal: `* 2` when Planar is chosen) and halved them going back.
const planarFactor = (mapping) => (mapping === MAPPING.PLANAR ? 2 : 1);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Selection (fractions of the image) -> the four numbers to type into Second Life. */
export function valuesFromSelection(sel, mapping = MAPPING.DEFAULT) {
  const k = planarFactor(mapping);
  return {
    repeatsU: sel.w * k,
    repeatsV: sel.h * k,
    // OffsetHorizontal: (x + w/2 - 0.5), clamped to -1..1
    offsetU: clamp(sel.x + sel.w / 2 - 0.5, -1, 1),
    // OffsetVertical: -(y + h/2 - 0.5), clamped to -1..1 (screen y grows down, texture V grows up)
    offsetV: clamp(-(sel.y + sel.h / 2 - 0.5), -1, 1),
  };
}

/** The four numbers -> selection (UpdateSelection in the original). */
export function selectionFromValues(v, mapping = MAPPING.DEFAULT) {
  const k = planarFactor(mapping);
  const w = v.repeatsU / k;
  const h = v.repeatsV / k;
  return {
    x: v.offsetU + 0.5 - w / 2,
    y: 0.5 - v.offsetV - h / 2,
    w,
    h,
  };
}

/** Rectangle from two corner points (DetermineLocation + DetermineSize). */
export function rectFromPoints(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/**
 * What a press at point p would do to rectangle r (FindAction). `grab` is the hit distance in the same
 * units as p and r. Corners win over edges, edges over the inside, and anywhere else starts a new box.
 */
export function findAction(p, r, grab) {
  const near = (ax, ay) => Math.hypot(p.x - ax, p.y - ay) < grab;
  const right = r.x + r.w;
  const bottom = r.y + r.h;
  if (r.w > 0 || r.h > 0) {
    if (near(r.x, r.y)) return 'scale-top-left';
    if (near(right, r.y)) return 'scale-top-right';
    if (near(right, bottom)) return 'scale-bottom-right';
    if (near(r.x, bottom)) return 'scale-bottom-left';
    const inY = p.y >= r.y && p.y <= bottom;
    const inX = p.x >= r.x && p.x <= right;
    if (Math.abs(p.x - r.x) < grab && inY) return 'scale-left';
    if (Math.abs(p.x - right) < grab && inY) return 'scale-right';
    if (Math.abs(p.y - r.y) < grab && inX) return 'scale-top';
    if (Math.abs(p.y - bottom) < grab && inX) return 'scale-bottom';
    if (inX && inY) return 'move';
  }
  return 'select';
}

export const CURSORS = Object.freeze({
  'scale-left': 'ew-resize', 'scale-right': 'ew-resize',
  'scale-top': 'ns-resize', 'scale-bottom': 'ns-resize',
  'scale-top-left': 'nwse-resize', 'scale-bottom-right': 'nwse-resize',
  'scale-top-right': 'nesw-resize', 'scale-bottom-left': 'nesw-resize',
  move: 'move', select: 'crosshair',
});

/**
 * Apply a drag. `start` is the rectangle when the press began, `from` the press point, `to` the current
 * point. Unlike the 2010 program, dragging an edge past the opposite edge flips the box cleanly instead
 * of anchoring it in the wrong place.
 */
export function applyDrag(action, start, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;
  switch (action) {
    case 'select': return rectFromPoints(from, to);
    case 'move': return { ...start, x: start.x + dx, y: start.y + dy };
    case 'scale-left': left += dx; break;
    case 'scale-right': right += dx; break;
    case 'scale-top': top += dy; break;
    case 'scale-bottom': bottom += dy; break;
    case 'scale-top-left': left += dx; top += dy; break;
    case 'scale-top-right': right += dx; top += dy; break;
    case 'scale-bottom-left': left += dx; bottom += dy; break;
    case 'scale-bottom-right': right += dx; bottom += dy; break;
    default: return start;
  }
  return rectFromPoints({ x: left, y: top }, { x: right, y: bottom });
}

/** Round for display and copying (the program showed three decimal places). */
export const fmt = (n) => (Math.abs(n) < 0.0005 ? 0 : n).toFixed(3);

/**
 * An LSL line that applies the values to a face. Flipping in Second Life is a negative repeat, and
 * planar mapping is PRIM_TEXGEN_PLANAR.
 */
export function lslSnippet(v, { mapping = MAPPING.DEFAULT, flipU = false, flipV = false, face = 'ALL_SIDES', texture = '"texture name or UUID"' } = {}) {
  const ru = fmt(flipU ? -v.repeatsU : v.repeatsU);
  const rv = fmt(flipV ? -v.repeatsV : v.repeatsV);
  const params = [
    `PRIM_TEXTURE, ${face}, ${texture}, <${ru}, ${rv}, 0.0>, <${fmt(v.offsetU)}, ${fmt(v.offsetV)}, 0.0>, 0.0`,
  ];
  if (mapping === MAPPING.PLANAR) params.push(`PRIM_TEXGEN, ${face}, PRIM_TEXGEN_PLANAR`);
  return `llSetPrimitiveParams([${params.join(', ')}]);`;
}
