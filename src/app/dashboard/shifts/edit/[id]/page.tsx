"use client";

import { useParams } from "next/navigation";

import { ShiftEditor } from "@/features/shifts/components/ShiftEditor";

export default function EditShiftPage() {
  const params = useParams<{ id: string }>();
  // Keyed by id so moving between two shifts' editors starts each one fresh.
  return <ShiftEditor key={params.id} shiftId={params.id} />;
}
