import { Command } from "cliffy";

import { config } from "@/api/mod.ts";
import { setupLogger } from "@/jcli/logger.ts";

import { action as globalOptionAction } from "@/args.ts";

import { default as projectsCommand } from "@/subcommands/projects/mod.ts";
import { default as migrationsCommand } from "@/subcommands/migrations/mod.ts";
import { default as functionsCommand } from "@/subcommands/functions/mod.ts";
import { default as adminCommand } from "@/subcommands/admin/mod.ts";

const DEFAULT_LOG_LEVEL = "INFO";
setupLogger(config.logLevel ?? DEFAULT_LOG_LEVEL);

await new Command()
  .name("jcli")
  .description("Jet command-line tool")
  .globalOption("-d, --debug", "Enable debug output.", {
    action: globalOptionAction,
  })
  .command("admin", adminCommand)
  .command("projects", projectsCommand)
  .command("migrations", migrationsCommand)
  .command("functions", functionsCommand)
  .parse(Deno.args);
