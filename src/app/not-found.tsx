import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 p-8">
      <Link
        href="/"
        className="absolute left-6 top-6 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
      >
        Home
      </Link>

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
        <img
          src="/mxwel.png"
          alt="Maxwell"
          className="h-12 w-12 rounded-xl object-cover"
        />
        <div className="text-left">
          <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
          <p className="mt-1 text-sm text-slate-500">
            This page is unavailable or the link is no longer valid.
          </p>
        </div>
      </div>
    </div>
  );
}
