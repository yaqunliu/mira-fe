import Link from 'next/link';
import './globals.css';

// src/app/ 下没有根 layout（唯一的 layout 在 [locale]/ 里），
// 所以这个兜底 404 必须自带 <html>/<body>。
// 它承接 [locale]/layout.tsx 里 locale 校验失败时的 notFound()，
// 以及任何落在 [locale] 之外的未知路径。
export default function NotFound() {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-6xl font-semibold tracking-tight">404</p>
          <h1 className="text-xl font-medium">This page could not be found.</h1>
          <Link
            href="/home"
            className="mt-2 rounded-xl border px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5"
          >
            Back to home
          </Link>
        </main>
      </body>
    </html>
  );
}
