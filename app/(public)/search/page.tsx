import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { MAX_QUERY_LENGTH, searchSite, type SiteSearchResult } from "@/lib/site-search";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search CYVRIX services, industries, insights, case studies and careers.",
  // Result pages carry no standalone value for indexing.
  robots: { index: false, follow: true },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

const suggestedTerms = [
  "Managed IT",
  "Microsoft 365",
  "Cybersecurity",
  "Cloud migration",
  "Network",
  "Field engineering",
];

export default function SearchPage(props: SearchPageProps) {
  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <section className="border-b border-white/10 bg-[#041635] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-sky-300">
              <SearchIcon className="h-4 w-4" aria-hidden="true" />
              Site search
            </p>
            <h1 className="mt-5 font-outfit text-4xl font-black tracking-tight sm:text-5xl">
              Find what you need.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-300">
              Search across our services, industries, insights, published case studies and open roles.
            </p>
          </div>

          <React.Suspense fallback={<SearchFormShell />}>
            <SearchForm {...props} />
          </React.Suspense>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <React.Suspense fallback={<ResultsSkeleton />}>
            <SearchResults {...props} />
          </React.Suspense>
        </div>
      </section>
    </div>
  );
}

async function SearchForm({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  return <SearchFormShell defaultValue={typeof q === "string" ? q : ""} />;
}

function SearchFormShell({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" method="get" role="search" className="mt-10 max-w-2xl">
      <label htmlFor="site-search" className="block text-sm font-black text-white">
        Search the CYVRIX website
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="site-search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          placeholder="For example, Microsoft 365 security"
          className="w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
        />
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#2691F0] px-6 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-[#020817] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#041635] active:scale-95"
        >
          Search
        </button>
      </div>
    </form>
  );
}

async function SearchResults({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const rawQuery = typeof q === "string" ? q : "";

  if (rawQuery.trim().length === 0) {
    return <SuggestedSearches heading="Popular searches" />;
  }

  const { query, results } = await searchSite(rawQuery);

  if (results.length === 0) {
    return (
      <div>
        <h2 className="font-outfit text-2xl font-black">
          No results for <span className="text-sky-300">{query}</span>
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
          Try a broader term, check the spelling, or browse the sections below. If you cannot find what you
          need, our team is happy to point you in the right direction.
        </p>
        <SuggestedSearches heading="Try one of these" />
        <Link
          href="/contact"
          className="mt-10 inline-flex h-12 items-center justify-center rounded-xl bg-[#2691F0] px-6 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817] active:scale-95"
        >
          Contact us
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-outfit text-2xl font-black" aria-live="polite">
        {results.length} {results.length === 1 ? "result" : "results"} for{" "}
        <span className="text-sky-300">{query}</span>
      </h2>
      <ul className="mt-8 grid gap-4">
        {results.map((result) => (
          <li key={result.id}>
            <ResultCard result={result} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultCard({ result }: { result: SiteSearchResult }) {
  return (
    <Link
      href={result.href}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#2691F0]/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
    >
      <span className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">{result.type}</span>
      <h3 className="mt-3 font-outfit text-xl font-black text-white">{result.title}</h3>
      {result.description ? (
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{result.description}</p>
      ) : null}
    </Link>
  );
}

function SuggestedSearches({ heading }: { heading: string }) {
  return (
    <div className="mt-10">
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{heading}</h3>
      <ul className="mt-4 flex flex-wrap gap-3">
        {suggestedTerms.map((term) => (
          <li key={term}>
            <Link
              href={`/search?q=${encodeURIComponent(term)}`}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-300 transition-colors hover:border-[#2691F0]/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
            >
              {term}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-32 rounded-2xl border border-white/10 bg-white/[0.03]" />
      ))}
    </div>
  );
}
