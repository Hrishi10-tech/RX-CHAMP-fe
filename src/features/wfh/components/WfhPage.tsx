"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useSession } from "@/features/auth/hooks/useSession";
import { isApprover, isOrgAdmin } from "@/constants/roles";
import { useWfhSummary } from "@/features/wfh/hooks/useWfh";

import { MyWfhPanel } from "./MyWfhPanel";
import { SchedulesPanel } from "./SchedulesPanel";
import { WfhPolicyPanel } from "./WfhPolicyPanel";
import { WfhRequestsPanel } from "./WfhRequestsPanel";

type Tab = "mine" | "requests" | "schedules" | "policy";

/**
 * Work from home (3.5 on 4.0). Every portal role: their own days, requests and
 * schedule (Staff ask in the RX Vision app, never here). Approvers: the requests
 * in their scope (a Manager the Staff of their departments) and the schedules.
 * The organisation's admins and the Super Manager: the policy too (the admins
 * change it). The organisation in view travels with every request (X-Org-Id); on
 * "All organisations" each row names its organisation. The tab is in the URL, so
 * a notification can open the right one.
 */
export function WfhPage() {
  const { role } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const approver = isApprover(role);
  // 4.0: the organisation's admins change the policy; the Super Manager reads it.
  const policyReader = isOrgAdmin(role) || role === "SUPER_MANAGER";
  const summary = useWfhSummary(undefined, approver);

  const tabs: { value: Tab; label: string; badge?: number }[] = [
    { value: "mine", label: "My work from home" },
    ...(approver
      ? [
          {
            value: "requests" as Tab,
            label: "Requests",
            badge: summary.data?.needsMe ? summary.data.needsMe : undefined,
          },
          { value: "schedules" as Tab, label: "Schedules" },
        ]
      : []),
    ...(policyReader ? [{ value: "policy" as Tab, label: "Policy" }] : []),
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
        <h1 className="text-2xl font-bold tracking-tight text-primary">Work from home</h1>
        <p className="text-sm text-quiet">
          A day, a half day or a quarter day at home, asked for and approved; managers and the
          organisation admin can also set a regular schedule.
        </p>
      </header>
      {tabs.length > 1 && (
        <SegmentedTabs
          label="Work from home sections"
          value={tab}
          onChange={select}
          tabs={tabs}
          idPrefix="wfh"
        />
      )}
      <div id="wfh-panel" role="tabpanel" aria-labelledby={`wfh-tab-${tab}`}>
        {tab === "mine" && <MyWfhPanel />}
        {tab === "requests" && <WfhRequestsPanel />}
        {tab === "schedules" && <SchedulesPanel />}
        {tab === "policy" && <WfhPolicyPanel />}
      </div>
    </div>
  );
}
