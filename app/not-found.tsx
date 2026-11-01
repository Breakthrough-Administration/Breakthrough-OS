/* eslint-disable @next/next/no-html-link-for-pages */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
      <h1 className="text-4xl font-bold tracking-tight text-teal-400">404 - Page Not Found</h1>
      <p className="mt-3 text-base text-slate-400">
        The requested resource or page could not be located.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-colors"
      >
        Return to Breakthrough OS Dashboard
      </a>
    </div>
  );
}
