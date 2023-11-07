import { GlobalOptions } from "@/args.ts";

export type PushOptions = GlobalOptions & {
  onlyFunctions?: boolean;
  onlyMigrations?: boolean;
};
