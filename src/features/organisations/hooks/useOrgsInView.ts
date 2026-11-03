"use client";

import { seesEveryOrg } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { useSelectedOrg, type SelectedOrg } from "@/lib/org/selection";

/** What the organisation switch has in view (3.3 combined views). */
export interface OrgsInView {
  /** The Super Admin or the Super Manager: she can switch organisations. */
  canChoose: boolean;
  /** The organisation picked, or null ("All organisations", or not a switching role). */
  org: SelectedOrg | null;
  /**
   * "All organisations" is in view: lists combine every organisation, so every row
   * carries an organisation chip.
   */
  mixed: boolean;
}

export function useOrgsInView(): OrgsInView {
  const { role } = useSession();
  const org = useSelectedOrg();
  const canChoose = seesEveryOrg(role);
  return { canChoose, org: canChoose ? org : null, mixed: canChoose && !org };
}
