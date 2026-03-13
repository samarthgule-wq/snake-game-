export const Direction = Object.freeze({
  Up: Object.freeze({ x: 0, y: -1 }),
  Down: Object.freeze({ x: 0, y: 1 }),
  Left: Object.freeze({ x: -1, y: 0 }),
  Right: Object.freeze({ x: 1, y: 0 })
});

export function dirEquals(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function dirIsOpposite(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

export function posEquals(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function clampInt(n) {
  const asNumber = Number(n);
  if (!Number.isFinite(asNumber)) return 0;
  return Math.trunc(asNumber);
}

export function createGame({
  width = 20,
  height = 20,
  initialLength = 3,
  rng = Math.random
} = {}) {
  width = Math.max(5, clampInt(width));
  height = Math.max(5, clampInt(height));
  initialLength = Math.max(2, clampInt(initialLength));
  initialLength = Math.min(initialLength, width);

  const startX = Math.floor(width / 2);
  const startY = Math.floor(height / 2);

  const snake = [];
  for (let i = 0; i < initialLength; i += 1) {
    snake.push({ x: startX - i, y: startY });
  }

  const base = {
    width,
    height,
    initialLength,
    snake,
    dir: Direction.Right,
    nextDir: null,
    food: null,
    score: 0,
    status: "playing"
  };

  return {
    ...base,
    food: spawnFood(base, rng)
  };
}

export function setDirection(state, direction) {
  if (state.status !== "playing") return state;

  const base = state.nextDir ?? state.dir;
  if (dirIsOpposite(direction, base)) return state;
  if (dirEquals(direction, base)) return state;

  return { ...state, nextDir: direction };
}

export function togglePause(state) {
  if (state.status === "game_over") return state;
  return { ...state, status: state.status === "paused" ? "playing" : "paused" };
}

export function restartGame(state, { rng = Math.random } = {}) {
  return createGame({
    width: state.width,
    height: state.height,
    initialLength: state.initialLength ?? 3,
    rng
  });
}

export function tick(state, rng = Math.random) {
  if (state.status !== "playing") return state;

  const dir = state.nextDir ?? state.dir;
  const head = state.snake[0];
  const newHead = { x: head.x + dir.x, y: head.y + dir.y };

  if (
    newHead.x < 0 ||
    newHead.x >= state.width ||
    newHead.y < 0 ||
    newHead.y >= state.height
  ) {
    return { ...state, dir, nextDir: null, status: "game_over" };
  }

  const willGrow = state.food ? posEquals(newHead, state.food) : false;
  const bodyToCheck = willGrow
    ? state.snake
    : state.snake.slice(0, Math.max(0, state.snake.length - 1));

  for (const part of bodyToCheck) {
    if (posEquals(part, newHead)) {
      return { ...state, dir, nextDir: null, status: "game_over" };
    }
  }

  const nextSnake = [newHead, ...state.snake];
  if (!willGrow) nextSnake.pop();

  let nextFood = state.food;
  let nextScore = state.score;
  if (willGrow) {
    nextScore += 1;
    nextFood = spawnFood(
      { ...state, snake: nextSnake, dir, nextDir: null, food: state.food },
      rng
    );
  }

  return {
    ...state,
    snake: nextSnake,
    dir,
    nextDir: null,
    food: nextFood,
    score: nextScore
  };
}

export function spawnFood(state, rng = Math.random) {
  const open = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const p = { x, y };
      let occupied = false;
      for (const part of state.snake) {
        if (posEquals(part, p)) {
          occupied = true;
          break;
        }
      }
      if (!occupied) open.push(p);
    }
  }

  if (open.length === 0) return null;
  const idx = Math.floor(rng() * open.length);
  return open[Math.min(Math.max(idx, 0), open.length - 1)];
}
