"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-[#020817] text-white flex flex-col items-center justify-center min-h-screen p-5 text-center">
        <h2 className="font-outfit text-3xl font-black mb-4">Something went wrong!</h2>
        <p className="text-slate-400 text-sm max-w-md mb-8">
          A critical application error has occurred. Our engineering team has been notified.
        </p>
        <button
          onClick={() => reset()}
          className="bg-[#2691F0] hover:bg-white hover:text-[#041635] text-white px-6 py-2.5 rounded-xl font-bold transition-all"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
