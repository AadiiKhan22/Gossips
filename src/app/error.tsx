"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import * as React from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  React.useEffect(() => {
    // Surface the real error in the console for debugging; nothing
    // sensitive is shown to the user themselves below.
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-full">
        <AlertTriangle className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Gossips hit an unexpected error. This has been noted -- try again, or reload the page if
          it keeps happening.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="gossip-gradient inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
      >
        <RotateCw className="size-4" />
        Try again
      </button>
    </div>
  );
}
