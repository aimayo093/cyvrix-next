import "server-only";
import { connection } from "next/server";
import { Bot } from "lucide-react";
import { readBotProtection } from "@/lib/bot-protection";
import { toggleBotProtection } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";

const updated = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/**
 * The Vercel Firewall's Bot Protection ruleset, read live and switched from
 * here. The state shown is what the firewall reports, never what was last
 * clicked: if it cannot be read, the card says so and offers no switch.
 */
export async function BotProtectionCard() {
  await connection();
  const current = await readBotProtection();
  const on = current.state === "on";
  // A switch only when the state is known, or when there is no configuration
  // yet and turning it on is how one is created.
  const known = current.state === "on" || current.state === "off" || current.state === "no_firewall_config";

  return (
    <section id="bot-protection" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#2691F0]" aria-hidden="true" />
          <div>
            <h3 className="font-outfit font-black text-[#041635]">Bot protection</h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
              Challenge suspicious traffic with JavaScript verification to block automated attacks while allowing
              legitimate users.
            </p>
          </div>
        </div>

        {known && (
          <form action={toggleBotProtection} className="shrink-0">
            <input type="hidden" name="enable" value={on ? "false" : "true"} />
            <button
              type="submit"
              role="switch"
              aria-checked={on}
              aria-label="Bot protection"
              className={cn(
                "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 motion-reduce:transition-none",
                on ? "bg-emerald-500" : "bg-slate-300",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
                  on ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </form>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600">
        {current.state === "on" && (
          <p>
            <span className="font-black text-emerald-700">On.</span>{" "}
            {current.mode === "deny" ? "Suspicious requests are blocked outright." : "Suspicious requests must pass a JavaScript check."}
            {current.updatedAt ? ` Changed ${updated.format(new Date(current.updatedAt))}.` : ""}
          </p>
        )}
        {current.state === "off" && (
          <p>
            <span className="font-black text-[#041635]">Off.</span>{" "}
            {current.mode === "log" ? "Bots are only being logged, not stopped." : "No traffic is being challenged."}
          </p>
        )}
        {current.state === "no_firewall_config" && (
          <p>
            The firewall has no configuration for this project yet, so this is not switched on. Turning it on creates
            one. If you expected bot protection to be on already, check the project and team ids (DEPLOYMENT.md).
          </p>
        )}
        {current.state === "not_configured" && (
          <p>
            Not connected. Add a Vercel access token as <code className="font-mono">FIREWALL_API_TOKEN</code> in the
            project&apos;s environment variables (see DEPLOYMENT.md), then redeploy.
          </p>
        )}
        {current.state === "unavailable" && (
          <p>
            <span className="font-black text-rose-700">—</span> Could not read the firewall: {current.reason} Try again
            shortly, or change it in the Vercel dashboard under Firewall.
          </p>
        )}
      </div>
      <p className="mt-3 text-[11px] font-medium leading-relaxed text-slate-400">
        Search engines and other verified bots are let through. For an active attack, Vercel&apos;s Attack Challenge
        Mode challenges every visitor; it is in the Vercel dashboard under Firewall.
      </p>
    </section>
  );
}
