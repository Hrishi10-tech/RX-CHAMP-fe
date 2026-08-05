import {
  BadgeCheck,
  BarChart3,
  Briefcase,
  Code2,
  Headphones,
  Heart,
  Megaphone,
  Package,
  Pencil,
  Scale,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { SelectOption } from "@/components/ui/types";

export const DEPARTMENTS: { name: string; icon: LucideIcon }[] = [
  { name: "Engineering", icon: Code2 },
  { name: "Product", icon: Package },
  { name: "Design", icon: Pencil },
  { name: "Quality Assurance", icon: BadgeCheck },
  { name: "IT & Support", icon: Headphones },
  { name: "Sales", icon: BarChart3 },
  { name: "Marketing", icon: Megaphone },
  { name: "Human Resources", icon: Users },
  { name: "Finance", icon: Wallet },
  { name: "Operations", icon: Settings },
  { name: "Customer Success", icon: Heart },
  { name: "Legal", icon: Scale },
];

export const DEPARTMENT_NAMES = DEPARTMENTS.map((d) => d.name);

export const departmentSelectOptions: SelectOption[] = DEPARTMENTS.map((d) => ({
  value: d.name,
  label: d.name,
  icon: d.icon,
}));

/**
 * Departments come back as free text, so a member may sit in one that isn't in
 * the list above. Prepend it rather than render an empty select.
 */
export function withDepartment(value: string | undefined, options = departmentSelectOptions) {
  if (!value || options.some((o) => o.value === value)) return options;
  return [{ value, label: value, icon: Briefcase }, ...options];
}
