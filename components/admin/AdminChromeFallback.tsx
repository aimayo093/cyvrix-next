import { Bell, Menu } from "lucide-react";

/**
 * What the admin area looks like while the sign-in check resolves.
 *
 * The previous fallback drew only a content skeleton, so a pending boundary
 * rendered a page with no sidebar, no header, no profile control and no
 * notification bell. That is indistinguishable from those things being broken,
 * and it is what an administrator sees whenever the database is slow.
 *
 * This keeps the frame in place and greys out only what is genuinely unknown.
 */
export function AdminChromeFallback() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-5">
          <div className="h-7 w-32 animate-pulse rounded bg-slate-100" />
        </div>
        <nav className="flex-1 space-y-5 px-3 py-4">
          {[6, 6, 3, 2].map((count, group) => (
            <div key={group} className="space-y-1">
              <div className="mx-3 mb-2 h-2 w-16 animate-pulse rounded bg-slate-100" />
              {Array.from({ length: count }).map((_, item) => (
                <div key={item} className="mx-1 h-8 animate-pulse rounded-lg bg-slate-50" />
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* The size of the real menu button, so the header does not shift. */}
            <span className="flex h-11 w-11 items-center justify-center lg:hidden" aria-hidden="true">
              <Menu className="h-5 w-5 text-slate-300" />
            </span>
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-slate-300" />
            <div className="h-7 w-7 animate-pulse rounded-full bg-slate-200" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="space-y-6">
            <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </div>
      </main>
    </div>
  );
}
