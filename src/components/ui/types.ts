import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: LucideIcon;
  iconClassName?: string;
  description?: string;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  leadingIcon?: LucideIcon;
}

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey?: (row: T, index: number) => string | number;
  emptyMessage?: string;

  minWidth?: number;

  title?: string;
  searchable?: boolean;
  searchKeys?: string[];
  searchPlaceholder?: string;
  action?: ReactNode;

  selectable?: boolean;

  rowActions?: (row: T, index: number) => ReactNode;

  onRowClick?: (row: T, index: number) => void;

  renderBulkActions?: (
    selectedKeys: Array<string | number>,
    clearSelection: () => void,
  ) => ReactNode;

  pageSize?: number;

  pageSizeOptions?: number[];

  countNoun?: string;

  serverPagination?: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
    onPageChange: (page: number) => void;
  };
}

export interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  iconClassName?: string;
  hasError?: boolean;
}

export interface Parsed {
  h12: number;
  m: number;
  p: "AM" | "PM";
}

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  destructive?: boolean;
  loading?: boolean;
}
