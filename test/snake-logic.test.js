import test from "node:test";
import assert from "node:assert/strict";

import { createGame, Direction, setDirection, spawnFood, tick } from "../public/snake/logic.js";

function rngFrom(values) {
  let i = 0;
  return () => {
    const v = values[i] ?? values[values.length - 1] ?? 0;
    i += 1;
    return v;
  };
}

test("tick moves snake forward by 1 cell", () => {
  const s0 = createGame({ width: 10, height: 10, initialLength: 3, rng: rngFrom([0]) });
  const head0 = s0.snake[0];
  const s1 = tick(s0, rngFrom([0]));
  assert.equal(s1.status, "playing");
  assert.deepEqual(s1.snake[0], { x: head0.x + 1, y: head0.y });
  assert.equal(s1.snake.length, s0.snake.length);
});

test("setDirection rejects immediate reversal", () => {
  const s0 = createGame({ width: 10, height: 10, initialLength: 3, rng: rngFrom([0]) });
  const s1 = setDirection(s0, Direction.Left);
  assert.equal(s1.nextDir, null);
});

test("eating food grows snake and increments score", () => {
  const s0 = createGame({ width: 10, height: 10, initialLength: 3, rng: rngFrom([0]) });
  // Place food directly in front of the head (moving right).
  const head0 = s0.snake[0];
  const sEat = { ...s0, food: { x: head0.x + 1, y: head0.y } };
  const s1 = tick(sEat, rngFrom([0]));
  assert.equal(s1.score, 1);
  assert.equal(s1.snake.length, s0.snake.length + 1);
});

test("wall collision ends game", () => {
  const s0 = createGame({ width: 5, height: 5, initialLength: 3, rng: rngFrom([0]) });
  // Move until we hit right boundary.
  let s = s0;
  for (let i = 0; i < 10; i += 1) s = tick(s, rngFrom([0]));
  assert.equal(s.status, "game_over");
});

test("self collision ends game", () => {
  // Build a simple U shape that will collide when moving up.
  const s0 = createGame({ width: 8, height: 8, initialLength: 3, rng: rngFrom([0]) });
  const snake = [
    { x: 3, y: 3 },
    { x: 2, y: 3 },
    { x: 2, y: 4 },
    { x: 3, y: 4 }
  ];
  const s = { ...s0, snake, dir: Direction.Left, nextDir: null, food: { x: 0, y: 0 } };
  const sTurn = setDirection(s, Direction.Up);
  const s1 = tick(sTurn, rngFrom([0]));
  assert.equal(s1.status, "game_over");
});

test("spawnFood never places food on the snake", () => {
  const s0 = createGame({ width: 6, height: 6, initialLength: 3, rng: rngFrom([0]) });
  const food = spawnFood(s0, rngFrom([0.5]));
  assert.ok(food);
  for (const part of s0.snake) assert.notDeepEqual(food, part);
});

