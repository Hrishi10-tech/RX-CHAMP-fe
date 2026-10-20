"use client";

import { isOrgAdmin } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { CalendarView } from "@/features/calendar/components/CalendarView";

/** SPEC 7.2 Calendar: Admins and Super Admins change it; Managers read it. */
export default function CalendarPage() {
  const { role } = useSession();
  return <CalendarView editable={isOrgAdmin(role)} />;
}
