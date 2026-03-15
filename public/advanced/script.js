/*
  Advanced Snake (Canvas)
  - Grid-based mechanics for classic collisions
  - Smooth 60 FPS rendering by interpolating between ticks
  - Curved body via Catmull-Rom sampling
  - Head with blinking eyes + forked tongue animation
  - Lighting/shadows + grass-like procedural background
*/

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const btnRestart = document.getElementById("btnRestart");
const overlayEl = document.getElementById("overlay");

const BEST_KEY = "snakeHighScore";

// Mechanics (grid)
const GRID_W = 26;
const GRID_H = 18;
// Speed rules:
// - Start a bit slow, then gently speed up until score 5
// - From score 5 to 9, keep speed constant
// - After that, speed only increases every +5 score (10, 15, 20, ...)
// - Each increase is eased over time to avoid noticeable jumps
const STEP_START_MS = 250;
const STEP_BASE_MS = 240;
const STEP_MIN_MS = 62;
const STEP_DECREASE_PER_LEVEL_MS = 7; // lower = subtle speed increases
const SPEED_EASE_MS = 1800; // transition duration for each level-up

// Rendering
const DPR = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
let cellPx = 28; // recomputed on resize

// State
let direction = { x: 1, y: 0 };
let queuedDirection = null;
let alive = true;
let score = 0;

let snake = []; // [{x,y}] head first
let prevSnake = [];
let food = { x: 0, y: 0 };

let stepAccumulator = 0;
let stepProgress = 0; // 0..1 between prevSnake and snake for smooth render
let lastTime = performance.now();

// Variable tick interval (smoothed)
let stepMsCurrent = STEP_BASE_MS;
let stepMsFrom = STEP_BASE_MS;
let stepMsTarget = STEP_BASE_MS;
let speedEaseT = 1; // 0..1

// Animation timers
let tongueTimer = 0;
let tonguePhase = 0; // 0..1 extend/retract
let blinkTimer = 0;
let blinkPhase = 0; // 0..1 eyelid closed
let turnPulse = 0; // small head motion on turn

// Camera-like feel: slight smoothing towards the head
let camera = { x: 0, y: 0 };

// Procedural background (grass)
let grassPattern = null;
let vignetteGradient = null;
let bodyGradient = null;
let cachedSize = { w: 0, h: 0 };

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function getBest() {
  const raw = localStorage.getItem(BEST_KEY);
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function setBest(n) {
  localStorage.setItem(BEST_KEY, String(Math.max(0, Math.trunc(n))));
}

function resetGame() {
  direction = { x: 1, y: 0 };
  queuedDirection = null;
  alive = true;
  score = 0;
  overlayEl.hidden = true;

  const startX = Math.floor(GRID_W / 2);
  const startY = Math.floor(GRID_H / 2);
  snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY }
  ];
  prevSnake = snake.map((p) => ({ ...p }));
  placeFood();

  stepAccumulator = 0;
  stepProgress = 0;
  stepMsCurrent = STEP_START_MS;
  stepMsFrom = STEP_START_MS;
  stepMsTarget = STEP_START_MS;
  speedEaseT = 1;

  tongueTimer = 0;
  tonguePhase = 0;
  blinkTimer = 0;
  blinkPhase = 0;
  turnPulse = 0;

  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(getBest());
}

function cellIsOnSnake(x, y, list = snake) {
  for (const p of list) if (p.x === x && p.y === y) return true;
  return false;
}

function placeFood() {
  const open = [];
  for (let y = 0; y < GRID_H; y += 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      if (!cellIsOnSnake(x, y)) open.push({ x, y });
    }
  }
  if (open.length === 0) return;
  food = open[Math.floor(Math.random() * open.length)];
}

function levelForScore(s) {
  // score 0-4 => level 0 (constant)
  // score 5-9 => level 1, etc.
  return Math.floor(Math.max(0, s) / 5);
}

function targetStepMsForScore(s) {
  const score = Math.max(0, s);

  // 0..4: speed ramps smoothly from STEP_START_MS -> STEP_BASE_MS
  if (score < 5) {
    const t = clamp(score / 5, 0, 1);
    const eased = easeInOut(t);
    const target = STEP_START_MS + (STEP_BASE_MS - STEP_START_MS) * eased;
    return clamp(target, STEP_BASE_MS, STEP_START_MS);
  }

  // 5..9: constant at STEP_BASE_MS
  // 10..14: slightly faster, and so on.
  const levelAfter5 = Math.floor((score - 5) / 5); // 0 at score 5..9
  const target = STEP_BASE_MS - levelAfter5 * STEP_DECREASE_PER_LEVEL_MS;
  return clamp(target, STEP_MIN_MS, STEP_BASE_MS);
}

function beginSpeedTransitionIfNeeded() {
  const shouldRetarget = score < 5 || score % 5 === 0;
  if (!shouldRetarget) return;
  const nextTarget = targetStepMsForScore(score);
  if (Math.abs(nextTarget - stepMsTarget) < 0.01) return;

  stepMsFrom = stepMsCurrent;
  stepMsTarget = nextTarget;
  speedEaseT = 0;
}

function setDirection(next) {
  // Prevent instant reverse.
  if (next.x === -direction.x && next.y === -direction.y) return;
  queuedDirection = next;
}

function step() {
  if (!alive) return;

  prevSnake = snake.map((p) => ({ ...p }));
  if (queuedDirection) {
    direction = queuedDirection;
    queuedDirection = null;
    turnPulse = 1;
  }

  const head = snake[0];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  // Wall collision
  if (newHead.x < 0 || newHead.x >= GRID_W || newHead.y < 0 || newHead.y >= GRID_H) {
    foul();
    return;
  }

  const willEat = newHead.x === food.x && newHead.y === food.y;
  const bodyToCheck = willEat ? snake : snake.slice(0, snake.length - 1);
  if (cellIsOnSnake(newHead.x, newHead.y, bodyToCheck)) {
    foul();
    return;
  }

  snake = [newHead, ...snake];
  if (!willEat) {
    snake.pop();
  } else {
    score += 1;
    if (score > getBest()) setBest(score);
    placeFood();
    beginSpeedTransitionIfNeeded();
  }

  updateHud();
}

function foul() {
  alive = false;
  overlayEl.hidden = false;
  if (score > getBest()) setBest(score);
  updateHud();
}

function resize() {
  // Fit a consistent aspect while staying responsive.
  const maxW = Math.min(1100, window.innerWidth - 32);
  const targetCell = Math.floor(maxW / GRID_W);
  cellPx = clamp(targetCell, 16, 34);

  const w = GRID_W * cellPx;
  const h = GRID_H * cellPx;
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  grassPattern = makeGrassPattern();

  // Cache gradients that depend only on canvas size (expensive to rebuild every frame).
  cachedSize = { w, h };
  vignetteGradient = (() => {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.40)");
    return g;
  })();
  bodyGradient = (() => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(45, 150, 88, 0.95)");
    g.addColorStop(0.5, "rgba(114, 232, 159, 0.95)");
    g.addColorStop(1, "rgba(60, 190, 120, 0.92)");
    return g;
  })();
}

function makeGrassPattern() {
  const s = 220;
  const off = document.createElement("canvas");
  off.width = s;
  off.height = s;
  const g = off.getContext("2d");

  // Base ground
  g.fillStyle = "#07110c";
  g.fillRect(0, 0, s, s);

  // Soft patches
  for (let i = 0; i < 260; i += 1) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = 10 + Math.random() * 40;
    const a = 0.02 + Math.random() * 0.05;
    g.fillStyle = `rgba(80, 150, 95, ${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Blade-like strokes
  g.strokeStyle = "rgba(160, 220, 180, 0.05)";
  g.lineWidth = 1;
  for (let i = 0; i < 900; i += 1) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const len = 6 + Math.random() * 14;
    const ang = (-0.8 + Math.random() * 1.6) * Math.PI;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }

  return ctx.createPattern(off, "repeat");
}

// Smooth path: Catmull-Rom spline sampling over segment centers
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
  };
}

function buildInterpolatedCenters() {
  const n = snake.length;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const a = prevSnake[i] ?? prevSnake[prevSnake.length - 1] ?? snake[i];
    const b = snake[i];
    // Interpolate segment positions between ticks.
    const x = a.x + (b.x - a.x) * stepProgress;
    const y = a.y + (b.y - a.y) * stepProgress;
    out.push({ x: (x + 0.5) * cellPx, y: (y + 0.5) * cellPx });
  }
  return out;
}

function sampleSmoothPath(centers) {
  // More samples = smoother bends.
  const points = [];
  // Dynamic sampling: keep the curve smooth, but reduce work for long snakes.
  // (Lag reports usually come from too many points + multiple thick strokes.)
  const len = centers.length;
  const samplesPer = clamp(Math.round(9 - len / 18), 4, 8);
  for (let i = 0; i < centers.length - 1; i += 1) {
    const p0 = centers[i - 1] ?? centers[i];
    const p1 = centers[i];
    const p2 = centers[i + 1];
    const p3 = centers[i + 2] ?? centers[i + 1];
    for (let s = 0; s < samplesPer; s += 1) {
      const t = s / samplesPer;
      points.push(catmullRom(p0, p1, p2, p3, t));
    }
  }
  points.push(centers[centers.length - 1]);
  return points;
}

function getHeadVector(pathPoints) {
  if (pathPoints.length < 2) return { x: 1, y: 0 };
  const a = pathPoints[0];
  const b = pathPoints[1];
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function renderBackground(timeSec) {
  ctx.save();
  ctx.fillStyle = grassPattern || "#07110c";

  // Camera-like movement: background slowly drifts with the camera.
  const driftX = Math.sin(timeSec * 0.35) * 6;
  const driftY = Math.cos(timeSec * 0.33) * 6;
  ctx.translate(-camera.x * 0.04 + driftX, -camera.y * 0.04 + driftY);
  ctx.fillRect(-60, -60, canvas.width / DPR + 120, canvas.height / DPR + 120);
  ctx.restore();

  // Vignette
  if (vignetteGradient) {
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, cachedSize.w, cachedSize.h);
  }
}

function renderFood(timeSec) {
  const cx = (food.x + 0.5) * cellPx;
  const cy = (food.y + 0.5) * cellPx;
  const r = cellPx * 0.22;
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * 3.1);

  // Glow
  const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * (2.8 + pulse));
  g.addColorStop(0, "rgba(255,90,106,0.95)");
  g.addColorStop(0.35, "rgba(255,90,106,0.42)");
  g.addColorStop(1, "rgba(255,90,106,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * (2.6 + pulse), 0, Math.PI * 2);
  ctx.fill();

  // Core
  const core = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r * 1.4);
  core.addColorStop(0, "rgba(255,255,255,0.9)");
  core.addColorStop(0.25, "rgba(255,140,150,0.95)");
  core.addColorStop(1, "rgba(255,90,106,1)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
  ctx.fill();
}

function renderSnake(timeSec) {
  const centers = buildInterpolatedCenters();
  const path = sampleSmoothPath(centers);

  // Update camera smoothing towards head.
  const head = centers[0] ?? { x: 0, y: 0 };
  camera.x += (head.x - camera.x) * 0.12;
  camera.y += (head.y - camera.y) * 0.12;

  const w = canvas.width / DPR;
  const h = canvas.height / DPR;

  // Under-shadow
  ctx.save();
  ctx.translate(0, cellPx * 0.12);
  ctx.beginPath();
  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  // Avoid ctx.filter blur (expensive); use shadowBlur instead.
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = cellPx * 0.58;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 2;
  ctx.stroke();
  ctx.restore();

  // Body base (darker edge)
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = "rgba(18, 55, 34, 0.95)";
  ctx.lineWidth = cellPx * 0.58;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();

  // Body main with highlight (cached gradient)
  const grad = bodyGradient || "rgba(114, 232, 159, 0.95)";

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = grad;
  ctx.lineWidth = cellPx * 0.50;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(114, 232, 159, 0.10)";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // Subtle top highlight (thin stroke)
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    if (i === 0) ctx.moveTo(p.x, p.y - cellPx * 0.07);
    else ctx.lineTo(p.x, p.y - cellPx * 0.07);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = cellPx * 0.16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();

  // Head (slightly larger)
  const headV = getHeadVector(path);
  const headAngle = Math.atan2(headV.y, headV.x);

  // Small living motion: bob + turn pulse
  const bob = Math.sin(timeSec * 7.2) * cellPx * 0.03;
  const pulse = easeInOut(clamp(turnPulse, 0, 1)) * cellPx * 0.06;
  const hx = head.x + headV.x * pulse;
  const hy = head.y + headV.y * pulse + bob;

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(headAngle);

  const headR = cellPx * 0.34;
  const headGrad = ctx.createRadialGradient(-headR * 0.2, -headR * 0.2, 0, 0, 0, headR * 2.1);
  headGrad.addColorStop(0, "rgba(190, 255, 220, 0.85)");
  headGrad.addColorStop(0.25, "rgba(114, 232, 159, 0.95)");
  headGrad.addColorStop(1, "rgba(25, 80, 48, 0.98)");

  // Head shadow
  ctx.save();
  ctx.translate(cellPx * 0.10, cellPx * 0.14);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 0, headR * 1.05, headR * 0.85, 0, 0, Math.PI * 2);
  ctx.filter = "blur(6px)";
  ctx.fill();
  ctx.restore();

  // Head body
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, headR * 1.15, headR * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostril hint
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(headR * 0.85, -headR * 0.18, headR * 0.10, headR * 0.06, 0, 0, Math.PI * 2);
  ctx.ellipse(headR * 0.85, headR * 0.18, headR * 0.10, headR * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (blink animation)
  // blinkPhase: 0 open, 1 closed
  const lid = easeInOut(clamp(blinkPhase, 0, 1));
  const eyeY = headR * 0.28;
  const eyeX = headR * 0.25;
  const eyeR = headR * 0.10;
  const eyeH = Math.max(0.8, eyeR * (1 - lid * 0.95));

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.beginPath();
  ctx.ellipse(eyeX, -eyeY, eyeR, eyeH, 0, 0, Math.PI * 2);
  ctx.ellipse(eyeX, eyeY, eyeR, eyeH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tiny specular dot when open
  if (lid < 0.25) {
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.35, -eyeY - eyeR * 0.15, eyeR * 0.25, 0, Math.PI * 2);
    ctx.arc(eyeX + eyeR * 0.35, eyeY - eyeR * 0.15, eyeR * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Forked tongue (smooth)
  const tongue = easeInOut(clamp(tonguePhase, 0, 1));
  if (tongue > 0.01) {
    const tLen = headR * (0.65 + tongue * 0.9);
    const tW = Math.max(1.2, headR * 0.07);
    const tY = 0;
    ctx.strokeStyle = "rgba(255, 90, 106, 0.95)";
    ctx.lineWidth = tW;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(headR * 1.05, tY);
    ctx.lineTo(headR * 1.05 + tLen * 0.78, tY);
    ctx.stroke();

    // Fork
    const fork = tLen * 0.26;
    ctx.beginPath();
    ctx.moveTo(headR * 1.05 + tLen * 0.78, tY);
    ctx.lineTo(headR * 1.05 + tLen * 0.78 + fork, tY - fork * 0.35);
    ctx.moveTo(headR * 1.05 + tLen * 0.78, tY);
    ctx.lineTo(headR * 1.05 + tLen * 0.78 + fork, tY + fork * 0.35);
    ctx.stroke();
  }

  ctx.restore();

  // Subtle rim light near head
  ctx.save();
  const rim = ctx.createRadialGradient(hx, hy, cellPx * 0.2, hx, hy, cellPx * 2.2);
  rim.addColorStop(0, "rgba(114,232,159,0.10)");
  rim.addColorStop(1, "rgba(114,232,159,0)");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(hx, hy, cellPx * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render(timeMs) {
  const timeSec = timeMs / 1000;
  const w = canvas.width / DPR;
  const h = canvas.height / DPR;

  ctx.clearRect(0, 0, w, h);
  renderBackground(timeSec);
  renderFood(timeSec);
  renderSnake(timeSec);

  // World border (subtle)
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
}

function updateAnimations(dt) {
  // Tongue: extend/retract every few seconds.
  tongueTimer += dt;
  const cycle = 2.6; // seconds
  const t = (tongueTimer % cycle) / cycle; // 0..1
  // Create a short pulse window.
  if (t < 0.18) tonguePhase = easeInOut(t / 0.18);
  else if (t < 0.34) tonguePhase = easeInOut(1 - (t - 0.18) / 0.16);
  else tonguePhase = 0;

  // Blink: irregular-ish, but deterministic enough.
  blinkTimer += dt;
  const blinkCycle = 3.7;
  const b = (blinkTimer % blinkCycle) / blinkCycle;
  if (b < 0.06) blinkPhase = easeInOut(b / 0.06);
  else if (b < 0.12) blinkPhase = easeInOut(1 - (b - 0.06) / 0.06);
  else blinkPhase = 0;

  // Head turn pulse decays after a turn.
  turnPulse = Math.max(0, turnPulse - dt * 2.4);
}

function loop(now) {
  const dtMs = Math.min(40, now - lastTime);
  lastTime = now;
  const dt = dtMs / 1000;

  // Smoothly ease tick interval changes so speed increases aren't "felt" as a jump.
  if (speedEaseT < 1) {
    speedEaseT = clamp(speedEaseT + dtMs / SPEED_EASE_MS, 0, 1);
    const eased = easeInOut(speedEaseT);
    stepMsCurrent = stepMsFrom + (stepMsTarget - stepMsFrom) * eased;
  } else {
    stepMsCurrent = stepMsTarget;
  }

  // Step the mechanics on a fixed tick, but render smoothly.
  stepAccumulator += dtMs;
  while (stepAccumulator >= stepMsCurrent) {
    stepAccumulator -= stepMsCurrent;
    step();
  }
  stepProgress = clamp(stepAccumulator / stepMsCurrent, 0, 1);

  updateAnimations(dt);
  render(now);

  requestAnimationFrame(loop);
}

function onKeyDown(e) {
  if (e.key === "ArrowUp") setDirection({ x: 0, y: -1 });
  else if (e.key === "ArrowDown") setDirection({ x: 0, y: 1 });
  else if (e.key === "ArrowLeft") setDirection({ x: -1, y: 0 });
  else if (e.key === "ArrowRight") setDirection({ x: 1, y: 0 });
  else if (e.key === "Enter") resetGame();
  else return;

  e.preventDefault();
}

btnRestart.addEventListener("click", (e) => {
  e.preventDefault();
  resetGame();
});

window.addEventListener("keydown", onKeyDown, { passive: false });
window.addEventListener("resize", resize);

resize();
resetGame();
requestAnimationFrame(loop);
