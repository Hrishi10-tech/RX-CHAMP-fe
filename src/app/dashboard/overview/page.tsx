"use client";

import { useState } from "react";

import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useSession } from "@/features/auth/hooks/useSession";
import { OverviewView } from "@/features/overview/components/OverviewView";
import { SuperOverview } from "@/features/overview/components/SuperOverview";
import { PlatformOverview } from "@/features/organisations/components/PlatformOverview";
import { useSelectedOrg } from "@/lib/org/selection";

/**
 * SPEC 7.2 Overview: the organisation's live picture for an Admin or a Manager
 * (their departments), and for a Super Admin inside an organisation.
 *
 * 3.3: the Super Manager's home is the organisations Overview (every
 * organisation, or the one picked in the header). A Super Admin on "All
 * organisations" gets the same, with the 4.0 platform overview one tab away.
 */
export default function OverviewPage() {
  const { role } = useSession();
  const org = useSelectedOrg();
  const [tab, setTab] = useState<"today" | "platform">("today");
  if (role === "SUPER_MANAGER") return <SuperOverview />;
  if (role === "SUPER_ADMIN" && !org) {
    return (
      <div className="space-y-5">
        <SegmentedTabs
          label="Overview"
          idPrefix="overview"
          size="sm"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "today", label: "Today" },
            { value: "platform", label: "Platform" },
          ]}
        />
        {tab === "today" ? <SuperOverview /> : <PlatformOverview />}
      </div>
    );
  }
  return <OverviewView />;
}
