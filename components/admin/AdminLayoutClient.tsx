"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { AdminAccountMenu, type AdminIdentity } from "@/components/admin/AdminHeaderMenus";
import { AdminSidebar, type BadgeSlots } from "@/components/admin/AdminSidebar";
import { activeNavItem } from "@/lib/admin-nav";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  /** The signed-in administrator, so the header stops claiming to be "AD". */
  identity: AdminIdentity;
  /**
   * The notification control, passed in already wrapped in its own Suspense
   * boundary so a slow query cannot hold up the rest of the header.
   */
  notificationsSlot: React.ReactNode;
  /** Live sidebar counts, each in its own Suspense boundary for the same reason. */
  badgeSlots: BadgeSlots;
}

const COLLAPSED_KEY = "admin_sidebar_collapsed";

/**
 * The admin frame: a light sidebar docked from `lg`, an off-canvas drawer
 * below it, and a header naming the current page. See DESIGN.md — the admin
 * is light; the public site is dark.
 */
export function AdminLayoutClient({ children, identity, notificationsSlot, badgeSlots }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const firstDrawerLinkRef = React.useRef<HTMLAnchorElement>(null);
  const wasOpen = React.useRef(false);

  React.useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem(COLLAPSED_KEY) === "true";
    } catch {
      // Storage refused (private window); start expanded.
    }
    if (!saved) return;
    const restore = window.setTimeout(() => setCollapsed(true), 0);
    return () => window.clearTimeout(restore);
  }, []);

  // Navigating closes the drawer.
  React.useEffect(() => {
    const close = window.setTimeout(() => setDrawerOpen(false), 0);
    return () => window.clearTimeout(close);
  }, [pathname]);

  // The drawer is hidden from lg up. If the window widens while it is open,
  // close it: otherwise <main> stays inert with no visible way to close it.
  React.useEffect(() => {
    if (!drawerOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (desktop.matches) setDrawerOpen(false);
    };
    onChange();
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, [drawerOpen]);

  // Focus moves into the drawer when it opens and back to the button when it
  // closes; Escape closes it, and Tab cycles inside it rather than leaving.
  React.useEffect(() => {
    if (drawerOpen) {
      firstDrawerLinkRef.current?.focus();
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setDrawerOpen(false);
          return;
        }
        if (event.key !== "Tab") return;
        const drawer = document.getElementById("admin-drawer");
        if (!drawer) return;
        const focusable = [...drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
          (element) => element.offsetParent !== null,
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", onKey);
      wasOpen.current = true;
      return () => document.removeEventListener("keydown", onKey);
    }
    if (wasOpen.current) {
      // Back to the menu button, unless it is hidden because the window is now
      // desktop width; then focus is left where the browser puts it.
      if (menuButtonRef.current?.offsetParent) menuButtonRef.current.focus();
      wasOpen.current = false;
    }
  }, [drawerOpen]);

  const toggleCollapsed = () => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        // The toggle still works for this visit.
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Docked sidebar, lg and up */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-300 lg:block`}
      >
        <AdminSidebar pathname={pathname} activeHref={active?.href ?? null} collapsed={collapsed} badges={badgeSlots} />
      </aside>

      {/* Drawer, below lg */}
      {drawerOpen && (
        // A modal: the page behind is inert while it is open (see <main>), so
        // keyboard focus cannot leave the menu. The backdrop closes it on a
        // click but is not a tab stop — the X button is the one close control.
        <div
          id="admin-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          className="fixed inset-0 z-40 lg:hidden"
        >
          <div aria-hidden="true" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-[#041635]/40" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <AdminSidebar
              pathname={pathname}
              activeHref={active?.href ?? null}
              collapsed={false}
              badges={badgeSlots}
              firstLinkRef={firstDrawerLinkRef}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      <main inert={drawerOpen} className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls="admin-drawer"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <p className="truncate font-outfit text-base font-black text-[#041635]">{active?.name ?? "Admin"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {notificationsSlot}
            <AdminAccountMenu identity={identity} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
