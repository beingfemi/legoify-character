// The character model: body silhouettes, hair, clothing and face features.
// Each part is described as a volume, then voxelised onto the brick grid.
import * as THREE from "three";
import { BH } from "./brickscene.js";

const lerp = THREE.MathUtils.lerp;

// ─────────────────────────── palettes ───────────────────────────

// Skin tones across the full range, light through deep.
export const SKIN_TONES = [
  0xf7dcb4, 0xf0c691, 0xdda15e, 0xc98a5e,
  0xa9714b, 0x8a5738, 0x6b4126, 0x4a2c19,
];

// Natural hair colours first, then a few that aren't.
export const HAIR_COLORS = [
  0x1b1b1b, 0x3a2a1c, 0x5c3c2e, 0x8a5a2b, 0xc68642,
  0xd6b56a, 0xe3691c, 0x7c0a02, 0xa3a2a4, 0xf4f4f4,
  0x923978, 0x7a4bab, 0x0055bf, 0x4b9f4c,
];

export const OPTIONS = {
  body:   ["slim", "athletic", "curvy", "broad", "round"],
  hair:   ["none", "short", "curls", "afro", "long", "ponytail", "bun", "locs", "headwrap"],
  top:    ["tee", "long sleeve", "tank", "hoodie", "jacket"],
  bottom: ["trousers", "shorts", "skirt", "dress"],
  pose:   ["stand", "point", "cheer"],
};

export const DEFAULT_CHAR = {
  body: "athletic",
  hair: "short",
  top: "tee",
  bottom: "trousers",
  pose: "stand",
  glasses: false,
  beard: false,
  skin: 0xc98a5e,
  hairColor: 0x3a2a1c,
  topColor: 0xc4281c,
  bottomColor: 0x1e2f5c,
  shoeColor: 0x1b1b1b,
};

// ─────────────────────────── proportions ───────────────────────────
// Silhouettes vary shoulder / chest / waist / hip independently, so any of
// them can be combined with any hair or clothing.
const BODY = {
  slim:     { sh: 6.4, chest: 6.5, waist: 4.9, hip: 5.5, legR: 2.55, armR: 1.85, depth: 0.62 },
  athletic: { sh: 7.4, chest: 7.3, waist: 5.5, hip: 6.0, legR: 2.85, armR: 2.15, depth: 0.66 },
  curvy:    { sh: 6.6, chest: 7.1, waist: 5.2, hip: 7.7, legR: 3.15, armR: 1.95, depth: 0.70 },
  broad:    { sh: 8.3, chest: 8.0, waist: 7.2, hip: 7.6, legR: 3.30, armR: 2.50, depth: 0.72 },
  round:    { sh: 7.2, chest: 8.2, waist: 8.2, hip: 8.2, legR: 3.45, armR: 2.40, depth: 0.78 },
};

const HIP_Y = 23.0, WAIST_Y = 30.0, CHEST_Y = 38.8;
const HEAD = { y: 47.4, rx: 6.9, ry: 7.4, rz: 6.6 };

function torsoRX(y, b) {
  if (y <= WAIST_Y) return lerp(b.hip, b.waist, (y - HIP_Y) / (WAIST_Y - HIP_Y));
  return lerp(b.waist, b.chest, (y - WAIST_Y) / (CHEST_Y - WAIST_Y));
}

// Grid bounds — generous enough for an afro, long hair and a flared skirt.
export const GRID = { X: 21, Y: 50, Z: 15 };

// ─────────────────────────── geometry helpers ───────────────────────────
const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pab = new THREE.Vector3();

function distToSegment(px, py, pz, ax, ay, az, bx, by, bz) {
  pa.set(px - ax, py - ay, pz - az);
  pab.set(bx - ax, by - ay, bz - az);
  const len2 = pab.lengthSq();
  const t = len2 === 0 ? 0 : THREE.MathUtils.clamp(pa.dot(pab) / len2, 0, 1);
  pb.copy(pab).multiplyScalar(t);
  return pa.sub(pb).length();
}

const ellip = (px, py, pz, cx, cy, cz, rx, ry, rz) =>
  ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 + ((pz - cz) / rz) ** 2 <= 1;

const inHead = (x, y, z, grow = 0) =>
  ellip(x, y, z, 0, HEAD.y, 0, HEAD.rx + grow, HEAD.ry + grow, HEAD.rz + grow);

// The face must stay clear of every hairstyle, or eyes end up printed on hair.
const isFaceZone = (x, y, z) => z >= 1.6 && y <= 50.2 && y >= 40.0 && Math.abs(x) <= 5.6;

// ─────────────────────────── hair ───────────────────────────
function hairAt(x, y, z, style) {
  if (style === "none") return false;

  const crown  = inHead(x, y, z, 0.35) && y >= 49.4;
  const back   = inHead(x, y, z, 0.35) && z <= -2.2 && y >= 44.0;
  const sides  = inHead(x, y, z, 0.35) && Math.abs(x) >= 5.2 && z <= 1.6 && y >= 44.5;
  const capBase = crown || back || sides;

  switch (style) {
    case "short":
      return capBase;

    case "curls": {
      // a thicker, textured layer sitting proud of the scalp
      const shell = inHead(x, y, z, 1.6) && !inHead(x, y, z, -0.4);
      const bumpy = (Math.sin(x * 1.7) + Math.cos(z * 1.7) + Math.sin(y * 1.5)) > -1.1;
      return capBase || (shell && bumpy && (y >= 47.5 || z <= -1.5 || Math.abs(x) >= 4.6));
    }

    case "afro":
      return ellip(x, y, z, 0, 49.0, -0.6, 10.2, 9.8, 9.6) && y >= 43.5;

    case "long": {
      // cap, plus a curtain falling past the shoulders at back and sides
      const r = Math.hypot(x, z + 0.6);
      const curtain = y >= 29.0 && y <= 50.0 && r <= 8.4 && r >= 4.4 && z <= 2.2;
      return capBase || curtain;
    }

    case "ponytail":
      return capBase ||
        distToSegment(x, y, z, 0, 47.5, -6.4, 0, 33.0, -9.6) <= 2.4;

    case "bun":
      return capBase || ellip(x, y, z, 0, 54.6, -3.2, 3.6, 3.4, 3.4);

    case "locs": {
      if (capBase) return true;
      // a ring of hanging strands
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const sx = Math.cos(a) * 5.6, sz = Math.sin(a) * 5.4 - 0.4;
        if (sz > 2.6) continue;                       // never across the face
        if (distToSegment(x, y, z, sx, 50.0, sz, sx * 1.1, 31.0 + (i % 3) * 2.5, sz * 1.1) <= 1.25)
          return true;
      }
      return false;
    }

    case "headwrap": {
      // covers the whole head bar the face, and tucks in under the jaw
      const wrap = inHead(x, y, z, 0.7) && y >= 41.5;
      const knot = ellip(x, y, z, 0, 51.5, -6.2, 3.0, 3.0, 3.0);
      return wrap || knot;
    }
  }
  return false;
}

// ─────────────────────────── build ───────────────────────────
export function buildCharacter(c) {
  const b = BODY[c.body] ?? BODY.athletic;
  const vox = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;

  const SHOULDER_Y = 37.6;
  const shX = b.sh;
  const handOut = shX + 2.6;
  const POSES = {
    stand: { L: [-handOut, 24.5, 1.0], R: [handOut, 24.5, 1.0] },
    point: { L: [-handOut, 24.5, 1.0], R: [handOut + 2.6, 55.0, 1.8] },
    cheer: { L: [-handOut - 2.6, 55.0, 1.8], R: [handOut + 2.6, 55.0, 1.8] },
  };
  const hands = POSES[c.pose] ?? POSES.stand;
  const arms = [{ sx: -shX, hand: hands.L }, { sx: shX, hand: hands.R }];

  // clothing rules
  const isDress = c.bottom === "dress";
  const skirted = isDress || c.bottom === "skirt";
  const skirtColor = isDress ? c.topColor : c.bottomColor;
  // how far the sleeve runs down the upper and lower arm, each 0..1
  const SLEEVE = {
    "tee":         [0.55, 0],
    "long sleeve": [1.0, 0.92],
    "tank":        [0, 0],
    "hoodie":      [1.0, 0.95],
    "jacket":      [1.0, 0.90],
  };
  const [slvUp, slvLo] = SLEEVE[c.top] ?? SLEEVE.tee;
  const legX = Math.max(2.6, b.hip * 0.52);
  // legs are bare below this height (shorts stop at the knee, skirts expose all)
  const bareBelow = c.bottom === "shorts" ? 14.0 : skirted ? HIP_Y : -1;

  for (let ix = -GRID.X; ix <= GRID.X; ix++) {
    for (let iy = 0; iy <= GRID.Y; iy++) {
      for (let iz = -GRID.Z; iz <= GRID.Z; iz++) {
        const x = ix, y = iy * BH, z = iz;
        let col = null;

        // ---- legs ----
        for (const sx of [-legX, legX]) {
          if (distToSegment(x, y, z, sx, HIP_Y, 0, sx, 4.2, 0) <= b.legR) {
            col = (bareBelow >= 0 && y < bareBelow) ? c.skin : c.bottomColor;
          }
        }
        // feet
        for (const sx of [-legX, legX]) {
          if (ellip(x, y, z, sx, 1.8, 1.8, b.legR + 0.3, 1.9, 4.7)) col = c.shoeColor;
        }

        // ---- hips ----
        if (ellip(x, y, z, 0, HIP_Y - 0.4, 0, b.hip, 4.0, b.hip * b.depth + 0.6)) {
          col = skirted ? skirtColor : c.bottomColor;
        }

        // ---- skirt / dress ----
        if (skirted && y >= 12.5 && y <= HIP_Y + 1.0) {
          const t = (HIP_Y + 1.0 - y) / (HIP_Y + 1.0 - 12.5);
          const rx = b.hip * lerp(1.0, 1.62, t);
          const rz = rx * b.depth * 1.06;
          if ((x / rx) ** 2 + (z / rz) ** 2 <= 1) col = skirtColor;
        }

        // ---- torso ----
        if (y >= HIP_Y && y <= CHEST_Y + 0.6) {
          const rx = torsoRX(y, b);
          const rz = rx * b.depth;
          if ((x / rx) ** 2 + (z / rz) ** 2 <= 1) {
            col = c.topColor;
            // a tank leaves the shoulders and upper chest bare but for two straps
            if (c.top === "tank" && y >= 34.5) {
              const strap = Math.abs(Math.abs(x) - 3.0) <= 1.15;
              col = strap ? c.topColor : c.skin;
            }
            // an open jacket front, in a deeper shade
            if (c.top === "jacket" && Math.abs(x) <= 0.7 && z > 0 && y <= CHEST_Y - 1.0) {
              col = shade(c.topColor, 0.72);
            }
          }
        }
        // jacket collar
        if (c.top === "jacket" && y >= CHEST_Y - 1.4 && y <= CHEST_Y + 1.6) {
          const rx = torsoRX(CHEST_Y, b) + 0.7, rz = rx * b.depth + 0.5;
          if ((x / rx) ** 2 + (z / rz) ** 2 <= 1) col = shade(c.topColor, 0.72);
        }

        // ---- arms ----
        for (const { sx, hand } of arms) {
          const ex = (sx + hand[0]) / 2 + Math.sign(sx) * 1.4;
          const ey = (SHOULDER_Y + hand[1]) / 2;
          const ez = hand[2] / 2;
          const dUp = distToSegment(x, y, z, sx, SHOULDER_Y, 0, ex, ey, ez);
          const dLo = distToSegment(x, y, z, ex, ey, ez, hand[0], hand[1], hand[2]);
          const rUp = b.armR + 0.45, rLo = b.armR + 0.1;

          if (dUp <= rUp) {
            const t = segT(x, y, z, sx, SHOULDER_Y, 0, ex, ey, ez);
            col = t <= slvUp ? c.topColor : c.skin;
          }
          if (dLo <= rLo) {
            const t = segT(x, y, z, ex, ey, ez, hand[0], hand[1], hand[2]);
            col = t <= slvLo ? c.topColor : c.skin;
          }
          const hr = b.armR + 0.55;
          if (ellip(x, y, z, hand[0], hand[1], hand[2], hr, hr, hr)) col = c.skin;
        }

        // ---- neck + head ----
        if (distToSegment(x, y, z, 0, 38.6, 0, 0, 42.4, 0) <= 2.9) col = c.skin;
        if (inHead(x, y, z)) col = c.skin;

        // ---- hood (sits behind the head) ----
        if (c.top === "hoodie") {
          const hood = ellip(x, y, z, 0, 47.2, -3.4, 8.6, 8.4, 7.4) && !inHead(x, y, z, 0.4) && y >= 40.0;
          if (hood && z <= 1.0) col = c.topColor;
        }

        // ---- hair + beard ----
        if (!isFaceZone(x, y, z) && hairAt(x, y, z, c.hair)) col = c.hairColor;
        if (c.beard && inHead(x, y, z, 0.45) && y >= 40.6 && y <= 44.9 && z >= 0.4) {
          col = c.hairColor;
        }

        if (col !== null) vox.set(key(ix, iy, iz), col);
      }
    }
  }

  const eyes = addFace(vox, key, c);
  return { vox, eyes };
}

// how far along a segment the closest point lies, 0..1
function segT(px, py, pz, ax, ay, az, bx, by, bz) {
  pa.set(px - ax, py - ay, pz - az);
  pab.set(bx - ax, by - ay, bz - az);
  const len2 = pab.lengthSq();
  return len2 === 0 ? 0 : THREE.MathUtils.clamp(pa.dot(pab) / len2, 0, 1);
}

function shade(hex, f) {
  const r = Math.round(((hex >> 16) & 255) * f);
  const g = Math.round(((hex >> 8) & 255) * f);
  const b = Math.round((hex & 255) * f);
  return (r << 16) | (g << 8) | b;
}

// Brow, nose and mouth are brick. Eyes come back as anchors so they can be
// built as printed tiles rather than flat blocks.
function addFace(vox, key, c) {
  const frontmost = (ix, iy) => {
    for (let iz = GRID.Z; iz >= -GRID.Z; iz--) if (vox.has(key(ix, iy, iz))) return iz;
    return null;
  };
  const row = (worldY) => Math.round(worldY / BH);

  const eyeRow = row(48.4);
  const eyes = [];
  for (const cx of [-3.5, 3.5]) {
    const a = frontmost(Math.round(cx - 0.5), eyeRow);
    const bz = frontmost(Math.round(cx + 0.5), eyeRow);
    if (a === null && bz === null) continue;
    const iz = Math.min(a ?? bz, bz ?? a);
    eyes.push({ x: cx, y: eyeRow * BH + BH / 2, z: iz + 0.5 });
  }

  const browRow = eyeRow + 2;
  for (const ix of [-4, -3, 3, 4]) {
    const iz = frontmost(ix, browRow);
    if (iz !== null) vox.set(key(ix, browRow, iz), c.hairColor);
  }

  const noseRow = row(46.0);
  const noseZ = frontmost(0, noseRow);
  if (noseZ !== null) vox.set(key(0, noseRow, noseZ + 1), c.skin);

  const mouthRow = row(43.0);
  for (const ix of [-1, 0, 1]) {
    const iz = frontmost(ix, mouthRow);
    if (iz !== null) vox.set(key(ix, mouthRow, iz), c.beard ? shade(c.hairColor, 0.6) : 0x5c3c2e);
  }
  return eyes;
}

// ─────────────────────────── randomise ───────────────────────────
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function randomCharacter(current) {
  const CLOTH = [
    0xf4f4f4, 0xc9cbc8, 0x635f61, 0x1b1b1b, 0xc4281c, 0x7c0a02, 0xe3691c,
    0xf5c400, 0x237841, 0x4b9f4c, 0x0055bf, 0x4c7fd6, 0x1e2f5c, 0x7a4bab,
    0x923978, 0xe4adc8, 0xe4cd9e, 0x5c3c2e,
  ];
  return {
    ...current,
    body: pick(OPTIONS.body),
    hair: pick(OPTIONS.hair),
    top: pick(OPTIONS.top),
    bottom: pick(OPTIONS.bottom),
    glasses: Math.random() < 0.3,
    beard: Math.random() < 0.25,
    skin: pick(SKIN_TONES),
    hairColor: pick(HAIR_COLORS),
    topColor: pick(CLOTH),
    bottomColor: pick(CLOTH),
    shoeColor: pick([0x1b1b1b, 0x2b2b2c, 0x5c3c2e, 0xf4f4f4, 0xc4281c, 0x0055bf]),
  };
}
