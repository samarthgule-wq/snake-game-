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

setupCanvas(canvas, GRID_W, GRID_H, CELL);

let state = createGame({ width: GRID_W, height: GRID_H, initialLength: 3, rng: Math.random });

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
  frame();
}

function doPauseToggle() {
  state = togglePause(state);
  frame();
}

function setDir(dir) {
  state = setDirection(state, dir);
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
    return;
  }

  if (e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    doPauseToggle();
    return;
  }

  if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    doRestart();
  }
}

function buttonPress(button, action) {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    action();
  });

  // Helps on mobile: prevent accidental double-tap zoom/scroll intent.
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    action();
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

setInterval(() => {
  state = tick(state, Math.random);
  if (state.status === "game_over") updateHighScoreIfNeeded();
  frame();
}, TICK_MS);

frame();
