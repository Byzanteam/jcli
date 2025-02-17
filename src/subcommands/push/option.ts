import { GlobalOptions } from "@/args.ts";

export const includeCategories = [
  "configuration",
  "function",
  "migration",
  "workflow",
] as const;

export type PushOptions = GlobalOptions & {
  include?: Array<typeof includeCategories[number]>;
};
