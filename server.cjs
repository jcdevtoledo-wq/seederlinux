// Node.js HTTP server wrapper for TanStack Start
// Self-hosted Docker deployment with static file serving

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

// MIME types para servir arquivos corretamente
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

// Função para servir arquivos estáticos
function serveStaticFile(res, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.statusCode = 200;
    res.end(content);
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  const { default: app } = await import("./dist/server/server.js");

  const server = http.createServer(async (req, res) => {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `${protocol}://${host}`);

    // 1. Tenta servir arquivo estático de dist/client/
    const staticPath = path.join(__dirname, 'dist', 'client', url.pathname);
    if (serveStaticFile(res, staticPath)) {
      return;
    }

    // 2. Tenta servir arquivo estático de public/
    const publicPath = path.join(__dirname, 'public', url.pathname);
    if (serveStaticFile(res, publicPath)) {
      return;
    }

    // 3. Se não for arquivo estático, passa para o TanStack Start
    // Build headers object
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) headers.set(key, v);
      } else if (value) {
        headers.set(key, value);
      }
    }

    // Read body for non-GET requests
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      // @ts-ignore
      duplex: "half",
    });

    try {
      const response = await app.fetch(request);

      res.statusCode = response.status;

      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (error) {
      console.error("Error handling request:", error);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  server.listen(PORT, HOSTNAME, () => {
    console.log(`Server listening on http://${HOSTNAME}:${PORT}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down...");
    server.close(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down...");
    server.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
