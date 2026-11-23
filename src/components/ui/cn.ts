import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names; a later class wins over an earlier one of the same kind (a variant's extras). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
