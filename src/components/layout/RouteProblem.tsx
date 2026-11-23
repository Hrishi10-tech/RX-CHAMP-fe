"use client";

import Link from "next/link";
import { AlertTriangle, Compass } from "lucide-react";

import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * What a route shows when it cannot show itself (U-3): a page that crashed, or an address that
 * is not a page. In the agent design, with one way forward. Words: owner, 19 November.
 */
export function RouteError({ onRetry, home = "/" }: { onRetry?: () => void; home?: string }) {
  return (
    <Card as="section" role="alert" className="mx-auto mt-10 max-w-md p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-attention" aria-hidden />
      <h1 className="mt-3 text-lg font-bold text-primary">Something went wrong</h1>
      <p className="mt-1 text-sm text-quiet">Something went wrong. Try again.</p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        {onRetry && (
          <Button variant="primary" type="button" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Link href={home} className={buttonClass("secondary")}>
          Back to home
        </Link>
      </div>
    </Card>
  );
}

export function RouteNotFound({ home = "/" }: { home?: string }) {
  return (
    <Card as="section" className="mx-auto mt-10 max-w-md p-6 text-center">
      <Compass className="mx-auto h-8 w-8 text-quiet" aria-hidden />
      <h1 className="mt-3 text-lg font-bold text-primary">Page not found</h1>
      <p className="mt-1 text-sm text-quiet">This page does not exist.</p>
      <div className="mt-5 flex justify-center">
        <Link href={home} className={buttonClass("primary")}>
          Back to home
        </Link>
      </div>
    </Card>
  );
}
