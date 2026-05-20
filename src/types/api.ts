export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiFieldErrors {
  [field: string]: string[];
}
