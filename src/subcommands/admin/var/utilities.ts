import { ProjectEnvironmentName } from "@/api/mod.ts";
import { VarOptions } from "@/subcommands/admin/var/option.ts";

export function buildEnvironmentName(
  options: VarOptions,
): ProjectEnvironmentName {
  if (options.prod) {
    return "PRODUCTION";
  } else {
    return "DEVELOPMENT";
  }
}
