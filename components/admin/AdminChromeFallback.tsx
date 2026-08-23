import { Bell, Layers, Menu } from "lucide-react";

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
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/5 bg-[#041635]">
        <div className="flex h-20 shrink-0 items-center justify-center border-b border-white/5">
          <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
        </div>
        <nav className="flex-1 space-y-5 px-3 py-4">
          {[5, 4, 3].map((count, group) => (
            <div key={group} className="space-y-1">
              <div className="mx-3 mb-2 h-2 w-16 animate-pulse rounded bg-white/5" />
              {Array.from({ length: count }).map((_, item) => (
                <div key={item} className="mx-1 h-8 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3">
            <Menu className="h-4 w-4 text-slate-300" />
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Layers className="h-3.5 w-3.5" />
              <span>CYVRIX Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-slate-300" />
            <div className="h-7 w-7 animate-pulse rounded-full bg-slate-200" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
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
