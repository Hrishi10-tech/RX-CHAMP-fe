/** React Query keys for Staff's own day pages (4.1). Start with "me": never organisation-scoped. */
export const myDayKeys = {
  all: ["me", "day"] as const,
  day: (date: string) => [...myDayKeys.all, date] as const,
};
