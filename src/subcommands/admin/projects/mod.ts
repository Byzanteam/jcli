import { Command } from "cliffy-command";
import { GlobalOptions } from "@/args.ts";

import createCommand from "@/subcommands/admin/projects/create/mod.ts";
import listCommand from "@/subcommands/admin/projects/list/mod.ts";

const command = new Command<GlobalOptions>()
  .description("Commands to manage your projects as an admin.")
  .command("create", createCommand)
  .command("list", listCommand);

export default command;
