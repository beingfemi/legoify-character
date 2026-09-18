// UI wiring for the character builder.
import * as THREE from "three";
import { BrickScene, snapToLego } from "./brickscene.js";
import {
  OPTIONS, SKIN_TONES, HAIR_COLORS, DEFAULT_CHAR,
  buildCharacter, randomCharacter,
} from "./character.js";

const CLOTH_COLORS = [
  0xf4f4f4, 0xe6e3da, 0xc9cbc8, 0xa3a2a4, 0x635f61, 0x2b2b2c, 0x1b1b1b,
  0xc4281c, 0x7c0a02, 0xe3691c, 0xb04a2f, 0xf5c400, 0xfbe6a2, 0x237841,
  0x4b9f4c, 0x789082, 0x0055bf, 0x4c7fd6, 0x1e2f5c, 0x7a4bab, 0x923978,
  0xe4adc8, 0xd0956a, 0xe4cd9e, 0xaa7f56, 0x5c3c2e,
];

let CHAR = { ...DEFAULT_CHAR };
let scene = null;

const hex = (h) => "#" + h.toString(16).padStart(6, "0");
const loadingEl = document.getElementById("loading");
const tallyEl = document.getElementById("brickTally");
const fileInput = document.getElementById("fileInput");

// ─────────────────── printed eyes & glasses ───────────────────
let eyeTexture = null;

function makeEyeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#f6f5f2";
  g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.fillStyle = "#3f2a1b";
  g.beginPath(); g.arc(128, 134, 62, 0, 7); g.fill();
  g.fillStyle = "#0d0d0d";
  g.beginPath(); g.arc(128, 134, 31, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,.92)";
  g.beginPath(); g.arc(104, 104, 22, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,.5)";
  g.beginPath(); g.arc(150, 158, 9, 0, 7); g.fill();
  g.strokeStyle = "rgba(0,0,0,.22)";
  g.lineWidth = 9;
  g.beginPath(); g.arc(128, 128, 121, 0, 7); g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function buildDetails(anchors) {
  if (!anchors.length) return null;
  if (!eyeTexture) eyeTexture = makeEyeTexture();
  const group = new THREE.Group();

  const R = 0.85, D = 0.26;
  const eyeGeo = new THREE.CylinderGeometry(R, R, D, 32);
  eyeGeo.rotateX(Math.PI / 2);
  const rim = new THREE.MeshPhysicalMaterial({
    color: 0xf4f4f4, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12,
  });
  const printed = new THREE.MeshPhysicalMaterial({
    map: eyeTexture, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06,
    envMapIntensity: 1.3,
  });

  for (const a of anchors) {
    const m = new THREE.Mesh(eyeGeo, [rim, printed, rim]);
    m.position.set(a.x, a.y, a.z + D / 2 - 0.04);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }

  if (CHAR.glasses) {
    const frame = new THREE.MeshPhysicalMaterial({
      color: 0x1b1b1b, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1,
    });
    const ringGeo = new THREE.TorusGeometry(1.18, 0.16, 10, 26);
    const zFront = Math.max(...anchors.map((a) => a.z)) + 0.42;
    const yEye = anchors[0].y;
    for (const a of anchors) {
      const ring = new THREE.Mesh(ringGeo, frame);
      ring.position.set(a.x, a.y, zFront);
      ring.castShadow = true;
      group.add(ring);
    }
    // bridge
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.22), frame);
    bridge.position.set(0, yEye + 0.35, zFront);
    group.add(bridge);
    // temple arms
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 4.2), frame);
      arm.position.set(s * 5.4, yEye + 0.2, zFront - 2.1);
      group.add(arm);
    }
  }
  return group;
}

// ─────────────────── build ───────────────────
function rebuild() {
  const { vox, eyes } = buildCharacter(CHAR);
  const n = scene.setVoxels(vox, buildDetails(eyes));
  tallyEl.textContent = `${n.toLocaleString()} bricks`;
}

// ─────────────────── panel controls ───────────────────
function swatchRow(el, colors, getSel, onPick) {
  el.innerHTML = "";
  for (const c of colors) {
    const b = document.createElement("button");
    b.className = "sw";
    b.style.background = hex(c);
    b.title = hex(c);
    if (c === getSel()) b.classList.add("on");
    b.addEventListener("click", () => { onPick(c); syncUI(); rebuild(); });
    el.appendChild(b);
  }
}

function pillRow(el, values, getSel, onPick) {
  el.innerHTML = "";
  for (const v of values) {
    const b = document.createElement("button");
    b.className = "pill";
    b.textContent = v;
    if (v === getSel()) b.classList.add("on");
    b.addEventListener("click", () => { onPick(v); syncUI(); rebuild(); });
    el.appendChild(b);
  }
}

const $ = (id) => document.getElementById(id);

function syncUI() {
  swatchRow($("skinRow"), SKIN_TONES, () => CHAR.skin, (c) => (CHAR.skin = c));
  swatchRow($("hairColorRow"), HAIR_COLORS, () => CHAR.hairColor, (c) => (CHAR.hairColor = c));
  swatchRow($("topColorRow"), CLOTH_COLORS, () => CHAR.topColor, (c) => (CHAR.topColor = c));
  swatchRow($("bottomColorRow"), CLOTH_COLORS, () => CHAR.bottomColor, (c) => (CHAR.bottomColor = c));
  swatchRow($("shoeColorRow"), CLOTH_COLORS, () => CHAR.shoeColor, (c) => (CHAR.shoeColor = c));

  pillRow($("hairRow"), OPTIONS.hair, () => CHAR.hair, (v) => (CHAR.hair = v));
  pillRow($("bodyRow"), OPTIONS.body, () => CHAR.body, (v) => (CHAR.body = v));
  pillRow($("topRow"), OPTIONS.top, () => CHAR.top, (v) => (CHAR.top = v));
  pillRow($("bottomRow"), OPTIONS.bottom, () => CHAR.bottom, (v) => (CHAR.bottom = v));
  pillRow($("poseRow"), OPTIONS.pose, () => CHAR.pose, (v) => (CHAR.pose = v));

  for (const b of document.querySelectorAll("#extrasRow .pill")) {
    b.classList.toggle("on", !!CHAR[b.dataset.flag]);
  }
}

$("extrasRow").addEventListener("click", (e) => {
  const b = e.target.closest(".pill");
  if (!b) return;
  CHAR[b.dataset.flag] = !CHAR[b.dataset.flag];
  syncUI();
  rebuild();
});

$("shuffleBtn").addEventListener("click", () => {
  CHAR = randomCharacter(CHAR);
  syncUI();
  rebuild();
});

$("panelToggle").addEventListener("click", () => {
  document.body.classList.toggle("panel-open");
});

$("replayBtn").addEventListener("click", () => scene?.replay());
$("shotBtn").addEventListener("click", () => scene?.snapshot("legoify-character.png"));

// ─────────────────── optional: colours from a photo ───────────────────
const srcCanvas = document.getElementById("sourceCanvas");

function dominantIn(data, W, H, x0, y0, x1, y1, palette) {
  const counts = new Map();
  const ax = Math.floor(x0 * W), bx = Math.ceil(x1 * W);
  const ay = Math.floor(y0 * H), by = Math.ceil(y1 * H);
  for (let y = ay; y < by; y++) {
    for (let x = ax; x < bx; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] < 40) continue;
      const c = palette ? nearestIn(palette, data[i], data[i + 1], data[i + 2])
                        : snapToLego(data[i], data[i + 1], data[i + 2]);
      counts.set(c, (counts.get(c) || 0) + 1);
    }
  }
  let best = null, bc = -1;
  for (const [c, n] of counts) if (n > bc) { bc = n; best = c; }
  return best;
}

function nearestIn(palette, r, g, b) {
  let best = palette[0], bd = Infinity;
  for (const h of palette) {
    const d = (r - ((h >> 16) & 255)) ** 2 + (g - ((h >> 8) & 255)) ** 2 + (b - (h & 255)) ** 2;
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}

function readColorsFromImage(img) {
  const S = 128;
  const ctx = srcCanvas.getContext("2d", { willReadFrequently: true });
  const side = Math.min(img.width, img.height);
  srcCanvas.width = srcCanvas.height = S;
  ctx.clearRect(0, 0, S, S);
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
  const { data } = ctx.getImageData(0, 0, S, S);

  // skin and hair snap to their own palettes so they stay plausible
  CHAR.skin = dominantIn(data, S, S, 0.36, 0.32, 0.64, 0.50, SKIN_TONES);
  CHAR.hairColor = dominantIn(data, S, S, 0.30, 0.06, 0.70, 0.20, HAIR_COLORS);
  CHAR.topColor = dominantIn(data, S, S, 0.22, 0.72, 0.78, 0.94, CLOTH_COLORS);
  const pants = dominantIn(data, S, S, 0.30, 0.94, 0.70, 1.00, CLOTH_COLORS);
  CHAR.bottomColor = pants === CHAR.topColor ? 0x1e2f5c : pants;
  syncUI();
  rebuild();
}

function handleFile(file) {
  const fr = new FileReader();
  fr.onload = (e) => {
    const img = new Image();
    img.onload = () => readColorsFromImage(img);
    img.src = e.target.result;
  };
  fr.readAsDataURL(file);
}

fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
  e.target.value = "";
});
$("photoBtn").addEventListener("click", () => fileInput.click());

["dragenter", "dragover"].forEach((ev) => addEventListener(ev, (e) => e.preventDefault()));
addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files[0];
  if (f?.type.startsWith("image/")) handleFile(f);
});

// ─────────────────── go ───────────────────
syncUI();
requestAnimationFrame(() => requestAnimationFrame(() => {
  scene = new BrickScene(document.getElementById("scene"));
  rebuild();
  loadingEl.classList.add("hidden");
}));
