import { GlobalOptions } from "@/args.ts";

export type DeployOptions = GlobalOptions & {
  commit?: string;
};
