import type { Metadata } from "next";
import * as React from "react";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import {
  ActivityBlock,
  ChartBlock,
  QueueBlock,
  SecurityBlock,
  TilesBlock,
  TodayHeader,
  WebsiteBlock,
} from "@/components/admin/dashboard/blocks";
import { BlockSkeleton } from "@/components/admin/dashboard/parts";
import { parseRange } from "@/lib/dashboard/time";

export const metadata: Metadata = {
  title: "Today",
  description: "What is waiting on the CYVRIX team today.",
};

type TodaySearch = { range?: string };

/**
 * The admin home: what is waiting on staff, then the trends behind it.
 * Design: docs/superpowers/specs/2026-11-09-admin-today-dashboard-design.md.
 *
 * Each block streams in its own Suspense boundary and reports its own failure,
 * so a slow or failed query blanks one card, never the page (DECISIONS §8).
 */
export default function TodayPage({ searchParams }: { searchParams: Promise<TodaySearch> }) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <TodayContent searchParams={searchParams} />
    </React.Suspense>
  );
}

async function TodayContent({ searchParams }: { searchParams: Promise<TodaySearch> }) {
  const range = parseRange((await searchParams).range);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <React.Suspense fallback={<div className="h-16 animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />}>
        <TodayHeader range={range} />
      </React.Suspense>

      <React.Suspense fallback={<BlockSkeleton className="h-32" />}>
        <TilesBlock range={range} />
      </React.Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <React.Suspense fallback={<BlockSkeleton className="h-80" />}>
            <QueueBlock />
          </React.Suspense>
        </div>
        <div className="space-y-6">
          <React.Suspense fallback={<BlockSkeleton className="h-44" />}>
            <SecurityBlock />
          </React.Suspense>
          <React.Suspense fallback={<BlockSkeleton className="h-56" />}>
            <WebsiteBlock range={range} />
          </React.Suspense>
        </div>
      </div>

      <React.Suspense fallback={<BlockSkeleton className="h-60" />}>
        <ChartBlock range={range} />
      </React.Suspense>

      <React.Suspense fallback={<BlockSkeleton className="h-64" />}>
        <ActivityBlock />
      </React.Suspense>
    </div>
  );
}
