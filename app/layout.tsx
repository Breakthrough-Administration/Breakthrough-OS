import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Breakthrough Allied Health & NDIS Operations OS',
  description:
    'Enterprise NDIS practice management system with clinical case notes, incident management, PRODA PACE claiming, SCHADS award roster compliance, and biometric security.',
  openGraph: {
    title: 'Breakthrough Allied Health & NDIS Operations OS',
    description:
      'Enterprise NDIS practice management system with clinical case notes, incident management, PRODA PACE claiming, SCHADS award roster compliance, and biometric security.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Breakthrough Allied Health & NDIS Operations OS',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="dark font-sans"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Early suppression of known Firebase Auth 11.x assertion failure in iframe contexts
              window.addEventListener('error', function(e) {
                if (e && e.message && e.message.indexOf('Pending promise was never set') !== -1) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);
              window.addEventListener('unhandledrejection', function(e) {
                var reason = e && e.reason ? (e.reason.message || String(e.reason)) : '';
                if (reason && reason.indexOf('Pending promise was never set') !== -1) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);

              if (typeof window !== 'undefined') {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (var i = 0; i < registrations.length; i++) {
                      registrations[i].unregister();
                    }
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(keys) {
                    for (var i = 0; i < keys.length; i++) {
                      caches.delete(keys[i]);
                    }
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body
        className="antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 min-h-screen transition-colors duration-150"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
