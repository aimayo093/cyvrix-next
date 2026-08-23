import Link from "next/link";
import { Award, BadgeCheck, Briefcase, GraduationCap, MapPin } from "lucide-react";
import {
  canPublishFounderIdentity,
  founder,
  founderCapabilities,
  founderCertifications,
  founderEducation,
  founderExperience,
} from "@/lib/founder";

/**
 * Who a client actually deals with.
 *
 * The site previously named nobody, which for a firm this size removes the
 * strongest evidence available: a named engineer with a checkable record is
 * more persuasive than any amount of copy about being security-first.
 *
 * The individual/company distinction is made explicitly rather than left to the
 * reader. These certifications belong to a person. CYVRIX LIMITED holds no
 * company accreditations, and this section must never be read as implying one.
 *
 * The founder's personal name is withheld by preference. Nothing here renders
 * it, and the LinkedIn link is omitted with it because that URL contains the
 * name. Because a stranger therefore cannot run the verification checks
 * unaided, the copy offers evidence on request instead of implying they can.
 */
export function FounderProfile() {
  return (
    <section className="border-y border-white/10 bg-[#050f27] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">
            Who you are dealing with
          </span>
          <h2 className="mt-4 font-outfit text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">
            {canPublishFounderIdentity() ? founder.name : "The engineer behind CYVRIX."}
          </h2>
          <p className="mt-2 text-sm font-black uppercase tracking-wider text-[#7ab8f4]">
            {founder.role}
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
            <MapPin className="h-4 w-4 text-[#7ab8f4]" />
            {founder.location}
          </p>

          <p className="mt-6 text-lg font-medium leading-relaxed text-slate-200">{founder.summary}</p>
          <p className="mt-4 text-base font-medium leading-relaxed text-slate-300">{founder.approach}</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <div className="rounded-3xl border border-white/10 bg-[#071126] p-7 md:p-8">
            <h3 className="flex items-center gap-2.5 font-outfit text-xl font-black text-white">
              <Briefcase className="h-5 w-5 text-[#7ab8f4]" />
              Selected experience
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
              Roles held by our founder. End clients are not named, because those were other
              organisations&rsquo; customers.
            </p>

            <ol className="mt-7 space-y-6">
              {founderExperience.map((entry) => (
                <li key={`${entry.organisation}-${entry.period}`} className="border-l-2 border-[#2691F0]/30 pl-5">
                  <p className="font-outfit text-base font-black text-white">{entry.role}</p>
                  <p className="mt-1 text-sm font-bold text-[#7ab8f4]">
                    {entry.organisation} &middot; {entry.period}
                  </p>
                  <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-300">{entry.detail}</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h4 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Day-to-day capability
              </h4>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {founderCapabilities.map((capability) => (
                  <li key={capability} className="flex gap-2.5 text-sm font-medium leading-relaxed text-slate-300">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2691F0]" />
                    {capability}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[#2691F0]/25 bg-[#061a3c] p-7">
              <h3 className="flex items-center gap-2.5 font-outfit text-xl font-black text-white">
                <BadgeCheck className="h-5 w-5 text-[#7ab8f4]" />
                Professional certifications
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
                Held personally by our founder. We will evidence any of them on request, and
                certificate details go to a prospective client who asks.
              </p>

              <ul className="mt-6 space-y-2.5">
                {founderCertifications.map((certification) => (
                  <li
                    key={certification.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#071126] px-4 py-2.5"
                  >
                    <span className="text-sm font-black text-white">{certification.name}</span>
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {certification.issuer}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 border-t border-white/10 pt-5 text-xs font-semibold leading-relaxed text-slate-400">
                These are individual qualifications, not company accreditations. CYVRIX LIMITED holds no
                company certifications; what the company can and cannot evidence is set out in the{" "}
                <Link href="/trust" className="text-[#7ab8f4] underline-offset-2 hover:underline">
                  Trust Centre
                </Link>
                .
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#071126] p-7">
              <h3 className="flex items-center gap-2.5 font-outfit text-xl font-black text-white">
                <GraduationCap className="h-5 w-5 text-[#7ab8f4]" />
                Education
              </h3>
              <ul className="mt-5 space-y-3">
                {founderEducation.map((entry) => (
                  <li key={entry.qualification}>
                    <p className="text-sm font-black text-white">{entry.qualification}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-400">{entry.institution}</p>
                  </li>
                ))}
              </ul>

              {canPublishFounderIdentity() && (
                <a
                  href={founder.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-2 border-t border-white/10 pt-5 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071126]"
                >
                  <Award className="h-4 w-4" />
                  Professional profile on LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
