"use client";

import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { MembersSection } from "@/features/users/components/MembersSection";

/** SPEC 7.2 Team management (Admin, Super Admin): people, their access and their app. */
export default function PeoplePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Team management"
        subtitle="Everyone in the organisation: roles, departments, what managers can see, and the RX Vision app."
      />
      <MembersSection />
    </div>
  );
}
