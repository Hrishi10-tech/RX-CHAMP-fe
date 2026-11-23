"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";

import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useSession } from "@/features/auth/hooks/useSession";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { useAttendanceStatus } from "@/features/attendance/hooks/useAttendance";
import { attendanceAccess } from "@/features/attendance/lib/format";

import { AttendanceSettingsPanel } from "./AttendanceSettingsPanel";
import { IntegrationPanel } from "./IntegrationPanel";
import { PeoplePanel } from "./PeoplePanel";
import { PunchesPanel } from "./PunchesPanel";
import { DevicesPanel, UnmatchedPanel } from "./UnmatchedDevicesPanels";

type Tab = "people" | "punches" | "unmatched" | "devices" | "integration" | "settings";

/**
 * Attendance (3.5, Manage): who checks in by the desktop agent and who by the
 * biometric device, the punch log, codes nobody has, devices, the integration
 * (keys, the pull, a CSV import) and its settings. 4.0: all of it is the
 * organisation's in view, which runs its own integration. Its admin (or a Super
 * Admin acting in it) changes; the Super Manager reads, and adds or voids punches.
 */
export function AttendancePage() {
  const { role, me } = useSession();
  const { canEdit, canWrite } = attendanceAccess(role);
  const { org } = useOrgsInView();
  const orgName = org?.name || me?.organisation?.name || "";
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = useAttendanceStatus();
  const tabs: { value: Tab; label: string; badge?: number }[] = [
    { value: "people", label: "People" },
    { value: "punches", label: "Punches" },
    { value: "unmatched", label: "Unmatched", badge: status.data?.unmatchedCodes || undefined },
    { value: "devices", label: "Devices" },
    { value: "integration", label: "Integration" },
    { value: "settings", label: "Settings" },
  ];
  const asked = params.get("tab");
  const tab: Tab = tabs.some((t) => t.value === asked) ? (asked as Tab) : "people";

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500">
          Who checks in by the desktop app and who by the biometric device, every punch, and the
          connection to the device{orgName ? `, for ${orgName}` : ""}. Each organisation runs its
          own integration.
        </p>
      </header>
      {!canEdit && canWrite && (
        <p
          role="note"
          className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600"
        >
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span>
            You can read everything here, and add or void punches. The organisation admin sets who
            checks in how, the keys, the pull and the settings.
          </span>
        </p>
      )}
      <SegmentedTabs
        label="Attendance"
        idPrefix="attendance"
        value={tab}
        onChange={(next) =>
          router.replace(next === "people" ? pathname : `${pathname}?tab=${next}`, {
            scroll: false,
          })
        }
        tabs={tabs}
      />
      <div id="attendance-panel" role="tabpanel" aria-labelledby={`attendance-tab-${tab}`}>
        {tab === "people" && <PeoplePanel canEdit={canEdit} />}
        {tab === "punches" && (
          <PunchesPanel canWrite={canWrite} initialCode={params.get("code") ?? undefined} />
        )}
        {tab === "unmatched" && <UnmatchedPanel canEdit={canEdit} />}
        {tab === "devices" && <DevicesPanel />}
        {tab === "integration" && <IntegrationPanel canEdit={canEdit} />}
        {tab === "settings" && <AttendanceSettingsPanel canEdit={canEdit} />}
      </div>
    </div>
  );
}
