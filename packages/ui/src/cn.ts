import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names with conflict resolution. Use for all conditional className logic. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
