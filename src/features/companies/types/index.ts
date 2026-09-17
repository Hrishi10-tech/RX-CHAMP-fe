import type { PaginationMeta } from "@/lib/api";

export interface CompanyManager {
  id: string;
  name: string;
  email?: string;
  joinedOn?: string;
  userCount?: number;
}

export interface Company {
  id: string;
  name: string;
  status?: string;
  createdAt?: string;
  managerCount?: number;
  userCount?: number;
  managers?: CompanyManager[];
}

export interface CompanyUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface GetCompaniesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateCompanyInput {
  name: string;
  managerIds?: string[];
}

export interface CompanyAssignments {
  assigned: string[];
  errors: { managerId: string; error: string }[];
}

export interface CreatedCompany {
  id: string;
  name: string;
  createdAt?: string;
  assignments?: CompanyAssignments;
}

export interface UpdatedCompany {
  id: string;
  name: string;
  createdAt?: string;
}

export interface DeletedCompany {
  deleted: true;
  id: string;
  name: string;
  /** Members that went with the company. Nothing is destroyed — only hidden. */
  membersRemoved: number;
}

export interface GetManagerUsersParams {
  page?: number;
  limit?: number;
}

export interface CompaniesResult {
  companies: Company[];
  meta?: PaginationMeta;
}

export interface ManagerUsersResult {
  users: CompanyUser[];
  meta?: PaginationMeta;
}
