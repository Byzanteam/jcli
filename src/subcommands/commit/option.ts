import { GlobalOptions } from "@/args.ts";

export type CommitOptions = GlobalOptions & {
  message?: string;
};
