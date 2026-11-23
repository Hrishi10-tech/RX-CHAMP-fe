"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useSession } from "@/features/auth/hooks/useSession";
import { isApprover, isOrgAdmin } from "@/constants/roles";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { useLeaveSummary } from "@/features/leave/hooks/useLeave";

import { BalancesPanel } from "./BalancesPanel";
import { MyLeavePanel } from "./MyLeavePanel";
import { PolicyPanel } from "./PolicyPanel";
import { RequestsPanel } from "./RequestsPanel";

type Tab = "mine" | "requests" | "balances" | "policy";

/**
 * Leave (3.4). Everyone: their own balances and requests. Approvers: the requests
 * in their scope and the balances. The organisation's admins and the Super
 * Manager: the policy too (the admins change it). The tab is in the URL, so a notification can open the right one.
 */
export function LeavePage() {
  const { role } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // 4.0: the API client sends the organisation in view; the combined view tags rows.
  const org = { companyId: undefined as string | undefined, mixed: useOrgsInView().mixed };
  const approver = isApprover(role);
  // 4.0: the organisation's admins change the policy; the Super Manager reads it.
  const policyEditor = isOrgAdmin(role) || role === "SUPER_MANAGER";
  const summary = useLeaveSummary(org.companyId, approver);

  const tabs: { value: Tab; label: string; badge?: number }[] = [
    { value: "mine", label: "My leave" },
    ...(approver
      ? [
          {
            value: "requests" as Tab,
            label: "Requests",
            badge: summary.data?.needsMe ? summary.data.needsMe : undefined,
          },
          { value: "balances" as Tab, label: "Balances" },
        ]
      : []),
    ...(policyEditor ? [{ value: "policy" as Tab, label: "Policy" }] : []),
  ];
  const asked = params.get("tab");
  const fallback: Tab =
    approver && (summary.data?.needsMe ?? 0) > 0 && !asked ? "requests" : "mine";
  const tab: Tab = tabs.some((t) => t.value === asked) ? (asked as Tab) : fallback;

  function select(next: Tab) {
    router.replace(next === "mine" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave</h1>
        <p className="text-sm text-slate-500">
          CL/SL (casual or sick) and EL/PL (earned or privilege), in full, half and quarter days.
        </p>
      </header>
      {tabs.length > 1 && (
        <SegmentedTabs
          label="Leave sections"
          value={tab}
          onChange={select}
          tabs={tabs}
          idPrefix="leave"
        />
      )}
      <div id="leave-panel" role="tabpanel" aria-labelledby={`leave-tab-${tab}`}>
        {tab === "mine" && <MyLeavePanel />}
        {tab === "requests" && <RequestsPanel />}
        {tab === "balances" && <BalancesPanel />}
        {tab === "policy" && <PolicyPanel />}
      </div>
    </div>
  );
}
