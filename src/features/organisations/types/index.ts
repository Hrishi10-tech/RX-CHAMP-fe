/** SPEC 5.1 `GET /organisations` (Super Admin). */
export interface OrganisationAdmin {
  id: string;
  name: string;
  email: string;
}

export interface OrganisationCounts {
  staff: number;
  managers: number;
  departments: number;
}

export interface OrganisationToday {
  started: number;
  working: number;
  onBreak: number;
  notStarted: number;
}

export interface OrganisationView {
  id: string;
  name: string;
  createdAt: string | null;
  admin: OrganisationAdmin | null;
  counts: OrganisationCounts;
  today: OrganisationToday;
}

/** SPEC 5.1 `GET /overview/platform`. */
export interface PlatformOverview {
  organisations: OrganisationView[];
  /** People who belong to no organisation yet (left by the migration, SPEC 3.3). */
  unassignedPeople: number;
}

export interface CreateAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
