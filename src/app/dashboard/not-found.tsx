import { RouteNotFound } from "@/components/layout/RouteProblem";

/** A dashboard address that is not a page (U-3): the menu stays. */
export default function DashboardNotFound() {
  return <RouteNotFound home="/dashboard" />;
}
