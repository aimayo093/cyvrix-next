import "server-only";
import { connection } from "next/server";
import { Laptop, LogOut, Smartphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentSessionId } from "@/lib/auth";
import { signOutDevice } from "@/lib/admin-actions";
import { deviceLabel } from "@/lib/device-label";

const MAX_LISTED = 100;

function sinceLabel(from: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - from.getTime()) / 60_000);
  if (minutes < 5) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/**
 * Every signed-in device across all accounts, newest activity first, each
 * with its own sign-out. Rows come from UserSession (DECISIONS §13); a device
 * appears here from the moment it signs in until it signs out, is signed out,
 * or its eight hours run out.
 */
export async function SignedInDevices({ viewerRole }: { viewerRole: string }) {
  await connection();
  const now = new Date();
  const active = { revokedAt: null, expiresAt: { gt: now } };
  const [sessions, total, mine] = await Promise.all([
    prisma.userSession
      .findMany({
        where: active,
        orderBy: { lastSeenAt: "desc" },
        take: MAX_LISTED,
        select: {
          id: true,
          createdAt: true,
          lastSeenAt: true,
          userAgent: true,
          ipAddress: true,
          user: { select: { name: true, email: true, role: true } },
        },
      })
      .catch(() => null),
    prisma.userSession.count({ where: active }).catch(() => null),
    currentSessionId(),
  ]);

  return (
    <section id="devices" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-outfit font-black text-[#041635]">Signed-in devices</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Every device signed in to the admin or client portal right now. Sign one out and its next request goes to the
          sign-in page. A session lasts eight hours at most.
        </p>
      </div>

      {sessions === null ? (
        <p className="px-6 py-5 text-sm font-semibold text-slate-500">Signed-in devices could not be read just now. Reload to try again.</p>
      ) : sessions.length === 0 ? (
        <p className="px-6 py-5 text-sm font-semibold text-slate-500">No devices are signed in.</p>
      ) : (
        <>
        {(total !== null ? total > sessions.length : sessions.length >= MAX_LISTED) && (
          // Never silently: when the list is cut, say so, even if the count
          // itself could not be read.
          <p className="border-b border-slate-100 bg-amber-50 px-6 py-3 text-xs font-semibold text-amber-900">
            {total !== null
              ? `Showing the ${sessions.length} most recently active of ${total} signed-in devices. The rest are not listed here.`
              : `Showing the ${sessions.length} most recently active signed-in devices. There may be more that are not listed here.`}
          </p>
        )}
        <ul className="divide-y divide-slate-100">
          {sessions.map((session) => {
            const label = deviceLabel(session.userAgent);
            const isMine = session.id === mine;
            const mobile = /iPhone|Android|iPad/.test(label);
            const Icon = mobile ? Smartphone : Laptop;
            const locked = session.user.role === "SUPER_ADMIN" && viewerRole !== "SUPER_ADMIN";
            return (
              <li key={session.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
                <Icon className="hidden h-5 w-5 shrink-0 text-slate-400 sm:block" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[#041635]">{label}</p>
                    {isMine && (
                      <span className="rounded-full bg-[#2691F0]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#0f5aab]">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-600">
                    {session.user.name?.trim() || session.user.email}
                    <span className="text-slate-400"> · {session.user.role.replace(/_/g, " ").toLowerCase()}</span>
                  </p>
                  <p className="mt-0.5 text-xs font-medium tabular-nums text-slate-500">
                    Signed in {when.format(session.createdAt)} · active {sinceLabel(session.lastSeenAt, now)}
                    {session.ipAddress && session.ipAddress !== "unknown" ? ` · ${session.ipAddress}` : ""}
                  </p>
                </div>
                {locked ? (
                  <p className="text-xs font-semibold text-slate-400 sm:w-40 sm:text-right">Super admin only</p>
                ) : (
                  <form action={signOutDevice} className="sm:shrink-0">
                    <input type="hidden" name="sessionId" value={session.id} />
                    <button
                      type="submit"
                      aria-label={`${isMine ? "Sign out this device" : "Sign out"}: ${label}, ${session.user.name?.trim() || session.user.email}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {isMine ? "Sign out this device" : "Sign out"}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        </>
      )}
    </section>
  );
}
