export function setupCanvas(canvas, gridWidth, gridHeight, cellSize) {
  const width = gridWidth * cellSize;
  const height = gridHeight * cellSize;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

function drawGrid(ctx, gridWidth, gridHeight, cellSize) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= gridWidth; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize + 0.5, 0);
    ctx.lineTo(x * cellSize + 0.5, gridHeight * cellSize);
    ctx.stroke();
  }

  for (let y = 0; y <= gridHeight; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize + 0.5);
    ctx.lineTo(gridWidth * cellSize, y * cellSize + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

export function render(ctx, state, cellSize) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawGrid(ctx, state.width, state.height, cellSize);

  if (state.food) {
    ctx.fillStyle = "#ff5a6a";
    const fx = state.food.x * cellSize;
    const fy = state.food.y * cellSize;
    const pad = Math.max(2, Math.floor(cellSize * 0.18));
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(
        fx + pad,
        fy + pad,
        cellSize - pad * 2,
        cellSize - pad * 2,
        6
      );
    } else {
      ctx.rect(fx + pad, fy + pad, cellSize - pad * 2, cellSize - pad * 2);
    }
    ctx.fill();
  }

  const pad = Math.max(1, Math.floor(cellSize * 0.12));
  for (let i = 0; i < state.snake.length; i += 1) {
    const part = state.snake[i];
    const x = part.x * cellSize;
    const y = part.y * cellSize;
    ctx.fillStyle = i === 0 ? "#a7ffcb" : "#72e89f";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 6);
    } else {
      ctx.rect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);
    }
    ctx.fill();
  }
}
