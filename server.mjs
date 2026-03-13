import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 5173);

const mimeByExt = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"]
]);

function safeResolvePublic(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const normalized = path.normalize(decoded).replaceAll("\\", "/");
  if (normalized.includes("..")) return null;
  return path.join(publicDir, normalized);
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname = url.pathname;
    if (pathname === "/") pathname = "/index.html";

    const resolved = safeResolvePublic(pathname);
    if (!resolved) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = mimeByExt.get(ext) || "application/octet-stream";
    const data = await readFile(resolved);

    res.writeHead(200, {
      "Content-Type": contentType,
      // Keep dev behavior predictable.
      "Cache-Control": "no-store"
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Snake dev server: http://localhost:${port}`);
});

