/** React Query keys for the signed-in person's work day. */
export const workdayKeys = {
  all: ["workday"] as const,
  today: () => [...workdayKeys.all, "me", "today"] as const,
};
