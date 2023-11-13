import { GlobalOptions } from "@/args.ts";

export type PushOptions = GlobalOptions & {
  onlyConfiguration?: boolean;
  onlyFunctions?: boolean;
  onlyMigrations?: boolean;
};
