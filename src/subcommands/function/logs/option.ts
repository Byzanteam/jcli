import { GlobalOptions } from "@/args.ts";

export type LogsOptions = GlobalOptions & {
  prod?: boolean;
  length?: number;
};
