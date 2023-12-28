import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import adminProjectsCommand from "@/subcommands/admin/projects/mod.ts";
import adminVarCommand from "@/subcommands/admin/var/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Work with admin functionalities.")
  .command("projects", adminProjectsCommand)
  .command("var", adminVarCommand);

export default command;
