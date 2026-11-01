import { createServer } from 'http';
import { parse } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import next from 'next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectDir = process.cwd();

const hasCompleteBuild =
  fs.existsSync(path.join(projectDir, '.next', 'required-server-files.json')) &&
  fs.existsSync(path.join(projectDir, '.next', 'prerender-manifest.json')) &&
  fs.existsSync(path.join(projectDir, '.next', 'routes-manifest.json')) &&
  fs.existsSync(path.join(projectDir, '.next', 'server', 'app-paths-manifest.json')) &&
  fs.existsSync(path.join(projectDir, '.next', 'build-manifest.json'));

const dev = process.env.NODE_ENV !== 'production' && !hasCompleteBuild;
if (!dev) {
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
}
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({
  dev,
  hostname,
  port,
  dir: projectDir,
});

const handle = app.getRequestHandler();
let isReady = false;

// Prepare Next.js app in background
const preparePromise = app
  .prepare()
  .then(() => {
    isReady = true;
    console.log(`> Next.js prepared successfully (dev=${dev})`);
  })
  .catch((err) => {
    console.error('Error during app.prepare():', err);
    throw err;
  });

// Start HTTP server immediately to satisfy Cloud Run deployment health checks
const server = createServer(async (req, res) => {
  const url = req.url || '/';

  // Fast-path health check endpoint for Cloud Run readiness & liveness probes
  if (url === '/_health' || url === '/healthz' || url === '/ping') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(JSON.stringify({ status: 'healthy', ready: isReady, uptime: process.uptime() }));
    return;
  }

  try {
    if (!isReady) {
      // Await preparation if not yet ready
      await preparePromise;
    }
    const parsedUrl = parse(url, true);
    await handle(req, res, parsedUrl);
  } catch (err) {
    console.error('Error occurred handling', url, err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('internal server error');
    }
  }
});

server.listen(port, hostname, () => {
  console.log(`> Server listening on http://${hostname}:${port} (dev=${dev})`);
});

