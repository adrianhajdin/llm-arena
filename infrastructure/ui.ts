import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names so a later Tailwind utility actually beats an earlier one
 * of the same kind. shadcn components are generated against this helper, which
 * is why it lives in `infrastructure` rather than inside a feature: it belongs
 * to no feature and every feature may reach it.
 */
export const cn = (...inputs: readonly ClassValue[]): string => twMerge(clsx(inputs));
