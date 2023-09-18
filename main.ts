import { Command } from "cliffy";

import { default as projectsCommand } from "@/subcommands/projects/mod.ts";
import { default as migrationsCommand } from "@/subcommands/migrations/mod.ts";
import { default as functionsCommand } from "@/subcommands/functions/mod.ts";

await new Command()
  .name("jcli")
  .description("Jet command-line tool")
  .globalOption("-d, --debug", "Enable debug output.")
  .command("projects", projectsCommand)
  .command("migrations", migrationsCommand)
  .command("functions", functionsCommand)
  .parse(Deno.args);
