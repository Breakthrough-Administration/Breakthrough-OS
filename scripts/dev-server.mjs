import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_ROUTES_MANIFEST = JSON.stringify(
  {
    version: 3,
    pages404: true,
    caseSensitive: false,
    basePath: '',
    redirects: [
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
        internal: true,
        regex: '^(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))\\/$',
      },
    ],
    headers: [],
    dynamicRoutes: [],
    staticRoutes: [
      {
        page: '/',
        regex: '^/(?:/)?$',
        routeKeys: {},
        namedRegex: '^/(?:/)?$',
      },
      {
        page: '/_not-found',
        regex: '^/_not\\-found(?:/)?$',
        routeKeys: {},
        namedRegex: '^/_not\\-found(?:/)?$',
      },
    ],
    dataRoutes: [],
    rsc: {
      header: 'RSC',
      varyHeader:
        'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch',
      prefetchHeader: 'Next-Router-Prefetch',
      didPostponeHeader: 'x-nextjs-postponed',
      contentTypeHeader: 'text/x-component',
      suffix: '.rsc',
      prefetchSuffix: '.prefetch.rsc',
      prefetchSegmentHeader: 'Next-Router-Segment-Prefetch',
      prefetchSegmentSuffix: '.segment.rsc',
      prefetchSegmentDirSuffix: '.segments',
    },
    rewriteHeaders: {
      pathHeader: 'x-nextjs-rewritten-path',
      queryHeader: 'x-nextjs-rewritten-query',
    },
    rewrites: {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    },
  },
  null,
  2
);

const DEFAULT_PRERENDER_MANIFEST = JSON.stringify(
  {
    version: 4,
    routes: {},
    dynamicRoutes: {},
    notFoundRoutes: [],
    preview: {
      previewModeId: 'development-id',
      previewModeSigningKey:
        '0000000000000000000000000000000000000000000000000000000000000000',
      previewModeEncryptionKey:
        '0000000000000000000000000000000000000000000000000000000000000000',
    },
  },
  null,
  2
);

const DEFAULT_APP_PATHS_MANIFEST = JSON.stringify(
  {
    '/_not-found/page': 'app/_not-found/page.js',
    '/page': 'app/page.js',
  },
  null,
  2
);

const DEFAULT_BUILD_MANIFEST = JSON.stringify(
  {
    polyfillFiles: ['static/chunks/polyfills.js'],
    devFiles: [],
    ampDevFiles: [],
    lowPriorityFiles: [
      'static/development/_buildManifest.js',
      'static/development/_ssgManifest.js',
    ],
    rootMainFiles: [
      'static/chunks/webpack.js',
      'static/chunks/main-app.js',
    ],
    rootMainFilesTree: {},
    pages: {
      '/_app': [],
      '/_error': [],
    },
    ampFirstPages: [],
  },
  null,
  2
);

const DEFAULT_APP_BUILD_MANIFEST = JSON.stringify(
  {
    pages: {
      '/layout': [
        'static/chunks/webpack.js',
        'static/chunks/main-app.js',
        'static/css/app/layout.css',
        'static/chunks/app/layout.js',
      ],
      '/error': [
        'static/chunks/webpack.js',
        'static/chunks/main-app.js',
        'static/chunks/app/error.js',
      ],
      '/not-found': [
        'static/chunks/webpack.js',
        'static/chunks/main-app.js',
        'static/chunks/app/not-found.js',
      ],
      '/_not-found/page': [
        'static/chunks/webpack.js',
        'static/chunks/main-app.js',
        'static/chunks/app/_not-found/page.js',
      ],
      '/page': [
        'static/chunks/webpack.js',
        'static/chunks/main-app.js',
        'static/chunks/app/page.js',
      ],
    },
  },
  null,
  2
);

const DEFAULT_REACT_LOADABLE_MANIFEST = JSON.stringify({}, null, 2);

const DEFAULT_MIDDLEWARE_MANIFEST = JSON.stringify(
  {
    version: 3,
    middleware: {},
    sortedMiddleware: [],
    functions: {},
  },
  null,
  2
);

const DEFAULT_NEXT_FONT_MANIFEST = JSON.stringify(
  {
    pages: {},
    app: {},
    appUsingSizeAdjust: false,
    pagesUsingSizeAdjust: false,
  },
  null,
  2
);

const DEFAULT_SERVER_REFERENCE_MANIFEST = JSON.stringify(
  {
    node: {},
    edge: {},
    encryptionKey:
      '0000000000000000000000000000000000000000000000000000000000000000',
  },
  null,
  2
);

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function ensureRoutesManifestValid(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, DEFAULT_ROUTES_MANIFEST, 'utf8');
    return;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    let mutated = false;
    if (!parsed.rewrites || Array.isArray(parsed.rewrites)) {
      parsed.rewrites = {
        beforeFiles: [],
        afterFiles: Array.isArray(parsed.rewrites) ? parsed.rewrites : [],
        fallback: [],
      };
      mutated = true;
    } else {
      if (!Array.isArray(parsed.rewrites.beforeFiles)) {
        parsed.rewrites.beforeFiles = [];
        mutated = true;
      }
      if (!Array.isArray(parsed.rewrites.afterFiles)) {
        parsed.rewrites.afterFiles = [];
        mutated = true;
      }
      if (!Array.isArray(parsed.rewrites.fallback)) {
        parsed.rewrites.fallback = [];
        mutated = true;
      }
    }
    if (!Array.isArray(parsed.dynamicRoutes)) {
      parsed.dynamicRoutes = [];
      mutated = true;
    }
    if (!Array.isArray(parsed.staticRoutes)) {
      parsed.staticRoutes = [];
      mutated = true;
    }
    if (!Array.isArray(parsed.dataRoutes)) {
      parsed.dataRoutes = [];
      mutated = true;
    }
    if (!Array.isArray(parsed.headers)) {
      parsed.headers = [];
      mutated = true;
    }
    if (!Array.isArray(parsed.redirects)) {
      parsed.redirects = [];
      mutated = true;
    }
    if (mutated) {
      fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
    }
  } catch {
    fs.writeFileSync(filePath, DEFAULT_ROUTES_MANIFEST, 'utf8');
  }
}

export function ensureManifests() {
  const dirs = [
    path.join(rootDir, '.next'),
    path.join(rootDir, '.next-dev'),
  ];

  for (const dir of dirs) {
    try {
      const serverDir = path.join(dir, 'server');
      fs.mkdirSync(serverDir, { recursive: true });

      ensureRoutesManifestValid(path.join(dir, 'routes-manifest.json'));
      writeIfMissing(path.join(dir, 'prerender-manifest.json'), DEFAULT_PRERENDER_MANIFEST);
      writeIfMissing(path.join(dir, 'build-manifest.json'), DEFAULT_BUILD_MANIFEST);
      writeIfMissing(path.join(dir, 'app-build-manifest.json'), DEFAULT_APP_BUILD_MANIFEST);
      writeIfMissing(
        path.join(dir, 'react-loadable-manifest.json'),
        DEFAULT_REACT_LOADABLE_MANIFEST
      );
      writeIfMissing(path.join(dir, 'BUILD_ID'), 'development');

      writeIfMissing(
        path.join(serverDir, 'app-paths-manifest.json'),
        DEFAULT_APP_PATHS_MANIFEST
      );
      writeIfMissing(
        path.join(serverDir, 'pages-manifest.json'),
        JSON.stringify({}, null, 2)
      );
      writeIfMissing(
        path.join(serverDir, 'middleware-manifest.json'),
        DEFAULT_MIDDLEWARE_MANIFEST
      );
      writeIfMissing(
        path.join(serverDir, 'next-font-manifest.json'),
        DEFAULT_NEXT_FONT_MANIFEST
      );
      writeIfMissing(
        path.join(serverDir, 'next-font-manifest.js'),
        `self.__NEXT_FONT_MANIFEST=${DEFAULT_NEXT_FONT_MANIFEST}`
      );
      writeIfMissing(
        path.join(serverDir, 'server-reference-manifest.json'),
        DEFAULT_SERVER_REFERENCE_MANIFEST
      );
      writeIfMissing(
        path.join(serverDir, 'server-reference-manifest.js'),
        `self.__RSC_SERVER_MANIFEST=${JSON.stringify(DEFAULT_SERVER_REFERENCE_MANIFEST)}`
      );
      writeIfMissing(
        path.join(serverDir, 'interception-route-rewrite-manifest.js'),
        'self.__INTERCEPTION_ROUTE_REWRITE_MANIFEST="[]"'
      );
      writeIfMissing(
        path.join(serverDir, 'middleware-build-manifest.js'),
        `globalThis.__BUILD_MANIFEST=${DEFAULT_BUILD_MANIFEST}`
      );
      writeIfMissing(
        path.join(serverDir, 'middleware-react-loadable-manifest.js'),
        'self.__REACT_LOADABLE_MANIFEST="{}"'
      );
    } catch {
      // Ignore transient filesystem lock during build/dev
    }
  }
}

// Run immediately before spawning next dev
ensureManifests();

// Continuously guard manifests every 150ms so next dev directory cleanup never causes ENOENT
const interval = setInterval(ensureManifests, 150);

const nextBin = path.join(rootDir, 'node_modules', '.bin', 'next');
const child = spawn(nextBin, ['dev', '-p', '3000', '-H', '0.0.0.0'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('exit', (code) => {
  clearInterval(interval);
  process.exit(code ?? 0);
});
