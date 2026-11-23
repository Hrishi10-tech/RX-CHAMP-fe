import { RouteNotFound } from "@/components/layout/RouteProblem";

/** An address that is not a page (U-3). */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-panel px-4 py-10">
      <RouteNotFound />
    </main>
  );
}
