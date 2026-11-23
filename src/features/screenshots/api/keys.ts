/** Query keys for screenshot reports, archives and the archive reminder (3.2). */
export const exportKeys = {
  all: ["screenshot-exports"] as const,
  one: (id: string) => [...exportKeys.all, id] as const,
  archives: () => [...exportKeys.all, "archives"] as const,
  nudge: () => [...exportKeys.all, "nudge"] as const,
};
