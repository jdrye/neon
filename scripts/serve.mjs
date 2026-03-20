import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const port = Number(process.argv[2]) || Number(process.env.PORT) || 4173;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function resolveTarget(urlPathname) {
  const cleanPath = decodeURIComponent(urlPathname.split("?")[0]);
  const candidate = cleanPath === "/" ? "/index.html" : cleanPath;
  const normalized = path.normalize(candidate).replace(/^(\.\.[/\\])+/, "");
  return path.join(rootDir, normalized);
}

const server = http.createServer(async (req, res) => {
  try {
    const target = resolveTarget(req.url || "/");
    const fileStat = await stat(target);
    if (!fileStat.isFile()) {
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(target).pipe(res);
  } catch (error) {
    send(res, 404, "Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Pulse Prism server listening on http://127.0.0.1:${port}`);
});
