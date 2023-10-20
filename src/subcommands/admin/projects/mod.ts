import { Command } from "cliffy";
import { GlobalOptions } from "@/args.ts";

import createCommand from "@/subcommands/admin/projects/create/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Commands to manage your projects as an admin.")
  .command("create", createCommand);

export default command;
