import { redirect } from "next/navigation";

/** 3.1: breaks and meetings are decided in one place, /dashboard/approvals. */
export default function BreakApprovalsPage() {
  redirect("/dashboard/approvals");
}
