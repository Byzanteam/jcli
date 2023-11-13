import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import migrateCommand from "@/subcommands/db/migrate/mod.ts";
import rollbackCommand from "@/subcommands/db/rollback/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Commands to manage your database on Jet.")
  .command("migrate", migrateCommand)
  .command("rollback", rollbackCommand);

export default command;
