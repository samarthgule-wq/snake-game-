const HIGH_SCORE_KEY = "snakeHighScore";

const highScoreEl = document.getElementById("highScore");
const menuHintEl = document.getElementById("menuHint");
const btnStart = document.getElementById("btnStart");
const btnResetHigh = document.getElementById("btnResetHigh");
const btnExit = document.getElementById("btnExit");

function getHighScore() {
  const raw = localStorage.getItem(HIGH_SCORE_KEY);
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function setHighScore(n) {
  localStorage.setItem(HIGH_SCORE_KEY, String(Math.max(0, Math.trunc(n))));
}

function updateUI() {
  highScoreEl.textContent = String(getHighScore());
}

btnStart.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "/game.html";
});

btnResetHigh.addEventListener("click", (e) => {
  e.preventDefault();
  setHighScore(0);
  menuHintEl.textContent = "High score reset.";
  updateUI();
});

btnExit.addEventListener("click", (e) => {
  e.preventDefault();
  menuHintEl.textContent = "To exit, close this browser tab/window.";
  try {
    window.close();
  } catch {
    // Most browsers block this.
  }
});

updateUI();

