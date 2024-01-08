import { VarOptions } from "@/subcommands/admin/var/option.ts";

export function buildEnvironmentName(
  options: VarOptions,
): "PRODUCTION" | "DEVELOPMENT" {
  if (options.prod) {
    return "PRODUCTION";
  } else {
    return "DEVELOPMENT";
  }
}
