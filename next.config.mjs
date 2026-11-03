import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

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

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function ensureDevManifests(distDirName) {
  try {
    const dir = path.join(rootDir, distDirName);
    const serverDir = path.join(dir, 'server');
    fs.mkdirSync(serverDir, { recursive: true });
    writeIfMissing(path.join(dir, 'routes-manifest.json'), DEFAULT_ROUTES_MANIFEST);
    writeIfMissing(path.join(dir, 'prerender-manifest.json'), DEFAULT_PRERENDER_MANIFEST);
    writeIfMissing(path.join(serverDir, 'app-paths-manifest.json'), JSON.stringify({}, null, 2));
    writeIfMissing(path.join(serverDir, 'pages-manifest.json'), JSON.stringify({}, null, 2));
  } catch {
    // Ignore transient filesystem lock
  }
}

/** @param {string} phase */
export default function nextConfig(phase) {
  const isDevServer = phase === 'phase-development-server';
  if (!isDevServer) {
    process.env.NODE_ENV = 'production';
  }
  const distDir = isDevServer ? '.next-dev' : '.next';

  if (isDevServer) {
    ensureDevManifests(distDir);
  }

  /** @type {import('next').NextConfig} */
  const config = {
    distDir,
    ...(isDevServer ? {} : { output: 'standalone' }),
    devIndicators: false,
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
        },
        {
          protocol: 'https',
          hostname: 'images.unsplash.com',
        },
      ],
    },
  };

  return config;
}
