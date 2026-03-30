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

function getDirectionFromKey(key) {
  const normalized = key.toLowerCase();
  if (normalized === "arrowup" || normalized === "w") return { x: 0, y: -1 };
  if (normalized === "arrowdown" || normalized === "s") return { x: 0, y: 1 };
  if (normalized === "arrowleft" || normalized === "a") return { x: -1, y: 0 };
  if (normalized === "arrowright" || normalized === "d") return { x: 1, y: 0 };
  return null;
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

function getSnakeById(snakeId) {
  return SNAKES.find((snake) => snake.id === snakeId) ?? SNAKES[0];
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
    case "orbit":
      [[5, 4], [6, 4], [7, 4], [12, 4], [13, 4], [14, 4], [4, 6], [15, 6], [4, 13], [15, 13], [5, 15], [6, 15], [7, 15], [12, 15], [13, 15], [14, 15]].forEach(([x, y]) => add(x, y));
      break;
    case "funnel":
      for (let y = 2; y <= 16; y += 1) {
        if (y < 8) { add(3 + y, y); add(16 - y, y); }
        if (y > 9) { add(y - 3, y); add(19 - y, y); }
      }
      break;
    case "columns":
      for (let y = 2; y <= 17; y += 1) {
        if (y !== 5 && y !== 11 && y !== 15) add(4, y);
        if (y !== 4 && y !== 9 && y !== 14) add(10, y);
        if (y !== 7 && y !== 12 && y !== 16) add(16, y);
      }
      break;
    case "flowers":
      [[4, 4], [10, 4], [15, 4], [6, 9], [12, 9], [4, 14], [10, 14], [15, 14]].forEach(([x, y]) => {
        add(x, y); add(x + 1, y); add(x - 1, y); add(x, y + 1); add(x, y - 1);
      });
      break;
    case "teeth":
      for (let x = 2; x <= 17; x += 2) {
        add(x, 4); add(x + 1, 5);
        add(x, 14); add(x + 1, 13);
      }
      break;
    case "craters":
      [[4, 4], [8, 5], [13, 4], [16, 7], [5, 10], [10, 10], [14, 12], [7, 15], [12, 15]].forEach(([x, y]) => {
        add(x, y); add(x + 1, y); add(x, y + 1); add(x + 1, y + 1);
      });
      break;
    case "spine":
      for (let y = 2; y <= 17; y += 1) if (y !== 9 && y !== 10) add(10, y);
      for (let x = 4; x <= 16; x += 3) { add(x, 6); add(x, 13); }
      break;
    case "crownmaze":
      for (let x = 3; x <= 16; x += 1) { if (x !== 9 && x !== 10) add(x, 3); if (x !== 6 && x !== 13) add(x, 16); }
      for (let y = 4; y <= 15; y += 1) { if (y !== 7 && y !== 12) add(3, y); if (y !== 5 && y !== 14) add(16, y); }
      ["6,6", "7,6", "12,6", "13,6", "6,13", "7,13", "12,13", "13,13", "9,8", "10,8", "9,11", "10,11"].forEach((key) => blocked.add(key));
      break;
    case "vault":
      for (let x = 2; x <= 17; x += 1) {
        if (![4, 9, 14].includes(x)) add(x, 6);
        if (![6, 11, 16].includes(x)) add(x, 13);
      }
      for (let y = 7; y <= 12; y += 1) { if (y !== 9 && y !== 10) add(9, y); if (y !== 8 && y !== 11) add(12, y); }
      break;
    case "rivers":
      for (let y = 3; y <= 16; y += 1) {
        if (y !== 8 && y !== 12) add(6, y);
        if (y !== 5 && y !== 9 && y !== 14) add(12, y);
      }
      for (let x = 8; x <= 16; x += 1) if (x !== 10 && x !== 14) add(x, 9);
      break;
    case "fortress":
      for (let x = 4; x <= 15; x += 1) { add(x, 4); add(x, 15); }
      for (let y = 5; y <= 14; y += 1) { add(4, y); add(15, y); }
      for (let y = 7; y <= 12; y += 1) { add(8, y); add(11, y); }
      ["6,6", "13,6", "6,13", "13,13", "9,9", "10,9", "9,10", "10,10"].forEach((key) => blocked.add(key));
      break;
    case "corridors":
      for (let x = 2; x <= 17; x += 1) if (![5, 10, 15].includes(x)) add(x, 5);
      for (let x = 2; x <= 17; x += 1) if (![4, 9, 14].includes(x)) add(x, 10);
      for (let x = 2; x <= 17; x += 1) if (![6, 11, 16].includes(x)) add(x, 15);
      break;
    case "halo":
      for (let x = 5; x <= 14; x += 1) { add(x, 5); add(x, 14); }
      for (let y = 6; y <= 13; y += 1) { add(5, y); add(14, y); }
      ["8,8", "11,8", "8,11", "11,11"].forEach((key) => blocked.add(key));
      break;
    case "catacomb":
      for (let x = 2; x <= 17; x += 1) { if (![4, 9, 14].includes(x)) add(x, 3); if (![6, 10, 15].includes(x)) add(x, 16); }
      for (let y = 5; y <= 14; y += 1) { if (![8, 11].includes(y)) add(6, y); if (![6, 9, 12].includes(y)) add(13, y); }
      for (let x = 6; x <= 13; x += 1) { if (![8, 11].includes(x)) add(x, 9); }
      break;
    case "apocalypse":
      for (let x = 2; x <= 17; x += 1) { if (![5, 14].includes(x)) add(x, 2); if (![4, 9, 15].includes(x)) add(x, 17); }
      for (let y = 4; y <= 15; y += 1) { if (![7, 12].includes(y)) add(4, y); if (![5, 10, 14].includes(y)) add(15, y); }
      for (let x = 6; x <= 13; x += 1) { if (![8, 11].includes(x)) add(x, 6); if (![7, 10, 12].includes(x)) add(x, 13); }
      ["8,9", "9,9", "10,9", "11,9", "8,10", "11,10"].forEach((key) => blocked.add(key));
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

function createPreviewObstacles(level) {
  if (level.obstacleMode.type === "random") {
    return [
      { x: 3, y: 3 }, { x: 5, y: 6 }, { x: 8, y: 4 }, { x: 10, y: 7 }, { x: 12, y: 3 },
      { x: 14, y: 6 }, { x: 16, y: 9 }, { x: 4, y: 11 }, { x: 7, y: 13 }, { x: 11, y: 12 },
      { x: 14, y: 14 }, { x: 17, y: 5 }
    ];
  }
  return createObstacles(level);
}

function getHazardColors(level) {
  switch (level.hazardType) {
    case "fireball":
      return { primary: "#ff7c39", secondary: "#ffca63", detail: "#6e1200", preview: "#ff8d4f" };
    case "snowball":
      return { primary: "#e9fbff", secondary: "#8cdfff", detail: "#2d5a6f", preview: "#d0f6ff" };
    case "lightning":
      return { primary: "#e5d1ff", secondary: "#8fa3ff", detail: "#31285d", preview: "#bdbfff" };
    case "poison":
      return { primary: "#b4ff56", secondary: "#51a432", detail: "#173614", preview: "#adff74" };
    case "crystal":
      return { primary: "#8ae8ff", secondary: "#f0afff", detail: "#2b305e", preview: "#bde9ff" };
    case "meteor":
      return { primary: "#ffb077", secondary: "#754029", detail: "#2a140b", preview: "#e79967" };
    case "plasma":
      return { primary: "#82ffe0", secondary: "#54a8ff", detail: "#15395a", preview: "#9afff1" };
    case "apocalypse":
      return { primary: "#ffd96b", secondary: "#ff6d4b", detail: "#391a23", preview: "#ffd785" };
    default:
      return { primary: "rgba(190, 200, 214, 0.78)", secondary: "rgba(80,92,106,0.95)", detail: "rgba(26,32,39,1)", preview: "rgba(190, 200, 214, 0.78)" };
  }
}

function drawHazardCell(ctx, x, y, size, level, pulse) {
  const colors = getHazardColors(level);
  const px = x * size;
  const py = y * size;
  const inset = size * 0.12;
  const midX = px + size / 2;
  const midY = py + size / 2;

  switch (level.hazardType) {
    case "fireball": {
      const glow = ctx.createRadialGradient(midX, midY, 2, midX, midY, size * 0.56);
      glow.addColorStop(0, colors.secondary);
      glow.addColorStop(0.55, colors.primary);
      glow.addColorStop(1, colors.detail);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(midX, midY, size * (0.34 + pulse * 0.04), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 240, 194, 0.75)";
      ctx.beginPath();
      ctx.arc(midX - size * 0.08, midY - size * 0.08, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "snowball":
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(midX, midY, size * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = Math.max(1.2, size * 0.06);
      ctx.beginPath();
      ctx.arc(midX, midY, size * 0.18, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "lightning":
      roundRect(ctx, px + inset, py + inset, size - inset * 2, size - inset * 2, size * 0.18);
      ctx.fillStyle = colors.detail;
      ctx.fill();
      ctx.fillStyle = colors.secondary;
      ctx.beginPath();
      ctx.moveTo(midX - size * 0.12, py + size * 0.18);
      ctx.lineTo(midX + size * 0.02, midY - size * 0.02);
      ctx.lineTo(midX - size * 0.02, midY - size * 0.02);
      ctx.lineTo(midX + size * 0.12, py + size * 0.82);
      ctx.lineTo(midX - size * 0.02, midY + size * 0.06);
      ctx.lineTo(midX + size * 0.02, midY + size * 0.06);
      ctx.closePath();
      ctx.fill();
      break;
    case "poison":
      ctx.fillStyle = colors.detail;
      roundRect(ctx, px + inset, py + inset, size - inset * 2, size - inset * 2, size * 0.22);
      ctx.fill();
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(midX - size * 0.1, midY, size * 0.16, 0, Math.PI * 2);
      ctx.arc(midX + size * 0.1, midY + size * 0.04, size * 0.14, 0, Math.PI * 2);
      ctx.arc(midX, midY - size * 0.08, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "crystal":
      ctx.fillStyle = colors.secondary;
      ctx.beginPath();
      ctx.moveTo(midX, py + inset);
      ctx.lineTo(px + size - inset, midY);
      ctx.lineTo(midX, py + size - inset);
      ctx.lineTo(px + inset, midY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = Math.max(1, size * 0.05);
      ctx.stroke();
      break;
    case "meteor":
      ctx.fillStyle = colors.secondary;
      ctx.beginPath();
      ctx.arc(midX, midY, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.detail;
      ctx.beginPath();
      ctx.arc(midX - size * 0.1, midY - size * 0.06, size * 0.08, 0, Math.PI * 2);
      ctx.arc(midX + size * 0.1, midY + size * 0.1, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "plasma": {
      const glow = ctx.createRadialGradient(midX, midY, 1, midX, midY, size * 0.5);
      glow.addColorStop(0, colors.primary);
      glow.addColorStop(1, colors.detail);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(midX, midY, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = Math.max(1, size * 0.05);
      ctx.beginPath();
      ctx.arc(midX, midY, size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "apocalypse": {
      const ring = ctx.createRadialGradient(midX, midY, 1, midX, midY, size * 0.46);
      ring.addColorStop(0, colors.primary);
      ring.addColorStop(0.45, colors.secondary);
      ring.addColorStop(1, colors.detail);
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(midX, midY, size * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c6f8ff";
      ctx.lineWidth = Math.max(1, size * 0.04);
      ctx.beginPath();
      ctx.moveTo(midX, py + inset);
      ctx.lineTo(midX + size * 0.1, midY);
      ctx.lineTo(midX, py + size - inset);
      ctx.lineTo(midX - size * 0.1, midY);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    default: {
      const rock = ctx.createLinearGradient(px, py, px + size, py + size);
      rock.addColorStop(0, "rgba(255,255,255,0.18)");
      rock.addColorStop(0.45, "rgba(80,92,106,0.95)");
      rock.addColorStop(1, "rgba(26,32,39,1)");
      ctx.fillStyle = rock;
      roundRect(ctx, px + inset, py + inset, size - inset * 2, size - inset * 2, size * 0.24);
      ctx.fill();
    }
  }
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
    drawHazardCell(ctx, x, y, CELL, level, pulse);
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

function LevelMapPreview({ level, snake, compact = false }) {
  const previewObstacles = createPreviewObstacles(level);
  const previewSnake = compact
    ? [{ x: 4, y: 13 }, { x: 3, y: 13 }, { x: 2, y: 13 }]
    : [{ x: 6, y: 13 }, { x: 5, y: 13 }, { x: 4, y: 13 }, { x: 3, y: 13 }];
  const food = compact ? { x: 14, y: 5 } : { x: 15, y: 4 };
  const viewBox = `0 0 ${W * 10} ${H * 10}`;
  const colors = getHazardColors(level);

  return (
    <div className={`levelPreview ${compact ? "compact" : ""}`}>
      <svg className="levelPreviewMap" viewBox={viewBox} aria-hidden="true">
        <defs>
          <linearGradient id={`preview-bg-${level.id}`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop stopColor={level.palette.bgA} />
            <stop offset="1" stopColor={level.palette.bgB} />
          </linearGradient>
          <linearGradient id={`preview-snake-${level.id}`} x1="0" y1="20" x2="160" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor={snake.colors[0]} />
            <stop offset="0.5" stopColor={snake.colors[1]} />
            <stop offset="1" stopColor={snake.colors[2]} />
          </linearGradient>
        </defs>
        <rect width={W * 10} height={H * 10} rx="20" fill={`url(#preview-bg-${level.id})`} />
        {Array.from({ length: H }).flatMap((_, y) =>
          Array.from({ length: W }).map((__, x) => (
            <rect
              key={`cell-${x}-${y}`}
              x={x * 10 + 1}
              y={y * 10 + 1}
              width="8"
              height="8"
              rx="2"
              fill={(x + y) % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}
            />
          ))
        )}
        {previewObstacles.map((point) => (
          <g key={`rock-${point.x}-${point.y}`}>
            <rect
              x={point.x * 10 + 1.5}
              y={point.y * 10 + 1.5}
              width="7"
              height="7"
              rx="2.4"
              fill={colors.preview}
              opacity="0.88"
            />
            {(level.hazardType === "fireball" || level.hazardType === "snowball" || level.hazardType === "plasma" || level.hazardType === "apocalypse") && (
              <circle
                cx={point.x * 10 + 5}
                cy={point.y * 10 + 5}
                r="1.7"
                fill={colors.secondary}
                opacity="0.9"
              />
            )}
          </g>
        ))}
        {previewSnake.map((segment, index) => (
          <rect
            key={`snake-${segment.x}-${segment.y}`}
            x={segment.x * 10 + 1}
            y={segment.y * 10 + 1}
            width="8"
            height="8"
            rx={index === 0 ? "3.2" : "2.8"}
            fill={`url(#preview-snake-${level.id})`}
            stroke={snake.stripe}
            strokeWidth="0.8"
          />
        ))}
        <circle cx={food.x * 10 + 5} cy={food.y * 10 + 5} r="3.2" fill="#ff5c68" />
        <path
          d={`M${food.x * 10 + 5} ${food.y * 10 + 1.7} Q${food.x * 10 + 7.2} ${food.y * 10 + 0.6} ${food.x * 10 + 8.2} ${food.y * 10 - 1.1}`}
          stroke="#8eff95"
          strokeWidth="1.1"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <div className="levelPreviewSnake">
        <div
          className={`snakeSwatch previewSwatch pattern-${snake.pattern} species-${snake.portrait}`}
          style={{ "--s0": snake.colors[0], "--s1": snake.colors[1], "--s2": snake.colors[2], "--stripe": snake.stripe }}
        >
          <SnakePortraitSVG snake={snake} />
        </div>
        <div className="levelPreviewCopy">
          <span>Required Snake</span>
          <strong>{snake.name}</strong>
        </div>
      </div>
    </div>
  );
}

function LevelCard({ level, progress, selected, onSelect }) {
  const unlocked = canUnlockLevel(level, progress);
  const cleared = progress.clearedLevels.includes(level.id);
  const requiredSnake = getSnakeName(level.requirements.snakeId);
  const requiredSnakeData = getSnakeById(level.requirements.snakeId);
  return (
    <button
      className={`levelCard ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}`}
      type="button"
      disabled={!unlocked}
      onClick={() => unlocked && onSelect(level.id)}
    >
      <div className="levelBadge">Level {level.id}</div>
      <LevelMapPreview level={level} snake={requiredSnakeData} compact />
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

function SnakePortraitSVG({ snake }) {
  const [c0, c1, c2] = snake.colors;
  const stripe = snake.stripe;

  const renderSpecies = () => {
    switch (snake.portrait) {
      case "cobra":
        return (
          <>
            <ellipse cx="112" cy="52" rx="42" ry="30" fill={c1} />
            <ellipse cx="112" cy="52" rx="28" ry="20" fill={c0} opacity="0.55" />
            <path d="M28 102C52 88 69 89 82 77C93 67 98 59 112 58C129 57 142 67 150 82C158 96 171 103 195 101" fill="none" stroke={c2} strokeWidth="28" strokeLinecap="round" />
            <path d="M32 102C54 89 74 92 91 82" fill="none" stroke={stripe} strokeWidth="7" strokeLinecap="round" strokeDasharray="8 10" />
          </>
        );
      case "anaconda":
        return (
          <>
            <path d="M22 96C46 78 70 111 96 95C118 82 120 56 144 54C165 53 177 69 186 82" fill="none" stroke={c2} strokeWidth="30" strokeLinecap="round" />
            <path d="M26 94C48 76 68 108 95 93C118 80 123 57 142 56C162 55 173 68 183 80" fill="none" stroke={c1} strokeWidth="21" strokeLinecap="round" />
            <circle cx="60" cy="90" r="9" fill={c0} opacity="0.45" />
            <circle cx="92" cy="92" r="10" fill={c0} opacity="0.4" />
            <circle cx="128" cy="68" r="8" fill={c0} opacity="0.36" />
          </>
        );
      case "python":
        return (
          <>
            <path d="M24 104C43 78 70 84 86 96C101 108 118 102 132 89C149 74 164 61 188 68" fill="none" stroke={c2} strokeWidth="28" strokeLinecap="round" />
            <path d="M24 104C43 78 70 84 86 96C101 108 118 102 132 89C149 74 164 61 188 68" fill="none" stroke={c1} strokeWidth="18" strokeLinecap="round" />
            <ellipse cx="62" cy="88" rx="11" ry="7" fill={stripe} opacity="0.45" />
            <ellipse cx="104" cy="101" rx="12" ry="8" fill={stripe} opacity="0.38" />
            <ellipse cx="151" cy="78" rx="11" ry="7" fill={stripe} opacity="0.4" />
          </>
        );
      case "mamba":
        return (
          <>
            <path d="M22 102C62 95 86 66 112 59C142 51 167 61 194 79" fill="none" stroke={c2} strokeWidth="20" strokeLinecap="round" />
            <path d="M22 102C62 95 86 66 112 59C142 51 167 61 194 79" fill="none" stroke={c1} strokeWidth="11" strokeLinecap="round" />
            <path d="M166 62L190 67L176 79Z" fill="#121212" />
          </>
        );
      case "coral":
        return (
          <>
            <path d="M22 100C48 88 68 96 90 84C112 71 126 52 154 54C173 56 184 63 194 74" fill="none" stroke={c2} strokeWidth="20" strokeLinecap="round" />
            <path d="M22 100C48 88 68 96 90 84C112 71 126 52 154 54C173 56 184 63 194 74" fill="none" stroke={c1} strokeWidth="12" strokeLinecap="round" strokeDasharray="10 8 5 8" />
            <path d="M22 100C48 88 68 96 90 84C112 71 126 52 154 54C173 56 184 63 194 74" fill="none" stroke={stripe} strokeWidth="6" strokeLinecap="round" strokeDasharray="5 18" />
          </>
        );
      case "boa":
        return (
          <>
            <path d="M22 104C41 89 64 77 83 87C103 98 122 103 145 87C163 74 175 69 194 73" fill="none" stroke={c2} strokeWidth="27" strokeLinecap="round" />
            <path d="M22 104C41 89 64 77 83 87C103 98 122 103 145 87C163 74 175 69 194 73" fill="none" stroke={c1} strokeWidth="18" strokeLinecap="round" />
            <path d="M46 93C57 81 72 81 81 89" stroke={stripe} strokeWidth="6" strokeLinecap="round" />
            <path d="M110 99C121 88 135 86 145 91" stroke={stripe} strokeWidth="6" strokeLinecap="round" />
          </>
        );
      case "rattlesnake":
        return (
          <>
            <path d="M28 102C55 92 72 86 95 94C118 102 145 96 171 75C178 70 185 69 194 72" fill="none" stroke={c2} strokeWidth="24" strokeLinecap="round" />
            <path d="M28 102C55 92 72 86 95 94C118 102 145 96 171 75C178 70 185 69 194 72" fill="none" stroke={c1} strokeWidth="14" strokeLinecap="round" />
            <path d="M44 97L56 91L68 97L56 103Z" fill={stripe} opacity="0.5" />
            <path d="M101 94L114 88L126 94L114 100Z" fill={stripe} opacity="0.45" />
            <rect x="16" y="97" width="8" height="8" rx="2" fill="#d7b168" />
            <rect x="10" y="98" width="6" height="6" rx="2" fill="#b98934" />
          </>
        );
      case "treepython":
        return (
          <>
            <circle cx="72" cy="78" r="28" fill={c1} />
            <circle cx="72" cy="78" r="18" fill="none" stroke={c2} strokeWidth="10" />
            <path d="M70 78C89 66 110 53 138 52C162 52 181 61 194 73" fill="none" stroke={c2} strokeWidth="22" strokeLinecap="round" />
            <path d="M70 78C89 66 110 53 138 52C162 52 181 61 194 73" fill="none" stroke={c1} strokeWidth="12" strokeLinecap="round" />
          </>
        );
      case "seakrait":
        return (
          <>
            <path d="M24 100C46 88 65 89 88 75C111 61 139 52 168 58C179 61 188 66 194 72" fill="none" stroke={c2} strokeWidth="18" strokeLinecap="round" />
            <path d="M24 100C46 88 65 89 88 75C111 61 139 52 168 58C179 61 188 66 194 72" fill="none" stroke={c1} strokeWidth="10" strokeLinecap="round" strokeDasharray="10 10" />
            <path d="M24 100C46 88 65 89 88 75C111 61 139 52 168 58C179 61 188 66 194 72" fill="none" stroke={stripe} strokeWidth="4" strokeLinecap="round" strokeDasharray="3 17" />
          </>
        );
      case "bushmaster":
        return (
          <>
            <path d="M24 103C44 90 68 84 92 91C119 99 147 95 171 79C180 73 188 72 194 74" fill="none" stroke={c2} strokeWidth="26" strokeLinecap="round" />
            <path d="M24 103C44 90 68 84 92 91C119 99 147 95 171 79C180 73 188 72 194 74" fill="none" stroke={c1} strokeWidth="16" strokeLinecap="round" />
            <path d="M44 98L53 90L61 98" stroke={stripe} strokeWidth="5" strokeLinecap="round" />
            <path d="M91 94L100 86L108 94" stroke={stripe} strokeWidth="5" strokeLinecap="round" />
            <path d="M138 92L147 84L155 92" stroke={stripe} strokeWidth="5" strokeLinecap="round" />
          </>
        );
      case "gaboon":
        return (
          <>
            <path d="M24 104C49 88 72 80 96 88C120 96 143 94 170 76C179 70 187 69 194 72" fill="none" stroke={c2} strokeWidth="28" strokeLinecap="round" />
            <path d="M24 104C49 88 72 80 96 88C120 96 143 94 170 76C179 70 187 69 194 72" fill="none" stroke={c1} strokeWidth="18" strokeLinecap="round" />
            <path d="M52 94L64 86L76 94L64 102Z" fill={stripe} opacity="0.46" />
            <path d="M107 90L120 82L133 90L120 98Z" fill={stripe} opacity="0.42" />
          </>
        );
      default:
        return (
          <>
            <path d="M24 102C44 90 64 84 88 90C115 97 146 93 172 74C180 68 188 69 194 72" fill="none" stroke={c2} strokeWidth="22" strokeLinecap="round" />
            <path d="M24 102C44 90 64 84 88 90C115 97 146 93 172 74C180 68 188 69 194 72" fill="none" stroke={c1} strokeWidth="13" strokeLinecap="round" />
          </>
        );
    }
  };

  return (
    <svg className="snakeArtSvg" viewBox="0 0 220 120" aria-hidden="true">
      <defs>
        <linearGradient id={`body-${snake.id}`} x1="28" y1="20" x2="192" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor={c0} />
          <stop offset="0.5" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <g opacity="0.98">
        {renderSpecies()}
        <ellipse cx="182" cy="72" rx="11" ry="8" fill="#111" />
        <ellipse cx="171" cy="68" rx="7" ry="6" fill="#111" />
        <circle cx="184" cy="70" r="1.8" fill="white" opacity="0.7" />
        <circle cx="173" cy="66.5" r="1.4" fill="white" opacity="0.7" />
      </g>
    </svg>
  );
}

function SnakeCard({ snake, progress, selected, onSelect, onBuy }) {
  const bought = progress.purchasedSkins.includes(snake.id);
  const { rank, coins, apples } = snake.requirements;
  const canBuy = bought || (progress.bestScore >= rank && progress.coins >= coins && progress.totalApples >= apples);

  return (
    <div className={`snakeCard ${selected ? "selected" : ""}`}>
      <div
        className={`snakeSwatch pattern-${snake.pattern} species-${snake.portrait}`}
        style={{ "--s0": snake.colors[0], "--s1": snake.colors[1], "--s2": snake.colors[2], "--stripe": snake.stripe }}
      >
        <SnakePortraitSVG snake={snake} />
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

function CarouselControls({ current, total, onPrev, onNext }) {
  return (
    <div className="carouselControls">
      <button className="carouselArrow" type="button" onClick={onPrev} disabled={current <= 0} aria-label="Previous">
        ←
      </button>
      <div className="carouselCount">{current + 1} / {total}</div>
      <button className="carouselArrow" type="button" onClick={onNext} disabled={current >= total - 1} aria-label="Next">
        →
      </button>
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
  const selectedIndex = Math.max(0, LEVELS.findIndex((level) => level.id === selectedLevelId));
  const selectedLevel = LEVELS.find((level) => level.id === selectedLevelId) ?? LEVELS[0];
  const requiredSnake = getSnakeName(selectedLevel.requirements.snakeId);
  const requiredSnakeData = getSnakeById(selectedLevel.requirements.snakeId);
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
      <div className="carouselShell">
        <CarouselControls
          current={selectedIndex}
          total={LEVELS.length}
          onPrev={() => onSelectLevel(LEVELS[Math.max(0, selectedIndex - 1)].id)}
          onNext={() => onSelectLevel(LEVELS[Math.min(LEVELS.length - 1, selectedIndex + 1)].id)}
        />
        <div className="carouselStage">
          <LevelCard level={selectedLevel} progress={progress} selected onSelect={onSelectLevel} />
        </div>
      </div>
      <div className="selectedPanel">
        <div className="selectedCopy">
          <h3>{selectedLevel.name}</h3>
          <p>{selectedLevel.description}</p>
          <LevelMapPreview level={selectedLevel} snake={requiredSnakeData} />
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
  const [browseSnakeId, setBrowseSnakeId] = useState(selectedSkinId);

  useEffect(() => {
    setBrowseSnakeId(selectedSkinId);
  }, [selectedSkinId, level.id]);

  const requiredSnake = getSnakeName(level.requirements.snakeId);
  const hasRequiredSnake = progress.purchasedSkins.includes(level.requirements.snakeId);
  const usingRequiredSnake = selectedSkinId === level.requirements.snakeId;
  const browseIndex = Math.max(0, SNAKES.findIndex((snake) => snake.id === browseSnakeId));
  const browseSnake = SNAKES[browseIndex] ?? SNAKES[0];
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
      <div className="carouselShell">
        <CarouselControls
          current={browseIndex}
          total={SNAKES.length}
          onPrev={() => setBrowseSnakeId(SNAKES[Math.max(0, browseIndex - 1)].id)}
          onNext={() => setBrowseSnakeId(SNAKES[Math.min(SNAKES.length - 1, browseIndex + 1)].id)}
        />
        <div className="carouselStage">
          <SnakeCard snake={browseSnake} progress={progress} selected={selectedSkinId === browseSnake.id} onSelect={onSelectSkin} onBuy={onBuySkin} />
        </div>
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
  const boardPanelRef = useRef(null);
  const touchStartRef = useRef(null);
  const [game, setGame] = useState(() => createGame(level));
  const prevScoreRef = useRef(0);
  const prevStatusRef = useRef("ready");
  const lastSoundRef = useRef({ score: 0, status: "ready" });
  const audioRef = useRef({ ctx: null, master: null, unlocked: false });

  function restartRun() {
    setGame(createGame(level));
    prevScoreRef.current = 0;
    prevStatusRef.current = "ready";
  }

  function queueDirection(direction) {
    setGame((current) => {
      if (direction.x === -current.direction.x && direction.y === -current.direction.y) return current;
      return {
        ...current,
        status: current.status === "ready" ? "playing" : current.status,
        queuedDirection: direction,
        message: ""
      };
    });
  }

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
      const direction = getDirectionFromKey(key);
      if (!direction) {
        if (key === "r") {
          unlockAudio();
          restartRun();
        }
        return;
      }
      event.preventDefault();
      unlockAudio();
      queueDirection(direction);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [level]);

  useEffect(() => {
    const panel = boardPanelRef.current;
    if (!panel) return undefined;

    const minimumSwipe = 24;

    const onPointerDown = (event) => {
      if (event.pointerType === "mouse") return;
      touchStartRef.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < minimumSwipe) return;

      unlockAudio();
      if (Math.abs(dx) > Math.abs(dy)) {
        queueDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
        return;
      }
      queueDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
    };

    const clearSwipe = () => {
      touchStartRef.current = null;
    };

    panel.addEventListener("pointerdown", onPointerDown);
    panel.addEventListener("pointerup", onPointerUp);
    panel.addEventListener("pointercancel", clearSwipe);
    panel.addEventListener("pointerleave", clearSwipe);

    return () => {
      panel.removeEventListener("pointerdown", onPointerDown);
      panel.removeEventListener("pointerup", onPointerUp);
      panel.removeEventListener("pointercancel", clearSwipe);
      panel.removeEventListener("pointerleave", clearSwipe);
    };
  }, []);

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
        <div className="boardPanel" ref={boardPanelRef}>
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
                      restartRun();
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
          <div className="hudSummaryGrid">
            <div className="hudStat"><span>Score</span><strong>{game.score}</strong></div>
            <MetricCard icon="/coin-icon.svg" label="Run Coins" value={Math.floor(game.score / 2)} />
            <MetricCard icon="/coin-icon.svg" label="Wallet" value={progress.coins} />
            <div className="hudStat"><span>Snake</span><strong>{skin.name}</strong></div>
          </div>
          <div className="controlsPanel">
            <button className="secondaryButton controlButton" type="button" onClick={() => { unlockAudio(); queueDirection({ x: 0, y: -1 }); }}>Up</button>
            <div className="controlRow">
              <button className="secondaryButton controlButton" type="button" onClick={() => { unlockAudio(); queueDirection({ x: -1, y: 0 }); }}>Left</button>
              <button className="secondaryButton controlButton" type="button" onClick={() => { unlockAudio(); queueDirection({ x: 1, y: 0 }); }}>Right</button>
            </div>
            <button className="secondaryButton controlButton" type="button" onClick={() => { unlockAudio(); queueDirection({ x: 0, y: 1 }); }}>Down</button>
          </div>
          <p className="controlsHint">Laptop: Arrow keys or WASD. Android/mobile: swipe or tap.</p>
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
    document.body.classList.toggle("gameplayActive", screen === "game");
    return () => document.body.classList.remove("gameplayActive");
  }, [screen]);

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
