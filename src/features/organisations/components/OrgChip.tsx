import { Building2 } from "lucide-react";

import { Chip } from "@/components/ui/Chip";

/**
 * A person's organisation on a row (3.3), shown when several organisations are
 * in view ("All organisations" for the Super Admin or the Super Manager) so
 * nobody has to guess whose person this is. Renders nothing without a name.
 */
export function OrgChip({
  name,
  show = true,
  className = "",
}: {
  name: string | null | undefined;
  show?: boolean;
  className?: string;
}) {
  if (!show || !name) return null;
  return (
    <Chip tone="violet" icon={Building2} title={`Organisation: ${name}`} className={className}>
      {name}
    </Chip>
  );
}

/** "Billing · Org B" for a secondary line; the organisation only when wanted. */
export function departmentAndOrg(
  department: string | null | undefined,
  orgName: string | null | undefined,
  show: boolean,
): string {
  return [department, show ? orgName : null].filter(Boolean).join(" · ");
}
