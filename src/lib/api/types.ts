import type { InternalAxiosRequestConfig } from "axios";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };
