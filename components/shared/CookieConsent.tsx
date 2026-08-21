"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((module) => module.Analytics),
  { ssr: false },
);

const CONSENT_COOKIE = "cyvrix_cookie_consent";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
let lastCookieValue: string | null | undefined;
let lastConsentSnapshot: StoredConsent | null = null;

type ConsentChoices = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

type StoredConsent = ConsentChoices & {
  version: 1;
  updatedAt: string;
};

const DEFAULT_CHOICES: ConsentChoices = {
  analytics: false,
  marketing: false,
  preferences: false,
};

function readStoredConsent(): StoredConsent | null {
  if (typeof document === "undefined") return null;

  const encodedValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);

  if (encodedValue === lastCookieValue) return lastConsentSnapshot;

  lastCookieValue = encodedValue ?? null;

  if (!encodedValue) {
    lastConsentSnapshot = null;
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(encodedValue)) as Partial<StoredConsent>;
    if (
      parsed.version !== 1 ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean" ||
      typeof parsed.preferences !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      lastConsentSnapshot = null;
      return null;
    }

    lastConsentSnapshot = parsed as StoredConsent;
    return lastConsentSnapshot;
  } catch {
    lastConsentSnapshot = null;
    return null;
  }
}

function subscribeToConsent() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function writeStoredConsent(choices: ConsentChoices): StoredConsent {
  const consent: StoredConsent = {
    ...choices,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  lastCookieValue = encodeURIComponent(JSON.stringify(consent));
  lastConsentSnapshot = consent;
  return consent;
}

type ConsentOptionProps = {
  checked: boolean;
  description: string;
  id: keyof ConsentChoices;
  label: string;
  onChange: (id: keyof ConsentChoices, checked: boolean) => void;
};

function ConsentOption({ checked, description, id, label, onChange }: ConsentOptionProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition hover:border-sky-200 hover:bg-sky-50">
      <input
        checked={checked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#2691F0]"
        onChange={(event) => onChange(id, event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="block font-semibold text-slate-950">{label}</span>
        <span className="mt-0.5 block leading-5 text-slate-600">{description}</span>
      </span>
    </label>
  );
}

export function CookieConsent() {
  const hasLoaded = React.useSyncExternalStore(
    subscribeToConsent,
    getClientSnapshot,
    getServerSnapshot,
  );
  const cookieConsent = React.useSyncExternalStore(
    subscribeToConsent,
    readStoredConsent,
    () => null,
  );
  const [savedConsent, setSavedConsent] = React.useState<StoredConsent | null | undefined>(undefined);
  const [isManaging, setIsManaging] = React.useState(false);
  const [draftChoices, setDraftChoices] = React.useState<ConsentChoices | null>(null);
  const consent = savedConsent === undefined ? cookieConsent : savedConsent;
  const choices = draftChoices ?? consent ?? DEFAULT_CHOICES;

  const save = React.useCallback((nextChoices: ConsentChoices) => {
    const nextConsent = writeStoredConsent(nextChoices);
    setSavedConsent(nextConsent);
    setDraftChoices(nextChoices);
    setIsManaging(false);
  }, []);

  const updateChoice = React.useCallback((id: keyof ConsentChoices, checked: boolean) => {
    setDraftChoices((current) => ({ ...(current ?? consent ?? DEFAULT_CHOICES), [id]: checked }));
  }, [consent]);

  if (!hasLoaded) return null;

  const showPanel = consent === null || isManaging;

  return (
    <>
      {consent?.analytics ? <Analytics /> : null}

      {showPanel ? (
        <section
          aria-describedby="cookie-consent-description"
          aria-labelledby="cookie-consent-title"
          aria-modal="false"
          className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20 sm:bottom-6 sm:p-6"
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Your privacy</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950" id="cookie-consent-title">Cookie preferences</h2>
            </div>
            {consent ? (
              <button
                aria-label="Close cookie preferences"
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                onClick={() => {
                  setDraftChoices(consent);
                  setIsManaging(false);
                }}
                type="button"
              >
                Close
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600" id="cookie-consent-description">
            Essential cookies keep the site working. Choose whether CYVRIX may also use analytics, preference and marketing technologies. You can change this at any time.
            {" "}
            <Link className="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-900" href="/cookie-policy">
              Read the Cookie Policy
            </Link>
            .
          </p>

          <div className="mt-4 grid gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <span className="block font-semibold text-slate-950">Essential</span>
              <span className="mt-0.5 block leading-5 text-slate-600">Required for core site functions and your saved cookie choice. Always active.</span>
            </div>
            <ConsentOption
              checked={choices.analytics}
              description="Helps us understand how the public site is used. Vercel Analytics is only loaded after you allow this category."
              id="analytics"
              label="Analytics"
              onChange={updateChoice}
            />
            <ConsentOption
              checked={choices.preferences}
              description="Allows optional experience preferences to be remembered when that functionality is enabled."
              id="preferences"
              label="Preferences"
              onChange={updateChoice}
            />
            <ConsentOption
              checked={choices.marketing}
              description="Allows future campaign measurement only if CYVRIX enables an approved marketing integration."
              id="marketing"
              label="Marketing"
              onChange={updateChoice}
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              onClick={() => save(DEFAULT_CHOICES)}
              type="button"
            >
              Reject optional
            </button>
            <button
              className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              onClick={() => save(choices)}
              type="button"
            >
              Save choices
            </button>
            <button
              className="rounded-lg bg-[#041635] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b2a5b] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              onClick={() => save({ analytics: true, marketing: true, preferences: true })}
              type="button"
            >
              Accept optional cookies
            </button>
          </div>
        </section>
      ) : (
        <button
          className="fixed bottom-4 left-4 z-[60] rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg transition hover:border-sky-300 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 sm:bottom-6 sm:left-6"
          onClick={() => {
            setDraftChoices(consent ?? DEFAULT_CHOICES);
            setIsManaging(true);
          }}
          type="button"
        >
          Cookie preferences
        </button>
      )}
    </>
  );
}
