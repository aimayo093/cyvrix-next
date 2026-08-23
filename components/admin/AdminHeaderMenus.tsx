"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CircleUserRound, LogOut, Settings, ShieldCheck } from "lucide-react";

export type AdminIdentity = {
  name: string | null;
  email: string;
  role: string;
};

export type AdminNotification = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  read: boolean;
};

/** "Paul Iyangbe" to "PI"; falls back to the email when no name is set. */
function initialsFor(identity: AdminIdentity): string {
  const source = identity.name?.trim() || identity.email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0]).join("");
  return (letters || source.slice(0, 2)).toUpperCase();
}

/** "SUPER_ADMIN" to "Super admin". */
function readableRole(role: string): string {
  const spaced = role.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function relativeTime(iso: string, now: number | null): string {
  if (now === null) return "";
  const seconds = Math.round((now - Date.parse(iso)) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 60) return "just now";

  const units: Array<[number, string]> = [
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
  ];

  let value = seconds / 60;
  let unit = "minute";
  for (let index = 1; index < units.length; index += 1) {
    if (value < units[index][0]) break;
    value /= units[index][0];
    unit = units[index][1];
  }

  const rounded = Math.round(value);
  return `${rounded} ${unit}${rounded === 1 ? "" : "s"} ago`;
}

/** Closes the menu on outside click and on Escape. */
function useDismissable(onDismiss: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss]);

  return ref;
}

/**
 * The bell as it appears before the notifications query returns.
 *
 * Rendered rather than nothing, so the control never disappears from the header
 * while data is in flight. It carries no unread indicator because at that point
 * the count is genuinely unknown, and a dot shown on spec would be the same
 * fabricated status the real bell was fixed to stop showing.
 */
export function AdminNotificationsButtonFallback() {
  return (
    <button
      type="button"
      disabled
      aria-label="Notifications, loading"
      className="rounded-lg p-2 text-slate-300"
    >
      <Bell className="h-4 w-4" />
    </button>
  );
}

/**
 * Notification bell.
 *
 * The unread dot is driven by the actual notification rows. It previously
 * rendered unconditionally, so the header always claimed unread items even
 * though nothing had ever been created.
 */
export function AdminNotificationsMenu({
  notifications,
  unreadCount,
}: {
  notifications: AdminNotification[];
  unreadCount: number;
}) {
  // The clock is read in the click handler rather than during render: render
  // has to stay pure, and the time the panel was opened is the right reference
  // point for "3 hours ago" anyway.
  const [openedAt, setOpenedAt] = React.useState<number | null>(null);
  const open = openedAt !== null;
  const close = React.useCallback(() => setOpenedAt(null), []);
  const ref = useDismissable(close);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpenedAt((previous) => (previous === null ? Date.now() : null))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications, none unread"
        }
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Notifications</p>
            {unreadCount > 0 && (
              <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700">
                {unreadCount} unread
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">Nothing to report.</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                Security scans and system alerts appear here when they have something to say.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`px-4 py-3 ${notification.read ? "" : "bg-sky-50/60"}`}
                >
                  <div className="flex items-start gap-2.5">
                    {!notification.read && (
                      <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2691F0]" />
                    )}
                    <div className={notification.read ? "pl-4" : ""}>
                      <p className="text-sm font-bold leading-snug text-[#041635]">{notification.title}</p>
                      {notification.body && (
                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                          {notification.body}
                        </p>
                      )}
                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {relativeTime(notification.createdAt, openedAt)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/admin/security-center"
            onClick={close}
            className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-black text-[#0f5aab] transition-colors hover:bg-slate-50"
          >
            Open Security Center
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Account menu.
 *
 * Replaces a hardcoded "AD" avatar that showed the same two letters whoever
 * was signed in, and was not interactive at all.
 */
export function AdminAccountMenu({ identity }: { identity: AdminIdentity }) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const ref = useDismissable(close);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${identity.name || identity.email}`}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2691F0] text-[10px] font-black text-white transition-shadow hover:ring-2 hover:ring-[#2691F0]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
      >
        {initialsFor(identity)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-black text-[#041635]">
              {identity.name || "Signed in"}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{identity.email}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
              <ShieldCheck className="h-3 w-3" />
              {readableRole(identity.role)}
            </span>
          </div>

          <div className="py-1">
            <Link
              href="/admin/profile"
              onClick={close}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#041635]"
            >
              <CircleUserRound className="h-4 w-4 text-slate-400" />
              Your profile
            </Link>
            <Link
              href="/admin/settings"
              onClick={close}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#041635]"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Settings
            </Link>
          </div>

          <form action="/api/auth/logout" method="POST" className="border-t border-slate-100">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
