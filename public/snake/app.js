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
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayHintEl = document.getElementById("overlayHint");

const btnRestart = document.getElementById("btnRestart");
const btnPause = document.getElementById("btnPause");
const btnUp = document.getElementById("btnUp");
const btnDown = document.getElementById("btnDown");
const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");

setupCanvas(canvas, GRID_W, GRID_H, CELL);

let state = createGame({ width: GRID_W, height: GRID_H, initialLength: 3, rng: Math.random });

function updateUI() {
  scoreEl.textContent = String(state.score);

  if (state.status === "playing") {
    overlayEl.hidden = true;
  } else {
    overlayEl.hidden = false;
    if (state.status === "paused") {
      overlayTitleEl.textContent = "Paused";
      overlayHintEl.textContent = "Press Space to resume, or R to restart.";
    } else {
      overlayTitleEl.textContent = "Game Over";
      overlayHintEl.textContent = "Press R to restart.";
    }
  }

  btnPause.textContent = state.status === "paused" ? "Resume (Space)" : "Pause (Space)";
}

function frame() {
  render(ctx, state, CELL);
  updateUI();
}

function doRestart() {
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

window.addEventListener("keydown", onKeyDown, { passive: false });

setInterval(() => {
  state = tick(state, Math.random);
  frame();
}, TICK_MS);

frame();

