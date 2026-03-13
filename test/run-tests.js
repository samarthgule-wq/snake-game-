import assert from "node:assert/strict";

import {
  createGame,
  Direction,
  setDirection,
  spawnFood,
  tick
} from "../public/snake/logic.js";

function rngFrom(values) {
  let i = 0;
  return () => {
    const v = values[i] ?? values[values.length - 1] ?? 0;
    i += 1;
    return v;
  };
}

function run(name, fn) {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`ok - ${name}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`not ok - ${name}`);
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  }
}

run("tick moves snake forward by 1 cell", () => {
  const s0 = createGame({ width: 10, height: 10, initialLength: 3, rng: rngFrom([0]) });
  const head0 = s0.snake[0];
  const s1 = tick(s0, rngFrom([0]));
  assert.equal(s1.status, "playing");
  assert.deepEqual(s1.snake[0], { x: head0.x + 1, y: head0.y });
  assert.equal(s1.snake.length, s0.snake.length);
});

run("setDirection rejects immediate reversal", () => {
  const s0 = createGame({ width: 10, height: 10, initialLength: 3, rng: rngFrom([0]) });
  const s1 = setDirection(s0, Direction.Left);
  assert.equal(s1.nextDir, null);
});

run("eating food grows snake and increments score", () => {
  const s0 = createGame({ width: 10, height: 10, initialLength: 3, rng: rngFrom([0]) });
  const head0 = s0.snake[0];
  const sEat = { ...s0, food: { x: head0.x + 1, y: head0.y } };
  const s1 = tick(sEat, rngFrom([0]));
  assert.equal(s1.score, 1);
  assert.equal(s1.snake.length, s0.snake.length + 1);
});

run("wall collision ends game", () => {
  const s0 = createGame({ width: 5, height: 5, initialLength: 3, rng: rngFrom([0]) });
  let s = s0;
  for (let i = 0; i < 10; i += 1) s = tick(s, rngFrom([0]));
  assert.equal(s.status, "game_over");
});

run("self collision ends game", () => {
  const s0 = createGame({ width: 8, height: 8, initialLength: 3, rng: rngFrom([0]) });
  // Snake is arranged so that moving Right collides with its own body.
  // Head at (2,2) -> new head would be (3,2), which is occupied by the body.
  const snake = [
    { x: 2, y: 2 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 2 },
    { x: 3, y: 1 },
    { x: 2, y: 1 }
  ];
  const s = { ...s0, snake, dir: Direction.Right, nextDir: null, food: { x: 0, y: 0 } };
  const s1 = tick(s, rngFrom([0]));
  assert.equal(s1.status, "game_over");
});

run("spawnFood never places food on the snake", () => {
  const s0 = createGame({ width: 6, height: 6, initialLength: 3, rng: rngFrom([0]) });
  const food = spawnFood(s0, rngFrom([0.5]));
  assert.ok(food);
  for (const part of s0.snake) assert.notDeepEqual(food, part);
});

if (process.exitCode) process.exit(process.exitCode);
