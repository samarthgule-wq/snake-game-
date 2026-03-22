import { useEffect, useMemo, useRef, useState } from "react";

import { LEVELS } from "./levels.js";
import { SNAKES } from "./snakes.js";

const W = 20;
const H = 20;
const CELL = 28;
const STORAGE_KEY = "snake-realms-progress";

const defaultProgress = {
  totalApples: 0,
  bestScore: 0,
  clearedLevels: [],
  coins: 0,
  purchasedSkins: [SNAKES[0].id],
  selectedSkinId: SNAKES[0].id
};

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
        : [],
      coins: Math.max(0, Number(parsed.coins) || 0),
      purchasedSkins: Array.isArray(parsed.purchasedSkins) && parsed.purchasedSkins.length
        ? Array.from(new Set(parsed.purchasedSkins.filter((id) => SNAKES.some((snake) => snake.id === id))))
        : [SNAKES[0].id],
      selectedSkinId: SNAKES.some((snake) => snake.id === parsed.selectedSkinId)
        ? parsed.selectedSkinId
        : SNAKES[0].id
    };
  } catch {
    return defaultProgress;
  }
}

function samePoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

function inside({ x, y }) {
  return x >= 0 && x < W && y >= 0 && y < H;
}

function pointKey({ x, y }) {
  return `${x},${y}`;
}

function canUnlockLevel(level, progress) {
  return (
    progress.totalApples >= level.requirements.apples &&
    progress.coins >= level.requirements.coins &&
    progress.bestScore >= level.requirements.rank &&
    progress.purchasedSkins.includes(level.requirements.snakeId)
  );
}

function getSnakeName(snakeId) {
  return SNAKES.find((snake) => snake.id === snakeId)?.name ?? "Unknown Snake";
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

function createObstacles(level) {
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
      ["6,7", "7,7", "8,7", "11,7", "12,7", "13,7", "7,12", "8,12", "11,12", "12,12"].forEach((key) => blocked.add(key));
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
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!occupied.has(`${x},${y}`)) open.push({ x, y });
    }
  }
  return open.length ? open[Math.floor(Math.random() * open.length)] : null;
}

function createGame(level) {
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  const snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
  const obstacles = createObstacles(level);
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

function paintBoard(ctx, level, game, bestScore, skin, options = {}) {
  const { hideSnake = false } = options;
  const width = W * CELL;
  const height = H * CELL;
  const pulse = 0.5 + Math.sin(game.pulse) * 0.5;
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, level.palette.bgA);
  background.addColorStop(1, level.palette.bgB);
  ctx.fillStyle = background;
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

  if (!hideSnake) {
    game.snake.slice().reverse().forEach((segment, reverseIndex) => {
      const index = game.snake.length - 1 - reverseIndex;
      const isHead = index === 0;
      const x = segment.x * CELL;
      const y = segment.y * CELL;
      const bodyFill = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
      bodyFill.addColorStop(0, skin.colors[0]);
      bodyFill.addColorStop(0.5, skin.colors[1]);
      bodyFill.addColorStop(1, skin.colors[2]);
      ctx.shadowColor = isHead ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)";
      ctx.shadowBlur = isHead ? 16 : 8;
      ctx.fillStyle = bodyFill;
      roundRect(ctx, x + 2 + (isHead ? -1 : 0), y + 3, CELL - 4 + (isHead ? 2 : 0), CELL - 6, isHead ? 12 : 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = skin.stripe;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 7, y + CELL * 0.42);
      ctx.lineTo(x + CELL - 7, y + CELL * 0.42);
      ctx.moveTo(x + 8, y + CELL * 0.62);
      ctx.lineTo(x + CELL - 8, y + CELL * 0.62);
      ctx.stroke();
    });

    const head = game.snake[0];
    if (head) {
      const hx = head.x * CELL;
      const hy = head.y * CELL;
      const dir = game.direction;
      const eyeX1 = dir.x === 1 ? 17 : dir.x === -1 ? 8 : 11;
      const eyeX2 = dir.x === 1 ? 17 : dir.x === -1 ? 8 : 17;
      const eyeY1 = dir.y === 1 ? 16 : dir.y === -1 ? 8 : 9;
      const eyeY2 = dir.y === 1 ? 16 : dir.y === -1 ? 8 : 17;
      ctx.fillStyle = "#111";
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
  const unlocked = canUnlockLevel(level, progress);
  const cleared = progress.clearedLevels.includes(level.id);
  const requiredSnake = getSnakeName(level.requirements.snakeId);
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
        <span>Goal {level.goal}</span>
        <span>{level.requirements.apples} apples</span>
        <span>{level.requirements.coins} coins</span>
        <span>Rank {level.requirements.rank}</span>
        <span>{requiredSnake}</span>
      </div>
      <div className="levelState">{cleared ? "Cleared" : unlocked ? "Ready" : "Locked"}</div>
    </button>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="metricCard">
      <img className="metricIcon" src={icon} alt="" aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SnakeCard({ snake, progress, selected, onSelect, onBuy }) {
  const bought = progress.purchasedSkins.includes(snake.id);
  const { rank, coins, apples } = snake.requirements;
  const canBuy = bought || (progress.bestScore >= rank && progress.coins >= coins && progress.totalApples >= apples);

  return (
    <div className={`snakeCard ${selected ? "selected" : ""}`}>
      <div
        className={`snakeSwatch pattern-${snake.pattern}`}
        style={{ "--s0": snake.colors[0], "--s1": snake.colors[1], "--s2": snake.colors[2], "--stripe": snake.stripe }}
      >
        <div className="snakePortrait">
          <span className="portraitCoil portraitCoilA" />
          <span className="portraitCoil portraitCoilB" />
          <span className="portraitHead" />
          <span className="portraitEye portraitEyeA" />
          <span className="portraitEye portraitEyeB" />
        </div>
      </div>
      <div className="snakeInfo">
        <div className="snakeNameRow">
          <h3>{snake.name}</h3>
          <span>{snake.region}</span>
        </div>
        <p>{snake.description}</p>
        <div className="snakeRequirements">
          <span>Rank {rank}</span>
          <span>{apples} apples</span>
          <span>{coins} coins</span>
        </div>
        <div className="snakeActions">
          {bought ? (
            <button className="primaryButton" type="button" onClick={() => onSelect(snake.id)}>
              {selected ? "Selected" : "Select"}
            </button>
          ) : (
            <button className="secondaryButton" type="button" disabled={!canBuy} onClick={() => onBuy(snake.id)}>
              Buy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuScreen({ progress, onStart }) {
  return (
    <section className="screen heroScreen">
      <div className="heroGlow" />
      <div className="heroPanel">
        <div className="creatorBanner">SAMARTH GAMER'S</div>
        <img className="brandLogo" src="/snake-realms-logo.svg" alt="Snake Realms logo" />
        <div className="eyebrow">React Snake Adventure</div>
        <h1>Snake Realms</h1>
        <p className="heroCopy">Choose levels, collect apples one by one correctly, earn gold coins, and unlock snakes from all around the world.</p>
        <div className="heroStats">
          <MetricCard icon="/apple-icon.svg" label="Total Apples" value={progress.totalApples} />
          <MetricCard icon="/coin-icon.svg" label="Coins" value={progress.coins} />
          <div><span>Best Rank</span><strong>{progress.bestScore}</strong></div>
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
  const requiredSnake = getSnakeName(selectedLevel.requirements.snakeId);
  return (
    <section className="screen levelsScreen">
      <div className="screenHeader">
        <div>
          <img className="headerLogo" src="/snake-realms-logo.svg" alt="Snake Realms logo" />
          <div className="eyebrow">Choose A Challenge</div>
          <h2>Level Select</h2>
        </div>
        <button className="secondaryButton" type="button" onClick={onBack}>Back</button>
      </div>
      <div className="levelSummary">
        <MetricCard icon="/apple-icon.svg" label="Total Apples" value={progress.totalApples} />
        <MetricCard icon="/coin-icon.svg" label="Coins" value={progress.coins} />
        <div><span>Best Rank</span><strong>{progress.bestScore}</strong></div>
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
            <span>{selectedLevel.requirements.apples} apples</span>
            <span>{selectedLevel.requirements.coins} coins</span>
            <span>Rank {selectedLevel.requirements.rank}</span>
            <span>{requiredSnake}</span>
          </div>
        </div>
        <button className="primaryButton" type="button" disabled={!canUnlockLevel(selectedLevel, progress)} onClick={() => onPlay(selectedLevel.id)}>
          Play Level {selectedLevel.id}
        </button>
      </div>
    </section>
  );
}

function SnakeCollectionScreen({ level, progress, selectedSkinId, onSelectSkin, onBuySkin, onBack, onStartGame }) {
  const requiredSnake = getSnakeName(level.requirements.snakeId);
  const hasRequiredSnake = progress.purchasedSkins.includes(level.requirements.snakeId);
  const usingRequiredSnake = selectedSkinId === level.requirements.snakeId;
  return (
    <section className="screen levelsScreen">
      <div className="screenHeader">
        <div>
          <img className="headerLogo" src="/snake-realms-logo.svg" alt="Snake Realms logo" />
          <div className="eyebrow">World Snake Collection</div>
          <h2>Choose Your Snake</h2>
        </div>
        <button className="secondaryButton" type="button" onClick={onBack}>Back</button>
      </div>
      <div className="levelSummary">
        <div><span>Current Level</span><strong>{level.name}</strong></div>
        <MetricCard icon="/apple-icon.svg" label="Total Apples" value={progress.totalApples} />
        <div><span>Coins / Rank</span><strong>{progress.coins} / {progress.bestScore}</strong></div>
      </div>
      <div className="snakeGrid">
        {SNAKES.map((snake) => (
          <SnakeCard key={snake.id} snake={snake} progress={progress} selected={selectedSkinId === snake.id} onSelect={onSelectSkin} onBuy={onBuySkin} />
        ))}
      </div>
      <div className="selectedPanel">
        <div className="selectedCopy">
          <h3>Shop Logic</h3>
          <p>This level needs {requiredSnake}. A level opens only when apples, coins, rank, and the required snake are all ready.</p>
          <div className="selectedMeta">
            <span>2 score = 1 gold coin</span>
            <span>1 apple = 1 apple count</span>
            <span>{level.requirements.apples} apples</span>
            <span>{level.requirements.coins} coins</span>
            <span>Rank {level.requirements.rank}</span>
          </div>
        </div>
        <button className="primaryButton" type="button" disabled={!hasRequiredSnake || !usingRequiredSnake} onClick={onStartGame}>
          Start With {requiredSnake}
        </button>
      </div>
    </section>
  );
}

function GameScreen({ level, skin, progress, onBackToSnakes, onRewards }) {
  const canvasRef = useRef(null);
  const [game, setGame] = useState(() => createGame(level));
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef("ready");
  const lastSoundRef = useRef({ score: 0, status: "ready" });
  const audioRef = useRef({ ctx: null, master: null, unlocked: false });

  function ensureAudio() {
    if (audioRef.current.ctx) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.13;
    master.connect(ctx.destination);
    audioRef.current = { ctx, master, unlocked: false };
    return true;
  }

  async function unlockAudio() {
    if (!ensureAudio()) return;
    const audio = audioRef.current;
    try {
      if (audio.ctx.state !== "running") await audio.ctx.resume();
      audio.unlocked = audio.ctx.state === "running";
    } catch {
      // Ignore browser autoplay restrictions until the next interaction.
    }
  }

  function playTone({ type = "sine", f0 = 440, f1 = 440, duration = 0.12, gain = 0.4 } = {}) {
    const audio = audioRef.current;
    if (!audio.unlocked || !audio.ctx || !audio.master) return;
    const now = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), now + duration);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(audio.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playNoise(duration = 0.12, gain = 0.35, filterType = "highpass", filterFreq = 320) {
    const audio = audioRef.current;
    if (!audio.unlocked || !audio.ctx || !audio.master) return;
    const now = audio.ctx.currentTime;
    const size = Math.floor(audio.ctx.sampleRate * duration);
    const buffer = audio.ctx.createBuffer(1, size, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = audio.ctx.createBufferSource();
    const filter = audio.ctx.createBiquadFilter();
    const g = audio.ctx.createGain();
    src.buffer = buffer;
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(audio.master);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  function playEatSound() {
    playTone({ type: "triangle", f0: 420, f1: 880, duration: 0.09, gain: 0.45 });
    playTone({ type: "sine", f0: 760, f1: 620, duration: 0.06, gain: 0.22 });
  }

  function playFoulSound() {
    playNoise(0.12, 0.34, "highpass", 280);
    playTone({ type: "sawtooth", f0: 180, f1: 72, duration: 0.18, gain: 0.34 });
  }

  function playEagleSound() {
    playTone({ type: "square", f0: 1080, f1: 920, duration: 0.08, gain: 0.16 });
    playTone({ type: "triangle", f0: 920, f1: 680, duration: 0.12, gain: 0.18 });
    playTone({ type: "square", f0: 1240, f1: 980, duration: 0.09, gain: 0.14 });
  }

  useEffect(() => {
    const next = createGame(level);
    setGame(next);
    prevScoreRef.current = 0;
    prevStatusRef.current = "ready";
    lastSoundRef.current = { score: 0, status: "ready" };
  }, [level, skin.id]);

  useEffect(() => {
    if (game.status !== "caught") return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) =>
        current.status === "caught"
          ? {
              ...current,
              status: "game_over",
              message: "The eagle escaped with your snake. Try again."
            }
          : current
      );
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [game.status]);

  useEffect(() => {
    const handleKey = (event) => {
      const key = event.key.toLowerCase();
      const direction = key === "arrowup" || key === "w" ? { x: 0, y: -1 } : key === "arrowdown" || key === "s" ? { x: 0, y: 1 } : key === "arrowleft" || key === "a" ? { x: -1, y: 0 } : key === "arrowright" || key === "d" ? { x: 1, y: 0 } : null;
      if (!direction) {
        if (key === "r") {
          unlockAudio();
          setGame(createGame(level));
          prevScoreRef.current = 0;
          prevStatusRef.current = "ready";
        }
        return;
      }
      event.preventDefault();
      unlockAudio();
      setGame((current) => {
        if (direction.x === -current.direction.x && direction.y === -current.direction.y) return current;
        return {
          ...current,
          status: current.status === "ready" ? "playing" : current.status,
          queuedDirection: direction,
          message: ""
        };
      });
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
        const nextHead = { x: current.snake[0].x + direction.x, y: current.snake[0].y + direction.y };
        const willEat = Boolean(current.food && samePoint(nextHead, current.food));
        const body = willEat ? current.snake : current.snake.slice(0, current.snake.length - 1);
        const hitSnake = body.some((segment) => samePoint(segment, nextHead));
        const hitObstacle = current.obstacles.some((segment) => samePoint(segment, nextHead));
        if (!inside(nextHead) || hitSnake || hitObstacle) {
          return {
            ...current,
            direction,
            queuedDirection: null,
            status: "caught",
            pulse,
            message: "Foul! An eagle spotted the snake."
          };
        }
        const snakeState = [nextHead, ...current.snake];
        let score = current.score;
        let status = "playing";
        let message = "";
        let food = current.food;
        if (willEat) {
          score += 1;
          food = spawnFood(snakeState, current.obstacles);
          if (score >= level.goal) {
            status = "won";
            message = `${level.name} cleared. Head back for the next challenge.`;
          }
        } else {
          snakeState.pop();
        }
        return {
          ...current,
          snake: snakeState,
          direction,
          queuedDirection: null,
          score,
          status,
          message,
          food,
          pulse
        };
      });
    }, level.speedMs);
    return () => window.clearInterval(timer);
  }, [game.status, level]);

  useEffect(() => {
    if (game.score > lastSoundRef.current.score) {
      playEatSound();
    }
    if (game.status === "caught" && lastSoundRef.current.status !== "caught") {
      playFoulSound();
      playEagleSound();
    }
    lastSoundRef.current = { score: game.score, status: game.status };
  }, [game.score, game.status]);

  useEffect(() => {
    const previousScore = prevScoreRef.current;
    const previousStatus = prevStatusRef.current;
    if (game.score > previousScore || (game.status === "won" && previousStatus !== "won")) {
      const applesEarned = Math.max(0, game.score - previousScore);
      const coinsEarned = Math.max(0, Math.floor(game.score / 2) - Math.floor(previousScore / 2));
      onRewards({
        applesEarned,
        coinsEarned,
        bestScore: game.score,
        clearedLevelId: game.status === "won" && previousStatus !== "won" ? level.id : null
      });
      prevScoreRef.current = game.score;
      prevStatusRef.current = game.status;
    } else if (game.score < previousScore || game.status !== previousStatus) {
      prevScoreRef.current = game.score;
      prevStatusRef.current = game.status;
    }
  }, [game.score, game.status, level.id, onRewards]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintBoard(ctx, level, game, progress.bestScore, skin, { hideSnake: game.status === "caught" });
  }, [game, level, progress.bestScore, skin]);

  const turn = (direction) => {
    setGame((current) => {
      if (direction.x === -current.direction.x && direction.y === -current.direction.y) return current;
      return {
        ...current,
        status: current.status === "ready" ? "playing" : current.status,
        queuedDirection: direction,
        message: ""
      };
    });
  };

  const caughtHead = game.snake[0];
  const eaglePickupStyle = caughtHead
    ? {
        left: `${((caughtHead.x + 0.5) / W) * 100}%`,
        top: `${((caughtHead.y + 0.5) / H) * 100}%`
      }
    : undefined;

  return (
    <section className="screen gameScreen">
      <div className="screenHeader">
        <div>
          <img className="headerLogo" src="/snake-realms-logo.svg" alt="Snake Realms logo" />
          <div className="eyebrow">Level {level.id}</div>
          <h2>{level.name}</h2>
        </div>
        <button className="secondaryButton" type="button" onClick={onBackToSnakes}>Snake Collection</button>
      </div>
      <div className="gameLayout">
        <div className="boardPanel">
          <canvas ref={canvasRef} width={W * CELL} height={H * CELL} className="gameCanvas" />
          <div className={`gameOverlay ${game.status === "playing" ? "hidden" : ""}`}>
            <div className="overlayCard">
              <div className="overlayTitle">{game.status === "won" ? "Level Cleared" : game.status === "game_over" ? "Serpent Down" : game.status === "caught" ? "Eagle Attack" : "Ready To Hunt"}</div>
              <p>{game.message}</p>
              <div className="overlayActions">
                {game.status !== "won" && game.status !== "caught" && (
                  <button className="primaryButton" type="button" onClick={() => { unlockAudio(); setGame((current) => ({ ...current, status: current.status === "ready" ? "playing" : current.status, message: "" })); }}>
                    Start Run
                  </button>
                )}
                {game.status !== "caught" && (
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => {
                      unlockAudio();
                      setGame(createGame(level));
                      prevScoreRef.current = 0;
                      prevStatusRef.current = "ready";
                    }}
                  >
                    Restart
                  </button>
                )}
              </div>
            </div>
          </div>
          {game.status === "caught" && (
            <div className="eagleScene" aria-hidden="true">
              <div className="eagle eaglePickup" style={eaglePickupStyle}>
                <span className="eagleWing eagleWingLeft" />
                <span className="eagleBody" />
                <span className="eagleWing eagleWingRight" />
                <span className="eagleClaw" />
                <span className="eagleSnake" />
              </div>
            </div>
          )}
        </div>
        <aside className="hudPanel">
          <div className="hudStat"><span>Score</span><strong>{game.score}</strong></div>
          <MetricCard icon="/coin-icon.svg" label="Coins This Run" value={Math.floor(game.score / 2)} />
          <MetricCard icon="/apple-icon.svg" label="Total Apples" value={progress.totalApples} />
          <MetricCard icon="/coin-icon.svg" label="Coins" value={progress.coins} />
          <div className="hudStat"><span>Snake</span><strong>{skin.name}</strong></div>
          <div className="controlsPanel">
            <button className="secondaryButton" type="button" onClick={() => { unlockAudio(); turn({ x: 0, y: -1 }); }}>Up</button>
            <div className="controlRow">
              <button className="secondaryButton" type="button" onClick={() => { unlockAudio(); turn({ x: -1, y: 0 }); }}>Left</button>
              <button className="secondaryButton" type="button" onClick={() => { unlockAudio(); turn({ x: 1, y: 0 }); }}>Right</button>
            </div>
            <button className="secondaryButton" type="button" onClick={() => { unlockAudio(); turn({ x: 0, y: 1 }); }}>Down</button>
          </div>
          <p className="controlsHint">Controls: Arrow keys or WASD. Apple count now moves one apple at a time, and coins follow the rule 2 score = 1 coin.</p>
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

  useEffect(() => {
    if (!progress.purchasedSkins.includes(progress.selectedSkinId)) {
      setProgress((current) => ({ ...current, selectedSkinId: current.purchasedSkins[0] || SNAKES[0].id }));
    }
  }, [progress]);

  const selectedLevel = useMemo(
    () => LEVELS.find((level) => level.id === selectedLevelId) ?? LEVELS[0],
    [selectedLevelId]
  );
  const activeLevel = useMemo(
    () => LEVELS.find((level) => level.id === activeLevelId) ?? LEVELS[0],
    [activeLevelId]
  );
  const activeSkin = useMemo(
    () => SNAKES.find((snake) => snake.id === progress.selectedSkinId) ?? SNAKES[0],
    [progress.selectedSkinId]
  );

  const buySkin = (snakeId) => {
    const snake = SNAKES.find((item) => item.id === snakeId);
    if (!snake) return;
    const { rank, apples, coins } = snake.requirements;
    setProgress((current) => {
      const alreadyBought = current.purchasedSkins.includes(snakeId);
      if (alreadyBought) return { ...current, selectedSkinId: snakeId };
      if (current.bestScore < rank || current.totalApples < apples || current.coins < coins) return current;
      return {
        ...current,
        coins: current.coins - coins,
        purchasedSkins: [...current.purchasedSkins, snakeId],
        selectedSkinId: snakeId
      };
    });
  };

  const applyRewards = ({ applesEarned, coinsEarned, bestScore, clearedLevelId }) => {
    setProgress((current) => ({
      ...current,
      totalApples: current.totalApples + applesEarned,
      coins: current.coins + coinsEarned,
      bestScore: Math.max(current.bestScore, bestScore),
      clearedLevels: clearedLevelId
        ? Array.from(new Set([...current.clearedLevels, clearedLevelId])).sort((a, b) => a - b)
        : current.clearedLevels
    }));
  };

  return (
    <main className="appShell">
      {screen === "menu" && (
        <MenuScreen progress={progress} onStart={() => { setSelectedLevelId(1); setScreen("levels"); }} />
      )}

      {screen === "levels" && (
        <LevelsScreen
          progress={progress}
          selectedLevelId={selectedLevelId}
          onSelectLevel={setSelectedLevelId}
          onBack={() => setScreen("menu")}
          onPlay={(levelId) => {
            setActiveLevelId(levelId);
            setScreen("snakes");
          }}
        />
      )}

      {screen === "snakes" && (
        <SnakeCollectionScreen
          level={selectedLevel}
          progress={progress}
          selectedSkinId={progress.selectedSkinId}
          onSelectSkin={(snakeId) => setProgress((current) => current.purchasedSkins.includes(snakeId) ? { ...current, selectedSkinId: snakeId } : current)}
          onBuySkin={buySkin}
          onBack={() => setScreen("levels")}
          onStartGame={() => {
            setActiveLevelId(selectedLevel.id);
            setScreen("game");
          }}
        />
      )}

      {screen === "game" && (
        <GameScreen
          key={`${activeLevel.id}-${activeSkin.id}`}
          level={activeLevel}
          skin={activeSkin}
          progress={progress}
          onBackToSnakes={() => setScreen("snakes")}
          onRewards={applyRewards}
        />
      )}
    </main>
  );
}
