import { useEffect, useRef, useState } from "react";

import { LEVELS } from "./levels.js";

const W = 20;
const H = 20;
const CELL = 28;
const STORAGE_KEY = "snake-realms-progress";

const defaultProgress = { totalApples: 0, bestScore: 0, clearedLevels: [] };

function readProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw);
    return {
      totalApples: Math.max(0, Number(parsed.totalApples) || 0),
      bestScore: Math.max(0, Number(parsed.bestScore) || 0),
      clearedLevels: Array.isArray(parsed.clearedLevels)
        ? parsed.clearedLevels.filter(Number.isInteger)
        : []
    };
  } catch {
    return defaultProgress;
  }
}

function pointKey({ x, y }) {
  return `${x},${y}`;
}

function samePoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

function inside({ x, y }) {
  return x >= 0 && x < W && y >= 0 && y < H;
}

function canUnlock(level, progress) {
  return progress.totalApples >= level.unlockApples;
}

function forbiddenStartZone() {
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  const zone = new Set();
  for (let y = cy - 2; y <= cy + 2; y += 1) {
    for (let x = cx - 3; x <= cx + 3; x += 1) zone.add(`${x},${y}`);
  }
  return zone;
}

function makeObstacles(level) {
  const blocked = new Set();
  const forbidden = forbiddenStartZone();
  const add = (x, y) => {
    const key = `${x},${y}`;
    if (!inside({ x, y }) || forbidden.has(key)) return;
    blocked.add(key);
  };

  switch (level.obstacleMode.type) {
    case "random": {
      let tries = 0;
      while (blocked.size < level.obstacleMode.count && tries < 1200) {
        tries += 1;
        const x = Math.floor(Math.random() * W);
        const y = Math.floor(Math.random() * H);
        let safe = true;
        for (let oy = -level.obstacleMode.spacing; oy <= level.obstacleMode.spacing; oy += 1) {
          for (let ox = -level.obstacleMode.spacing; ox <= level.obstacleMode.spacing; ox += 1) {
            if (blocked.has(`${x + ox},${y + oy}`)) safe = false;
          }
        }
        if (safe) add(x, y);
      }
      break;
    }
    case "lanes":
      for (let y = 2; y < H - 2; y += 1) {
        if (y !== 6 && y !== 13) add(6, y);
        if (y !== 6 && y !== 13) add(13, y);
      }
      break;
    case "corners":
      for (let i = 0; i < 5; i += 1) {
        add(2 + i, 2); add(2, 2 + i); add(W - 3 - i, 2); add(W - 3, 2 + i);
        add(2 + i, H - 3); add(2, H - 3 - i); add(W - 3 - i, H - 3); add(W - 3, H - 3 - i);
      }
      break;
    case "spiral":
      for (let x = 3; x < W - 3; x += 1) add(x, 3);
      for (let y = 3; y < H - 4; y += 1) add(W - 4, y);
      for (let x = W - 4; x >= 5; x -= 1) add(x, H - 4);
      for (let y = H - 4; y >= 6; y -= 1) add(5, y);
      for (let x = 5; x < W - 6; x += 1) add(x, 6);
      for (let y = 6; y < H - 6; y += 1) add(W - 7, y);
      break;
    case "islands":
      [[4, 4], [10, 4], [15, 5], [5, 11], [11, 10], [15, 14]].forEach(([x, y]) => {
        add(x, y); add(x + 1, y); add(x, y + 1); add(x + 1, y + 1);
      });
      break;
    case "cross":
      for (let i = 3; i < W - 3; i += 1) if (i < 8 || i > 11) add(i, 9);
      for (let i = 2; i < H - 2; i += 1) if (i < 7 || i > 12) add(10, i);
      break;
    case "gates":
      for (let x = 2; x < W - 2; x += 1) {
        if (x !== 5 && x !== 14) add(x, 5);
        if (x !== 8 && x !== 11) add(x, 14);
      }
      break;
    case "crown":
      for (let x = 4; x <= 15; x += 1) { add(x, 4); add(x, 15); }
      for (let y = 5; y <= 14; y += 1) { add(4, y); add(15, y); }
      ["6,7", "7,7", "8,7", "11,7", "12,7", "13,7", "7,12", "8,12", "11,12", "12,12"].forEach((k) => blocked.add(k));
      break;
    case "labyrinth":
      for (let x = 2; x <= 17; x += 1) { if (x !== 4 && x !== 15) add(x, 2); if (x !== 7 && x !== 12) add(x, 17); }
      for (let y = 4; y <= 15; y += 1) { if (y !== 9 && y !== 10) add(5, y); if (y !== 6 && y !== 13) add(14, y); }
      for (let x = 5; x <= 14; x += 1) { if (x !== 9 && x !== 10) add(x, 8); if (x !== 7 && x !== 12) add(x, 11); }
      break;
    default:
      break;
  }

  return Array.from(blocked).map((value) => {
    const [x, y] = value.split(",").map(Number);
    return { x, y };
  });
}

function spawnFood(snake, obstacles) {
  const occupied = new Set(snake.map(pointKey));
  obstacles.forEach((point) => occupied.add(pointKey(point)));
  const open = [];
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (!occupied.has(`${x},${y}`)) open.push({ x, y });
  return open.length ? open[Math.floor(Math.random() * open.length)] : null;
}

function newGame(level) {
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  const snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
  const obstacles = makeObstacles(level);
  return {
    snake,
    direction: { x: 1, y: 0 },
    queuedDirection: null,
    obstacles,
    food: spawnFood(snake, obstacles),
    score: 0,
    status: "ready",
    pulse: 0,
    message: "Press any arrow key or tap Start Run to begin."
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, width, height, radius);
  else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
}

function paintBoard(ctx, level, game, bestScore) {
  const width = W * CELL;
  const height = H * CELL;
  const pulse = 0.5 + Math.sin(game.pulse) * 0.5;
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, level.palette.bgA);
  bg.addColorStop(1, level.palette.bgB);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const aura = ctx.createRadialGradient(width * 0.35, height * 0.2, CELL, width * 0.35, height * 0.2, width * 0.9);
  aura.addColorStop(0, level.palette.glow);
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
      roundRect(ctx, x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4, 8);
      ctx.fill();
    }
  }

  game.obstacles.forEach(({ x, y }) => {
    const rock = ctx.createLinearGradient(x * CELL, y * CELL, x * CELL + CELL, y * CELL + CELL);
    rock.addColorStop(0, "rgba(255,255,255,0.18)");
    rock.addColorStop(0.45, "rgba(80,92,106,0.95)");
    rock.addColorStop(1, "rgba(26,32,39,1)");
    ctx.fillStyle = rock;
    roundRect(ctx, x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 6, 10);
    ctx.fill();
  });

  if (game.food) {
    const fx = game.food.x * CELL + CELL / 2;
    const fy = game.food.y * CELL + CELL / 2;
    const glow = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL * (0.55 + pulse * 0.25));
    glow.addColorStop(0, "rgba(255,243,202,0.95)");
    glow.addColorStop(0.45, "rgba(255,92,104,0.8)");
    glow.addColorStop(1, "rgba(255,92,104,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * (0.55 + pulse * 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff5c68";
    ctx.beginPath();
    ctx.arc(fx, fy + 1, CELL * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7cff9f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx + 1, fy - CELL * 0.18);
    ctx.quadraticCurveTo(fx + 6, fy - CELL * 0.32, fx + 8, fy - CELL * 0.44);
    ctx.stroke();
  }

  game.snake.slice().reverse().forEach((segment, reverseIndex) => {
    const index = game.snake.length - 1 - reverseIndex;
    const isHead = index === 0;
    const x = segment.x * CELL;
    const y = segment.y * CELL;
    const fill = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
    if (isHead) {
      fill.addColorStop(0, "#efffd8");
      fill.addColorStop(0.45, "#95ff8d");
      fill.addColorStop(1, "#2b7b2e");
    } else {
      fill.addColorStop(0, "#8de88f");
      fill.addColorStop(0.4, "#4dbb53");
      fill.addColorStop(1, "#175221");
    }
    ctx.shadowColor = isHead ? "rgba(156,255,141,0.4)" : "rgba(0,0,0,0.2)";
    ctx.shadowBlur = isHead ? 16 : 8;
    ctx.fillStyle = fill;
    roundRect(ctx, x + 2 + (isHead ? -1 : 0), y + 3, CELL - 4 + (isHead ? 2 : 0), CELL - 6, isHead ? 12 : 10);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  const head = game.snake[0];
  if (head) {
    const { x, y } = head;
    const hx = x * CELL;
    const hy = y * CELL;
    const dir = game.direction;
    const eyeX1 = dir.x === 1 ? 17 : dir.x === -1 ? 8 : 11;
    const eyeX2 = dir.x === 1 ? 17 : dir.x === -1 ? 8 : 17;
    const eyeY1 = dir.y === 1 ? 16 : dir.y === -1 ? 8 : 9;
    const eyeY2 = dir.y === 1 ? 16 : dir.y === -1 ? 8 : 17;
    ctx.fillStyle = "#132214";
    ctx.beginPath();
    ctx.arc(hx + eyeX1, hy + eyeY1, 2.4, 0, Math.PI * 2);
    ctx.arc(hx + eyeX2, hy + eyeY2, 2.4, 0, Math.PI * 2);
    ctx.fill();
    const tx = hx + CELL / 2 + dir.x * 8;
    const ty = hy + CELL / 2 + dir.y * 8;
    ctx.strokeStyle = "#ff6f7d";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + dir.x * 8 + (dir.y !== 0 ? -3 : 0), ty + dir.y * 8 - 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  roundRect(ctx, 2, 2, width - 4, height - 4, 20);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = "700 14px 'Exo 2', sans-serif";
  ctx.fillText(`Goal ${level.goal}`, 18, 28);
  ctx.fillText(`Best ${bestScore}`, width - 90, 28);
}

function LevelCard({ level, progress, selected, onSelect }) {
  const unlocked = canUnlock(level, progress);
  const cleared = progress.clearedLevels.includes(level.id);
  return (
    <button
      className={`levelCard ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}`}
      type="button"
      disabled={!unlocked}
      onClick={() => unlocked && onSelect(level.id)}
    >
      <div className="levelBadge">Level {level.id}</div>
      <h3>{level.name}</h3>
      <p>{level.description}</p>
      <div className="levelMeta">
        <span>{level.theme}</span>
        <span>{unlocked ? `Goal ${level.goal}` : `Unlock at ${level.unlockApples} apples`}</span>
      </div>
      <div className="levelState">{cleared ? "Cleared" : unlocked ? "Ready" : "Locked"}</div>
    </button>
  );
}

function MenuScreen({ progress, onStart }) {
  return (
    <section className="screen heroScreen">
      <div className="heroGlow" />
      <div className="heroPanel">
        <div className="eyebrow">React Snake Adventure</div>
        <h1>Snake Realms</h1>
        <p className="heroCopy">A more cinematic snake game with level unlocks, richer maps, and a living serpent style.</p>
        <div className="heroStats">
          <div><span>Total Apples</span><strong>{progress.totalApples}</strong></div>
          <div><span>Best Score</span><strong>{progress.bestScore}</strong></div>
          <div><span>Levels Cleared</span><strong>{progress.clearedLevels.length}/10</strong></div>
        </div>
        <button className="primaryButton" type="button" onClick={onStart}>Start Adventure</button>
      </div>
      <div className="heroArt">
        <div className="snakeHalo" />
        <div className="snakePreview">
          <span className="segment head" /><span className="segment" /><span className="segment" /><span className="segment" /><span className="segment tail" />
        </div>
      </div>
    </section>
  );
}

function LevelsScreen({ progress, selectedLevelId, onSelectLevel, onBack, onPlay }) {
  const selectedLevel = LEVELS.find((level) => level.id === selectedLevelId) ?? LEVELS[0];
  return (
    <section className="screen levelsScreen">
      <div className="screenHeader">
        <div><div className="eyebrow">Choose A Challenge</div><h2>Level Select</h2></div>
        <button className="secondaryButton" type="button" onClick={onBack}>Back</button>
      </div>
      <div className="levelSummary">
        <div><span>Total Apples</span><strong>{progress.totalApples}</strong></div>
        <div><span>Selected Level</span><strong>{selectedLevel.name}</strong></div>
        <div><span>Unlock Rule</span><strong>{selectedLevel.unlockApples === 0 ? "Available now" : `${selectedLevel.unlockApples} apples`}</strong></div>
      </div>
      <div className="levelsGrid">
        {LEVELS.map((level) => (
          <LevelCard key={level.id} level={level} progress={progress} selected={level.id === selectedLevelId} onSelect={onSelectLevel} />
        ))}
      </div>
      <div className="selectedPanel">
        <div className="selectedCopy">
          <h3>{selectedLevel.name}</h3>
          <p>{selectedLevel.description}</p>
          <div className="selectedMeta">
            <span>{selectedLevel.theme}</span>
            <span>Goal {selectedLevel.goal}</span>
            <span>Speed {selectedLevel.speedMs} ms</span>
          </div>
        </div>
        <button className="primaryButton" type="button" disabled={!canUnlock(selectedLevel, progress)} onClick={() => onPlay(selectedLevel.id)}>Play Level {selectedLevel.id}</button>
      </div>
    </section>
  );
}

function GameScreen({ level, progress, onBackToLevels, onProgress }) {
  const canvasRef = useRef(null);
  const [game, setGame] = useState(() => newGame(level));

  useEffect(() => setGame(newGame(level)), [level]);

  useEffect(() => {
    const handleKey = (event) => {
      const key = event.key.toLowerCase();
      const direction = key === "arrowup" || key === "w" ? { x: 0, y: -1 } : key === "arrowdown" || key === "s" ? { x: 0, y: 1 } : key === "arrowleft" || key === "a" ? { x: -1, y: 0 } : key === "arrowright" || key === "d" ? { x: 1, y: 0 } : null;
      if (!direction) {
        if (key === "r") setGame(newGame(level));
        return;
      }
      event.preventDefault();
      setGame((current) => direction.x === -current.direction.x && direction.y === -current.direction.y ? current : { ...current, status: current.status === "ready" ? "playing" : current.status, queuedDirection: direction, message: "" });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [level]);

  useEffect(() => {
    if (game.status !== "playing" && game.status !== "ready") return undefined;
    const timer = window.setInterval(() => {
      setGame((current) => {
        const pulse = current.pulse + 0.24;
        if (current.status === "ready") return { ...current, pulse };
        const direction = current.queuedDirection ?? current.direction;
        const head = current.snake[0];
        const nextHead = { x: head.x + direction.x, y: head.y + direction.y };
        const willEat = Boolean(current.food && samePoint(nextHead, current.food));
        const body = willEat ? current.snake : current.snake.slice(0, current.snake.length - 1);
        const hitSnake = body.some((segment) => samePoint(segment, nextHead));
        const hitObstacle = current.obstacles.some((segment) => samePoint(segment, nextHead));
        if (!inside(nextHead) || hitSnake || hitObstacle) return { ...current, direction, queuedDirection: null, status: "game_over", pulse, message: "The serpent crashed. Restart and strike again." };
        const snake = [nextHead, ...current.snake];
        let score = current.score;
        let status = "playing";
        let message = "";
        let food = current.food;
        if (willEat) {
          score += 1;
          food = spawnFood(snake, current.obstacles);
          if (score >= level.goal) {
            status = "won";
            message = `${level.name} cleared. Head back to levels for the next challenge.`;
          }
          onProgress({ applesEarned: 1, bestScore: score, clearedLevelId: status === "won" ? level.id : null });
        } else snake.pop();
        return { ...current, snake, direction, queuedDirection: null, score, status, message, food, pulse };
      });
    }, level.speedMs);
    return () => window.clearInterval(timer);
  }, [game.status, level, onProgress]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintBoard(ctx, level, game, progress.bestScore);
  }, [game, level, progress.bestScore]);

  const turn = (direction) => {
    setGame((current) => direction.x === -current.direction.x && direction.y === -current.direction.y ? current : { ...current, status: current.status === "ready" ? "playing" : current.status, queuedDirection: direction, message: "" });
  };

  return (
    <section className="screen gameScreen">
      <div className="screenHeader">
        <div><div className="eyebrow">Level {level.id}</div><h2>{level.name}</h2></div>
        <button className="secondaryButton" type="button" onClick={onBackToLevels}>Levels</button>
      </div>
      <div className="gameLayout">
        <div className="boardPanel">
          <canvas ref={canvasRef} width={W * CELL} height={H * CELL} className="gameCanvas" />
          <div className={`gameOverlay ${game.status === "playing" ? "hidden" : ""}`}>
            <div className="overlayCard">
              <div className="overlayTitle">{game.status === "won" ? "Level Cleared" : game.status === "game_over" ? "Serpent Down" : "Ready To Hunt"}</div>
              <p>{game.message}</p>
              <div className="overlayActions">
                {game.status !== "won" && <button className="primaryButton" type="button" onClick={() => setGame((current) => ({ ...current, status: current.status === "ready" ? "playing" : current.status, message: "" }))}>Start Run</button>}
                <button className="secondaryButton" type="button" onClick={() => setGame(newGame(level))}>Restart</button>
              </div>
            </div>
          </div>
        </div>
        <aside className="hudPanel">
          <div className="hudStat"><span>Score</span><strong>{game.score}</strong></div>
          <div className="hudStat"><span>Goal</span><strong>{level.goal}</strong></div>
          <div className="hudStat"><span>Total Apples</span><strong>{progress.totalApples}</strong></div>
          <div className="hudStat"><span>Best Score</span><strong>{progress.bestScore}</strong></div>
          <div className="controlsPanel">
            <button className="secondaryButton" type="button" onClick={() => turn({ x: 0, y: -1 })}>Up</button>
            <div className="controlRow">
              <button className="secondaryButton" type="button" onClick={() => turn({ x: -1, y: 0 })}>Left</button>
              <button className="secondaryButton" type="button" onClick={() => turn({ x: 1, y: 0 })}>Right</button>
            </div>
            <button className="secondaryButton" type="button" onClick={() => turn({ x: 0, y: 1 })}>Down</button>
          </div>
          <p className="controlsHint">Controls: Arrow keys or WASD. Press <kbd>R</kbd> to restart.</p>
        </aside>
      </div>
    </section>
  );
}

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [selectedLevelId, setSelectedLevelId] = useState(1);
  const [activeLevelId, setActiveLevelId] = useState(1);
  const [progress, setProgress] = useState(() => readProgress());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const activeLevel = LEVELS.find((level) => level.id === activeLevelId) ?? LEVELS[0];

  const handleProgress = ({ applesEarned, bestScore, clearedLevelId }) => {
    setProgress((current) => ({
      totalApples: current.totalApples + applesEarned,
      bestScore: Math.max(current.bestScore, bestScore),
      clearedLevels: clearedLevelId ? Array.from(new Set([...current.clearedLevels, clearedLevelId])).sort((a, b) => a - b) : current.clearedLevels
    }));
  };

  return (
    <main className="appShell">
      {screen === "menu" && <MenuScreen progress={progress} onStart={() => { setSelectedLevelId(1); setScreen("levels"); }} />}
      {screen === "levels" && <LevelsScreen progress={progress} selectedLevelId={selectedLevelId} onSelectLevel={setSelectedLevelId} onBack={() => setScreen("menu")} onPlay={(levelId) => { setActiveLevelId(levelId); setScreen("game"); }} />}
      {screen === "game" && <GameScreen key={activeLevel.id} level={activeLevel} progress={progress} onBackToLevels={() => setScreen("levels")} onProgress={handleProgress} />}
    </main>
  );
}
