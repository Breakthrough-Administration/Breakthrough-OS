import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const nextDir = path.join(rootDir, '.next');
const legacyDirs = [
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'build'),
  path.join(rootDir, 'out'),
];

try {
  // Remove heavy webpack cache inside .next so filesystem sync and deployment upload stay fast
  const nextCache = path.join(nextDir, 'cache');
  if (fs.existsSync(nextCache)) {
    try {
      fs.rmSync(nextCache, { recursive: true, force: true });
    } catch {
      // Ignore transient lock
    }
  }

  // Remove redundant legacy mirror directories that bloat workspace sync payloads
  for (const dir of legacyDirs) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Ignore transient lock
      }
    }
  }

  // Verify Next.js standalone and static build outputs required by the deployment archiver
  const standaloneDir = path.join(nextDir, 'standalone');
  const staticDir = path.join(nextDir, 'static');
  if (!fs.existsSync(standaloneDir) || !fs.existsSync(staticDir)) {
    throw new Error('Missing .next/standalone or .next/static output after next build');
  }

  // Copy service-account.json into .next/standalone if present
  const saFile = path.join(rootDir, 'service-account.json');
  if (fs.existsSync(saFile)) {
    fs.copyFileSync(saFile, path.join(standaloneDir, 'service-account.json'));
  }

  console.log('> ✓ Standalone and static Next.js build artifacts verified');
} catch (err) {
  console.error('> Error preparing build artifacts:', err);
  process.exit(1);
}
