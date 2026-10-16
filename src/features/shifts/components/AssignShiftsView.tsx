"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useShifts } from "@/features/shifts/hooks/useShifts";
import { useDepartmentAssignments } from "@/features/shifts/hooks/useAssignments";
import { DepartmentsTab } from "@/features/shifts/components/DepartmentsTab";
import { PeopleTab } from "@/features/shifts/components/PeopleTab";

type Tab = "departments" | "people";

function Precedence({ defaultName }: { defaultName?: string }) {
  const steps = [
    "Personal override",
    "Department shift",
    `Default shift${defaultName ? ` (${defaultName})` : ""}`,
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm sm:px-5">
      <p className="text-sm font-semibold text-slate-900">Which shift applies</p>
      <ol className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`rounded-lg px-2.5 py-1 font-semibold ${
                i === 0
                  ? "bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)]"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {i + 1}. {step}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight aria-hidden className="h-4 w-4 text-slate-300" />
            )}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-slate-500">
        The first one that exists wins. Changes start on the day you pick; past days keep the shift
        they had.
      </p>
    </div>
  );
}

/** Assign shifts: departments (Super Admin edits) and people (overrides). */
export function AssignShiftsView({ canEditDepartments }: { canEditDepartments: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "people" ? "people" : "departments";
  const department = searchParams.get("department") ?? "";

  const shifts = useShifts();
  const departments = useDepartmentAssignments();
  const departmentNames = useMemo(
    () =>
      [...new Set((departments.data ?? []).map((d) => d.department))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [departments.data],
  );
  const defaultShift = shifts.data?.find((s) => s.isDefault);

  function go(next: { tab?: Tab; department?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextTab = next.tab ?? tab;
    if (nextTab === "people") params.set("tab", "people");
    else params.delete("tab");
    const nextDept = next.department ?? (nextTab === "people" ? department : "");
    if (nextDept && nextTab === "people") params.set("department", nextDept);
    else params.delete("department");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assign shifts"
        subtitle="Give each department a shift. Override it for people who work different hours."
      />

      <Precedence defaultName={defaultShift?.name} />

      <SegmentedTabs
        label="Assign by"
        idPrefix="assign"
        value={tab}
        onChange={(t) => go({ tab: t })}
        tabs={[
          { value: "departments", label: "Departments" },
          { value: "people", label: "People" },
        ]}
      />

      <div id="assign-panel" role="tabpanel" aria-labelledby={`assign-tab-${tab}`}>
        {tab === "departments" ? (
          <DepartmentsTab
            canEdit={canEditDepartments}
            shifts={shifts.data}
            onShowOverrides={(d) => go({ tab: "people", department: d })}
          />
        ) : (
          <PeopleTab
            shifts={shifts.data}
            departments={departmentNames}
            department={department}
            onDepartmentChange={(d) => go({ tab: "people", department: d })}
          />
        )}
      </div>
    </div>
  );
}
