import { createGame, Direction, restartGame, setDirection, tick, togglePause } from "./logic.js";
import { render, setupCanvas } from "./render.js";

const GRID_W = 20;
const GRID_H = 20;
const CELL = 20;
const TICK_MS = 110;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const overlayEl = document.getElementById("overlay");
const overlayCardEl = document.getElementById("overlayCard");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayHintEl = document.getElementById("overlayHint");
const btnOverlayRestart = document.getElementById("btnOverlayRestart");

const btnBack = document.getElementById("btnBack");
const btnRestart = document.getElementById("btnRestart");
const btnPause = document.getElementById("btnPause");
const btnUp = document.getElementById("btnUp");
const btnDown = document.getElementById("btnDown");
const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");
const stageEl = document.querySelector(".stage");

setupCanvas(canvas, GRID_W, GRID_H, CELL);

let state = createGame({ width: GRID_W, height: GRID_H, initialLength: 3, rng: Math.random });
let lastScore = state.score;
let crashPlayed = false;

// Simple SFX (Web Audio API), no external audio files.
let audioCtx = null;
let audioMaster = null;
let audioUnlocked = false;

function ensureAudio() {
  if (audioCtx) return true;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  audioCtx = new Ctx();
  audioMaster = audioCtx.createGain();
  audioMaster.gain.value = 0.12;
  audioMaster.connect(audioCtx.destination);
  return true;
}

async function unlockAudio() {
  if (audioUnlocked) return;
  if (!ensureAudio()) return;
  try {
    if (audioCtx.state !== "running") await audioCtx.resume();
    audioUnlocked = audioCtx.state === "running";
  } catch {
    // Ignore
  }
}

function playTone({ type = "sine", f0 = 440, f1 = 440, duration = 0.12, gain = 0.6 } = {}) {
  if (!audioUnlocked || !audioCtx || !audioMaster) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + duration);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g);
  g.connect(audioMaster);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playNoiseBurst({ duration = 0.10, gain = 0.5 } = {}) {
  if (!audioUnlocked || !audioCtx || !audioMaster) return;
  const now = audioCtx.currentTime;
  const bufferSize = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 180;

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(audioMaster);
  src.start(now);
  src.stop(now + duration + 0.02);
}

function sfxEat() {
  playTone({ type: "triangle", f0: 420, f1: 840, duration: 0.09, gain: 0.55 });
  playTone({ type: "sine", f0: 760, f1: 560, duration: 0.07, gain: 0.25 });
}

function sfxCrash() {
  playNoiseBurst({ duration: 0.12, gain: 0.55 });
  playTone({ type: "sawtooth", f0: 160, f1: 70, duration: 0.18, gain: 0.45 });
}

function updateHighScoreIfNeeded() {
  const raw = localStorage.getItem("snakeHighScore");
  const best = Number.isFinite(Number(raw)) ? Math.max(0, Math.trunc(Number(raw))) : 0;
  if (state.score > best) localStorage.setItem("snakeHighScore", String(state.score));
}

function updateUI() {
  scoreEl.textContent = String(state.score);

  if (state.status === "playing") {
    overlayEl.hidden = true;
    if (overlayCardEl) overlayCardEl.classList.remove("popupOnly");
  } else {
    overlayEl.hidden = false;
    if (state.status === "paused") {
      overlayTitleEl.textContent = "Paused";
      overlayTitleEl.hidden = false;
      overlayHintEl.textContent = "Press Space to resume.";
      if (overlayCardEl) overlayCardEl.classList.remove("popupOnly");
    } else {
      // Foul: show only the restart popup (no "Game Over" text).
      overlayTitleEl.textContent = "";
      overlayTitleEl.hidden = true;
      overlayHintEl.textContent = "";
      if (overlayCardEl) overlayCardEl.classList.add("popupOnly");
    }
  }

  btnPause.textContent = state.status === "paused" ? "Resume (Space)" : "Pause (Space)";
  btnOverlayRestart.hidden = state.status !== "game_over";
}

function frame() {
  render(ctx, state, CELL);
  updateUI();
}

function doRestart() {
  updateHighScoreIfNeeded();
  state = restartGame(state, { rng: Math.random });
  lastScore = state.score;
  crashPlayed = false;
  frame();
}

function doPauseToggle() {
  state = togglePause(state);
  frame();
}

function setDir(dir) {
  state = setDirection(state, dir);
}

function swipeToDirection(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? Direction.Right : Direction.Left;
  return dy > 0 ? Direction.Down : Direction.Up;
}

function keyToDirection(key) {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return Direction.Up;
    case "ArrowDown":
    case "s":
    case "S":
      return Direction.Down;
    case "ArrowLeft":
    case "a":
    case "A":
      return Direction.Left;
    case "ArrowRight":
    case "d":
    case "D":
      return Direction.Right;
    default:
      return null;
  }
}

function onKeyDown(e) {
  const dir = keyToDirection(e.key);
  if (dir) {
    e.preventDefault();
    setDir(dir);
    unlockAudio();
    return;
  }

  if (e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    doPauseToggle();
    unlockAudio();
    return;
  }

  if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    doRestart();
    unlockAudio();
  }
}

function buttonPress(button, action) {
  let ignoreClickUntil = 0;

  button.addEventListener("click", (e) => {
    if (performance.now() < ignoreClickUntil) return;
    e.preventDefault();
    action();
    unlockAudio();
  });

  // Trigger immediately on touch/pen without double-firing the later click event.
  button.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    e.preventDefault();
    ignoreClickUntil = performance.now() + 400;
    action();
    unlockAudio();
  });
}

buttonPress(btnRestart, doRestart);
buttonPress(btnPause, doPauseToggle);
buttonPress(btnUp, () => setDir(Direction.Up));
buttonPress(btnDown, () => setDir(Direction.Down));
buttonPress(btnLeft, () => setDir(Direction.Left));
buttonPress(btnRight, () => setDir(Direction.Right));

buttonPress(btnOverlayRestart, doRestart);
if (btnBack) {
  buttonPress(btnBack, () => {
    updateHighScoreIfNeeded();
    window.location.href = "/";
  });
}

window.addEventListener("keydown", onKeyDown, { passive: false });
window.addEventListener("pointerdown", unlockAudio, { passive: true, once: true });

if (stageEl) {
  let swipeStart = null;
  const minimumSwipe = 24;

  stageEl.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    swipeStart = { x: event.clientX, y: event.clientY };
  });

  stageEl.addEventListener("pointerup", (event) => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < minimumSwipe) return;
    setDir(swipeToDirection(dx, dy));
    unlockAudio();
  });

  stageEl.addEventListener("pointercancel", () => {
    swipeStart = null;
  });
}

setInterval(() => {
  state = tick(state, Math.random);
  if (state.score > lastScore) sfxEat();
  lastScore = state.score;
  if (state.status === "game_over") updateHighScoreIfNeeded();
  if (state.status === "game_over" && !crashPlayed) {
    sfxCrash();
    crashPlayed = true;
  }
  frame();
}, TICK_MS);

frame();
